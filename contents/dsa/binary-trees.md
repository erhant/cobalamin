# Binary Trees

A rooted tree where every node has **at most two children** — conventionally `left` and `right`. The structure is recursive: each subtree is itself a binary tree, which is why nearly every algorithm on them is a one-line recursion plus a combine step.

The core move: solve for the left subtree, solve for the right subtree, then combine with the current node. Most of the skill is picking the **direction of information flow** — top-down (pass context down the recursion) vs bottom-up (return a value up). Getting that choice right often turns a hard problem into a five-line DFS.

Common specializations:

- **Binary Search Tree (BST)** — left subtree values $<$ node $<$ right subtree values. In-order traversal yields sorted order; search / insert / delete in $O(h)$.
- **Heap** — complete shape + partial order (parent $\le$ or $\ge$ children). Priority-queue operations in $O(\log n)$ on an implicit array.
- **Balanced trees** (AVL, red-black, treap) — $O(\log n)$ height guaranteed, at the cost of rotation bookkeeping.

Problem patterns to recognize:

- **Traversal** — preorder, inorder, postorder, level-order. Each exposes a different invariant (BST $\to$ inorder is sorted; postorder is the natural order for bottom-up aggregation).
- **Aggregations** — depth, height, diameter, subtree sum, path sum. Almost always a post-order DFS returning a structured value (e.g. `[heightHere, bestAnswerSoFar]`).
- **Construction** — rebuild from a pair of traversals (preorder + inorder, postorder + inorder); the recursive structure of traversals is exactly the recursive structure of the tree.
- **Path queries** — lowest common ancestor (LCA), root-to-leaf paths, longest path through a node.
- **Structural hashing** — serialize each subtree into a canonical string to detect duplicates or equality.

General graph algorithms (BFS/DFS, cycle detection, shortest paths, topological order) live in [Graphs](./graphs.md). The techniques below are specifically those that exploit the two-children-per-node structure.

