# Variance

Variance answers one question: if `Dog` is assignable to `Animal`, is `Box<Dog>` assignable to `Box<Animal>`? It depends on how `Box` _uses_ its type parameter.

## Subtyping

Write $A <: B$ for "$A$ is a subtype of $B$": a value of type $A$ is safe wherever a $B$ is expected. In TypeScript this is just **assignability**: `const b: B = a` compiles.

TS is **structural**: $A <: B$ when $A$ has at least the members of $B$, with compatible types. No `extends` needed.

```ts
type Animal = { name: string };
type Dog = { name: string; bark(): void };
type Cat = { name: string; meow(): void };

// fine: Dog has everything Animal has
const a: Animal = { name: "rex", bark() {} } as Dog;
```

The examples below reuse `Animal`, `Dog`, `Cat`.

## The four variances

Take a type constructor $F$ (a generic: `F<T>`) and assume $A <: B$.

| Variance      | Rule                                    | Intuition                    |
| ------------- | --------------------------------------- | ---------------------------- |
| Covariant     | $F\langle A\rangle <: F\langle B\rangle$ | producers / outputs          |
| Contravariant | $F\langle B\rangle <: F\langle A\rangle$ | consumers / inputs           |
| Invariant     | neither                                 | read **and** write           |
| Bivariant     | both                                    | unsound; TS legacy shortcut  |

- A producer of `Dog` is a fine producer of `Animal`: whoever reads gets an animal.
- A consumer of `Animal` is a fine consumer of `Dog`: it can handle any animal, dogs included.
- Something you both read from and write to must match exactly.

## Functions

Parameters are contravariant, the return type is covariant:

$$
A' <: A,\quad B <: B' \;\Rightarrow\; (A \to B) <: (A' \to B')
$$

Accept more, return less, and you can stand in for the original.

```ts
type Handler = (a: Animal) => void;

const onDog = (d: Dog) => d.bark();
// error under strictFunctionTypes: onDog can't handle a Cat
const h: Handler = onDog;
```

### The method-shorthand hole

`strictFunctionTypes` (on with `strict`) only checks **function-type properties**. Parameters of **method shorthand** stay bivariant:

```ts
// property syntax: params checked contravariantly
type PropH = { handle: (a: Animal) => void };
// method syntax: params bivariant
type MethH = { handle(a: Animal): void };

// error
const p: PropH = { handle: onDog };
// compiles
const m: MethH = { handle: onDog };
// runtime crash: cat has no bark
m.handle({ name: "tom", meow() {} } as Cat);
```

The exemption exists so that built-ins declared with methods (`Array<T>`, DOM types) keep their expected covariance.

> [!TIP]
> In your own types, write callbacks as properties (`cb: (x: T) => void`), not methods (`cb(x: T): void`), to get the strict check.

## Arrays

`T[]` is treated as covariant, which is **unsound**: arrays are read/write and should be invariant.

```ts
const dogs: Dog[] = [];
// allowed: Dog[] <: Animal[]
const animals: Animal[] = dogs;
animals.push({ name: "tom", meow() {} } as Cat);
// typed Dog, actually a Cat: crash
dogs[0].bark();
```

The same hole applies to mutable object properties: `{ pet: Dog }` is assignable to `{ pet: Animal }`, then you can write a `Cat` into `pet`.

The honest covariant version drops the writes:

```ts
// fine: no push, no index assignment
const ro: readonly Animal[] = dogs;
```

Take `readonly T[]` (or `ReadonlyArray<T>`) in parameters you don't mutate; it also lets callers pass narrower arrays without the hole.

## Variance annotations

Since TS 4.7 you can declare variance on type parameters: `out` (covariant), `in` (contravariant), `in out` (invariant).

```ts
interface Producer<out T> { get: () => T }
interface Consumer<in T> { accept: (x: T) => void }
interface Cell<in out T> { get: () => T; set: (x: T) => void }

// ok
const p: Producer<Animal> = {} as Producer<Dog>;
// ok
const c: Consumer<Dog> = {} as Consumer<Animal>;
// error: Cell is invariant
const x: Cell<Animal> = {} as Cell<Dog>;
```

What they're for:

