# Fenwick Tree

A **Fenwick Tree** (a.k.a. **Binary Indexed Tree**, BIT) maintains a mutable array under **point updates** and **prefix-sum queries**, both in $O(\log n)$. It's a leaner alternative to a [segment tree](./segment-tree.md) when the aggregate is a **group** — has an inverse — so sum, XOR, and modular sum work; min, max, and gcd don't.

The whole structure is one $n+1$-sized array and two three-line loops. That's why it's almost always the first thing to try when the problem reads "mutable array + range queries."

## The `i & -i` Trick

Every position `i` is responsible for a contiguous range of the original array whose length is its **lowest set bit**:

$$
\text{lowbit}(i) = i \,\&\, (-i)
$$

In two's complement, `-i` flips all bits then adds one, so the only bit that lines up with `i` is the rightmost one. So `i & -i` isolates that bit, and its numeric value is the length of the range `tree[i]` covers — namely $[i - \text{lowbit}(i) + 1,\; i]$.

| `i` (binary) | `lowbit(i)` | range covered |
| ------------ | ----------- | ------------- |
| `0001`       | `1`         | `[1, 1]`      |
| `0010`       | `2`         | `[1, 2]`      |
| `0011`       | `1`         | `[3, 3]`      |
| `0100`       | `4`         | `[1, 4]`      |
| `0101`       | `1`         | `[5, 5]`      |
| `0110`       | `2`         | `[5, 6]`      |
| `0111`       | `1`         | `[7, 7]`      |
| `1000`       | `8`         | `[1, 8]`      |

```
indices:  1   2   3   4   5   6   7   8
tree[i] covers:
  1: [1..1]
  2: [1..2]
  3: [3..3]
  4: [1..4]
  5: [5..5]
  6: [5..6]
  7: [7..7]
  8: [1..8]
```

Two loops fall out:

- **`update(i, delta)`** — climb to every ancestor that includes `i` by adding the lowbit: `i += i & -i`.
- **`prefix(i)`** — descend by repeatedly subtracting the lowbit, accumulating non-overlapping ranges that tile $[1, i]$: `i -= i & -i`.

Both traverse at most $\lceil \log_2 n \rceil$ positions because each step strips one bit.

## Implementation

```typescript
class FenwickTree {
  private tree: number[];

  constructor(n: number) {
    this.tree = new Array(n + 1).fill(0);
  }

  update(i: number, delta: number): void {
    for (; i < this.tree.length; i += i & -i) this.tree[i] += delta;
  }

  prefix(i: number): number {
    let sum = 0;
    for (; i > 0; i -= i & -i) sum += this.tree[i];
    return sum;
  }

  // sum of original array indices [l..r], 1-indexed
  query(l: number, r: number): number {
    return this.prefix(r) - this.prefix(l - 1);
  }
}
```

**Conventions.** The tree is **1-indexed**. Index `0` is unused so that `i & -i` never returns `0` (which would loop forever). If your array is 0-indexed, add `1` at the API boundary.

### Building from an existing array

The naïve build is $n$ updates at $O(\log n)$ each — $O(n \log n)$. There's an $O(n)$ build that adds each element only to its immediate parent:

```typescript
constructor(arr: number[]) {
  this.tree = new Array(arr.length + 1).fill(0);
  for (let i = 0; i < arr.length; i++) this.tree[i + 1] = arr[i];
  for (let i = 1; i < this.tree.length; i++) {
    const parent = i + (i & -i);
    if (parent < this.tree.length) this.tree[parent] += this.tree[i];
  }
}
```

Each slot pushes once into its parent — total $O(n)$ work.

## Range Update + Point Query

Layer a difference array on top of the Fenwick tree. To add $v$ to $[l, r]$:

```typescript
bit.update(l, v);
bit.update(r + 1, -v);
```

Then `bit.prefix(i)` returns the **current value of `a[i]`** — the running sum of the difference array up to `i`. This is the BIT-backed version of the [Difference Array trick](./prefix-diff.md#difference-array), upgraded so updates and queries can interleave.

## Range Update + Range Query

Two Fenwick trees in tandem extend this further. The math: if $d$ is the difference array of $a$, then

$$
\sum_{k=1}^{i} a[k] = \sum_{k=1}^{i} \sum_{j=1}^{k} d[j] = \sum_{j=1}^{i} d[j] \cdot (i - j + 1) = (i + 1)\sum_{j=1}^{i} d[j] - \sum_{j=1}^{i} j \cdot d[j]
$$

So maintain one BIT over $d[j]$ and a second over $j \cdot d[j]$:

```typescript
class RangeBIT {
  private b1: FenwickTree;
  private b2: FenwickTree;
  constructor(n: number) {
    this.b1 = new FenwickTree(n);
    this.b2 = new FenwickTree(n);
  }

  rangeAdd(l: number, r: number, v: number): void {
    this.b1.update(l, v);
    this.b1.update(r + 1, -v);
    this.b2.update(l, v * (l - 1));
    this.b2.update(r + 1, -v * r);
  }

  prefix(i: number): number {
    return this.b1.prefix(i) * i - this.b2.prefix(i);
  }

  query(l: number, r: number): number {
    return this.prefix(r) - this.prefix(l - 1);
  }
}
```

This handles range-add + range-sum in $O(\log n)$ per operation with the same code complexity as a lazy segment tree, but ~2× tighter constants. The catch is it only works for **invertible** operations — there's no two-BIT trick for range-min.

## Variants

- **2D Fenwick** — `update(x, y, delta)` and `prefix(x, y)` over a 2D grid, $O(\log^2 n)$ per op. Same lowbit idea on each axis independently. Far cheaper than a 2D segment tree.
- **Order-statistics over a small value domain.** Coordinate-compress values into $[1, m]$, treat `tree[v]` as a count, and use `prefix(v)` to count "how many elements $\le v$". Binary-lift on the Fenwick tree to find the $k$-th smallest in $O(\log n)$ — useful for online median, rank queries, etc.
- **Range XOR.** XOR is its own inverse, so the same skeleton with `+` replaced by `^` works for prefix XOR with point updates.

## When _not_ to use a Fenwick tree

- The aggregate isn't a group (no inverse): min, max, gcd, OR/AND. Use a [segment tree](./segment-tree.md) instead.
- The update isn't just "add a delta": e.g. "set every element in $[l, r]$ to $v$". Segment tree with lazy propagation.
- You need to query arbitrary monoid values at non-prefix positions (e.g. "min over $[l, r]$"). Segment tree.

The rule of thumb: **prefix sums + mutability = Fenwick**. Anything fancier, segment tree.

> [!TIP]
> [307 Range Sum Query - Mutable](https://leetcode.com/problems/range-sum-query-mutable/) · [315 Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/) (BIT over compressed values, scanning right-to-left) · [493 Reverse Pairs](https://leetcode.com/problems/reverse-pairs/) · [2179 Count Good Triplets in an Array](https://leetcode.com/problems/count-good-triplets-in-an-array/) (prefix counts from both sides)
