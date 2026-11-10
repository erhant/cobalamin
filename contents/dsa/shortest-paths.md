# Shortest Paths

Pick the algorithm by the edge weights and by how many sources you need:

| Weights                          | Single source                                    | All pairs                         |
| -------------------------------- | ------------------------------------------------ | --------------------------------- |
| none (unweighted)                | [BFS](./graphs.md#bfs--unweighted-shortest-paths), $O(V + E)$ | BFS from each vertex, $O(V(V + E))$ |
| $\{0, 1\}$                       | 0-1 BFS, $O(V + E)$                              |                                   |
| non-negative                     | Dijkstra, $O((V + E) \log V)$                    | Dijkstra from each vertex         |
| negative, no negative cycles     | Bellman-Ford, $O(VE)$                            | Floyd-Warshall, $O(V^3)$          |
| DAG, any sign                    | relax in topological order, $O(V + E)$           |                                   |

All of them share one operation, **relaxation**. If going through $u$ is shorter, $\text{dist}[v] = \text{dist}[u] + w$. They differ only in the order in which edges get relaxed.

## 0-1 BFS

When edge weights are only $0$ or $1$, a deque replaces the heap. Push the target of a $0$-edge to the **front**, since it's as close as the current vertex, and the target of a $1$-edge to the **back**. The deque then holds at most two distinct distances at any time, in order, which is all Dijkstra's heap was guaranteeing anyway.

```typescript
// adj[u]: [v, w] with w in {0, 1}
function bfs01(start: number, adj: [number, number][][]): number[] {
  const n = adj.length;
  const dist = new Array(n).fill(Infinity);
  dist[start] = 0;
  // ring-buffer deque: entries hold only distances D and D + 1, at most one per vertex each
  const cap = 2 * n + 1;
  const dq = new Int32Array(cap);
  let head = 0;
  let size = 1;
  dq[0] = start;
  while (size) {
    const u = dq[head];
    head = (head + 1) % cap;
    size--;
    for (const [v, w] of adj[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        if (w === 0) {
          // push front
          head = (head - 1 + cap) % cap;
          dq[head] = v;
        } else {
          // push back
          dq[(head + size) % cap] = v;
        }
        size++;
      }
    }
  }
  return dist;
}
```

This is $O(V + E)$. Typical use: a grid where moving along an arrow is free and changing direction costs 1, or a cell can be entered by "breaking a wall" for cost 1.

> [!TIP]
> [1368 Minimum Cost to Make at Least One Valid Path in a Grid](https://leetcode.com/problems/minimum-cost-to-make-at-least-one-valid-path-in-a-grid/) · [2290 Minimum Obstacle Removal to Reach Corner](https://leetcode.com/problems/minimum-obstacle-removal-to-reach-corner/)

## Dijkstra

BFS generalized to non-negative edge weights. Min-heap keyed on the best known distance so far:

```typescript
function dijkstra(start: number, adj: [number, number][][]): number[] {
  const dist = new Array(adj.length).fill(Infinity);
  dist[start] = 0;
  // [dist, node]
  const pq = new MinHeap<[number, number]>((a, b) => a[0] < b[0]);
  pq.push([0, start]);

  while (pq.size()) {
    const [d, u] = pq.pop()!;
    // stale entry — newer path already processed
    if (d > dist[u]) continue;
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

$O((V + E) \log V)$ with a binary heap. JS has no built-in priority queue — bring your own ([Heap](./heap.md) has a ~30 line array-backed one).

**"Stale entry" trick.** Instead of implementing decrease-key, push a fresh `(nd, v)` whenever we improve `dist[v]`, and on pop skip entries whose `d` is worse than the current `dist[u]`. Simpler code, same asymptotics.

**Negative weights break Dijkstra.** The greedy "once you're popped, you're final" argument relies on all future paths only getting longer. With a negative edge, a later detour could undercut. Use Bellman-Ford below.

Variations that keep the same skeleton:

- **Path reconstruction**: record `parent[v] = u` on every successful relaxation, then walk `parent` back from the target and reverse.
- **Multi-source**: push every source with distance $0$ before the loop.
- **Extra state**: Dijkstra over `(node, k)` pairs for questions like "at most $k$ discounts" or "at most $k$ stops". The [state-space](./graph-representations.md#state-spaces) idea applies to weighted graphs too.
- **Other path costs**: any cost that never decreases as the path grows works, including the max edge on the path (minimax) and the product of probabilities $\le 1$ (with a max-heap). Swap `d + w` for `Math.max(d, w)` or `d * w`.

> [!TIP]
> [743 Network Delay Time](https://leetcode.com/problems/network-delay-time/) · [1631 Path With Minimum Effort](https://leetcode.com/problems/path-with-minimum-effort/) (minimax) · [1514 Path with Maximum Probability](https://leetcode.com/problems/path-with-maximum-probability/) · [787 Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) (extra state, or Bellman-Ford)

## Bellman-Ford

Relax **every edge**, $V - 1$ times. A shortest path without cycles has at most $V - 1$ edges, and after round $i$, every vertex whose shortest path uses at most $i$ edges has its final distance: round $i$ relaxes the last edge of that path. No ordering is needed, so negative weights are fine.

```typescript
// returns null if a negative cycle is reachable from start
function bellmanFord(n: number, edges: [number, number, number][], start: number): number[] | null {
  const dist = new Array(n).fill(Infinity);
  dist[start] = 0;
  for (let round = 0; round < n - 1; round++) {
    let changed = false;
    for (const [u, v, w] of edges) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        changed = true;
      }
    }
    // nothing moved this round: everything is final already
    if (!changed) return dist;
  }
  // one more round still improving means a negative cycle
  for (const [u, v, w] of edges) {
    if (dist[u] + w < dist[v]) return null;
  }
  return dist;
}
```

This is $O(VE)$. Skipping vertices with `dist[u] === Infinity` comes for free, because `Infinity + w` is never smaller than anything.

**At most $k$ edges.** Run exactly $k$ rounds, and relax each round from a **copy** of the previous round's `dist`. Without the copy, a single round can chain several edges together. This is the clean solution to LC 787.

> [!TIP]
> [787 Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) · [743 Network Delay Time](https://leetcode.com/problems/network-delay-time/)

## Floyd-Warshall

All-pairs shortest paths. Allow vertex `k` as a possible stop, for $k = 0, 1, \dots, V - 1$ in turn. After step $k$, `d[i][j]` is the shortest path whose intermediate vertices are all in $\{0, \dots, k\}$.

```typescript
// d: V×V matrix, d[i][i] = 0, d[i][j] = w or Infinity; updated in place
function floydWarshall(d: number[][]): void {
  const n = d.length;
  // k outermost: step k needs d[i][k] and d[k][j] to already allow stops 0..k-1
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
      }
    }
  }
}
```

This is $O(V^3)$ time and $O(V^2)$ space, practical up to $V \approx 500$. Negative edges are fine. A negative cycle shows up afterwards as some $d[i][i] < 0$.

Swapping the operations gives other "all pairs" questions: `||` and `&&` for **reachability** (transitive closure), or `max` and `min` for the **widest path**.

> [!TIP]
> [1334 Find the City With the Smallest Number of Neighbors at a Threshold Distance](https://leetcode.com/problems/find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance/) · [1462 Course Schedule IV](https://leetcode.com/problems/course-schedule-iv/) (reachability) · [2976 Minimum Cost to Convert String I](https://leetcode.com/problems/minimum-cost-to-convert-string-i/)

## DAGs

On a DAG, relax the edges out of each vertex in [topological order](./graphs.md#topological-sort). Each vertex's distance is final before it's used, so this is $O(V + E)$ for any edge signs. Negating the weights gives the **longest path**, which is NP-hard on general graphs but easy here.
