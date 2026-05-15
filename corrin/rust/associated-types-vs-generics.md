# Associated Types vs. Generics

Both let a trait talk about "some other type", but they differ in **how many of those types a given implementor can have**.

- **Generic parameter** (`trait Foo<T>`): the trait is _parameterized_. A single type can implement `Foo<A>`, `Foo<B>`, `Foo<C>` independently — one impl per `T`.
- **Associated type** (`trait Foo { type T; }`): the trait _owns_ the type. A single type implements `Foo` at most once, and that impl picks the `T`.

Mental model: generics are inputs, associated types are outputs.

## The two shapes

```rust
// generic
trait Convert<T> {
    fn convert(self) -> T;
}

// associated
trait Iter {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}
```

In `Convert<T>`, `T` is chosen by the _caller_ — it's part of the trait's name. `i32: Convert<String>` and `i32: Convert<f64>` are two unrelated trait impls.

In `Iter`, `Self::Item` is chosen by the _implementor_ and fixed for that type. `Vec<u8>` decides once that iterating yields `u8`, and there is no other choice.

## When to pick which

Use **generics** when multiple impls for the same `Self` are meaningful:

```rust
impl From<u32>    for MyNum { /* ... */ }
impl From<String> for MyNum { /* ... */ }
```

A type can be constructed `From` many other types — so `From<T>` is generic.

Use an **associated type** when the related type is uniquely determined by `Self`:

```rust
impl Iterator for Counter {
    type Item = u64;           // a Counter yields u64 and only u64
    fn next(&mut self) -> Option<u64> { /* ... */ }
}
```

A single iterator yielding both `u64` and `String` doesn't make sense, so `Iterator` owns `Item`. This is also why `Add`'s right-hand side is generic but its result is associated:

```rust
trait Add<Rhs = Self> {
    type Output;              // fixed once you pick Self + Rhs
    fn add(self, rhs: Rhs) -> Self::Output;
}
```

You may want `Vec<T> + &[T]` and `Vec<T> + Vec<T>` — different `Rhs`, so it's generic. But for a given `(Self, Rhs)`, the result type is forced — so `Output` is associated.

## Disambiguation at the call site

This is the ergonomic payoff. With a generic trait, the compiler often can't infer which impl you meant:

```rust
let x = <i32 as Convert<_>>::convert(42);  // _ = ?
// error: type annotations needed
```

With an associated type, there's nothing to annotate — picking `Self` picks everything:

```rust
let mut c = Counter::new();
let v = c.next();             // inferred as Option<u64>, no turbofish
```

Rule of thumb: if you find yourself reaching for turbofish every time you call the trait method, the type should probably be associated.

## Bounds and where-clauses

Generic parameters show up in trait bounds positionally; associated types are named with `Trait::Name` (or the `Trait<Name = ...>` sugar).

```rust
// "T can be converted into a String"
fn f<T: Convert<String>>(t: T) { /* ... */ }

// "I can iterate it and each item is a u64"
fn g<I: Iterator<Item = u64>>(it: I) { /* ... */ }
```

The `Item = u64` syntax only works because `Item` is associated. You cannot write `Convert<= String>` — for a generic parameter you simply name it positionally.

This also means you can _leave associated types unbound_:

```rust
fn sum<I: Iterator>(it: I) -> I::Item
where I::Item: std::ops::Add<Output = I::Item> + Default
{ /* ... */ }
```

The caller's `I` pins `Item` for us; the generic bound propagates it.

## Object safety note

Both kinds of trait can be made into `dyn Trait`, but with associated types you must pin every one:

```rust
fn boxed() -> Box<dyn Iterator<Item = u64>> { /* ok */ }
fn boxed() -> Box<dyn Iterator>             { /* error: Item unspecified */ }
```

Generic methods on a trait (not the trait itself being generic — that's fine) break object safety entirely, because the vtable would need one slot per monomorphization. Associated types don't have this problem since each `dyn Trait<Item = T>` is already a concrete type.

## Summary

|                        | Generic `trait Foo<T>`      | Associated `type T`             |
| ---------------------- | --------------------------- | ------------------------------- |
| Impls per `Self`       | many, one per `T`           | at most one                     |
| Chosen by              | caller (part of trait name) | implementor (fixed in the impl) |
| Inference at call site | often needs turbofish       | falls out of `Self`             |
| Bound syntax           | `T: Foo<U>`                 | `T: Foo<Name = U>` or `T::Name` |
| Good fit               | `From`, `Into`, `PartialEq` | `Iterator::Item`, `Add::Output` |

If multiple values of the related type make sense for the same `Self`, it's an input — go generic. If there's only ever one, it's an output — make it associated.