- **Checking**: TS verifies the annotation against the structure. `interface Bad<out T> { accept: (x: T) => void }` errors.
- **Documentation**: the intent sits in the signature.
- **Performance**: TS normally infers variance by probing the structure; an annotation skips that, which helps with large or recursive types.

> [!CAUTION]
> The check uses the same rules as assignability, so the holes leak through: `<out T>` with `T` in a method-shorthand parameter, or in a mutable property, is accepted. Annotations can't make an unsound structure sound. They also only work on type parameters of interfaces, classes and object/function type aliases.

## Type theory corner

Types ordered by $<:$ form a lattice. A conditional type is a subtyping check you can run in the compiler:

```typescript
type Sub<A, B> = [A] extends [B] ? true : false;

// true: Dog <: Animal, but not the other way round
type T0 = Sub<Dog, Animal>;
// false
type T1 = Sub<Animal, Dog>;
```

**Top** `unknown`: every type is assignable to it, $\forall A.\ A <: \top$. Nothing is known about its values, so you must narrow before using one.

```typescript
const anything: unknown = 42;
// error: 'anything' is of type 'unknown'
anything.toFixed();
if (typeof anything === "number") anything.toFixed();
```

**Bottom** `never`: assignable to every type, $\forall A.\ \bot <: A$. It has no values, so "every `never` is a `string`" is vacuously true. A function that never returns has type `never`, which is why it can stand in anywhere:

```typescript
function fail(msg: string): never {
  throw new Error(msg);
}

// fine: never <: number
const port: number = process.env.PORT ? +process.env.PORT : fail("no port");
```

**Join** (least upper bound) is the union, $A <: A \cup B$. **Meet** (greatest lower bound) is the intersection, $A \cap B <: A$. Top and bottom are the identities you'd expect:

```typescript
// all true
type J = Sub<Dog, Dog | Cat>;
type M = Sub<Dog & Cat, Dog>;

// Dog: never is the identity for |
type U = Dog | never;
// Dog: unknown is the identity for &
type I = Dog & unknown;
// never: no value is both a string and a number
type E = string & number;
```

**Contravariance flips the order.** Calling a union of functions means the argument must suit every member, so the parameter types intersect:

```typescript
type Speak = ((d: Dog) => void) | ((c: Cat) => void);
declare const speak: Speak;

// error: Dog alone is not a Cat
speak({ name: "rex", bark() {} });
// fine: Dog & Cat suits both
speak({ name: "?", bark() {}, meow() {} });
```

Inference shows the same flip: `infer` in a covariant position gives a union, in a contravariant one an intersection. This is the trick behind the well-known `UnionToIntersection`:

```typescript
type UnionToIntersection<U> =
  // distribute U into one function per member, then infer from the parameter (contravariant)
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

// Dog & Cat
type DC = UnionToIntersection<Dog | Cat>;
```

**Liskov substitution**: if $A <: B$, any property provable of $B$-values must hold for $A$-values. Variance is that principle applied to type constructors. In TS it is enforced on overrides, which must be assignable to the base member:

```typescript
class Shelter {
  adopt(): Animal {
    return { name: "?" };
  }
}

// fine: a narrower return type (covariant)
class DogShelter extends Shelter {
  adopt(): Dog {
    return { name: "rex", bark() {} };
  }
}

// error: Animal is missing bark()
class BadShelter extends DogShelter {
  adopt(): Animal {
    return { name: "?" };
  }
}
```

## Where it bites

- **Event handler callbacks**: `addEventListener("click", (e: MouseEvent) => ...)` works because the DOM overloads map event names to precise types, not because handlers are covariant. Passing `(e: MouseEvent) => void` where `(e: Event) => void` is expected is an error.
- **Generic containers**: a mutable `Box<T> { value: T }` is accepted as covariant. If you write to it, prefer exposing a `readonly` view or annotate `in out`.
- **`Promise<T>`**: covariant (read-only producer), so `Promise<Dog>` is a `Promise<Animal>`. Safe.
- **`Map<K, V>`**: should be invariant in both, but its methods are method-shorthand, so `Map<Dog, number>` is assignable to `Map<Animal, number>` and `Map<string, Dog>` to `Map<string, Animal>`. Then `set` accepts the wider type. Use `ReadonlyMap` for the covariant case.
