# Prefix Sums & Difference Arrays

Two complementary preprocessing tricks, often the cheapest way to flip the cost between queries and updates:

- **Prefix sums** turn $O(n)$ _range queries_ into $O(1)$ after $O(n)$ precomputation.
- **Difference arrays** turn $O(n)$ _range updates_ into $O(1)$, reconstructed later in $O(n)$.

They're **inverses** of each other. Let $a$ be the original array:

$$
\text{pfx}[i] = \sum_{k \le i} a[k] \quad\iff\quad a[i] = \text{pfx}[i] - \text{pfx}[i - 1]
$$

$$
d[i] = a[i] - a[i - 1] \quad\iff\quad a[i] = \sum_{k \le i} d[k]
$$

Differencing and prefix-summing undo each other — that duality is why the same mental model powers both the "fast query" and "fast update" regimes.

When to reach for them:

- **$O(1)$ range-sum queries** on a static array (the textbook case).
- **$O(1)$ range updates + $O(n)$ finalize**, when all updates arrive before any query.
- **Counting subarrays with an additive property** (sums to $k$, divisible by $k$, ...) by pairing prefix sums against a hash map — the running sum lets any subarray sum be read as a difference of two values you've already seen.
- **2D versions** via inclusion–exclusion, with a specialized row-sweep form when every query shares a fixed corner.
- **Dynamic case** — if the array itself keeps changing between queries, plain prefix sums are wrong on the very next update; switch to a Fenwick or segment tree.

## Basics

### Prefix Sum

```ts
const pfx = new Array(nums.length + 1).fill(0);
for (let i = 0; i < nums.length; i++) {
  pfx[i + 1] = pfx[i] + nums[i];
}
```

Sum of `nums[l..r]` (inclusive) is `pfx[r + 1] - pfx[l]`. The leading `0` lets `l = 0` work without a special case — the "empty prefix" is a real, addressable state.

### Difference Array

For range updates. Given many "add $v$ to every element in $[l, r]$" updates, applying each directly is $O(n)$ per update. Instead, apply each in $O(1)$ and reconstruct once at the end:

```typescript
const d = new Array(n + 1).fill(0);

function rangeAdd(l: number, r: number, v: number) {
  d[l] += v;
  d[r + 1] -= v; // cancellation one past the end
}

// after all updates, reconstruct the final array:
for (let i = 1; i < n; i++) d[i] += d[i - 1];
```

The `+v` at `l` "turns on" the increment; the `-v` at `r + 1` "turns it off"; the prefix-sum sweep applies each increment to exactly the positions it should cover. This same cancellation idea — place an effect and place its inverse one step past the range — generalizes to the multiplicative and strided variants later in this chapter.

## Prefix Sum + Hash Map for Subarray Queries

Any subarray sum is the difference of two prefix sums:

$$
\operatorname{sum}(l+1, \dots, r) = \operatorname{prefix}[r] - \operatorname{prefix}[l]
$$

This turns subarray sum problems into "find two prefix sums with some relationship."

### Count subarrays that sum to $k$

Track prefix sum frequencies. At each position, ask "how many previous prefix sums equal $\text{sum} - k$?":

```typescript
let sum = 0;
const seen = new Map<number, number>([[0, 1]]); // empty prefix

for (const n of nums) {
  sum += n;
  ans += seen.get(sum - k) ?? 0; // look up sum - k
  seen.set(sum, (seen.get(sum) ?? 0) + 1);
}
```

Each match is a left endpoint forming a valid subarray ending here. O(n) time.

### Count subarrays divisible by $k$

If two prefix sums share the **same remainder** mod $k$, their difference is divisible by $k$. Look up the same remainder, not $k - \text{rem}$:

```typescript
let sum = 0;
const seen = new Map<number, number>([[0, 1]]);

for (const n of nums) {
  sum += n;
  const rem = ((sum % k) + k) % k; // handle negative numbers
  ans += seen.get(rem) ?? 0; // same remainder = divisible
  seen.set(rem, (seen.get(rem) ?? 0) + 1);
}
```

**Why not $k - \text{rem}$?** That would find pairs where remainders _add_ to $k$, which is a different condition. Divisibility requires $\text{sum}_r \bmod k = \text{sum}_l \bmod k$, not $\text{sum}_r \bmod k + \text{sum}_l \bmod k = k$.

**Why `((sum % k) + k) % k`?** JS gives negative remainders for negative numbers (`-3 % 5 === -3`). The `+ k) % k` normalizes to $[0, k)$.

## Counting Triplets with Prefix Factoring

For counting triplets $(i < j < k)$ where values must be distinct, count frequencies and compute:

$$
\sum_{i < j < k} \text{counts}[i] \cdot \text{counts}[j] \cdot \text{counts}[k]
$$

This nested sum can be **factored** into running accumulators:

