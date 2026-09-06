# Binary Lifting

Precompute jump pointers of power-of-two lengths so that any jump of length $k$ decomposes into at most $\log k$ precomputed jumps — one per set bit of $k$. The core table:

$$
\text{up}[j][v] = \text{the node reached from } v \text{ by } 2^j \text{ steps}
$$

built from the doubling recurrence: a $2^j$-jump is two $2^{j-1}$-jumps.

$$
\text{up}[j][v] = \text{up}[j-1]\big[\,\text{up}[j-1][v]\,\big]
$$

Preprocessing is $O(n \log n)$ time and space; each query is $O(\log n)$. It applies to anything shaped like "follow a pointer $k$ times": parent pointers in a rooted tree (k-th ancestor, LCA) or `next` pointers in a functional graph (every node has out-degree 1).

## K-th Ancestor

Row $0$ is the parent array; fill upward with the doubling recurrence. Use a sentinel (here `-1`) for jumps that leave the tree, and make the sentinel absorbing so out-of-range queries stay `-1`:

```typescript
const LOG = Math.ceil(Math.log2(n)) + 1;
const up: number[][] = Array.from({ length: LOG }, () => new Array(n).fill(-1));

// parent[root] = -1
up[0] = parent;
for (let j = 1; j < LOG; j++) {
  for (let v = 0; v < n; v++) {
    const mid = up[j - 1][v];
    up[j][v] = mid === -1 ? -1 : up[j - 1][mid];
  }
}

function kthAncestor(v: number, k: number): number {
  for (let j = 0; j < LOG && v !== -1; j++) {
    if (k & (1 << j)) v = up[j][v];
  }
  return v;
}
```

The query walks the set bits of $k$ — e.g. $k = 13 = 1101_2$ becomes jumps of $1$, $4$, and $8$. Bit order doesn't matter for plain ancestor queries; jumps commute.

> [!TIP]
> [1483 Kth Ancestor of a Tree Node](https://leetcode.com/problems/kth-ancestor-of-a-tree-node/) — the canonical problem; the naive $O(k)$ walk per query TLEs by design.

## Lowest Common Ancestor (LCA)

Compute depths with one DFS/BFS, then:

1. **Lift the deeper node** up by the depth difference (a k-th ancestor jump).
2. If they meet, that node is the LCA.
3. Otherwise **lift both in lockstep**, from the highest power down, taking a jump only when it does *not* make them equal. They stop one step below the LCA.

```typescript
function lca(u: number, v: number): number {
  if (depth[u] < depth[v]) [u, v] = [v, u];
  // equalize depths
  u = kthAncestor(u, depth[u] - depth[v]);

  if (u === v) return u;

  for (let j = LOG - 1; j >= 0; j--) {
    if (up[j][u] !== up[j][v]) {
      // jump kept them apart ⇒ still below the LCA, take it
      u = up[j][u];
      v = up[j][v];
    }
  }
  // one step above the meeting frontier
  return up[0][u];
}
```

Step 3 must go **high bit to low bit**: it's a greedy "find the largest jump that stays strictly below the LCA", the same descend-from-the-top pattern as binary search on bits. Skipping a jump because `up[j][u] === up[j][v]` doesn't mean that common node is the LCA — it may be far above it; the loop refines that bound downward.

With LCA you get **path queries** for free:

$$
\text{dist}(u, v) = \text{depth}[u] + \text{depth}[v] - 2 \cdot \text{depth}[\text{lca}(u, v)]
$$

> [!TIP]
> [2846 Minimum Edge Weight Equilibrium Queries in a Tree](https://leetcode.com/problems/minimum-edge-weight-equilibrium-queries-in-a-tree/) · [2277 Closest Node to Path in Tree](https://leetcode.com/problems/closest-node-to-path-in-tree/) · [1740 Find Distance in a Binary Tree](https://leetcode.com/problems/find-distance-in-a-binary-tree/) (small constraints, but the distance formula is this one)

## Aggregates Along Jumps

Store a value alongside each jump — $\text{agg}[j][v]$ = the aggregate (min/max/sum/...) over the $2^j$ edges above $v$ — and combine it during the walk:

```typescript
// build, alongside up[][]
agg[j][v] = combine(agg[j - 1][v], agg[j - 1][up[j - 1][v]]);

// query: aggregate over the k edges above v
let acc = IDENTITY;
for (let j = 0; j < LOG; j++) {
  if (k & (1 << j)) {
    acc = combine(acc, agg[j][v]);
    v = up[j][v];
  }
}
```

Combined with LCA, this answers "min/max/sum edge weight on the path $u \rightsquigarrow v$" in $O(\log n)$ per query — split the path at the LCA and aggregate both halves. The operation must be associative; it does **not** need to be invertible (unlike prefix sums), which is why min/max work.

## Functional Graphs (k-th successor)

Nothing above requires a tree — only that each node has exactly one outgoing pointer. For a `next` array (possibly with cycles), the same table answers "where am I after $k$ steps" for astronomically large $k$, since $k$ only costs $\log k$ rows:

```typescript
// k up to 2^64 — bigint bits
const LOG = 64;
// up[0] = next; same doubling build, no -1 cases since every node has a successor
```

> [!TIP]
> [2836 Maximize Value of Function in a Ball Passing Game](https://leetcode.com/problems/maximize-value-of-function-in-a-ball-passing-game/) — $k \le 10^{10}$, binary lifting with a sum aggregate alongside each jump.

## Notes

- **Complexity**: $O(n \log n)$ build, $O(\log n)$ or $O(\log k)$ per query, $O(n \log n)$ space.
- **Offline alternative**: if all LCA queries are known upfront, Tarjan's offline LCA ([Union-Find](./union-find.md)) answers them in near-linear total time. Binary lifting wins when queries arrive online.
- **Euler tour + sparse table** gives $O(1)$ LCA queries after $O(n \log n)$ preprocessing, but binary lifting is simpler and additionally gives k-th ancestor and path aggregates, which that method doesn't.
- The same doubling idea powers **sparse tables** on arrays and **matrix exponentiation** — "precompute powers of two, decompose $k$ by its bits."
