# Interior Mutability

Rust's core borrow rule: at any moment, a value has **either** many `&T` readers **or** exactly one `&mut T` writer — never both. Interior mutability is the controlled escape hatch that lets you mutate through a `&T` by moving the check from _compile time_ to _run time_ (or into hardware atomics).

The primitive underneath is `UnsafeCell<T>`. It's the only legal way to mutate through a shared reference — the compiler specifically exempts it from `&T`'s no-mutation rule. Every safe interior-mutability type wraps an `UnsafeCell<T>` and adds a safety discipline on top:

| Type         | Checks performed     | Threading       | Borrow granted              |
| ------------ | -------------------- | --------------- | --------------------------- |
| `Cell<T>`    | none (no borrowing)  | single-threaded | none — get/set only         |
| `RefCell<T>` | runtime borrow count | single-threaded | `&T` / `&mut T` dynamically |
| `Mutex<T>`   | OS lock              | multi-threaded  | `&mut T` via guard          |
| `RwLock<T>`  | OS lock (rw)         | multi-threaded  | `&T` (many) or `&mut T`     |
| `AtomicU32`… | hardware atomics     | multi-threaded  | none — load/store only      |

Pick the weakest tool that does the job. Every row down adds overhead or failure modes.

## `Cell<T>`: no borrowing, just get/set

`Cell<T>` never hands out a reference to its contents. You read by _copying out_, and write by _replacing_. No borrow checking needed because there are no borrows.

```rust
use std::cell::Cell;

struct Counter { n: Cell<u32> }

impl Counter {
    fn bump(&self) {                    // note: &self, not &mut self
        self.n.set(self.n.get() + 1);
    }
}
```

Constraints:

- `Cell::get` requires `T: Copy`.
- For non-`Copy`, use `take` (leaves `Default::default()` behind) or `replace`.
- Single-threaded only (`!Sync`).

Use it for small `Copy` state — counters, flags, cached lookups — where you want `&self` methods to mutate.

## `RefCell<T>`: runtime borrow checking

`RefCell<T>` hands out actual references, but **counts** them at runtime. If the rules are violated, it panics instead of being rejected by the compiler.

```rust
use std::cell::RefCell;

let cell = RefCell::new(vec![1, 2, 3]);
let r1 = cell.borrow();                  // Ref<Vec<i32>>
let r2 = cell.borrow();                  // ok: many readers
// let w = cell.borrow_mut();            // panic: already borrowed
drop((r1, r2));
let mut w = cell.borrow_mut();           // ok now
w.push(4);
```

The reference-counting bookkeeping lives in the `RefCell` header (two counters, roughly). `borrow` returns `Ref<'_, T>`, `borrow_mut` returns `RefMut<'_, T>`; the counters are decremented on drop.

Use it when the _aliasing pattern is dynamic_ — e.g., a tree where a node temporarily hands a mutable view to a visitor, or a cache mutated from within a traversal. Reach for `try_borrow` / `try_borrow_mut` when the panic would otherwise be an assertion of program correctness you aren't sure about.

Still single-threaded (`!Sync`).

## `Mutex<T>` and `RwLock<T>`: threaded versions

Cross-thread interior mutability needs synchronization. `Mutex<T>` gives `&mut T` access under a lock; `RwLock<T>` gives many `&T` readers _or_ one `&mut T` writer. Both implement `Sync` (provided `T: Send`).

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let shared = Arc::new(Mutex::new(0u64));
let mut handles = vec![];
for _ in 0..8 {
    let s = Arc::clone(&shared);
    handles.push(thread::spawn(move || {
        let mut n = s.lock().unwrap();
        *n += 1;
    }));
}
for h in handles { h.join().unwrap(); }
```

`lock()` returns a `Result<MutexGuard<T>, PoisonError<...>>` — `Err` means another thread panicked while holding the lock, leaving the data in a possibly-inconsistent state. Handle or `unwrap`.

Use `RwLock` only when reads dominate writes by a lot — the bookkeeping is heavier than `Mutex`, and writer starvation can surprise you. Default to `Mutex`.

## Atomics: interior mutability without a lock

`AtomicU32`, `AtomicBool`, etc. are the fastest form — they mutate through `&self` using CPU atomic instructions, no OS involvement. `Ordering::Relaxed` for counters, `Acquire`/`Release` for publishing data. Small payloads only (no general `AtomicT<T>` for arbitrary `T` in std).

## `Rc` and `Arc`: ownership, not mutability

Smart pointers that allow _multiple owners_ of the same value. They don't give you mutation on their own — you combine them with a cell/lock if you need both:

- `Rc<RefCell<T>>` — single-threaded, many owners, mutable contents.
- `Arc<Mutex<T>>` — multi-threaded, many owners, mutable contents.

`Rc` and `Arc` only lend out `&T`. The interior-mutability wrapper is what upgrades that to something mutable.

## Sync vs. Send, briefly

- `T: Send` — safe to move to another thread.
- `T: Sync` — `&T` is safe to share across threads (equivalently, `T: Sync` iff `&T: Send`).

`Cell<T>` and `RefCell<T>` are `!Sync` — they're unsound if `&cell` crosses threads. `Mutex<T>: Sync` (when `T: Send`) — that's precisely what makes it useful for multi-threaded sharing.

## Picking the right tool

1. Only read and write small `Copy` values? `Cell<T>`.
2. Need real `&T` / `&mut T` but the pattern is dynamic? `RefCell<T>`.
3. Cross-thread, simple write-through? `Mutex<T>`.
4. Cross-thread, mostly-read? `RwLock<T>` — but benchmark vs. `Mutex`.
5. Cross-thread, single integer/flag? `AtomicXxx`.
6. Need shared ownership on top of any of the above? Wrap in `Rc` (ST) or `Arc` (MT).

## Gotchas

**`RefCell` panics are bugs, not errors.** They indicate the aliasing rule was violated — fix the code, don't catch the panic.

**Holding a `RefCell` borrow across `.await`.** `Ref`/`RefMut` aren't `Send` and they prevent the future from being scheduled on other threads. Drop the borrow before awaiting.

**Holding a `Mutex` guard across `.await`.** Same problem, plus can deadlock if the same task tries to lock again. Use `tokio::sync::Mutex` if you truly need an async lock; otherwise scope the guard tightly.

**`Rc<RefCell<T>>` cycles leak.** `Rc` is non-tracing; a cycle of `Rc`s never reaches zero. Break cycles with `Weak<T>`.

**Choosing `RwLock` "just in case".** `Mutex` is simpler, often faster, and avoids writer starvation. Default there unless you've measured that reads dominate.

## Summary

Interior mutability = mutate through `&T` by paying a runtime or hardware cost.

The progression `Cell` → `RefCell` → `Mutex` / `RwLock` → `Atomic` trades features for safety checks and overhead:

- `Cell` has the fewest features (no borrows) but zero checking overhead.
- `RefCell` adds real borrows at the cost of a runtime panic risk.
- `Mutex`/`RwLock` extend that to threads at the cost of a syscall.
- Atomics skip locks entirely but only work on small, fixed-layout values.

Shared ownership (`Rc`, `Arc`) is orthogonal — combine as needed.
