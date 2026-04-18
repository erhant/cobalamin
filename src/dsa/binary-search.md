# Binary Search

## Templates

There are three common binary search templates. Knowing which to use matters.

### Template 1: `while (l < r)` with `l = mid, r = mid - 1`

```typescript
let l = 0,
  r = arr.length - 1;
while (l < r) {
  const mid = (r + l) >> 1;
  if (arr[mid] < num) l = mid;
  else r = mid - 1;
}
```

**BROKEN** — infinite loops when `l + 1 === r`. Don't use this.

### Template 2: `while (l < r)` with `l = mid + 1, r = mid`

```typescript
let l = 0,
  r = arr.length - 1;
while (l < r) {
  const mid = (r + l) >> 1;
  if (arr[mid] < num) l = mid + 1;
  else r = mid;
}
```

- Always converges.
- Exits with `l === r`, but that element is **never checked** against `=== num`.
- Best for: **boundary finding** (e.g. "first index where condition holds").
- This is `lowerBound` — finds first index where `arr[idx] >= num`.

### Template 3: `while (l <= r)` with `l = mid + 1, r = mid - 1`

```typescript
let l = 0,
  r = arr.length - 1;
while (l <= r) {
  const mid = (r + l) >> 1;
  if (arr[mid] === num) return mid;
  else if (arr[mid] < num) l = mid + 1;
  else r = mid - 1;
}
```

- Always converges.
- Every `mid` is explicitly checked.
- Exits with `l > r` (they cross).
- Best for: **exact match** searches.

### Summary

|             | Template 1         | Template 2             | Template 3         |
| ----------- | ------------------ | ---------------------- | ------------------ |
| Loop        | `l < r`            | `l < r`                | `l <= r`           |
| Shrink      | `l=mid, r=mid-1`   | `l=mid+1, r=mid`       | `l=mid+1, r=mid-1` |
| Terminates? | **No** (can stall) | Yes                    | Yes                |
| Checks all? | --                 | No (`l===r` unchecked) | Yes                |
| Best for    | --                 | Boundary finding       | Exact match        |

## `lowerBound` and `upperBound`

Two essential helpers built on Template 2:

```typescript
// first index where arr[idx] >= val
function lowerBound(arr: number[], val: number): number {
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// first index where arr[idx] > val
function upperBound(arr: number[], val: number): number {
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= val) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
```

Note: `r = arr.length` (not `length - 1`) to allow "insert at end" as a valid result.

## Binary Search over Computed Values

Binary search doesn't require a sorted array — it works on any **monotonic function**. Search over the input space and evaluate the function at `mid`.

### Perfect Square Check

The function `f(x) = x * x` is monotonically increasing. Binary search for `mid` where `mid * mid === n`:

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

$O(\log n)$ — avoids floating-point issues with `Math.sqrt`. For large numbers (beyond $2^{53}$), use `BigInt`.

### Integer Square Root (`floor(sqrt(x))`)

Unlike the perfect-square case, there's usually no exact hit — we want the largest `m` with `m * m <= x`. Template 3 is the natural fit:

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

After the loop, `l === r + 1`, and `r` is the answer. Also handles `x = 0` cleanly.

**Common trap:** writing Template 2 (`while (l < r)`) and `return mid` at the end.

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

`mid` is the last midpoint examined, not the loop's final invariant point. It can land on either side of the answer (e.g. `x = 3` returns `2`; `x = 8` returns `3`; `x = 0` returns `undefined`). If you must use Template 2, return `l - 1`, not `mid`.

This pattern generalizes: any time you need to find a value where some monotonic condition flips (e.g. "minimum capacity such that X fits", "smallest speed to finish in time"), binary search over the answer space.

## Tip: `(r + l) >> 1` vs `Math.floor((r + l) / 2)`

Equivalent for non-negative 32-bit integers. The bitshift is a common shorthand.

## Searching a Sorted Matrix

A matrix where each row is sorted and the first element of each row is greater than the last element of the previous row can be treated as a **flat sorted array**:

```typescript
// flat index → row/col
const r = Math.trunc(mid / numCols);
const c = mid % numCols;
```

One binary search over $m \cdot n$ elements: $O(\log(m \cdot n)) = O(\log m + \log n)$.
