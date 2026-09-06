# Binary Search

$O(\log n)$ search over a **monotonic** structure. Usually pictured as "find `x` in a sorted array", but the real requirement is a monotonic predicate. Given any $p : [0, n) \to \{\text{false}, \text{true}\}$ that flips $\text{false} \to \text{true}$ exactly once, binary search locates the boundary in $\lceil \log_2 n \rceil$ probes.

It's the right tool whenever you can phrase the question as "the answer is somewhere in this range, and a single comparison tells me which half to discard":

- **Exact match** in a sorted array — is `x` present, and if so, where?
- **`lowerBound` / `upperBound`** — first index $\ge x$ or $> x$; underlies insertion point, count-in-range, first/last occurrence.
- **Search on the answer** (parametric search) — "smallest capacity to ship in $D$ days", "minimum speed to finish on time", "largest value that still fits". Any problem where feasibility is monotone in a numeric parameter.
- **Monotone inverse problems** — integer square root, $n$-th root, and similar.

> [!TIP]
>
> **The core idea**: maintain an interval known to contain the answer; each step halves it. Two idioms cover every case — pick based on whether you need an **exact match** or a **boundary**.

## Closed Variant

Search interval is $[l, r]$, meaning that it is **closed** on both sides. Every `mid` is explicitly compared against the target. The search terminates when `l > r`, or the answer is found.

```typescript
function binarySearch(arr: number[], target: number): number {
  let [l, r] = [0, arr.length - 1];

  while (l <= r) {
    const mid = (r + l) >>> 1;
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      l = mid + 1;
    } else /* arr[mid] > target */ {
      r = mid - 1;
    }
  }

  // not found
  return -1;
}
```

You can use this when you need to distinguish "found it" from "not found" at the element level, i.e. simply searching for an element.

