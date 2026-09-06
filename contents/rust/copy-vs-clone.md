# Copy vs. Clone

Both traits duplicate a value, but they sit at very different layers.

- **`Clone`** is an explicit, user-defined duplication. You call `.clone()` and the trait's code runs — arbitrarily expensive, may allocate, may do I/O.
- **`Copy`** is an implicit, bitwise duplication. Assignment and pass-by-value _copy_ the bytes instead of _moving_ the value. No method runs.

`Copy: Clone` — `Copy` is a supertrait of `Clone`. Every `Copy` type is also `Clone`, and `clone()` on a `Copy` type is just the bitwise copy. The reverse isn't true: `String` is `Clone` but not `Copy`.

## The move/copy distinction

By default, Rust values _move_ on assignment:

```rust
let s = String::from("hi");
let t = s;
// println!("{s}");  // error: value moved
```

For `Copy` types, the compiler quietly duplicates instead:

```rust
let x: i32 = 5;
let y = x;
// fine — x was copied, not moved
println!("{x}");
```

There is no `.copy()` call. `Copy` changes what `let y = x;` _means_ at the language level.

## What `Copy` requires

A type can be `Copy` only if:

1. **Every field is `Copy`.** `Copy` is a deep, structural property. One non-`Copy` field poisons the whole struct.
2. **The type does not implement `Drop`.** `Copy` and `Drop` are mutually exclusive — the compiler rejects the combination.

The second rule is the important one. If a type had both, a bitwise copy would duplicate whatever resource `Drop` is meant to release, and both copies would then run destructors on the same resource — double-free territory.

```rust
struct FileHandle(i32);

impl Drop for FileHandle {
    fn drop(&mut self) { /* close fd */ }
}

// impl Copy for FileHandle {}  // error[E0184]: the trait `Copy` cannot
//                              // be implemented for a type with a destructor
```

That's why `String`, `Vec<T>`, `Box<T>`, `File`, `Mutex<T>` — anything owning a heap allocation or OS resource — cannot be `Copy`. Their `Drop` impl is what frees the resource.

Conversely, primitives (`i32`, `f64`, `bool`, `char`), shared references `&T`, raw pointers, function pointers, and tuples/arrays of `Copy` types are all `Copy`.

`&mut T` is **not** `Copy` — if it were, you could duplicate a unique borrow and have two of them at once, violating the aliasing rule.

## Deriving

```rust
#[derive(Copy, Clone)]
struct Point { x: f64, y: f64 }
```

`#[derive(Copy)]` is valid only if every field is already `Copy`. `#[derive(Clone)]` generates a field-by-field clone. You almost always derive both together — there is no reason to have `Copy` without `Clone`.

Generic types derive with a bound: `#[derive(Copy, Clone)] struct Pair<T>(T, T);` generates impls that require `T: Copy` / `T: Clone`. So `Pair<String>` is `Clone` but not `Copy`.

## When to write `Clone` by hand

`Clone` is a normal trait — you can implement it manually when the derived version is wrong:

```rust
struct Cache { data: Vec<u8>, /* handle to disk */ }

impl Clone for Cache {
    fn clone(&self) -> Self {
        // maybe re-open the handle rather than copy it
        Cache { data: self.data.clone(), /* ... */ }
    }
}
```

You do **not** write `impl Copy` manually in practice — the behavior is fixed (bitwise), so deriving it is the only meaningful form.

## Performance intuition

"`Copy` is cheap, `Clone` might not be" is the usual heuristic, but it's about _semantics_, not size. A `[u8; 10_000]` is `Copy` and cloning it memcpys 10 KB every pass-by-value. A `Rc<T>` is `Clone` (bumps a refcount, ~one atomic/non-atomic increment) but not `Copy`.

If you have a large `Copy` struct, passing it by value is not free — prefer `&T`. `Copy` is about whether moves are allowed to duplicate, not about whether duplication is fast.

## When to make a type `Copy`

Rough guide:

- **Yes:** small, plain-old-data, no owned resources, no invariants that would be violated by silent duplication. Coordinates, IDs, enum tags, bit flags.
- **No:** owns an allocation or handle, has a non-trivial `Drop`, represents unique ownership of something, or is large enough that silent copies would surprise readers.

Once you make a public type `Copy`, removing that is a breaking change — downstream code relies on values remaining usable after being passed around.

## Summary

|                        | `Copy`                             | `Clone`                        |
| ---------------------- | ---------------------------------- | ------------------------------ |
| Invocation             | implicit (assignment, pass-by-val) | explicit `.clone()`            |
| Cost                   | fixed: bitwise memcpy              | arbitrary, user-defined        |
| Can allocate?          | no                                 | yes                            |
| Compatible with `Drop` | no                                 | yes                            |
| Field requirement      | all fields `Copy`                  | all fields `Clone`             |
| Typical impls          | primitives, `&T`, small PODs       | `String`, `Vec<T>`, `Rc<T>`, … |

Rule of thumb: if your type owns something that needs cleaning up, it's `Clone` at most. If it's a bag of bytes with no invariants, make it `Copy` too.
