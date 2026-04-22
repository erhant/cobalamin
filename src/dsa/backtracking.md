# Backtracking

A systematic way to enumerate candidate solutions by building them one step at a time and **abandoning a partial candidate as soon as it can't lead to a valid solution**. That "abandon early" is the whole point — strip it out and you're just doing brute force.

Picture a **search tree**: the root is the empty state, each node is a partial candidate, and each edge is one choice extending it. Complete solutions live at specific nodes (often leaves). Backtracking is DFS over this tree with aggressive pruning — every subtree rejected at its root kills every candidate below it.

It's the right tool when:

- You need to **enumerate** all solutions (permutations, subsets, combinations, partitions, all paths, ...).
- You need **one** solution, but the space is too large for brute force and has easily-checkable local constraints (N-queens, Sudoku, word search on a grid).
- The search space is combinatorial and has structure that lets you rule out whole subtrees cheaply (a partial sum already exceeds the target, a letter already placed conflicts, a queen threatens the current column, ...).

Three things determine efficiency, in order of importance:

1. **Pruning** — reject candidates that can't extend to a solution, as early as possible. A single good cut can eliminate an enormous subtree. This is the lever to optimize.
2. **Choice ordering** — try promising candidates first to hit a solution (or a prune) sooner. Sorting candidates or using heuristics like "most constrained variable" helps.
3. **In-place state** — mutate the partial candidate, recurse, then undo. Snapshotting at each level is usually too slow.

## General Outline

```ts
function backtrack(state: State): void {
    if (isComplete(state)) {
      // full solution — copy, don't alias
      // e.g. [...arr] in JS, list.copy() in Python
      record(snapshot of state);
      return;
    }


    for (const candidate of CANDIDATES(state)) {
        // prune: don't even recurse
        if (!IS_VALID(candidate, state)) {
            continue;
        }

        // choose: extend the state
        APPLY(candidate, state);
        // explore: recurse
        backtrack(state);
        // un-choose: restore for the next sibling
        UNDO(candidate, state);
    }
}
```

Five slots to fill for any problem:

- **`state`** — the partial candidate (e.g. the current prefix array) plus any auxiliary structures needed for fast validity checks (`used[]`, column/diagonal sets for N-queens, remaining sum, ...).
- **`IS_COMPLETE`** — when does `state` represent a finished solution? Often `cur.length === n` or `sum === target`. Sometimes you record at every node (e.g. subsets), in which case there's no separate completion test.
- **`CANDIDATES`** — the next choices to try. The shape of this set is what distinguishes permutations (all unused) from subsets/combinations (everything past index `start`) — see the next section.
- **`IS_VALID`** — the **pruning** predicate. The sooner this rejects a candidate, the more of the search tree you skip. Anything you can check before applying belongs here.
- **`APPLY` / `UNDO`** — symmetric mutations. Whatever `APPLY` changes (push to list, mark used, add to sum, flip a board cell), `UNDO` must exactly reverse **after** the recursive call returns. Miss one and later calls see corrupted state — these bugs are brutal to track down.

**Record = snapshot.** When you record a complete solution, always copy the state (`[...current]`). The live array keeps mutating; aliasing it means every recorded solution ends up pointing at the final (usually empty) state.

**Why undo instead of passing immutable state?** A fresh copy per call turns an $O(\text{nodes})$ algorithm into $O(\text{nodes} \cdot \text{depth})$ in both time and space. Mutate-recurse-undo is the standard for a reason.

## Permutation vs Subset vs Combination

These three are the core backtracking patterns. They differ in **what order matters** and **how candidates are restricted**:

|                    | Permutation              | Subset              | Combination         |
| ------------------ | ------------------------ | ------------------- | ------------------- |
| **Order matters?** | Yes — `[1,2]` ≠ `[2,1]`  | No                  | No                  |
| **Size**           | Always `n`               | Any (0 to n)        | Fixed `k`           |
| **Candidates**     | All unused               | After `start` index | After `start` index |
| **Recurse with**   | `backtrack()` (no index) | `backtrack(i + 1)`  | `backtrack(i + 1)`  |
| **Tracking**       | `used[]` array           | `start` index       | `start` index       |
| **Record when**    | `cur.length === n`       | Every level         | `cur.length === k`  |

