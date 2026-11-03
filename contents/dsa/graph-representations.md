# Graph Representations

The representation decides what's cheap. Pick it based on the operation the algorithm repeats most often:

| Form             | Space      | Neighbors of $u$ | Is $u$–$v$ an edge? | Natural for                                   |
| ---------------- | ---------- | ---------------- | ------------------- | --------------------------------------------- |
| Adjacency list   | $O(V + E)$ | $O(\deg u)$      | $O(\deg u)$         | BFS, DFS, Dijkstra, almost everything          |
| Adjacency matrix | $O(V^2)$   | $O(V)$           | $O(1)$              | dense graphs, Floyd-Warshall                   |
| Edge list        | $O(E)$     | $O(E)$           | $O(E)$              | Kruskal, Bellman-Ford: anything that scans edges |
| Implicit         | $O(1)$     | computed         | computed            | grids, puzzles, state spaces                   |

## Adjacency List

The default for sparse graphs. `adj[u]` lists the neighbors of `u`:

```typescript
const adj: number[][] = Array.from({ length: n }, () => []);
for (const [u, v] of edges) {
  adj[u].push(v);
  // drop this line for directed graphs
  adj[v].push(u);
}

// weighted:
const wadj: [number, number][][] = Array.from({ length: n }, () => []);
for (const [u, v, w] of edges) {
  wadj[u].push([v, w]);
  wadj[v].push([u, w]);
}
```

$O(V + E)$ space. Iterating a vertex's neighbors is $O(\deg(u))$.

Useful variants:

- **Reverse graph**: also build `radj` with every edge flipped. Kosaraju's SCC, "which nodes can reach $t$?" (BFS from $t$ on `radj`), and "safe states" problems all need it.
- **Neighbor sets**: `Set<number>[]` instead of arrays gives $O(1)$ edge checks and deletions. That's useful for problems that remove edges or count triangles, at roughly 3–5× the memory.

## Edge IDs

Sometimes an algorithm needs to mark an **edge**, not a vertex, as used. Examples are undirected Eulerian paths, bridges, and "remove this edge" queries. In an undirected adjacency list each edge appears twice, so give both copies the same ID:

```typescript
// adj[u]: [neighbor, edgeId]
const adj: [number, number][][] = Array.from({ length: n }, () => []);
edges.forEach(([u, v], id) => {
  adj[u].push([v, id]);
  adj[v].push([u, id]);
});
const used = new Array(edges.length).fill(false);
```

For bridges and articulation points, the ID also replaces the "skip the parent" check. Skip the **edge** you arrived by, not the parent vertex, so parallel edges are handled correctly.

## Adjacency Matrix

`M[u][v]` is the weight, or $\infty$ for no edge. That's $O(V^2)$ space with $O(1)$ edge lookup. Use it when $|E| \approx |V|^2$, when the algorithm is naturally written over a matrix (Floyd-Warshall, [Bitmask DP](./dp-bitmask.md) over a small vertex set), or when $V$ is a few hundred and simplicity matters more than memory.

Matrix powers count walks: $(M^k)[u][v]$ is the number of length-$k$ walks from $u$ to $v$ when $M$ is a 0/1 matrix. With [binary exponentiation](../math/arithmetic.md), that's $O(V^3 \log k)$.

## Edge List

Just `[u, v, w][]`. It's the natural input for algorithms that scan or sort all edges ([Kruskal](./mst.md), [Bellman-Ford](./shortest-paths.md#bellman-ford)). Everywhere else, build an adjacency list first.

## Flat Arrays (CSR)

For large graphs ($10^6$ edges and up), an array of arrays costs one heap allocation per vertex, and the neighbors end up scattered across memory. **Compressed sparse row** (CSR) packs all neighbors into one typed array, with `start[u]` marking where vertex `u`'s neighbors begin:

```typescript
// counting sort of edges by source vertex
const start = new Int32Array(n + 1);
for (const [u] of edges) start[u + 1]++;
for (let u = 0; u < n; u++) start[u + 1] += start[u];
const to = new Int32Array(edges.length);
// next free slot per vertex
const pos = start.slice(0, n);
for (const [u, v] of edges) to[pos[u]++] = v;

// neighbors of u: to[start[u] .. start[u + 1])
for (let i = start[u]; i < start[u + 1]; i++) visit(to[i]);
```

It holds the same information as an adjacency list, and it's usually several times faster and smaller in JS. The trade-off is that the graph is fixed after building. For an undirected graph, push both directions into `edges` first.

## Implicit Graphs

Often the graph is never stored. Vertices are **states**, and neighbors are computed on demand. BFS and Dijkstra don't care, as long as you can list a state's neighbors and mark states as visited.

### Grid as Graph

A grid is a graph in disguise: every cell is a vertex, and its neighbors are the 4 (sometimes 8) adjacent cells. No adjacency list is needed. Generate neighbors on the fly:

```typescript
const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

for (const [dr, dc] of DIRS) {
  const nr = r + dr,
    nc = c + dc;
  if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
  if (grid[nr][nc] === BLOCKED) continue;
  // visit (nr, nc)
}
```

"Number of islands", "rotting oranges", "shortest path in a binary matrix", "flood fill", "word search": all grid-as-graph. Use BFS when the question is "fewest steps", and DFS when it's "is it reachable" or "how big is this component".

**Encoding cells as integers.** $\text{id} = r \cdot \text{cols} + c$ turns 2D coordinates into a 1D vertex ID, which is useful when you want to reuse generic graph code (DSU, adjacency lists) without nested arrays.

> [!TIP]
> [200 Number of Islands](https://leetcode.com/problems/number-of-islands/) · [463 Island Perimeter](https://leetcode.com/problems/island-perimeter/) · [695 Max Area of Island](https://leetcode.com/problems/max-area-of-island/) · [1091 Shortest Path in Binary Matrix](https://leetcode.com/problems/shortest-path-in-binary-matrix/) · [79 Word Search](https://leetcode.com/problems/word-search/)

### State Spaces

When the position alone doesn't determine the future, add more fields to the state: `(cell, keysHeld)`, `(cell, obstaclesRemovedSoFar)`, `(node, parity)`. The graph is then the product of the position and the extra fields. Encode each state as one integer or a string key, and run plain BFS over it.

- **Size check first.** The state count is the product of the field ranges, like $R \cdot C \cdot 2^{\text{keys}}$. If that's too large, the extra field is too detailed.
- **Word ladders and lock combinations**: each string is a vertex, and the neighbors are all one-edit variants. Generate them by changing each position, or bucket words by wildcard patterns like `h*t`.

> [!TIP]
> [864 Shortest Path to Get All Keys](https://leetcode.com/problems/shortest-path-to-get-all-keys/) · [1293 Shortest Path in a Grid with Obstacles Elimination](https://leetcode.com/problems/shortest-path-in-a-grid-with-obstacles-elimination/) · [752 Open the Lock](https://leetcode.com/problems/open-the-lock/) · [127 Word Ladder](https://leetcode.com/problems/word-ladder/)
