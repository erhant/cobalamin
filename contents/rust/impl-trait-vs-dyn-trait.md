# `impl Trait` vs. `dyn Trait`

Two ways to say "some type that implements this trait." Same surface syntax, fundamentally different machinery.

- **`impl Trait`** is a _single concrete type_, hidden from the signature. The compiler monomorphizes — each call site gets its own specialized code. **Static dispatch.**
- **`dyn Trait`** is a _type-erased value_ behind a fat pointer carrying a vtable. One piece of code handles every implementor. **Dynamic dispatch.**

If you care about performance and every caller uses one known type, `impl Trait`. If you need a heterogeneous collection or plugin-style flexibility, `dyn Trait`.

## `impl Trait`: static dispatch

```rust
fn make_iter() -> impl Iterator<Item = u32> {
    (0..10).filter(|x| x % 2 == 0)
}
```

The return type is a specific, compiler-generated iterator type — a concrete composition of `Filter<Range<u32>, _>`. The caller can use any `Iterator<Item = u32>` method on the result, but cannot name the type and cannot swap in a different one.

Every call site is monomorphized: `fn take_iter<I: Iterator<Item = u32>>(i: I)` generates a separate specialized function per `I`. Inlining works, bounds checks drop out, zero indirection. The cost is **code size** and **compile time**.

Key properties:

- Sized. A function returning `impl Trait` returns a value with a known size (whatever the hidden concrete type is).
- One type per call site. You cannot write:
  ```rust
  fn choose(b: bool) -> impl Iterator<Item = u32> {
      if b { 0..10 } else { (0..10).filter(|_| true) }  // error: mismatched types
  }
  ```
  Both branches must produce the _same_ concrete type.

### Positions where `impl Trait` appears

- **Return position** (`-> impl Trait`): hide an unnameable type (closures, combinator chains).
- **Argument position** (`fn f(x: impl Trait)`): sugar for `fn f<T: Trait>(x: T)`. Same monomorphization.
- **Associated type position** and `let` bindings are also allowed, with similar semantics.

Argument-position `impl Trait` is just a generic with a cleaner syntax — the caller still chooses the type. Return-position `impl Trait` is the opposite: the _callee_ chooses, and the caller never learns which one.

## `dyn Trait`: dynamic dispatch

```rust
fn take_any(iters: Vec<Box<dyn Iterator<Item = u32>>>) { /* ... */ }
```

`dyn Trait` is an **unsized type**. You always handle it behind a pointer: `&dyn Trait`, `&mut dyn Trait`, `Box<dyn Trait>`, `Rc<dyn Trait>`. That pointer is a **fat pointer** — two machine words: a data pointer and a vtable pointer.

Every method call through `dyn Trait` indirects through the vtable: look up the function pointer, call it. One compiled copy of the generic code serves all types. The cost is a **pointer indirection per call** and no cross-call inlining.

Why you'd reach for it:

- **Heterogeneous collections:** `Vec<Box<dyn Shape>>` holds circles and squares in one container.
- **Plugin/driver dispatch:** the concrete type is chosen at runtime (config, user input).
- **Code-size-sensitive contexts:** one vtable beats N monomorphizations when N is large.

## Object safety

Not every trait can be made into `dyn Trait`. A trait is **object-safe** only if every method is callable through a vtable. The usual blockers:

- **Generic methods:** `fn foo<T>(&self, x: T)` — the vtable would need one slot per `T`, which isn't representable.
- **Methods returning `Self` by value** (other than `Sized` constructors): `fn clone(&self) -> Self` — the caller can't know `Self`'s size.
- **Methods taking `Self` by value:** same reason.
- **Associated types** without a bound in the `dyn` spelling: `dyn Iterator` is an error; `dyn Iterator<Item = u32>` is fine.
- **`Self: Sized` bounds:** methods guarded by `where Self: Sized` are excluded from the vtable, which lets the rest of the trait stay object-safe.

`Copy` and `Clone`, for instance, are not object-safe (`Clone::clone` returns `Self`). That's why `Box<dyn Clone>` doesn't compile and crates like `dyn-clone` exist.

## Size and ABI

|                      | `impl Trait`               | `dyn Trait`                     |
| -------------------- | -------------------------- | ------------------------------- |
| Dispatch             | static (direct call)       | dynamic (vtable indirection)    |
| Sized?               | yes (concrete hidden type) | no — use `&`, `Box`, `Rc`, etc. |
| Monomorphization     | yes (one copy per type)    | no (one copy, many vtables)     |
| Inlining across call | yes                        | no                              |
| Heterogeneous values | no                         | yes                             |
| Pointer layout       | thin (if any)              | fat (data + vtable)             |
| Object safety needed | no                         | yes                             |

## Picking between them

Default to `impl Trait`. It's the zero-cost option and fits the common case — you know the type statically, you just don't want to write it out.

Reach for `dyn Trait` when you actually need runtime polymorphism:

- You want to store different concrete types in one container.
- You want to swap implementations at runtime without recompiling.
- You're worried about binary bloat from deep generic chains (rare, but real for heavy combinator code).

A useful middle ground: take arguments as `impl Trait` / generics (keep the hot path static), and only erase to `dyn Trait` at the boundary where heterogeneity is actually needed.

## Small gotchas

**Returning `impl Trait` from branches.** Both arms must be the same type. If they're not, `Box<dyn Trait>` is the fix:

```rust
fn choose(b: bool) -> Box<dyn Iterator<Item = u32>> {
    if b { Box::new(0..10) } else { Box::new((0..10).filter(|_| true)) }
}
```

**`dyn Trait` in return position without a pointer.** `fn f() -> dyn Trait` is a compile error — `dyn Trait` is unsized. You need `Box<dyn Trait>` or `&dyn Trait`.

**`impl Trait` leaks auto traits.** If the hidden type is `Send`, the `impl Trait` is `Send`; if it isn't, downstream generic code breaks. `dyn Trait` requires you to spell it out: `dyn Trait + Send`.

**Trait upcasting.** Going from `Box<dyn Sub>` to `Box<dyn Super>` is now supported (stable since Rust 1.86), but older code often used explicit `as_super(&self) -> &dyn Super` methods — you'll still see the pattern in the wild.

## Summary

`impl Trait` compiles to the same code as hand-written generics — specialization, inlining, no indirection — at the cost of one function copy per concrete type. `dyn Trait` compiles to a single function driven by a vtable — heterogeneity and runtime flexibility at the cost of one pointer-indirection per call and the object-safety restriction on the trait.

Static unless you actually need dynamic.
