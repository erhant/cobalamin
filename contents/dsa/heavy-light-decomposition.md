# Heavy-Light Decomposition

Split a rooted tree into vertical **chains** so that any path crosses only $O(\log n)$ of them, then lay the chains out contiguously in one array. A path query between any two nodes becomes $O(\log n)$ range queries on a [Segment Tree](./segment-tree.md), for $O(\log^2 n)$ total, with updates.

For each node, the child with the largest subtree is its **heavy** child; the edges to the other children are **light**. Heavy edges link up into chains. Going up a light edge from $c$ to its parent $p$ at least doubles the subtree size ($\text{size}[p] \ge 2 \cdot \text{size}[c]$), so any root-to-node path crosses at most $\log_2 n$ light edges, and therefore touches at most $\log_2 n + 1$ chains.

A DFS that visits the heavy child **first** gives every chain a contiguous block of positions:

```typescript
const parent = new Array(n).fill(-1);
const depth = new Array(n).fill(0);
const size = new Array(n).fill(1);
const heavy = new Array(n).fill(-1);
// top node of u's chain
const head = new Array(n);
// u's index in the flattened array
const pos = new Array(n);

function sizes(u: number): void {
  for (const v of adj[u]) {
    if (v === parent[u]) continue;
    parent[v] = u;
    depth[v] = depth[u] + 1;
    sizes(v);
    size[u] += size[v];
    if (heavy[u] === -1 || size[v] > size[heavy[u]]) heavy[u] = v;
  }
}

let timer = 0;
function decompose(u: number, h: number): void {
  head[u] = h;
  pos[u] = timer++;
  // heavy child continues the chain; every light child starts its own
  if (heavy[u] !== -1) decompose(heavy[u], h);
  for (const v of adj[u]) {
    if (v !== parent[u] && v !== heavy[u]) decompose(v, v);
  }
}

sizes(0);
decompose(0, 0);
```

## Path Queries

Store node $u$'s value at index `pos[u]` of an [`IterativeSegTree`](./segment-tree.md#iterative-bottom-up-form). To query the path $u \leadsto v$, repeatedly take the endpoint whose chain head is deeper, consume its chain segment, and jump above the head. Once both are on the same chain, one final range finishes it:

```typescript
const base = new Array(n);
for (let u = 0; u < n; u++) base[pos[u]] = val[u];
const seg = new IterativeSegTree(base);

function pathSum(u: number, v: number): number {
  let res = 0;
  while (head[u] !== head[v]) {
    if (depth[head[u]] < depth[head[v]]) [u, v] = [v, u];
    res += seg.query(pos[head[u]], pos[u]);
    u = parent[head[u]];
  }
  if (depth[u] > depth[v]) [u, v] = [v, u];
  // u is now the LCA
  return res + seg.query(pos[u], pos[v]);
}

const setValue = (u: number, x: number) => seg.update(pos[u], x);
```

Swap the sum for any monoid (max, min, gcd). For **path updates**, use the lazy segment tree and apply the update to the same ranges.

## Notes

- **LCA for free**: the loop above without the queries; the shallower endpoint at the end is the LCA, in $O(\log n)$.
- **Edge weights**: store each edge's weight on its child node, and skip the LCA in the last range with `seg.query(pos[u] + 1, pos[v])`.
- **Subtree queries still work**: `decompose` is a DFS, so $u$'s subtree is the range $[\text{pos}[u], \text{pos}[u] + \text{size}[u] - 1]$, exactly as in [Tree Flattening](./tree-flattening.md). One array serves both path and subtree queries.
- **When to reach for it**: [Tree Flattening](./tree-flattening.md) covers subtree queries and root-to-node sums. [Binary Lifting](./binary-lifting.md) covers path aggregates over static values. HLD is the one for arbitrary $u \leadsto v$ paths **with updates**.
- Both DFS functions recurse to the tree's depth; switch to an explicit stack for deep trees ($n \gtrsim 10^4$).

> [!TIP]
> [CSES Path Queries II](https://cses.fi/problemset/task/2134) (path max, point updates) · [SPOJ QTREE](https://www.spoj.com/problems/QTREE/) (edge weights, path max)
