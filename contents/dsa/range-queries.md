# Range Queries

Answer "aggregate of $a[l..r]$" fast, possibly while $a$ changes. The right structure depends on three questions:
- Are there updates?
- Does the operation have an **inverse** (sum, xor) or not (min, max, gcd)?
- Is it **idempotent**, meaning overlapping ranges don't double count (min, max, gcd, but not sum)?

| Structure                                     | Build          | Query              | Update                        | Needs                                |
| --------------------------------------------- | -------------- | ------------------ | ----------------------------- | ------------------------------------ |
| [Prefix Sums](./prefix-diff.md)               | $O(n)$         | $O(1)$             | none (static)                 | inverse                              |
| [Sparse Table](./sparse-table.md)             | $O(n \log n)$  | $O(1)$             | none (static)                 | idempotent                           |
| [Fenwick Tree](./fenwick-tree.md)             | $O(n)$         | $O(\log n)$        | $O(\log n)$ point             | inverse (for $[l, r]$, not prefixes) |
| [Segment Tree](./segment-tree.md)             | $O(n)$         | $O(\log n)$        | $O(\log n)$ point or range    | associative                          |
| [Sqrt Decomposition](./sqrt-decomposition.md) | $O(n)$         | $O(\sqrt{n})$      | $O(1)$ to $O(\sqrt{n})$       | anything that splits into blocks     |

Picking one:

- **Static, invertible** (range sum): prefix sums. Nothing beats $O(1)$ with one array.
- **Static, idempotent** (range min): sparse table. Two overlapping power-of-two windows cover any range.
- **Point updates, invertible**: Fenwick tree. About ten lines and the smallest constants.
- **Range updates, or no inverse with updates**: segment tree, with lazy propagation for range updates.
- **Aggregates that don't merge cleanly** (distinct count, mode), or many offline queries: sqrt decomposition and Mo's algorithm.
- **Queries over tree paths or subtrees**: flatten the tree into an array first ([Tree Flattening](./tree-flattening.md), [Heavy-Light Decomposition](./heavy-light-decomposition.md)), then use any structure above.
