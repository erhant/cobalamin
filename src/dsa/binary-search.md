# Binary Search

$O(\log n)$ search over a **monotonic** structure. Usually pictured as "find `x` in a sorted array", but the real requirement is a monotonic predicate. Given any $p : [0, n) \to \{\text{false}, \text{true}\}$ that flips $\text{false} \to \text{true}$ exactly once, binary search locates the boundary in $\lceil \log_2 n \rceil$ probes.

It's the right tool whenever you can phrase the question as "the answer is somewhere in this range, and a single comparison tells me which half to discard":

- **Exact match** in a sorted array — is `x` present, and if so, where?
- **`lowerBound` / `upperBound`** — first index $\ge x$ or $> x$; underlies insertion point, count-in-range, first/last occurrence.
- **Search on the answer** (parametric search) — "smallest capacity to ship in $D$ days", "minimum speed to finish on time", "largest value that still fits". Any problem where feasibility is monotone in a numeric parameter.
- **Monotone inverse problems** — integer square root, $n$-th root, and similar.
- **Sorted 2D matrix** — flatten to 1D and search once.

Core invariant: maintain an interval known to contain the answer; each step halves it. Two idioms cover every case — pick based on whether you need an **exact match** or a **boundary**.

## Closed-Interval Search (Exact Match)

Search interval is $[l, r]$, closed on both sides. Every `mid` is explicitly compared against the target.

```typescript
let l = 0,
  r = arr.length - 1;
while (l <= r) {
  const mid = (l + r) >> 1;
  if (arr[mid] === num) return mid;
  else if (arr[mid] < num) l = mid + 1;
  else r = mid - 1;
}
return -1; // not found
```

Terminates when `l > r` (the interval crosses). Use this when you need to distinguish "found it" from "not found" at the element level.

## Half-Open / Boundary Search (`partitionPoint`)

Search interval is $[l, r)$, right end exclusive. Find the **first index where a predicate becomes true** — equivalently, the boundary between the `false` region and the `true` region.

```typescript
let l = 0,
  r = n; // r = n so "past the end" is a valid answer
while (l < r) {
  const mid = (l + r) >> 1;
  if (predicate(mid)) r = mid;
  else l = mid + 1;
}
return l; // first index where predicate holds; === n if none do
```

Terminates with `l === r`, which is the answer. `mid` is never "checked off" as the answer — it only narrows the range, so don't put an `=== target` early-return inside this loop.

Once you see the "first true" framing, **every `lowerBound` / `upperBound` / "minimum X such that ..." problem is the same algorithm with a different predicate.** This is the pattern worth internalizing; in C++ STL it's literally called `std::partition_point`.

### Side-by-side

|                | Closed-Interval            | Boundary                  |
| -------------- | -------------------------- | ------------------------- |
| Loop           | `while (l <= r)`           | `while (l < r)`           |
| Interval       | $[l, r]$                   | $[l, r)$                  |
| Right init     | `n - 1`                    | `n`                       |
| Shrink         | `l = mid + 1, r = mid - 1` | `l = mid + 1, r = mid`    |
| `mid` checked? | Yes, explicitly            | No, only narrows          |
| Exits with     | `l > r` (crossed, empty)   | `l === r` (the answer)    |
| Best for       | Exact match                | "First true" / boundaries |

## `lowerBound` and `upperBound`

Direct specializations of boundary search:

```typescript
// first index where arr[idx] >= val
function lowerBound(arr: number[], val: number): number {
  let l = 0,
    r = arr.length;
  while (l < r) {
    const mid = (l + r) >> 1;
    if (arr[mid] < val) l = mid + 1;
    else r = mid;
  }
  return l;
}

// first index where arr[idx] > val
function upperBound(arr: number[], val: number): number {
  let l = 0,
    r = arr.length;
  while (l < r) {
    const mid = (l + r) >> 1;
    if (arr[mid] <= val) l = mid + 1;
    else r = mid;
  }
  return l;
}
```

Note: `r = arr.length` (not `length - 1`), so "insert at end" is a representable answer.

Two handy consequences:

- **Count of `val`** in a sorted array: `upperBound(a, val) - lowerBound(a, val)`.
- **Exact-match check** built from a boundary search: `const i = lowerBound(a, val); return i < a.length && a[i] === val;`.

## Binary Search over Computed Values

Nothing requires the values to live in an array. Any monotonic function over an integer domain works — evaluate the predicate at `mid` instead of indexing.

### Perfect Square Check

$f(x) = x^2$ is monotonically increasing. Search for an `x` with `x * x === n`:

```typescript
function isPerfectSquare(n: number): boolean {
  let l = 0,
    r = n;
  while (l <= r) {
    const mid = (l + r) >>> 1;
    const sq = mid * mid;
    if (sq === n) return true;
    else if (sq < n) l = mid + 1;
    else r = mid - 1;
  }
  return false;
}
```

$O(\log n)$ — avoids floating-point issues with `Math.sqrt`. For $n > 2^{53}$, use `BigInt`.

### Integer Square Root (`floor(sqrt(x))`)

No exact hit in general — we want the largest `m` with `m * m <= x`. Natural fit for closed-interval search: the loop's final `r` is exactly the answer.

```typescript
function mySqrt(x: number): number {
  let l = 0,
    r = x;
  while (l <= r) {
    const mid = (l + r) >>> 1;
    if (mid * mid <= x) l = mid + 1;
    else r = mid - 1;
  }
  return r; // largest m with m*m <= x
}
```

After the loop, `l === r + 1` and `r` holds the answer. Handles `x = 0` cleanly too.

**Common trap.** Rewriting this with the boundary form and returning `mid`:

```typescript
// BROKEN
while (l < r) {
  const mid = (l + r) >>> 1;
  const sq = mid * mid;
  if (sq === x) return mid;
  else if (sq < x) l = mid + 1;
  else r = mid;
}
return mid; // ← wrong
```

`mid` is just the last midpoint examined, not the loop's final invariant. It can land on either side of the answer (`x = 3` returns `2`; `x = 8` returns `3`; `x = 0` returns `undefined`). If you want the boundary form, phrase it as "find the first `m` where `m * m > x`" and return `l - 1`.

This pattern generalizes: whenever you need the largest/smallest value where a monotonic condition flips (minimum capacity, smallest speed, largest dividend), binary-search over the answer space.

## Searching a Sorted Matrix

A matrix where each row is sorted and the first element of each row is greater than the last of the previous row can be treated as a **flat sorted array**:

```typescript
// flat index → row/col
const r = Math.trunc(mid / numCols);
const c = mid % numCols;
```

One binary search over $m \cdot n$ elements: $O(\log(m \cdot n)) = O(\log m + \log n)$.

## Tip: `(l + r) >> 1` vs `Math.floor((l + r) / 2)`

Equivalent for non-negative 32-bit integers; the bitshift is common shorthand. For values near $2^{31}$ where `l + r` can overflow, prefer `l + ((r - l) >> 1)`.
