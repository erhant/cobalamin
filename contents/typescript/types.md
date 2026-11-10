# Built-in Types

Quick reference for TypeScript's type system, assuming `strict: true`. Types are sets of values: `|` is union, `&` is intersection, `never` is the empty set, `unknown` is everything.

## Primitives and literals

| Type            | Values                       | Notes                                                  |
| --------------- | ---------------------------- | ------------------------------------------------------ |
| `string`        | `"a"`, `` `x${y}` ``         |                                                        |
| `number`        | `1`, `0.5`, `NaN`, `Infinity`| IEEE-754 double                                        |
| `bigint`        | `1n`                         | target ≥ ES2020; doesn't mix with `number` in arithmetic |
| `boolean`       | `true`, `false`              | literally `true \| false`                              |
| `symbol`        | `Symbol()`                   | any symbol                                             |
| `unique symbol` | one specific symbol          | only on `const` / `readonly static` declarations       |
| `null`          | `null`                       | separate type under `strictNullChecks`                 |
| `undefined`     | `undefined`                  | separate type under `strictNullChecks`                 |

Literal types narrow a primitive to a single value. `const` infers literals, `let` widens.

```ts
// "GET"
const m = "GET";
// string
let n = "GET";
type Dir = "up" | "down" | 1 | true;

// usable as a property key with a distinct type
const KEY: unique symbol = Symbol("key");
type Tagged = { [KEY]: true };
```

Without `strictNullChecks`, `null` / `undefined` are assignable to everything. With it, you must spell out `T | null` and narrow before use. Optional properties (`x?: T`) read as `T | undefined`; `exactOptionalPropertyTypes` additionally forbids writing an explicit `undefined` to them.

## Top, bottom, and the object trio

| Type      | Assign _to_ it      | Use it as                 | Meaning                                         |
| --------- | ------------------- | ------------------------- | ----------------------------------------------- |
| `any`     | anything            | anything                  | type checking off; spreads silently             |
| `unknown` | anything            | nothing until narrowed    | safe top type; use for untrusted input          |
| `never`   | nothing             | anything                  | empty set; unreachable code, exhaustive checks  |
| `void`    | `undefined`         | —                         | "return value is ignored"                       |
| `object`  | any non-primitive   | —                         | objects, arrays, functions                      |
| `{}`      | any non-nullish     | —                         | includes `1`, `"a"`, `true`                     |
| `Object`  | any non-nullish     | —                         | like `{}`, but checks against `Object.prototype` methods; never use |

```ts
function assertNever(x: never): never {
  throw new Error(`unhandled: ${x}`);
}

// a void-returning function type accepts functions that return something
const f: () => void = () => 42;
```

## Arrays and tuples

```ts
// equivalent
let a: number[];
let b: Array<number>;
// no push / index writes; ReadonlyArray<number> is the same
let r: readonly number[];

// fixed length and positions
type Pair = [string, number];
// optional element: length is 2 | 3
type P3 = [number, number, number?];
// named members (documentation only; affects editor hints and parameter names)
type Range = [start: number, end: number];
// rest element anywhere, at most one
type Head = [string, ...number[]];
type Tail = [...number[], string];
// variadic: spread generic tuples
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
// [1, 2, "x"]
type C = Concat<[1, 2], ["x"]>;
```

`readonly` also applies to properties (`readonly id: string`) and is shallow. Mutable arrays are assignable to readonly ones, not the other way round. `as const` makes literals deeply `readonly` with literal types: `[1, 2] as const` is `readonly [1, 2]`.

## Narrowing toolbox

| Tool                  | Example                                  | Narrows by                                     |
| --------------------- | ---------------------------------------- | ---------------------------------------------- |
| `typeof`              | `typeof x === "string"`                  | JS runtime tag (`typeof null` is `"object"`!)  |
| truthiness            | `if (x)`                                 | drops `null`/`undefined` but also `0`, `""`    |
| `===` / `!=`          | `x != null`                              | equality; `!= null` drops both nullish values  |
| `in`                  | `"swim" in pet`                          | property presence                              |
| `instanceof`          | `e instanceof Error`                     | prototype chain                                |
| discriminant          | `switch (s.kind)`                        | shared literal property on union members       |
| `is` predicate        | `(x): x is Fish => ...`                  | user-defined; trusted, not checked             |
| `asserts`             | `function assert(c: unknown): asserts c` | narrows after the call or throws               |
| `satisfies`           | `cfg satisfies Config`                   | checks against a type, keeps the inferred one  |
| `as const`            | `["a", "b"] as const`                    | freezes literals; no widening                  |
| `as`                  | `x as Foo`                               | not narrowing: an unchecked cast               |