> [!TIP]
> **Recursive primitives:** [226 Invert Binary Tree](https://leetcode.com/problems/invert-binary-tree/) · [101 Symmetric Tree](https://leetcode.com/problems/symmetric-tree/) · [104 Maximum Depth](https://leetcode.com/problems/maximum-depth-of-binary-tree/) · [543 Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/) · [236 Lowest Common Ancestor](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) · [124 Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/)

## Traversal Orders

Given a tree:

```mermaid
graph TD
    1((1)) --> 2((2))
    1 --> 3((3))
    2 --> 4((4))
    2 --> 5((5))
```

| Order         | Visit pattern    | Result          |
| ------------- | ---------------- | --------------- |
| **Preorder**  | cur, left, right | `1, 2, 4, 5, 3` |
| **Inorder**   | left, cur, right | `4, 2, 5, 1, 3` |
| **Postorder** | left, right, cur | `4, 5, 2, 3, 1` |

### Recursive (trivial)

```typescript
function preorder(node: TreeNode | null, result: number[]) {
  if (!node) return;
  // visit
  result.push(node.val);
  preorder(node.left, result);
  preorder(node.right, result);
}
```

Swap the `push` line to middle for inorder, to end for postorder.

### Iterative with Stack

The stack replaces the call stack. Each order handles it differently.

**Preorder** — most straightforward. Push right first so left is processed first:

```typescript
function preorder(root: TreeNode): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [root];

  while (stack.length) {
    const node = stack.pop()!;
    // visit immediately
    result.push(node.val);
    // right first
    if (node.right) stack.push(node.right);
    // so left pops first
    if (node.left) stack.push(node.left);
  }

  return result;
}
```

**Inorder** — go as far left as possible, then visit, then go right:

```typescript
function inorder(root: TreeNode): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let cur: TreeNode | null = root;

  while (cur || stack.length) {
    // drill down left
    while (cur) {
      stack.push(cur);
      cur = cur.left;
    }
    // visit
    cur = stack.pop()!;
    result.push(cur.val);
    // go right
    cur = cur.right;
  }

  return result;
}
```

**Postorder** — trick: do a modified preorder (cur, right, left) and reverse the result:

```typescript
function postorder(root: TreeNode): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [root];

  while (stack.length) {
    const node = stack.pop()!;
    // cur
    result.push(node.val);
    // left first
    if (node.left) stack.push(node.left);
    // so right pops first
    if (node.right) stack.push(node.right);
  }

  // reverse: cur,right,left → left,right,cur
  return result.reverse();
}
```

This works because postorder (`left, right, cur`) is the reverse of a modified preorder (`cur, right, left`).

### Summary

| Order     | Stack approach                                  |
| --------- | ----------------------------------------------- |
| Preorder  | Pop → visit → push right, left                  |
| Inorder   | Drill left, pop → visit → go right              |
| Postorder | Modified preorder (right before left) → reverse |

> [!TIP]
> **Traversals & BST inorder property:** [144 Binary Tree Preorder](https://leetcode.com/problems/binary-tree-preorder-traversal/) · [94 Binary Tree Inorder](https://leetcode.com/problems/binary-tree-inorder-traversal/) · [145 Binary Tree Postorder](https://leetcode.com/problems/binary-tree-postorder-traversal/) · [98 Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/) (inorder is sorted) · [501 Find Mode in BST](https://leetcode.com/problems/find-mode-in-binary-search-tree/) (inorder groups duplicates) · [230 Kth Smallest Element in BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/)

### Reverse Preorder (cur, right, left)

Swapping the child visit order gives a **reverse preorder** (NRL). Useful when you need the rightmost node at each depth first — e.g. "right side view" of a tree:

```typescript
// [node, depth]
const stack: [TreeNode, number][] = [[root, 0]];

while (stack.length) {
  const [node, depth] = stack.pop()!;
  // first at this depth = rightmost
  if (depth === result.length) result.push(node.val);

  // left first
  if (node.left) stack.push([node.left, depth + 1]);
  // so right pops first
  if (node.right) stack.push([node.right, depth + 1]);
}
```

Since right children are popped first, the first node seen at each depth is always the rightmost. The `depth === result.length` check ensures we only record it once per level.

> [!TIP]
> [199 Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/) · [515 Find Largest Value in Each Tree Row](https://leetcode.com/problems/find-largest-value-in-each-tree-row/)

## Serialization (Subtree Hashing)

To detect duplicate subtrees, serialize each subtree into a string key.

### Which traversal order works?

**Preorder** (`cur_left_right`) works without parens:

```typescript
const key = `${node.val}_${left}_${right}`;
```

**Inorder** and **postorder** are ambiguous without explicit grouping:

<div style="display: flex; gap: 2rem; justify-content: center;">

```mermaid
graph TD
    A1((1)) --> A2((1))
    A1 -.-> AN1[null]:::nil
    classDef nil fill:transparent,stroke-dasharray:3 3,color:#888
```

```mermaid
graph TD
    B1((1)) -.-> BN1[null]:::nil
    B1 --> B2((1))
    classDef nil fill:transparent,stroke-dasharray:3 3,color:#888
```

</div>

```
Inorder, both trees:  "NULL_1_NULL_1_NULL"   (same!)
Preorder, tree A:     "1_1_NULL_NULL_NULL"
Preorder, tree B:     "1_NULL_1_NULL_NULL"   (different — preorder disambiguates)
```

**With parentheses**, any order works:

```typescript
// inorder, safe
const key = `(${left})${node.val}(${right})`;
// uniform, safe
const key = `(${node.val},${left},${right})`;
```

The parens explicitly encode tree structure, making ordering irrelevant.

> [!TIP]
> [652 Find Duplicate Subtrees](https://leetcode.com/problems/find-duplicate-subtrees/) · [297 Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) · [572 Subtree of Another Tree](https://leetcode.com/problems/subtree-of-another-tree/)

## Max Width (Heap Indexing)

For maximum width of a binary tree (counting nulls between endpoints), assign heap indices:

- Root has index $0$
- Left child of index $i$: $2i$
- Right child of index $i$: $2i + 1$

Width of a level $= \text{lastIndex} - \text{firstIndex} + 1$.

```mermaid
graph TD
    I0((0)) --> I1((1))
    I0 --> I2((2))
    I1 --> I3((3))
    I1 --> I4((4))
    I2 --> I5((5))
    I2 --> I6((6))
```

Use DFS tracking first index per depth:

```typescript
const firstAt: Record<number, bigint> = {};
let maxWidth = 0n;

function dfs(node: TreeNode | null, depth: number, idx: bigint) {
  if (!node) return;
  if (!(depth in firstAt)) firstAt[depth] = idx;

  const width = idx - firstAt[depth] + 1n;
  if (width > maxWidth) maxWidth = width;

  dfs(node.left, depth + 1, 2n * idx);
  dfs(node.right, depth + 1, 2n * idx + 1n);
}
```

Use `BigInt` since indices double each level and can overflow.
