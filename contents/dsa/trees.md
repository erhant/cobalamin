# Trees

A **tree** on $n$ nodes is a connected, acyclic graph. It always has exactly $n - 1$ edges, and any two of these three properties imply the third. Between any two nodes there is exactly one simple path, which is what makes tree problems tractable: "the path from $u$ to $v$" is well defined.

Picking a **root** orients every edge: each non-root node gets a parent, and subtrees, depths and ancestors follow. Unless a page says otherwise, the pages in this group take a tree as an undirected adjacency list `adj: number[][]` over nodes $0..n-1$, rooted at $0$. [Binary Trees](./binary-trees.md) are the special case stored as `left` / `right` pointers instead.

## Parent, Depth, Size

One DFS from the root gives the arrays nearly every tree technique starts from:

```typescript
const parent = new Array(n).fill(-1);
const depth = new Array(n).fill(0);
const size = new Array(n).fill(1);

function dfs(u: number, p: number): void {
  parent[u] = p;
  for (const v of adj[u]) {
    // the only neighbor that isn't a child is the parent
    if (v === p) continue;
    depth[v] = depth[u] + 1;
    dfs(v, u);
    size[u] += size[v];
  }
}
dfs(0, -1);
```

Recursion depth equals tree depth, so a path-shaped tree with $n \gtrsim 10^4$ overflows the JS stack. The iterative form uses BFS order, where every parent comes before its children:

```typescript
const order = [0];
for (let i = 0; i < order.length; i++) {
  const u = order[i];
  for (const v of adj[u]) {
    if (v === parent[u]) continue;
    parent[v] = u;
    depth[v] = depth[u] + 1;
    order.push(v);
  }
}
// reversed BFS order visits children before parents
for (let i = n - 1; i > 0; i--) size[parent[order[i]]] += size[order[i]];
```

## Techniques

| Question                                     | Technique                                                    | Cost after preprocessing  |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| $k$-th ancestor, LCA, static path aggregates | [Binary Lifting](./binary-lifting.md)                        | $O(\log n)$               |
| Subtree query / update                       | [Tree Flattening](./tree-flattening.md) + a range structure   | $O(\log n)$               |
| Path query / update between any $u, v$       | [Heavy-Light Decomposition](./heavy-light-decomposition.md)  | $O(\log^2 n)$             |

The last two turn tree questions into [Range Queries](./range-queries.md) over an array.
