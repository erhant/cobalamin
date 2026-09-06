# Bitmask DP

When a state needs "which subset of $n$ elements has been used / visited / chosen", encode the subset as an integer `mask ∈ [0, 2^n)` — bit $i$ is $1$ iff element $i$ is in the set. The whole subset lattice indexes a single flat array, and transitions become bit operations. The trade-off is that $n$ must be small: $2^n$ is the table size, so $n \le 20$ or so is the practical ceiling ($2^{20} \approx 10^6$).

Use bitmask DP when the state has to remember the **identity** of the set, not just its size — two configurations covering different elements are not interchangeable even at the same count. Classic shapes: traveling salesman, assignment, set cover, Hamiltonian-path counting, partition into groups.

## The trick: subset as integer

| Op                   | Meaning                                |
| -------------------- | -------------------------------------- |
| `mask & (1 << i)`    | is element $i$ in the set?             |
| `mask \| (1 << i)`   | add element $i$                        |
| `mask & ~(1 << i)`   | remove element $i$                     |
| `mask ^ (1 << i)`    | toggle element $i$                     |
| `mask & (mask - 1)`  | clear lowest set bit                   |
| `s = (s - 1) & mask` | step to next non-empty submask of mask |

Iteration order is the natural topological order on the subset lattice: if transitions only _add_ elements, iterate `mask` ascending — every `mask'` with `mask' ⊃ mask` comes later. If transitions _remove_ elements, iterate descending.

See [Bit Manipulation](./bits.md) for the cheat-sheet, popcount tricks, and JS-specific pitfalls (32-bit overflow, operator precedence).

## State

Two shapes recur:

- **`(mask, position)`** — when which element was placed last matters (TSP, Hamiltonian paths, "best path through a chosen subset"). The mask records _what_, the position records _where you are_.
- **`mask`** alone — when only the set matters (assignment, partition into groups, set cover). The "next slot to fill" is implicit: `popcount(mask)` says how many elements have been processed.

Add a position dimension only when transitions actually depend on it. Every extra dimension multiplies the table.

## Worked example: Traveling Salesman

Given $n$ cities and a distance matrix $d[i][j]$, find the shortest tour starting at city $0$, visiting every city once, and returning. State `(mask, i)` = "shortest path that has visited exactly the cities in `mask`, currently at city $i$" (with $i \in \text{mask}$). Transition from `(mask, i)`: pick any unvisited $j$, pay $d[i][j]$, land at `(mask | (1 << j), j)`.

Tracing $n = 3$ with $d[0][1] = 1$, $d[0][2] = 2$, $d[1][2] = 3$ (symmetric): the base is `dp[001][0] = 0`. From there `dp[011][1] = 1` and `dp[101][2] = 2`. Then `dp[111][2] = dp[011][1] + d[1][2] = 4` and `dp[111][1] = dp[101][2] + d[2][1] = 5`. Answer is $\min(\, dp[111][1] + d[1][0], \, dp[111][2] + d[2][0]\,) = \min(6, 6) = 6$.

### Skeleton

```typescript
function tsp(d: number[][]): number {
  const n = d.length;
  const FULL = (1 << n) - 1;
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
  // started at city 0, only city 0 visited
  dp[1][0] = 0;

  for (let mask = 1; mask <= FULL; mask++) {
    // every reachable mask contains city 0
    if (!(mask & 1)) continue;
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i)) || dp[mask][i] === Infinity) continue;
      for (let j = 0; j < n; j++) {
        // already visited
        if (mask & (1 << j)) continue;
        const next = mask | (1 << j);
        const cand = dp[mask][i] + d[i][j];
        if (cand < dp[next][j]) dp[next][j] = cand;
      }
    }
  }

  let best = Infinity;
  for (let i = 1; i < n; i++) best = Math.min(best, dp[FULL][i] + d[i][0]);
  return best;
}
```

