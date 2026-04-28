# Union-Find

Also known as **Disjoint Set Union (DSU)**. Maintains a partition of $\{0, 1, ..., n−1\}$ into disjoint sets, supporting two operations:

- $\operatorname{find}(x)$ — return a canonical representative of the set containing $x$.
- $\operatorname{union}(x, y)$ — merge the sets containing $x$ and $y$.

Two elements are in the same set iff $\operatorname{find}(x) = \operatorname{find}(y)$. That's the whole API.

It's the right tool whenever you're building up an **equivalence relation incrementally** and want to keep asking "are these two in the same group?". Typical problems:

- Dynamic connectivity in an undirected graph (edges stream in, queries ask if `u` and `v` are connected).
- Kruskal's MST — add the next cheapest edge iff it joins two different components.
- Cycle detection while adding edges — a new edge creates a cycle iff its endpoints are already unioned.
- Counting connected components, or the size of each.
- Any "these items are interchangeable under a set of pairwise rules" constraint (see the example below).

## Implementation

Two optimizations, both essential:

- **Path compression.** During `find`, rewire every node on the path to point directly at the root. The next `find` on any of them is $O(1)$.
- **Union by rank.** `rank[x]` is an upper bound on the height of the tree rooted at `x`. Always hang the shorter tree under the taller one so the combined tree stays shallow.

```typescript
class UnionFind {
  // parent (FAther) pointers
  // roots satisfy `fa[i] === i`
  fa: number[];
  // rank (upper bound on tree height) for union by rank
  rank: number[];

  constructor(n: number) {
    this.fa = new Array(n);
    this.rank = new Array(n).fill(0);
    for (let i = 0; i < n; i++) this.fa[i] = i;
  }

  find(x: number): number {
    if (this.fa[x] !== x) {
      this.fa[x] = this.find(this.fa[x]);
    }
    return this.fa[x];
  }

  union(x: number, y: number): void {
    x = this.find(x);
    y = this.find(y);
    if (x === y) return;
    if (this.rank[x] < this.rank[y]) [x, y] = [y, x];
    this.fa[y] = x;
    if (this.rank[x] === this.rank[y]) this.rank[x]++;
  }
}
```

With both optimizations, each operation is $O(\alpha(n))$ amortized — inverse Ackermann, effectively constant for any `n` that fits in memory ($\alpha(n) \le 4$ for $n < 2^{65536}$).

**Recursion caveat.** The recursive `find` can blow the JS stack on adversarial inputs (a long chain before the first compression). For large `n`, use a two-pass iterative version: walk up to the root, then walk again to point everything at it.

## Common Variants

The two-op skeleton above covers most problems unchanged. A handful of small variants show up often enough to recognize on sight — the problem hints which to reach for.

- **Component size / count.** Replace `rank[]` with `size[]`: attach smaller under larger, sum sizes on merge. Same $\alpha(n)$ bound, and `size[find(x)]` answers component-size queries for free. Track a separate `components` counter (start at $n$, decrement on each successful union) for instant "how many groups?".
- **Non-integer keys.** If nodes aren't $0 \ldots n - 1$ (strings, coordinates, pairs), either pre-map each distinct key to an index, or replace `fa: number[]` with `fa: Map<K, K>` and initialize entries lazily on first touch. The algorithm is unchanged; only the storage changes.
- **Weighted (potential) DSU.** Alongside the parent pointer, store an offset `w[x]` meaning "distance from `x` to its parent" under some group operation (addition, XOR, ratio). Answers the _relation_ between `x` and `y`, not just whether they're related. Used for "given constraints $a_i - a_j = v_{ij}$, are they consistent?" or currency-conversion graphs. `find` must accumulate the offset along the path to the root as it compresses.
- **Bipartite / 2-coloring DSU.** Potential DSU where the offset is a single parity bit. A new edge $(u, v)$ that would close an odd-length cycle means the graph isn't bipartite. Cleaner than online BFS 2-coloring when edges arrive one at a time.
- **Rollback / offline DSU.** Drop path compression (you can't cheaply undo a flattened path) and keep union-by-rank. Push enough state (the two roots touched, their previous `rank` values) onto an undo stack to revert the last union. Operations become $O(\log n)$ instead of $O(\alpha(n))$. Needed when queries are processed offline in a sweep order that requires unwinding — small-to-large / DSU-on-tree, divide-and-conquer over edges, persistent connectivity queries.

**Rule of thumb.** If the problem asks only about _membership_ (connected? same group? cycle formed?), the base class is enough. If it asks for _more than membership_ (size, relation, parity, rollback), reach for the matching variant.

## Example: Minimum Hamming Distance with Allowed Swaps

> Given `source` and `target` of length `n`, and pairs `allowedSwaps[i] = [a, b]` meaning you can swap `source[a]` and `source[b]` any number of times, minimize the Hamming distance between `source` and `target`.

**Key insight.** Swaps are transitive on positions: if you can swap `(a, b)` and `(b, c)`, then `source[a]`, `source[b]`, `source[c]` can be placed in **any** order across those three indices (any transposition-generated permutation). So `allowedSwaps` defines an equivalence relation on indices, and within each connected component of positions, the multiset of `source` values can be permuted freely.

That turns the problem into a **multiset-matching** question per component:

- Let $S_c$ = multiset of `source[i]` for indices `i` in component `c`.
- Let $T_c$ = multiset of `target[i]` for indices `i` in component `c`.
- Minimum mismatches in component `c` is $|c| - |S_c \cap T_c|$.
- Answer is the sum over all components.

**Algorithm.**

1. Union every allowed pair of indices.
2. For each component, build a frequency map of `source` values.
3. Walk `target`: if `target[i]` is available in its component's map, consume one (mismatch avoidable); otherwise, add 1 to the answer.

```typescript
function minimumHammingDistance(
  source: number[],
  target: number[],
  allowedSwaps: number[][],
): number {
  const n = source.length;

  // Step 1: group indices by the equivalence relation generated by allowedSwaps.
  // Any two indices in the same component can be freely permuted.
  const uf = new UnionFind(n);
  for (const [a, b] of allowedSwaps) uf.union(a, b);

  // Step 2: per component, build a multiset of the source values at those indices.
  // Shape: root -> (value -> count). Each component gets its own frequency map.
  const sets = new Map<number, Map<number, number>>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i); // canonical id of the component containing index i
    if (!sets.has(root)) sets.set(root, new Map());
    const cnt = sets.get(root)!;
    // increment the tally for this source value within its component
    cnt.set(source[i], (cnt.get(source[i]) ?? 0) + 1);
  }

  // Step 3: walk target[], trying to "consume" a matching source value per index.
  // If the component has target[i] available, we can permute source to place it
  // here (cost 0); otherwise this index must mismatch (cost 1).
  let ans = 0;
  for (let i = 0; i < n; i++) {
    const cnt = sets.get(uf.find(i))!; // this index's component multiset
    const have = cnt.get(target[i]) ?? 0; // supply of target[i] left in the component
    if (have > 0) cnt.set(target[i], have - 1); // consume one — index can be matched
    else ans++; // no supply left — forced mismatch
  }
  return ans;
}
```

$O(n \cdot \alpha(n) + m \cdot \alpha(n))$ time where `m = allowedSwaps.length`, $O(n)$ space.

**What to take away.** The DSU part is mechanical — the insight is recognizing that a relation generated by pairs closes under transitivity, and that's exactly what Union-Find computes for you. Whenever the problem says "you can do X between these pairs, any number of times, in any order", reach for DSU.