```typescript
let sumCounts = 0;
let sumPairs = 0;
let ans = 0;

for (let i = counts.length - 1; i >= 0; i--) {
  const pairCount = counts[i] * sumCounts;
  ans += counts[i] * sumPairs;
  sumCounts += counts[i];
  sumPairs += pairCount;
}
```

Each nesting level becomes one accumulator, turning $O(d^3)$ into $O(d)$.

This works because $i < j < k$ gives a **triangular** summation region that can be peeled one variable at a time.

## Multiplicative Difference Array with Stride

For range updates $[l, r]$ with stride $k$, multiplying by $v$:

- Place $v$ at index $l$ (effect)
- Place $v^{-1}$ at the first stride position past $r$ (cancellation)
- Propagate: $\text{dif}[i] \mathrel{*}= \text{dif}[i - k]$

```
k=3, l=1, r=7

Affected:     1    4    7
Cancel at:                  10  (= 7 + k)

Propagation carries v forward through the stride.
The inverse at 10 cancels it: v * v^{-1} = 1.
```

The cancellation is one **stride** past the last affected index (not $r + 1$) because propagation steps by $k$.

Different queries with the same $k$ but different $l$ values form independent "lanes" — the propagation $\text{dif}[i] \mathrel{*}= \text{dif}[i - k]$ with sequential `i++` handles all lanes in one pass.

### Modular Inverse via Fermat's Little Theorem

When working mod a prime $p$:

$$
v^{p - 1} \equiv 1 \pmod{p} \;\implies\; v^{p - 2} \equiv v^{-1} \pmod{p}
$$

Computed via fast exponentiation (square-and-multiply) in $O(\log p)$.

## Space Optimization: 2D → 1D by Row Sweep

For problems where every query is a **top-left-anchored submatrix** $(0, 0) \to (r, c)$, the full 2D prefix-sum grid is wasteful. You only ever need the row directly above.

**Standard 2D recurrence** (with inclusion-exclusion):

$$
\text{pfx}[r][c] = \text{pfx}[r-1][c] + \text{pfx}[r][c-1] - \text{pfx}[r-1][c-1] + \text{val}(r, c)
$$

**Row-sweep form.** Let $\text{rowSum}(r, c) = \sum_{k=0}^{c} \text{val}(r, k)$. Then:

$$
\text{pfx}[r][c] = \text{pfx}[r-1][c] + \text{rowSum}(r, c)
$$

No subtraction — we're stacking a row strip onto the previous row's value, so the overlap rectangle never appears. Keep a 1D `pfx[c]` that after row $r$ holds $\text{pfx}[r][c]$; within each row, accumulate `rowSum` left-to-right and add it in:

```typescript
const pfx = new Array(cols).fill(0);
let ans = 0;

for (let r = 0; r < rows; r++) {
  let rowSum = 0;
  for (let c = 0; c < cols; c++) {
    rowSum += grid[r][c];
    pfx[c] += rowSum; // pfx[r-1][c] + rowSum(r, c) = pfx[r][c]
    if (pfx[c] <= k) ans++; // or whatever the per-rectangle predicate is
  }
}
```

**O(C) space, O(R·C) time** — time is optimal (every cell must be read). The row-sweep form also collapses the usual three special cases (first row, first column, interior) into a single uniform update: `pfx.fill(0)` correctly represents the empty "row −1" strip.

### Parallel Monotone State

Any **monotone** per-rectangle property can ride along in a parallel 1D array, updated the same way. Example: "has at least one X in $(0,0) \to (r,c)$":

```typescript
const hasX = new Array(cols).fill(false);
// inside the inner loop:
rowHasX ||= grid[r][c] === "X";
hasX[c] ||= rowHasX;
```

OR is idempotent, so double-counting the overlap doesn't hurt — no subtract term needed. Same pattern works for any associative-idempotent monoid (min, max, bitwise OR/AND, set union).

### When This Works

The pattern applies when **every query rectangle shares a fixed corner** (here, $(0, 0)$). If you need arbitrary sub-rectangles $(r_1, c_1) \to (r_2, c_2)$, you need the full 2D prefix grid — the row-sweep version can't answer those in $O(1)$.

## Fenwick Tree (Binary Indexed Tree)

$O(\log n)$ point update + prefix sum queries:

```typescript
class FenwickTree {
  tree: number[];
  constructor(n: number) {
    this.tree = new Array(n + 1).fill(0);
  }

  update(i: number, delta: number) {
    for (; i < this.tree.length; i += i & -i) this.tree[i] += delta;
  }

  prefix(i: number): number {
    let sum = 0;
    for (; i > 0; i -= i & -i) sum += this.tree[i];
    return sum;
  }

  query(l: number, r: number): number {
    return this.prefix(r) - this.prefix(l - 1);
  }
}
```

Each index is responsible for a range determined by its **lowest set bit** ($i \,\&\, (-i)$).
