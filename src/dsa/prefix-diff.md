# Prefix Sums & Difference Arrays

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