> [!TIP]
> [943 Find the Shortest Superstring](https://leetcode.com/problems/find-the-shortest-superstring/) · [847 Shortest Path Visiting All Nodes](https://leetcode.com/problems/shortest-path-visiting-all-nodes/) (BFS-flavored bitmask) · [980 Unique Paths III](https://leetcode.com/problems/unique-paths-iii/)

## Recipe

1. **Check $n$ is small.** $2^n$ table size means $n \le 20$ for comfort, $n \le 22$ at the limit.
2. **State.** Start with `mask` alone; add a position dimension only if transitions need it.
3. **Transition.** Either _grow_ the mask (add an element) or _peel_ it (process the lowest set bit, or iterate submasks).
4. **Order.** Ascending `mask` for growing transitions; descending for peeling.
5. **Answer.** Almost always at `mask = (1 << n) - 1` (full set), minimized/maximized over the position dimension if present.

## Variants

### Assignment Problem

$n$ workers, $n$ jobs, cost matrix. `dp[mask]` = min cost to give the jobs in `mask` to the first `popcount(mask)` workers. Transition: pick which job in `mask` worker `popcount(mask) - 1` takes. $O(2^n \cdot n)$, no position dimension.

```typescript
function assignmentCost(cost: number[][]): number {
  const n = cost.length;
  const dp = new Array(1 << n).fill(Infinity);
  dp[0] = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    // worker index = how many jobs assigned so far
    const w = popcount(mask);
    if (dp[mask] === Infinity || w === n) continue;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) continue;
      const next = mask | (1 << j);
      dp[next] = Math.min(dp[next], dp[mask] + cost[w][j]);
    }
  }
  return dp[(1 << n) - 1];
}
```

> [!TIP]
> [1066 Campus Bikes II](https://leetcode.com/problems/campus-bikes-ii/) · [1947 Maximum Compatibility Score Sum](https://leetcode.com/problems/maximum-compatibility-score-sum/) · [1879 Minimum XOR Sum of Two Arrays](https://leetcode.com/problems/minimum-xor-sum-of-two-arrays/)

### Iterate submasks

When a transition splits `mask` into two parts (partition into groups, set cover by overlapping subsets), enumerate non-empty submasks via:

```typescript
for (let s = mask; s > 0; s = (s - 1) & mask) {
  // process submask s
}
```

Total work across all masks is $O(3^n)$ — each pair $(\text{sub}, \text{mask})$ with $\text{sub} \subseteq \text{mask}$ is visited once, and there are $3^n$ such pairs (each element is either: out of mask, in mask & sub, or in mask & ~sub).

> [!TIP]
> [1681 Minimum Incompatibility](https://leetcode.com/problems/minimum-incompatibility/) · [1723 Find Minimum Time to Finish All Jobs](https://leetcode.com/problems/find-minimum-time-to-finish-all-jobs/) · [698 Partition to K Equal Sum Subsets](https://leetcode.com/problems/partition-to-k-equal-sum-subsets/) · [2305 Fair Distribution of Cookies](https://leetcode.com/problems/fair-distribution-of-cookies/)

### SOS DP (sum-over-subsets)

Compute $f(\text{mask}) = \sum_{\text{sub} \subseteq \text{mask}} g(\text{sub})$ in $O(2^n \cdot n)$, beating the naive $O(3^n)$. Process one bit at a time: for $k$ in $0 \dots n-1$, if `mask & (1 << k)` then `f[mask] += f[mask ^ (1 << k)]`. Dual to a multi-dimensional prefix sum over the boolean cube.

```typescript
function sosDP(g: number[]): number[] {
  const n = Math.log2(g.length);
  const f = g.slice();
  for (let k = 0; k < n; k++)
    for (let mask = 0; mask < g.length; mask++)
      if (mask & (1 << k)) f[mask] += f[mask ^ (1 << k)];
  return f;
}
```

### Broken profile DP

Tile a grid (dominoes, polyominoes) or count grid configurations: `mask` encodes the "profile" — one row or column's worth of cells — and $n$ is the grid's narrow dimension. Each transition fills one cell and updates the profile.

## Pitfalls

- **Operator precedence in JS/TS.** `&` binds _looser_ than `===`, so `mask & (1 << i) === 0` parses as `mask & ((1 << i) === 0)`. Always parenthesize: `(mask & (1 << i)) === 0`.
- **`1 << n` for $n \ge 31$.** JS bitwise ops are 32-bit signed; `1 << 31` is negative. For $n \le 30$ you're safe; beyond that, use `2 ** n` for the table size or switch to `BigInt`.
- **No native `popcount`.** Either loop (`while (m) { m &= m - 1; c++; }`) or precompute a table for all masks once at startup.

## Complexity

- TSP-style `(mask, position)` with grow transitions: $O(2^n \cdot n^2)$.
- `mask`-only with grow transitions: $O(2^n \cdot n)$.
- Subset-iteration transitions: $O(3^n)$.
- SOS DP: $O(2^n \cdot n)$.

For $n = 20$: $2^n \approx 10^6$, $2^n \cdot n^2 \approx 4 \times 10^8$ (borderline), $3^n \approx 3.5 \times 10^9$ (too slow without pruning).
