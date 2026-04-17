# Backtracking

## General Outline

```
function backtrack(state):
    if IS_COMPLETE(state):
        RECORD(snapshot of state)
        return

    for candidate in CANDIDATES(state):
        if !IS_VALID(candidate, state): continue

        APPLY(candidate, state)       // choose
        backtrack(state)              // explore
        UNDO(candidate, state)        // un-choose
```

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