The key distinction is **order sensitivity**:

- **Permutations** care about order, so every element is a candidate at every level → needs `used[]` to avoid reuse
- **Subsets / Combinations** don't care about order, so we only look forward with `start` → order-based duplicates are impossible

Combinations are essentially subsets filtered by a fixed size `k`. The backtracking code is identical to subsets, just with a different base case (`cur.length === k` instead of recording at every level).

```
nums = [1, 2, 3]

Permutations:  [1,2,3] [1,3,2] [2,1,3] [2,3,1] [3,1,2] [3,2,1]
Subsets:       [] [1] [1,2] [1,2,3] [1,3] [2] [2,3] [3]
Combinations (k=2): [1,2] [1,3] [2,3]
```

## Example: Permutations

```typescript
function permute(nums: number[]): number[][] {
  const result: number[][] = [];
  const current: number[] = [];
  const used = new Array(nums.length).fill(false);

  function backtrack() {
    if (current.length === nums.length) {
      result.push([...current]); // snapshot!
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;

      current.push(nums[i]); // choose
      used[i] = true;

      backtrack(); // explore

      current.pop(); // un-choose
      used[i] = false;
    }
  }

  backtrack();
  return result;
}
```

Always **snapshot** (`[...current]`) when recording results, otherwise you push references to the same mutating array.

## Combination Sum Variants

### Distinct candidates, reuse allowed (Combination Sum I)

Pass a `start` index and recurse with `backtrack(i)` (same index, allowing reuse):

```typescript
function backtrack(start: number) {
  if (sum === target) {
    ans.push([...comb]);
    return;
  }

  for (let i = start; i < candidates.length; i++) {
    if (sum + candidates[i] > target) continue;

    comb.push(candidates[i]);
    sum += candidates[i];
    backtrack(i); // reuse allowed
    comb.pop();
    sum -= candidates[i];
  }
}
```

The `start` index prevents order-based duplicates (e.g. `[2,3]` vs `[3,2]`).

### Duplicate candidates, no reuse (Combination Sum II)

Sort first, recurse with `backtrack(i + 1)`, and **skip duplicates at the same recursion level**:

```typescript
candidates.sort((a, b) => a - b);

function backtrack(start: number) {
  if (sum === target) {
    ans.push([...comb]);
    return;
  }

  for (let i = start; i < candidates.length; i++) {
    if (i > start && candidates[i] === candidates[i - 1]) continue; // skip dup
    if (sum + candidates[i] > target) continue;

    comb.push(candidates[i]);
    sum += candidates[i];
    backtrack(i + 1); // no reuse
    comb.pop();
    sum -= candidates[i];
  }
}
```

The `i > start` check is key: it allows picking a duplicate value deeper in the recursion (e.g. `[1, 1, 6]`) but prevents trying the same value twice at the same level.

## Subsets

Record at every recursion level (not just at a base case). The `start` index ensures each subset is generated once in sorted order:

```typescript
function backtrack(start: number) {
  ans.push([...cur]); // record at EVERY level, not just a base case
  for (let i = start; i < nums.length; i++) {
    cur.push(nums[i]);
    backtrack(i + 1); // move past i, not past start
    cur.pop();
  }
}
```

**Common mistake:** using `backtrack(start + 1)` instead of `backtrack(i + 1)`. This must advance from the **picked index**, not the level's start. Otherwise earlier indices get reconsidered.

**How non-consecutive subsets like `[1, 3]` are generated:** after picking `1` at `i=0` and recursing, the inner call picks `2` at `i=1`, backtracks (pops `2`), then the `for` loop **continues** to `i=2` and picks `3`. The loop naturally skips elements — no explicit "skip" logic needed.

With `start` index, the `used` array is unnecessary — the index range already prevents revisiting.