> [!TIP]
> [704 Binary Search](https://leetcode.com/problems/binary-search/) · [153 Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) · [33 Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)

## Half-Open / Boundary Search (`partitionPoint`)

Search interval is $[l, r)$, right end exclusive. Find the **first index where a predicate becomes true** — equivalently, the boundary between the `false` region and the `true` region.

```typescript
// r = n, so "past the end" stays a representable answer
let l = 0;
let r = n;
while (l < r) {
  const mid = (l + r) >> 1;
  if (predicate(mid)) r = mid;
  else l = mid + 1;
}
// first index where predicate holds; === n if none do
return l;
```

Terminates with `l === r`, which is the answer. `mid` is never "checked off" as the answer — it only narrows the range, so don't put an `=== target` early-return inside this loop.

Once you see the "first true" framing, **every `lowerBound` / `upperBound` / "minimum X such that ..." problem is the same algorithm with a different predicate.** This is the pattern worth internalizing; in C++ STL it's literally called `std::partition_point`.

### Side-by-side

|                | Closed / Exact Match       | Half-Open / Boundary Search |
| -------------- | -------------------------- | --------------------------- |
| Loop Condition | `l <= r`                   | `l < r`                     |
| Interval       | $[l, r]$                   | $[l, r)$                    |
| Initial        | $[0, n - 1]$               | $[0, n)$                    |
| Shrink         | `l = mid + 1, r = mid - 1` | `l = mid + 1, r = mid`      |
| `mid` checked? | Yes, explicitly            | No, only narrows            |
| Exits with     | `l > r` (crossed, empty)   | `l === r` (the answer)      |
| Best for       | Exact match                | "First true" / boundaries   |

> [!CAUTION]
>
> The `(r + l) >>> 1` pattern is a common shorthand for `Math.floor((l + r) / 2)`, but it uses bitwise ops which may default to 32-bits in Node etc.
>
> Furthermore, `l + r` can overflow for large indices. To be safe, prefer `l + ((r - l) >>> 1)` or it's equivalent `l + Math.floor((r - l) / 2)`.

## `lowerBound` and `upperBound`

Direct specializations of boundary search:

```typescript
// first index where arr[idx] >= val
function lowerBound(arr: number[], val: number): number {
  let [l, r] = [0, arr.length];
  while (l < r) {
    const mid = (l + r) >> 1;
    if (arr[mid] < val) l = mid + 1;
    else r = mid;
  }
  return l;
}

// first index where arr[idx] > val
function upperBound(arr: number[], val: number): number {
  let [l, r] = [0, arr.length];
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
  // largest m with m*m <= x
  return r;
}
```

After the loop, `l === r + 1` and `r` holds the answer. Handles `x = 0` cleanly too.

**Common trap.** Don't return `mid` from the boundary form. `mid` is the last midpoint probed, not the loop's invariant — it can land on either side of the answer. Return the invariant instead: `r` in the closed form above, or phrase it as "first `m` with `m * m > x`" and return `l - 1`.

This pattern generalizes: whenever you need the largest/smallest value where a monotonic condition flips (minimum capacity, smallest speed, largest dividend), binary-search over the answer space.

> [!TIP]
> [69 Sqrt(x)](https://leetcode.com/problems/sqrtx/) · [367 Valid Perfect Square](https://leetcode.com/problems/valid-perfect-square/)

## Max of Min / Min of Max

A whole family of problems asks for the **largest minimum** or **smallest maximum** of some derived quantity: "place $k$ items so the smallest gap is as large as possible", "split an array into $m$ chunks so the heaviest chunk is as light as possible", "pick $k$ workers so the slowest finishes earliest". The configuration space is exponential, but the answer is one number — and feasibility in that number is monotone, so binary-search **the answer** itself.

- **Max of min**: predicate $p(d) =$ "is some configuration with every gap $\ge d$ achievable?" — true for small $d$, false for large. Find the **last `true`**.
- **Min of max**: predicate $p(c) =$ "can we keep every part $\le c$?" — true for large $c$, false for small. Find the **first `true`**.

Min-of-max is straight `partitionPoint`. Max-of-min is its mirror, with a midpoint bias to avoid stalling:

```typescript
// largest d with feasible(d) === true
let lo = lowestPossible,
  hi = highestPossible;
while (lo < hi) {
  // bias up
  const mid = lo + ((hi - lo + 1) >> 1);
  if (feasible(mid)) lo = mid;
  else hi = mid - 1;
}
return lo;
```

The `+1` bias matters. When `hi - lo === 1` and `feasible(lo)` holds, plain `(lo + hi) >> 1` rounds down to `lo`, `lo = mid` is a no-op, and the loop stalls. Rounding up forces `mid === hi`, so progress is guaranteed.

### Example: aggressive cows

Place $k$ cows in stalls at sorted positions `pos[]` so the minimum pairwise distance is as large as possible. Feasibility for a candidate $d$: greedy sweep — place the first cow at `pos[0]`, then take the next stall whenever it's at least $d$ past the last placement.

```typescript
function maxMinDistance(pos: number[], k: number): number {
  pos.sort((a, b) => a - b);

  const feasible = (d: number): boolean => {
    let placed = 1,
      last = pos[0];
    for (let i = 1; i < pos.length && placed < k; i++) {
      if (pos[i] - last >= d) {
        placed++;
        last = pos[i];
      }
    }
    return placed >= k;
  };

  let lo = 1,
    hi = pos[pos.length - 1] - pos[0];
  while (lo < hi) {
    const mid = lo + ((hi - lo + 1) >> 1);
    if (feasible(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
```

$O(n \log n)$ for the sort plus $O(n \log(\text{range}))$ for the search.

The hard part is always `feasible`; the search wrapped around it is mechanical. The same shape covers anything phrased as "maximize the minimum ..." or "minimize the maximum ...", including disguised ones — "maximize the minimum Manhattan distance between $k$ points on a square's boundary" is aggressive cows again once you unroll the perimeter into 1D.

> [!TIP]
> [2602 Minimum Operations to Make All Array Elements Equal](https://leetcode.com/problems/minimum-operations-to-make-all-array-elements-equal/) · [3356 Zero Array Transformation II](https://leetcode.com/problems/zero-array-transformation-ii/) · [875 Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/) · [1011 Capacity To Ship Packages](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) · [410 Split Array Largest Sum](https://leetcode.com/problems/split-array-largest-sum/)
