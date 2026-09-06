# Global State

Rust has no "global variable" in the C sense. A `static` lives for the whole program, so anything reachable from it can be touched by every thread at once — which means the compiler demands `T: Sync`, and it demands the initializer be computable at compile time. Those two constraints are the whole story; every pattern below is a way to satisfy them.

```rust
// inlined at each use site, no address
const MAX: usize = 1024;
// one address, immutable, must be Sync
static NAME: &str = "cobalamin";
```

`const` is a copy-paste of a value; `static` is a single memory location. Reach for `const` unless you need the address or the singleton semantics.

| Need                                | Use                              |
| ----------------------------------- | -------------------------------- |
| Compile-time constant               | `const`                          |
| Immutable, needs a stable address   | `static`                         |
| Mutable counter / flag              | `static X: AtomicU64`            |
| Mutable structured data             | `static X: Mutex<T>`             |
| Set once, later, from anywhere      | `static X: OnceLock<T>`          |
| Computed on first use, no injection | `static X: LazyLock<T>`          |
| Per-thread, no synchronization      | `thread_local!`                  |

## Atomics and `Mutex`: `const` constructors

Since `Mutex::new`, `RwLock::new` and the atomic constructors are `const fn`, the simplest mutable globals need nothing extra:

```rust
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};

static REQUESTS: AtomicU64 = AtomicU64::new(0);
static LOG: Mutex<Vec<String>> = Mutex::new(Vec::new());

fn handle(path: &str) {
    REQUESTS.fetch_add(1, Ordering::Relaxed);
    LOG.lock().unwrap().push(path.to_string());
}
```

This works because `Vec::new()` is also `const` — an empty `Vec` allocates nothing. The moment the initial value needs the heap, a config file, or the result of a function call, you fall off this path and need one of the lazy forms below.

See [Interior Mutability](./interior-mutability.md) for how `Mutex` grants `&mut T` through a `&'static` shared reference in the first place.

## `OnceLock<T>`: written once, by whoever gets there first

`OnceLock<T>` is an empty slot that can be filled exactly once, atomically, and read as `&'static T` forever after. Stable since 1.70.

```rust
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

struct Config { endpoint: String, retries: u32 }

fn init(cfg: Config) {
    // Err(cfg) if already set — value handed back
    CONFIG.set(cfg).ok();
}

fn config() -> &'static Config {
    CONFIG.get().expect("init() not called")
}
```

The API:

- `set(v) -> Result<(), T>` — fill it; on failure your value comes back so nothing leaks.
- `get() -> Option<&T>` — cheap atomic load, `None` if unset.
- `get_or_init(|| ...) -> &T` — fill it if empty, otherwise return what's there. Exactly one closure across all threads wins; the losers block until it finishes, then see the winner's value.

Use `OnceLock` when the value is **injected** — parsed from argv, read from the environment, handed over by `main`. The `expect` in `config()` is the price: initialization order is now a runtime invariant instead of a compile-time one.

`OnceCell<T>` is the same thing without the synchronization — `!Sync`, so it can't be a `static`, only a struct field in single-threaded code.

## `LazyLock<T>`: computed on first touch

When the value is derivable without outside input, `LazyLock<T>` bundles the `OnceLock` with its initializer so callers never see the uninitialized case. Stable since 1.80.

```rust
use std::collections::HashMap;
use std::sync::LazyLock;

static KEYWORDS: LazyLock<HashMap<&str, u8>> = LazyLock::new(|| {
    [("fn", 0), ("let", 1), ("mut", 2)].into_iter().collect()
});

fn is_keyword(s: &str) -> bool {
    // Deref — first touch runs the closure
    KEYWORDS.contains_key(s)
}
```

It `Deref`s to `T`, so it reads like a plain value. The initializer runs once, on the first dereference, on whichever thread got there first; everyone else blocks until it returns.

This is what the `lazy_static!` and `once_cell::sync::Lazy` crates existed for. New code shouldn't need either.

`LazyCell<T>` is the `!Sync` counterpart, for lazy struct fields rather than statics.

## `thread_local!`: one copy per thread

If the state is genuinely per-thread — a scratch buffer, an RNG, a call-depth counter — sidestep synchronization entirely. Each thread gets its own instance, so the type needs no `Sync`, which means plain `Cell`/`RefCell` work.

```rust
use std::cell::Cell;

thread_local! {
    static DEPTH: Cell<u32> = const { Cell::new(0) };
}

fn trace<R>(f: impl FnOnce() -> R) -> R {
    DEPTH.set(DEPTH.get() + 1);
    let out = f();
    DEPTH.set(DEPTH.get() - 1);
    out
}
```

The `const { ... }` block is worth using whenever the initializer is const: it lets the compiler skip the lazy-initialization check on every access, and skip registering a destructor.

Access goes through `with(|v| ...)` in general; `Cell`-typed keys get the shorthand `get`/`set` used above. Note that you cannot return a reference out of `with` — the closure body is the entire lifetime you get.

## `static mut` — don't

```rust
// taking a reference to this is denied since 2024
static mut COUNTER: u64 = 0;
```

Every access is `unsafe` and it is trivially UB under threads. As of the 2024 edition, `static_mut_refs` is a deny-by-default lint, so even `&COUNTER` is rejected. An `AtomicU64` is the same speed for scalars, and `Mutex`/`OnceLock` cover the rest. There is no case in safe-adjacent code where `static mut` is the answer.

## Gotchas

**Statics are never dropped.** The program exits and their destructors do not run. A `static LazyLock<File>` will not flush; a `static Mutex<Connection>` will not close. If cleanup matters, do it explicitly before returning from `main`.

**Thread-local destructors are almost-always.** They run on thread exit, but not for the main thread on every platform, and not for a thread killed by process exit. Same rule: don't put "must run" cleanup there.

**Recursive initialization deadlocks.** If a `LazyLock`/`OnceLock` initializer transitively touches the same static, the thread blocks on a lock it already holds. Keep initializers self-contained — no calls into subsystems that might read your global.

**A panicking initializer poisons the slot.** `LazyLock` propagates the panic, and every later access panics too. Initializers that can fail should store a `Result` rather than `unwrap` inside the closure.

**Globals break test isolation.** `cargo test` runs tests in parallel threads of one process, so all of them share your `OnceLock`. A test that calls `set` conflicts with the second test that does, and ordering is nondeterministic. Take the global as a parameter in the code under test and let `main` be the only place that reads the static.

**`get_or_init` isn't free after the first call.** It's an atomic acquire load, not a plain read — cheap, but not zero. Hoist it out of a hot loop rather than calling it per-iteration.

## Picking one

1. Value known at compile time → `const`.
2. Single counter or flag → `static X: AtomicXxx`.
3. Structured, mutable, `const`-constructible → `static X: Mutex<T>`.
4. Computed on demand from nothing external → `static X: LazyLock<T>`.
5. Supplied by `main` at startup → `static X: OnceLock<T>`.
6. Not actually shared between threads → `thread_local!`.

And the rung above all of these: pass the thing as an argument. A global is a hidden parameter that every future caller inherits, and it is the one design decision you can't unmake later without touching every call site.
