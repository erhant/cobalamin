# Graphs

A **graph** is a set of vertices $V$ and edges $E \subseteq V \times V$. Almost every algorithm in this chapter is "visit vertices via edges in the right order with the right bookkeeping" — the art is picking the order (FIFO, LIFO, priority queue) and the bookkeeping (visited, distance, parent, color).

Main axes to classify a graph:

- **Directed vs undirected** — does an edge $u \to v$ imply $v \to u$?
- **Weighted vs unweighted** — do edges carry costs? Unweighted is the $w \equiv 1$ special case.
- **Dense vs sparse** — is $|E|$ closer to $|V|^2$ or to $|V|$? Decides representation.
- **Cyclic vs acyclic** — DAGs unlock topological order and bottom-up DP.

Problems worth recognizing on sight:

- **Reachability / connected components** — any traversal.
- **Shortest path** — BFS if unweighted, Dijkstra for non-negative weights, Bellman-Ford if negatives, Floyd-Warshall for all pairs.
- **Ordering with dependencies** — topological sort on a DAG.
- **Cycle detection** — DFS colors (directed) or [Union-Find](./union-find.md) (undirected).
- **Bipartite check** — 2-coloring via BFS.
- **Minimum spanning tree** — Kruskal (DSU) or Prim (heap).
- **Strong connectivity** — Tarjan / Kosaraju SCC.

## Representations

**Adjacency list** — the default for sparse graphs. `adj[u]` lists the neighbors of `u`:

```typescript
const adj: number[][] = Array.from({ length: n }, () => []);
for (const [u, v] of edges) {
  adj[u].push(v);
  adj[v].push(u); // drop this line for directed graphs
}

// weighted:
const wadj: [number, number][][] = Array.from({ length: n }, () => []);
for (const [u, v, w] of edges) {
  wadj[u].push([v, w]);
  wadj[v].push([u, w]);
}
```

$O(V + E)$ space. Iterating a vertex's neighbors is $O(\deg(u))$.

**Adjacency matrix** — `M[u][v]` is the weight or $\infty$. $O(V^2)$ space, $O(1)$ edge lookup. Use when $|E| \approx |V|^2$ or when the algorithm (Floyd-Warshall) wants matrix form.

**Edge list** — just `[u, v, w][]`. Natural for Kruskal's MST and Bellman-Ford; everywhere else, build an adjacency list first.

## BFS — Unweighted Shortest Paths

BFS visits vertices in order of edge-count distance from the source. Queue + visited set:

```typescript
function bfs(start: number, adj: number[][]): number[] {
  const dist = new Array(adj.length).fill(-1);
  dist[start] = 0;
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of adj[u]) {
      if (dist[v] === -1) {
        dist[v] = dist[u] + 1;
        queue.push(v);
      }
    }
  }
  return dist;
}
```

$O(V + E)$. Using a `head` index instead of `Array.shift()` avoids the $O(n)$ reshuffle JS does on every shift.

**Multi-source BFS.** Seed the queue with every source at distance $0$, then run the same loop. Produces "distance to nearest source" for every cell in one sweep — the standard trick for "rotting oranges", "walls and gates", "distance from each zero to the nearest one", etc.

**0-1 BFS.** When edge weights are only $0$ or $1$, a plain `Deque` suffices: push `0`-weight edges to the front, `1`-weight to the back. Same $O(V + E)$ as BFS, no heap needed.

## DFS

Depth-first. Recursion is the cleanest form; switch to an explicit stack only when the call depth threatens overflow.

```typescript
const visited = new Array(n).fill(false);

function dfs(u: number): void {
  visited[u] = true;
  for (const v of adj[u]) if (!visited[v]) dfs(v);
}
```

$O(V + E)$. The same skeleton powers connectivity, component sizes, topological post-order, Tarjan's SCC / bridges / articulation points, and most tree-on-a-graph DP.

### Cycle Detection

**Directed graph — three colors.** White = unvisited, gray = on the current DFS stack, black = fully processed. Any edge to a gray vertex is a back-edge, i.e. a cycle.

```typescript
const WHITE = 0,
  GRAY = 1,
  BLACK = 2;
const color = new Array(n).fill(WHITE);

function hasCycle(u: number): boolean {
  color[u] = GRAY;
  for (const v of adj[u]) {
    if (color[v] === GRAY) return true;
    if (color[v] === WHITE && hasCycle(v)) return true;
  }
  color[u] = BLACK;
  return false;
}
```

Run from every white vertex to cover disconnected components.

**Undirected graph.** A back-edge here is any edge to a visited vertex that isn't the parent of the current node. Or — usually simpler — build a DSU and declare a cycle the moment an edge joins two vertices that already share a root (see [Union-Find](./union-find.md)).

