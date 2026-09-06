# Ordering Threads

Three threads $A$, $B$, $C$ each call one method on a shared `Foo` — `first`, `second`, `third` respectively — but the scheduler runs them in any order. The job is to enforce that `print_first()` happens-before `print_second()`, which happens-before `print_third()`, using only `std`.

Skeleton (each method signature is fixed; only the body and `Foo`'s fields are open):

```rust
struct Foo { /* state */ }

impl Foo {
    fn new() -> Self { /* ... */ }

    fn first<F: FnOnce()>(&self, print_first: F)   { /* setup, print, signal */ }
    fn second<F: FnOnce()>(&self, print_second: F) { /* wait, print, signal */ }
    fn third<F: FnOnce()>(&self, print_third: F)   { /* wait, print */ }
}
```

`Foo` must be `Sync` (it's shared across threads via `Arc`), so any mutable state needs an interior-mutability wrapper. See [Interior Mutability](./interior-mutability.md) for the underlying rules.

Below are four `std`-only solutions, in roughly increasing order of how much rope you give yourself.

## Mutex + Condvar

The textbook monitor pattern. A step counter under a `Mutex`, a `Condvar` to park waiters until it advances.

```rust
use std::sync::{Condvar, Mutex};

struct Foo {
    step: Mutex<u32>,
    cv: Condvar,
}

impl Foo {
    fn new() -> Self {
        Foo { step: Mutex::new(0), cv: Condvar::new() }
    }

    fn first<F: FnOnce()>(&self, print_first: F) {
        let mut s = self.step.lock().unwrap();
        print_first();
        *s = 1;
        self.cv.notify_all();
    }

    fn second<F: FnOnce()>(&self, print_second: F) {
        let mut s = self.step.lock().unwrap();
        s = self.cv.wait_while(s, |s| *s < 1).unwrap();
        print_second();
        *s = 2;
        self.cv.notify_all();
    }

    fn third<F: FnOnce()>(&self, print_third: F) {
        let s = self.step.lock().unwrap();
        let _unused = self.cv.wait_while(s, |s| *s < 2).unwrap();
        print_third();
    }
}
```

`wait_while` releases the lock atomically with parking and reacquires it before returning — that atomicity is what prevents the lost-wakeup bug. `notify_all` is safe with at most two waiters; `notify_one` works too because `wait_while` re-checks the predicate on spurious wakeup.

> [!NOTE]
>
> **Why not just a Mutex?** A Mutex only enforces mutual exclusion — it has no API to wait on the *contents* reaching a value. Without a Condvar, `second` would have to busy-loop:
>
> ```rust
> loop {
>     let s = self.step.lock().unwrap();
>     if *s >= 1 { break; }
>     drop(s); // release so the writer can take the lock
> }
> ```
>
> That burns CPU and thrashes the lock on every iteration. Inserting a `thread::sleep` between attempts trades CPU for arbitrary wakeup latency — better, but still polling.
>
> Condvar supplies the missing primitive: **park the calling thread until `notify_*` fires**, atomically with releasing the mutex. Without that atomicity, a `notify_all` landing between "release lock" and "park" would wake nobody — the classic lost-wakeup. The Mutex stays in the picture because the predicate read and the state write must happen under one lock; otherwise a notification can slip past a waiter who's mid-check and about to park.

## Channels (`mpsc`)

Each happens-before edge becomes a one-shot send/recv. No shared counter — just a signal per edge.

```rust
use std::sync::{Mutex, mpsc::{channel, Receiver, Sender}};

struct Foo {
    tx_a: Sender<()>,
    rx_a: Mutex<Receiver<()>>,
    tx_b: Sender<()>,
    rx_b: Mutex<Receiver<()>>,
}

impl Foo {
    fn new() -> Self {
        let (tx_a, rx_a) = channel();
        let (tx_b, rx_b) = channel();
        Foo { tx_a, rx_a: Mutex::new(rx_a), tx_b, rx_b: Mutex::new(rx_b) }
    }

    fn first<F: FnOnce()>(&self, print_first: F) {
        print_first();
        self.tx_a.send(()).unwrap();
    }

    fn second<F: FnOnce()>(&self, print_second: F) {
        self.rx_a.lock().unwrap().recv().unwrap();
        print_second();
        self.tx_b.send(()).unwrap();
    }

    fn third<F: FnOnce()>(&self, print_third: F) {
        self.rx_b.lock().unwrap().recv().unwrap();
        print_third();
    }
}
```

`Receiver<T>` is `Send` but not `Sync`, so sharing it through `&self` needs a `Mutex<Receiver<_>>`. The mutex is uncontended — only one thread ever calls each method — so it costs roughly an atomic CAS. This style fits when the problem reads as "wait for an event" more than "guard shared state".

## `Once` + `wait`

`Once` was designed for one-shot lazy initialization, but `Once::wait` (stable since Rust 1.78) lets a thread block until *some other* thread's `call_once` completes, without trying to be the initializer itself. One `Once` per ordering edge gives the most compact solution of the lot.

```rust
use std::sync::Once;

struct Foo {
    first_done: Once,
    second_done: Once,
}

impl Foo {
    fn new() -> Self {
        Foo { first_done: Once::new(), second_done: Once::new() }
    }

    fn first<F: FnOnce()>(&self, print_first: F) {
        self.first_done.call_once(print_first);
    }

    fn second<F: FnOnce()>(&self, print_second: F) {
        self.first_done.wait();
        self.second_done.call_once(print_second);
    }

    fn third<F: FnOnce()>(&self, print_third: F) {
        self.second_done.wait();
        print_third();
    }
}
```

`Once` documents a happens-before relation between the closure passed to `call_once` and the return of any other `wait` or `call_once` on the same instance, so the effects of `print_first()` are visible to `second` by the time `wait` returns.

The catch is discipline: **only the signaling thread calls `call_once`**, **only waiters call `wait`**. If a waiter races ahead and calls `call_once` instead, *it* becomes the initializer — its closure runs, the Once is marked complete, and the signaler's later `call_once` is a silent no-op that drops `print_first()` entirely. The compiler can't enforce the split; you can. Prefer Mutex+Condvar if the cost of being wrong is high.

## Atomic + Spin

For sub-millisecond waits, busy-spinning on an `AtomicU32` skips the kernel entirely.

```rust
use std::hint;
use std::sync::atomic::{AtomicU32, Ordering};

struct Foo { step: AtomicU32 }

impl Foo {
    fn new() -> Self { Foo { step: AtomicU32::new(0) } }

    fn first<F: FnOnce()>(&self, print_first: F) {
        print_first();
        self.step.store(1, Ordering::Release);
    }

    fn second<F: FnOnce()>(&self, print_second: F) {
        while self.step.load(Ordering::Acquire) < 1 { hint::spin_loop(); }
        print_second();
        self.step.store(2, Ordering::Release);
    }

    fn third<F: FnOnce()>(&self, print_third: F) {
        while self.step.load(Ordering::Acquire) < 2 { hint::spin_loop(); }
        print_third();
    }
}
```

The `Release` store synchronizes-with the matching `Acquire` load: everything sequenced before the store — including the side effects of `print_first()` — is visible to whoever observes the new value. `hint::spin_loop` is a CPU hint (e.g. `PAUSE` on x86), not a scheduler yield; it improves spin behavior on hyperthreaded cores but doesn't surrender the core.

Reach for this only when wait times are short and the thread count is low. A thread that schedules an hour after the trigger spins for an hour.

## `park` / `unpark`

For longer waits without locking, each waiter parks itself and the signaler holds its `Thread` handle to unpark it. `park`'s token semantics absorb spurious wakeups _and_ unparks that arrive before the matching `park`, which kills the most common race.

```rust
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::{self, Thread};

struct Foo {
    first_done: AtomicBool,
    second_done: AtomicBool,
    waiter_2: Mutex<Option<Thread>>,
    waiter_3: Mutex<Option<Thread>>,
}

impl Foo {
    fn new() -> Self {
        Foo {
            first_done: AtomicBool::new(false),
            second_done: AtomicBool::new(false),
            waiter_2: Mutex::new(None),
            waiter_3: Mutex::new(None),
        }
    }

    fn first<F: FnOnce()>(&self, print_first: F) {
        print_first();
        self.first_done.store(true, Ordering::Release);
        if let Some(t) = self.waiter_2.lock().unwrap().take() { t.unpark(); }
    }

    fn second<F: FnOnce()>(&self, print_second: F) {
        *self.waiter_2.lock().unwrap() = Some(thread::current());
        while !self.first_done.load(Ordering::Acquire) { thread::park(); }
        print_second();
        self.second_done.store(true, Ordering::Release);
        if let Some(t) = self.waiter_3.lock().unwrap().take() { t.unpark(); }
    }

    fn third<F: FnOnce()>(&self, print_third: F) {
        *self.waiter_3.lock().unwrap() = Some(thread::current());
        while !self.second_done.load(Ordering::Acquire) { thread::park(); }
        print_third();
    }
}
```

Two rules keep this race-free:

1. **Register the handle before checking the flag.** Otherwise the signaler can fire between your check and your registration, and you park forever.
2. **Check the flag inside a loop, not once.** `park` can return spuriously, and the token can be consumed by an unrelated `unpark`.

This is the primitive that `Condvar` is built on top of. Use it when you're building a custom synchronization type; for a one-off ordering problem, prefer the Condvar version above.

## What doesn't fit

- **`std::sync::Barrier`** is a group rendezvous: every participant blocks until $n$ have arrived, then all release together. It models a single shared phase boundary, not the asymmetric "$A$ unblocks $B$, then $B$ unblocks $C$" chain. You can hack it with two two-thread barriers, but every option above is cleaner.
- **No `std::sync::Semaphore`.** A bounded channel (`mpsc::sync_channel(k)`) gives you semaphore semantics for many problems; for a real semaphore, reach for `tokio::sync::Semaphore` or `parking_lot`.

## Picking one

| Approach        | Wait cost   | Clarity | When                                                                |
| --------------- | ----------- | ------- | ------------------------------------------------------------------- |
| Mutex + Condvar | Kernel park | High    | Default. Boring and correct.                                        |
| Channels        | Kernel park | High    | When the problem reads as "wait for event", not "guard state".      |
| `Once` + `wait` | Kernel park | High    | One-shot edges where you can guarantee one signaler per `Once`.     |
| Atomic + spin   | None (CPU)  | Medium  | Sub-ms waits, low thread count, no oversubscription.                |
| park / unpark   | Kernel park | Low     | Building a new synchronization primitive — not consuming one.       |

For the LeetCode-style ordering problem, Mutex+Condvar or channels are the production-grade answers. `Once`+`wait` is the most compact when the edges are truly one-shot. The remaining two are mainly useful for understanding what the higher-level primitives are doing underneath.
