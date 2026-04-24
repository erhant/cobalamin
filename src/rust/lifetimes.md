# Lifetimes

A lifetime is a **compile-time label** on a reference indicating how long the borrow is valid. They are not runtime values — they carry no code, take no space, exist only during borrow-checking.

The borrow checker's job: for every reference, prove it's not used after the thing it points at has been dropped. Lifetime annotations are how you tell the compiler the relationships it cannot infer on its own.

## Why they exist

Given only signatures, the compiler has to choose *conservatively*. Consider:

```rust
fn longest(a: &str, b: &str) -> &str {
    if a.len() >= b.len() { a } else { b }
}
```

Which input's lifetime does the return share? Without annotations, it's ambiguous, and the caller cannot reason about how long the returned reference is valid. The fix:

```rust
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str { /* ... */ }
```

Read `'a` as "some lifetime I'll call 'a'." The signature says: *the return lives at least as long as the shorter of the two inputs*. The caller is now free to use the result for that duration and no longer.

`'a` is introduced in the generic list `<'a>` exactly like a type parameter. It's monomorphized away — at runtime, there is no `'a`.

## Elision rules

You rarely write lifetimes. The compiler fills them in using three rules:

1. Each elided input reference gets its **own** lifetime: `fn f(x: &T, y: &U)` → `fn f<'a, 'b>(x: &'a T, y: &'b U)`.
2. If there is exactly **one input lifetime**, it's assigned to all elided output lifetimes.
3. If one of the inputs is `&self` or `&mut self`, the lifetime of `self` is assigned to all elided output lifetimes.

So these compile without annotations:

```rust
fn first(s: &str) -> &str { &s[..1] }        // rule 2
fn field(&self) -> &Field { &self.field }    // rule 3
```

This doesn't — two inputs, no `self`, so rule 2 can't fire:

```rust
// fn longest(a: &str, b: &str) -> &str  // error: missing lifetime
```

Elision is a **syntactic shortcut**, not inference. The rules cover the common cases exactly; when they don't apply, you annotate explicitly.

## Lifetimes in structs

A struct that stores a reference must declare how long that reference has to live:

```rust
struct Excerpt<'a> {
    part: &'a str,
}
```

Now `Excerpt<'a>` is only valid as long as `'a` is. Any function producing one annotates accordingly. This is how the borrow checker tracks that a struct can't outlive its borrowed data.

A struct with lifetime parameters can't be placed into a `static` or stored for longer than the borrow — if that's needed, store an owned `String` instead.

## `'static`

`'static` means "lives for the entire program." Two common sources:

```rust
let s: &'static str = "hello";       // string literals are baked into the binary
let b: &'static [u8] = &[1, 2, 3];    // likewise for const/static items
```

`T: 'static` as a bound means something subtly different: "the type `T` contains no references with a lifetime shorter than `'static`" — i.e., either owned data, or only `'static` references. Owned `String`, `Vec<u8>`, `i32` all satisfy `T: 'static` because they contain no borrowed data. `&'a str` does not (unless `'a = 'static`).

You see `T: 'static` on thread spawns, `Box<dyn Any>`, most channel payloads — anywhere a value might outlive the current stack frame. It's not "lives forever", it's "is free to live as long as needed."

## Multiple lifetime parameters

When inputs have independent lifetimes and the output ties to a specific one, name them:

```rust
fn first_word<'a, 'b>(text: &'a str, _sep: &'b str) -> &'a str {
    text.split_whitespace().next().unwrap_or("")
}
```

`'b` is unused in the output, so the compiler can choose it freely. This is the general case: annotate only the relationships that matter.

You can also constrain one lifetime to outlive another with `'a: 'b` ("`'a` outlives `'b`"):

```rust
fn choose<'a, 'b: 'a>(x: &'a i32, y: &'b i32) -> &'a i32 {
    if *x > 0 { x } else { y }  // y: &'b can be shortened to &'a since 'b: 'a
}
```

## Variance, briefly

Lifetimes are subtyped: if `'long: 'short`, then `&'long T` is usable where `&'short T` is expected. The compiler automatically *shortens* lifetimes as needed (covariance over `&T`). This is why you can pass a `&'static str` into a function expecting `&'a str`.

`&mut T` is *invariant* in `T`. That's why you can't treat a `&mut &'long str` as `&mut &'short str` — the borrow checker won't let you, because through the `&mut` you could write a shorter-lifetime reference back and violate the longer borrow's contract. You don't need to derive these rules from scratch; just know that subtyping exists and `&mut` is stricter than `&`.

## Common gotchas

**Returning a reference to a local.** A function can't return `&T` to data it owns — the owner drops at the end of the call, and the reference would dangle:

```rust
fn bad() -> &String {
    let s = String::from("oops");
    &s  // error: `s` does not live long enough
}
```

Return `String` by value, or take a reference parameter and return a reference tied to it.

**Over-annotating.** If elision gives the right answer, don't fight it. Lifetime salt-and-pepper `fn f<'a>(x: &'a T) -> &'a T` is noise compared to `fn f(x: &T) -> &T`.

**Confusing `'static` with "owned".** `String: 'static` is true because `String` owns its bytes, not because the string literal inside it is. The bound says nothing about immutability or storage location, only about borrow relationships.

**Trying to store a short-lived reference in a long-lived container.** If `Excerpt<'a>` needs to go into a `Vec<Excerpt<'static>>`, the `'a` must already be `'static`. Usually the fix is to store owned data (`String`) in the long-lived container, or scope the container to match the borrow.

## Summary

Lifetimes are the compiler's way of checking that "this reference is valid whenever it's used." You annotate them when:

- Multiple input references could relate to the output in more than one way.
- A struct holds a reference.
- A bound like `T: 'static` or `'a: 'b` is needed to express a required outlives-relationship.

And you skip annotating them when elision already says the right thing — which is most of the time.