## Topological Sort

Given a DAG, produce an ordering where every edge points forward. Two standard algorithms, both $O(V + E)$.

### Kahn's Algorithm (BFS on Indegrees)

Repeatedly emit any vertex with indegree $0$, then "remove" it by decrementing its neighbors' indegrees:

```typescript
const indeg = new Array(n).fill(0);
for (const nbrs of adj) {
  for (const v of nbrs) {
    indeg[v]++;
  }
}

const queue: number[] = [];
for (let u = 0; u < n; u++) if (indeg[u] === 0) queue.push(u);

const order: number[] = [];
for (let head = 0; head < queue.length; head++) {
  const u = queue[head];
  order.push(u);
  for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
}
// order.length < n ⇒ graph has a cycle
```

Bonus: detects cycles for free (short output means some vertex's indegree never hit zero).

### DFS Post-Order

Post-order DFS, then reverse. A vertex is emitted only after all its descendants, so reversing puts it before them:

```typescript
const order: number[] = [];
function visit(u: number) {
  visited[u] = true;
  for (const v of adj[u]) if (!visited[v]) visit(v);
  order.push(u);
}
for (let u = 0; u < n; u++) if (!visited[u]) visit(u);
order.reverse();
```

For cycle detection in this form, use the three-color variant above instead of the boolean `visited`.

## Dijkstra — Non-negative Weighted Shortest Paths

BFS generalized to non-negative edge weights. Min-heap keyed on the best known distance so far:

```typescript
function dijkstra(start: number, adj: [number, number][][]): number[] {
  const dist = new Array(adj.length).fill(Infinity);
  dist[start] = 0;
  const pq = new MinHeap<[number, number]>((a, b) => a[0] - b[0]); // [dist, node]
  pq.push([0, start]);

  while (pq.size) {
    const [d, u] = pq.pop();
    if (d > dist[u]) continue; // stale entry — newer path already processed
    for (const [v, w] of adj[u]) {
      const nd = d + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        pq.push([nd, v]);
      }
    }
  }
  return dist;
}
```

$O((V + E) \log V)$ with a binary heap. JS has no built-in priority queue — bring your own (an array-backed binary heap is ~30 lines).

**"Stale entry" trick.** Instead of implementing decrease-key, push a fresh `(nd, v)` whenever we improve `dist[v]`, and on pop skip entries whose `d` is worse than the current `dist[u]`. Simpler code, same asymptotics.

**Negative weights break Dijkstra.** The greedy "once you're popped, you're final" argument relies on all future paths only getting longer. With a negative edge, a later detour could undercut. Use **Bellman-Ford** ($O(VE)$) when negatives are possible, or **SPFA** as a faster-in-practice variant. **Floyd-Warshall** ($O(V^3)$) gives all-pairs shortest paths and handles negatives (but not negative cycles).

## Grid as Graph

A grid is a graph in disguise: every cell is a vertex, adjacencies are the 4 (sometimes 8) neighbors. No explicit adjacency list needed — generate neighbors on the fly:

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

"Number of islands", "rotting oranges", "shortest path in a binary matrix", "flood fill", "word search" — all grid-as-graph. BFS when the question is "fewest steps"; DFS when it's "is it reachable" or "how big is this component".

**Encoding cells as integers.** `id = r * cols + c` turns 2D coordinates into a 1D vertex ID — useful when you want to reuse generic graph code (DSU, adjacency lists) without nesting arrays.

## Cheat Sheet

| Problem                              | Tool                         | Time                         |
| ------------------------------------ | ---------------------------- | ---------------------------- |
| Reachability / connected components  | DFS or BFS                   | $O(V + E)$                   |
| Shortest path, unweighted            | BFS                          | $O(V + E)$                   |
| Shortest path, weights in $\{0, 1\}$ | 0-1 BFS (deque)              | $O(V + E)$                   |
| Shortest path, non-negative weights  | Dijkstra                     | $O((V + E) \log V)$          |
| Shortest path, negative weights      | Bellman-Ford                 | $O(VE)$                      |
| All-pairs shortest paths             | Floyd-Warshall               | $O(V^3)$                     |
| Topological order (DAG)              | Kahn's or DFS post-order     | $O(V + E)$                   |
| Cycle in directed graph              | DFS three-coloring           | $O(V + E)$                   |
| Cycle in undirected graph            | DSU or DFS-with-parent       | $O((V + E) \cdot \alpha(V))$ |
| Minimum spanning tree                | Kruskal (DSU) or Prim (heap) | $O(E \log E)$                |
| Strongly connected components        | Tarjan / Kosaraju            | $O(V + E)$                   |
| Bipartite check / 2-coloring         | BFS                          | $O(V + E)$                   |
