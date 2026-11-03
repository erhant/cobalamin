# Sparse Table

Range queries on a **static** array in $O(1)$, after $O(n \log n)$ preprocessing. Store the answer for every window whose length is a power of two. Any query range $[l, r]$ is then covered by **two overlapping windows** of length $2^k$, where $2^k \le r - l + 1 < 2^{k+1}$.

The overlap is only harmless when the operation is **idempotent**, meaning $x \circ x = x$: `min`, `max`, `gcd`, bitwise `&` and `|`. It doesn't work for sum or XOR, which count the overlap twice. Use [prefix sums](./prefix-diff.md) for those instead.

```typescript
class SparseTable {
  // sp[k][i]: op over a[i .. i + 2^k)
  private sp: number[][];

  constructor(a: number[], private op: (x: number, y: number) => number) {
    this.sp = [a.slice()];
    for (let k = 1; 1 << k <= a.length; k++) {
      const prev = this.sp[k - 1];
      const half = 1 << (k - 1);
      const row: number[] = [];
      // a window of 2^k is two adjacent windows of 2^(k-1)
      for (let i = 0; i + (1 << k) <= a.length; i++) row.push(op(prev[i], prev[i + half]));
      this.sp.push(row);
    }
  }

  // op over a[l..r], inclusive
  query(l: number, r: number): number {
    const k = 31 - Math.clz32(r - l + 1);
    return this.op(this.sp[k][l], this.sp[k][r - (1 << k) + 1]);
  }
}
```

`31 - Math.clz32(x)` is $\lfloor \log_2 x \rfloor$ (see [Bit Manipulation](./bits.md)). Precomputing a `log[]` table instead is the same speed in practice.

Each level `k` doubles the window, which is the same doubling idea as [Binary Lifting](./binary-lifting.md): there it doubles jumps up a tree, here it doubles windows along an array.

## Uses

- **Range min / max** on a static array, which is the classic RMQ problem.
- **LCA in $O(1)$** via the [Euler tour](./tree-flattening.md#lca-via-euler-tour): LCA becomes a range-min query over depths.
- **Binary search over a range property**: AND and GCD only shrink as the window grows, and OR only grows. So "the longest subarray from $i$ whose AND is still $\ge k$" is a binary search over $r$ with $O(1)$ checks.
- **Non-idempotent operations in $O(\log n)$**: split $[l, r]$ into disjoint power-of-two windows, one per set bit of the length. This is rarely worth it over a prefix sum or a Fenwick tree.

## Sparse Table vs. Segment Tree

|                | Sparse table               | [Segment tree](./segment-tree.md) |
| -------------- | -------------------------- | --------------------------------- |
| Build          | $O(n \log n)$ time / space | $O(n)$                            |
| Query          | $O(1)$ (idempotent ops)    | $O(\log n)$, any associative op   |
| Updates        | none: rebuild              | $O(\log n)$                       |

Use a sparse table when the array never changes and queries dominate, for example $10^6$ queries on a fixed array. If there are any updates, use a segment tree.

> [!TIP]
> [1521 Find a Value of a Mysterious Function Closest to Target](https://leetcode.com/problems/find-a-value-of-a-mysterious-function-closest-to-target/) (AND) · [3171 Find Subarray With Bitwise OR Closest to K](https://leetcode.com/problems/find-subarray-with-bitwise-or-closest-to-k/) (OR) · [239 Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/) (or a [monotonic queue](./monotonic-stack-queue.md))