```ts
type Shape = { kind: "circle"; r: number } | { kind: "square"; s: number };

function area(sh: Shape): number {
  switch (sh.kind) {
    case "circle":
      return Math.PI * sh.r ** 2;
    case "square":
      return sh.s ** 2;
    default:
      // compile error here if a new variant is added
      return assertNever(sh);
  }
}

// key type stays "a" | "b", values still checked against Record<string, number>
const limits = { a: 1, b: 2 } satisfies Record<string, number>;
```

## Utility types

| Type                          | Result                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| `Partial<T>`                  | all properties optional                                        |
| `Required<T>`                 | all properties required (removes `?`)                          |
| `Readonly<T>`                 | all properties `readonly` (shallow)                            |
| `Pick<T, K>`                  | only keys `K` (must be keys of `T`)                            |
| `Omit<T, K>`                  | all but `K` (`K` is _not_ checked against `keyof T`)           |
| `Record<K, V>`                | object with keys `K`, values `V`                               |
| `Exclude<U, X>`               | members of union `U` not assignable to `X`                     |
| `Extract<U, X>`               | members of union `U` assignable to `X`                         |
| `NonNullable<T>`              | `T` without `null` / `undefined`                               |
| `ReturnType<F>`               | return type of function type `F`                               |
| `Parameters<F>`               | parameter types of `F` as a tuple                              |
| `ConstructorParameters<C>`    | constructor parameter types as a tuple                         |
| `InstanceType<C>`             | type produced by `new C()`                                     |
| `ThisParameterType<F>`        | the declared `this` of `F`                                     |
| `OmitThisParameter<F>`        | `F` without its `this` parameter                               |
| `ThisType<T>`                 | marker: sets `this` inside an object literal                   |
| `Awaited<T>`                  | recursively unwraps `Promise`/thenables                        |
| `NoInfer<T>`                  | blocks inference from this position (TS 5.4+)                  |
| `Uppercase` / `Lowercase` / `Capitalize` / `Uncapitalize` | string literal case transforms     |

```ts
// T is inferred from `states` only, so "c" is rejected
function pick<T extends string>(states: T[], initial: NoInfer<T>) {}
pick(["a", "b"], "c");
```

## Type-level programming

Mapped types iterate keys; `as` remaps them, `-?` / `-readonly` strip modifiers.

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// { getName: () => string }
type G = Getters<{ name: string }>;
```

Conditional types branch on assignability; they **distribute** over unions when the checked type is a naked type parameter.

```ts
type IsString<T> = T extends string ? true : false;
// boolean (distributed: true | false)
type A = IsString<string | number>;
// wrap in a tuple to disable distribution: false
type NoDist<T> = [T] extends [string] ? true : false;
```

`infer` captures a type from inside a conditional match.

```ts
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type First<T> = T extends [infer H, ...unknown[]] ? H : never;
```

Template literal types build string types, and distribute over unions.

```ts
type Event = `on${Capitalize<"click" | "focus">}`;
// "onClick" | "onFocus"
```

## Gotchas

- **`{}` is not "empty object".** It accepts any non-nullish value, including `0` and `""`. For "any object" use `object`; for "no keys" use `Record<string, never>`.
- **Excess property checks only apply to fresh object literals.** `const p: Point = { x: 1, y: 2, z: 3 }` errors, but the same object assigned through an intermediate variable passes (structural typing).
- **Enums.** Numeric enums create a reverse mapping (`E[0] === "A"`) and accept any `number` variable. Enums emit runtime code and are rejected by `--erasableSyntaxOnly` (and Node's type stripping); `const enum` breaks under `isolatedModules`. Prefer a union of literals, or an `as const` object plus `type V = (typeof O)[keyof typeof O]`.
- **Index signatures lie by default.** `Record<string, T>` and `{ [k: string]: T }` give `obj[k]: T` even when the key is missing. Enable `noUncheckedIndexedAccess` to get `T | undefined` (also applies to array indexing, not to `for..of`).
- **`Object.keys(o)` returns `string[]`**, not `(keyof T)[]`, since objects can carry extra keys at runtime.
- **Type predicates are unchecked.** A wrong `x is T` body is a silent lie, just like `as`.
- **Method parameters are bivariant.** Declare callbacks as properties (`f: (x: T) => void`) rather than methods (`f(x: T): void`) to get strict checking under `strictFunctionTypes`.

> [!TIP]
> To make an intersection readable on hover, flatten it with `type Debug<T> = { [K in keyof T]: T[K] } & {}`.
