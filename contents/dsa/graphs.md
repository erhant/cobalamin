# Graphs

A **graph** is a set of vertices $V$ and edges $E \subseteq V \times V$. Almost every algorithm in this chapter is "visit vertices via edges in the right order with the right bookkeeping" — the art is picking the order (FIFO, LIFO, priority queue) and the bookkeeping (visited, distance, parent, color).

Main axes to classify a graph:

- **Directed vs undirected** — does an edge $u \to v$ imply $v \to u$?
- **Weighted vs unweighted** — do edges carry costs? Unweighted is the $w \equiv 1$ special case.
- **Dense vs sparse** — is $|E|$ closer to $|V|^2$ or to $|V|$? Decides representation.
- **Cyclic vs acyclic** — DAGs unlock topological order and bottom-up DP.

Problems worth recognizing on sight:

- **Reachability / connected components** — any traversal.
- **Shortest path** — BFS if unweighted, Dijkstra for non-negative weights, Bellman-Ford if negatives, Floyd-Warshall for all pairs. See [Shortest Paths](./shortest-paths.md).
- **Ordering with dependencies** — topological sort on a DAG.
- **Cycle detection** — DFS colors (directed) or [Union-Find](./union-find.md) (undirected).
- **Bipartite check** — 2-coloring via BFS.
- **Minimum spanning tree** — Kruskal (DSU) or Prim (heap). See [Minimum Spanning Tree](./mst.md).
- **Use every edge once** — Eulerian path via Hierholzer.
- **Subtree / ancestor queries on a tree** — Euler tour flattening into ranges ([Tree Flattening](./tree-flattening.md)), or jump pointers ([Binary Lifting](./binary-lifting.md)).
- **Strong connectivity** — Tarjan / Kosaraju SCC.

## Representations

The snippets in this chapter take an **adjacency list**: `adj[u]` lists the neighbors of `u`, and in weighted graphs it holds `[v, w]` pairs. Matrices, edge lists, edge IDs, flat arrays, and graphs that are never built at all (grids, state spaces) are covered in [Graph Representations](./graph-representations.md).

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

For weighted edges, see [Shortest Paths](./shortest-paths.md), which starts with 0-1 BFS, the in-between case of weights in $\{0, 1\}$.

> [!TIP]
> [102 Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/) · [994 Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) (multi-source) · [542 01 Matrix](https://leetcode.com/problems/01-matrix/) (multi-source) · [127 Word Ladder](https://leetcode.com/problems/word-ladder/)

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

> [!TIP]
> [207 Course Schedule](https://leetcode.com/problems/course-schedule/) · [210 Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) · [269 Alien Dictionary](https://leetcode.com/problems/alien-dictionary/) · [802 Find Eventual Safe States](https://leetcode.com/problems/find-eventual-safe-states/)

## Eulerian Path & Circuit

An **Eulerian path** uses every **edge** exactly once. An **Eulerian circuit** is one that also ends where it started. The vertex version of the question, visiting every vertex exactly once (a Hamiltonian path), is NP-hard. The edge version is linear.

Existence depends only on degrees, assuming all edges are in one connected component:

| Graph      | Circuit                   | Path                                                                                     |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| Undirected | every degree even         | exactly $0$ or $2$ odd-degree vertices; start at an odd one                               |
| Directed   | $\text{in} = \text{out}$ everywhere | at most one vertex with $\text{out} - \text{in} = 1$ (the start) and one with $\text{in} - \text{out} = 1$ (the end) |

**Hierholzer's algorithm.** Walk unused edges from the start until you get stuck. You can only get stuck at the end of the path. Then backtrack, and splice in a detour from any vertex that still has unused edges. Written with an explicit stack, each vertex goes onto the output **when it has no edges left**, so the output comes out in reverse:

```typescript
// adj: directed adjacency list; returns vertices in path order
function eulerPath(adj: number[][], start: number): number[] {
  // ptr[u]: next unused edge of u, so each edge is walked once
  const ptr = new Array(adj.length).fill(0);
  const stack = [start];
  const path: number[] = [];
  while (stack.length) {
    const u = stack[stack.length - 1];
    if (ptr[u] < adj[u].length) {
      stack.push(adj[u][ptr[u]++]);
    } else {
      // u is exhausted: it is final at this position
      path.push(stack.pop()!);
    }
  }
  return path.reverse();
}
```

This runs in $O(V + E)$. Pick the start from the table: the vertex with $\text{out} - \text{in} = 1$ if there is one, otherwise any vertex with an edge. If `path.length !== E + 1`, the edges weren't connected and no Eulerian path exists.

- **Lexicographically smallest path**: sort each `adj[u]` ascending first. The greedy walk then always tries the smallest neighbor, and the splicing keeps the result valid. This is exactly LC 332.
- **Undirected graphs**: each edge appears in both endpoints' lists, so store `[v, edgeId]` and keep a `used[edgeId]` array. Skip used edges when advancing `ptr[u]`.
- **De Bruijn sequences** are Eulerian circuits in disguise. The vertices are the $(n-1)$-length strings, and each edge appends one symbol. That's LC 753.

> [!TIP]
> [332 Reconstruct Itinerary](https://leetcode.com/problems/reconstruct-itinerary/) · [2097 Valid Arrangement of Pairs](https://leetcode.com/problems/valid-arrangement-of-pairs/) · [753 Cracking the Safe](https://leetcode.com/problems/cracking-the-safe/)

## Cheat Sheet

| Problem                              | Tool                         | Time                         |
| ------------------------------------ | ---------------------------- | ---------------------------- |
| Reachability / connected components  | DFS or BFS                   | $O(V + E)$                   |
| Shortest path, unweighted            | BFS                          | $O(V + E)$                   |
| Shortest path, weights in $\{0, 1\}$ | [0-1 BFS](./shortest-paths.md#0-1-bfs) | $O(V + E)$                   |
| Shortest path, non-negative weights  | [Dijkstra](./shortest-paths.md#dijkstra) | $O((V + E) \log V)$          |
| Shortest path, negative weights      | [Bellman-Ford](./shortest-paths.md#bellman-ford) | $O(VE)$                      |
| All-pairs shortest paths             | [Floyd-Warshall](./shortest-paths.md#floyd-warshall) | $O(V^3)$                     |
| Topological order (DAG)              | Kahn's or DFS post-order     | $O(V + E)$                   |
| Cycle in directed graph              | DFS three-coloring           | $O(V + E)$                   |
| Cycle in undirected graph            | DSU or DFS-with-parent       | $O((V + E) \cdot \alpha(V))$ |
| Minimum spanning tree                | [Kruskal or Prim](./mst.md) | $O(E \log E)$, dense $O(V^2)$ |
| Eulerian path / circuit              | Hierholzer                   | $O(V + E)$                   |
| Subtree queries / ancestor test      | [Euler tour (tin / tout)](./tree-flattening.md) | $O(n)$ + range structure     |
| LCA, $O(1)$ per query                | [Euler tour + sparse table](./tree-flattening.md#lca-via-euler-tour) | $O(n \log n)$ build          |
| LCA + k-th ancestor, $O(\log n)$     | [Binary Lifting](./binary-lifting.md) | $O(n \log n)$ build          |
| Strongly connected components        | Tarjan / Kosaraju            | $O(V + E)$                   |
| Bipartite check / 2-coloring         | BFS                          | $O(V + E)$                   |
