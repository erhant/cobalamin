# Minimum Spanning Tree

A **spanning tree** of a connected, undirected, weighted graph connects all $V$ vertices using exactly $V - 1$ edges. A **minimum spanning tree (MST)** is one with the smallest total weight.

Both classic algorithms are greedy and rest on the **cut property**: for any split of the vertices into two sides, the lightest edge crossing the split belongs to some MST. Kruskal and Prim differ only in which cut they look at: Kruskal's separates the two components an edge would join, Prim's separates the current tree from everything else.

## Kruskal (Sort Edges + DSU)

Sort the edges by weight and take each one unless it would close a cycle. "Would close a cycle" means both endpoints are already in the same component, which is exactly what [Union-Find](./union-find.md) answers.

```typescript
// edges: [u, v, w][]; returns the MST weight, or -1 if the graph is disconnected
function kruskal(n: number, edges: [number, number, number][]): number {
  const uf = new UnionFind(n);
  let total = 0;
  let used = 0;
  for (const [u, v, w] of [...edges].sort((a, b) => a[2] - b[2])) {
    // same component already: this edge would close a cycle
    if (uf.find(u) === uf.find(v)) continue;
    uf.union(u, v);
    total += w;
    // a tree has n - 1 edges, so stop early
    if (++used === n - 1) break;
  }
  return used === n - 1 ? total : -1;
}
```

The cost is $O(E \log E)$, dominated by the sort. The DSU work is $O(E \cdot \alpha(V))$. Kruskal takes the edge list directly, so it's the natural pick when the input arrives that way.

## Prim (Grow From a Vertex + Heap)

Start from any vertex and grow a single tree. At each step, add the lightest edge leaving the tree. The heap holds candidate edges as `[w, v]`, and it uses the same **stale entry** skip as [Dijkstra](./shortest-paths.md#dijkstra): a vertex that is already in the tree is ignored when it's popped again.

```typescript
// adj: weighted adjacency list; returns the MST weight, or -1 if the graph is disconnected
function prim(adj: [number, number][][]): number {
  const inTree = new Array(adj.length).fill(false);
  // [weight, node]
  const pq = new MinHeap<[number, number]>((a, b) => a[0] < b[0]);
  // seed: vertex 0 joins for free
  pq.push([0, 0]);
  let total = 0;
  let count = 0;
  while (pq.size()) {
    const [w, u] = pq.pop()!;
    // stale entry: u was already reached by a lighter edge
    if (inTree[u]) continue;
    inTree[u] = true;
    total += w;
    count++;
    for (const [v, wv] of adj[u]) {
      if (!inTree[v]) pq.push([wv, v]);
    }
  }
  return count === adj.length ? total : -1;
}
```

This is $O(E \log V)$. The heap holds up to $E$ entries, and $\log E \le 2 \log V$, so the two bounds match.

It looks almost identical to Dijkstra. The only difference is the heap key: Prim uses the **edge weight** `wv`, while Dijkstra uses the **path length** `d + w`.

## Dense Graphs: Prim Without a Heap

When the graph is complete (for example, every pair of points connected), $E \approx V^2$. Building the edge list or the heap then costs $O(V^2 \log V)$. Instead, keep `best[v]`, the cheapest edge from the tree to each vertex outside it. Each step takes the outside vertex with the smallest `best` by a linear scan, then relaxes all others. This runs in $O(V^2)$ and never stores an edge:

```typescript
// cost(u, v): weight of edge u–v, computed on demand
function primDense(n: number, cost: (u: number, v: number) => number): number {
  const best = new Array(n).fill(Infinity);
  const inTree = new Array(n).fill(false);
  best[0] = 0;
  let total = 0;
  for (let step = 0; step < n; step++) {
    // pick the outside vertex closest to the tree
    let u = -1;
    for (let v = 0; v < n; v++) {
      if (!inTree[v] && (u === -1 || best[v] < best[u])) u = v;
    }
    inTree[u] = true;
    total += best[u];
    for (let v = 0; v < n; v++) {
      if (!inTree[v]) best[v] = Math.min(best[v], cost(u, v));
    }
  }
  return total;
}
```

## Notes

- **Disconnected graphs** have no spanning tree. Kruskal then produces a minimum spanning **forest**, and the `-1` checks above catch it.
- **Maximum spanning tree**: sort descending, or negate the weights. The same greedy argument applies.
- **Equal weights** can make the MST non-unique, but the total weight is always the same.
- **Minimax paths**: in an MST, the path between $u$ and $v$ minimizes the largest edge on it. That's why "minimize the maximum effort" problems can be solved Kruskal-style: add edges in weight order until $u$ and $v$ connect.
- **Virtual node trick**: when each vertex can also "pay to be self-sufficient" (like building a well instead of a pipe), add a node $0$ with an edge of that cost to every vertex, then run a plain MST.

> [!TIP]
> [1584 Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) (dense Prim) · [1135 Connecting Cities With Minimum Cost](https://leetcode.com/problems/connecting-cities-with-minimum-cost/) · [1168 Optimize Water Distribution in a Village](https://leetcode.com/problems/optimize-water-distribution-in-a-village/) (virtual node) · [1489 Find Critical and Pseudo-Critical Edges in MST](https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/) · [1631 Path With Minimum Effort](https://leetcode.com/problems/path-with-minimum-effort/) (minimax)
