# Euler Tour of a Tree (Flattening)

A tree's **Euler tour** is the order in which DFS enters and leaves its vertices. It has nothing to do with the [Eulerian path](./graphs.md#eulerian-path--circuit) except the name. Record the DFS **entry time** `tin[u]` and the last entry time inside `u`'s subtree, `tout[u]`. Every subtree then becomes the **contiguous range** $[\text{tin}[u], \text{tout}[u]]$ in entry order, which turns tree problems into array problems.

```typescript
const tin = new Array(n);
const tout = new Array(n);
let timer = 0;

function dfs(u: number, p: number): void {
  tin[u] = timer++;
  for (const v of adj[u]) if (v !== p) dfs(v, u);
  // the largest tin inside u's subtree
  tout[u] = timer - 1;
}
dfs(0, -1);
```

## What It Enables


- **Ancestor test in $O(1)$**: $u$ is an ancestor of $v$ iff $\text{tin}[u] \le \text{tin}[v]$ and $\text{tout}[v] \le \text{tout}[u]$.
- **Subtree queries with point updates**: store node $u$'s value at index `tin[u]` in a [Fenwick Tree](./fenwick-tree.md) or [Segment Tree](./segment-tree.md). The subtree sum is then `query(tin[u] + 1, tout[u] + 1)`, using 1-indexed Fenwick positions.
- **Root-to-node path sums with point updates**: reverse the roles with a difference trick. Adding $d$ to node $u$ changes the root-to-$v$ sum for exactly the $v$ in $u$'s subtree, so add $d$ over that range: `update(tin[u] + 1, d)` and `update(tout[u] + 2, -d)`. The path sum from the root to $v$ is then `prefix(tin[v] + 1)`, which collects the $d$ of every ancestor of $v$ (including $v$).

## LCA via Euler Tour

Use a fuller tour that records $u$ again after returning from each child, which gives $2n - 1$ entries. The LCA of $u$ and $v$ is the **shallowest vertex** in the tour between their first occurrences: that stretch of the tour walks from $u$ up to the LCA and down to $v$, never leaving the LCA's subtree. A [sparse table](./sparse-table.md) answers that range-min query in $O(1)$ after $O(n \log n)$ preprocessing:

```typescript
const tour: number[] = [];
const first = new Array(n);
const depth = new Array(n);

function walk(u: number, p: number, d: number): void {
  first[u] = tour.length;
  depth[u] = d;
  tour.push(u);
  for (const v of adj[u]) {
    if (v === p) continue;
    walk(v, u, d + 1);
    // back at u after each child
    tour.push(u);
  }
}
walk(0, -1, 0);

// sp[k][i]: shallowest vertex in tour[i .. i + 2^k)
const shallower = (a: number, b: number) => (depth[a] < depth[b] ? a : b);
const sp: number[][] = [tour];
for (let k = 1; 1 << k <= tour.length; k++) {
  const prev = sp[k - 1];
  const half = 1 << (k - 1);
  // a window of length 2^k is two halves; only starts i <= len - 2^k fit
  sp.push(prev.slice(0, tour.length - (1 << k) + 1).map((x, i) => shallower(x, prev[i + half])));
}

function lca(u: number, v: number): number {
  let l = first[u];
  let r = first[v];
  if (l > r) [l, r] = [r, l];
  // k = floor(log2(len)); two overlapping 2^k windows cover [l, r]
  const k = 31 - Math.clz32(r - l + 1);
  return shallower(sp[k][l], sp[k][r - (1 << k) + 1]);
}
```

Compared with [Binary Lifting](./binary-lifting.md), queries are faster, $O(1)$ instead of $O(\log n)$. Binary lifting, though, also answers k-th ancestor and path-aggregate queries.

Both DFS functions recurse to the tree's depth, which can be $n$ on a path-shaped tree. For $n \gtrsim 10^4$, switch to an explicit stack.

> [!TIP]
> [2322 Minimum Score After Removals on a Tree](https://leetcode.com/problems/minimum-score-after-removals-on-a-tree/) (ancestor test) · [236 Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) · [2846 Minimum Edge Weight Equilibrium Queries in a Tree](https://leetcode.com/problems/minimum-edge-weight-equilibrium-queries-in-a-tree/)
