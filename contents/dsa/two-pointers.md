# Two Pointers

Two indices walking a sequence, each **moving in only one direction**. That monotonicity is the whole trick: if neither pointer ever backtracks, the total number of moves is $O(n)$ no matter how many pairs the pointers implicitly represent — which is how an $O(n^2)$ pair scan collapses to $O(n)$, or an $O(n^3)$ triple scan to $O(n^2)$.

It applies when advancing one pointer **can never invalidate what the other has already ruled out**. Sorting the input is often what buys you that guarantee.

Three families, distinguished by how the pointers move:

- **Sliding window** — both move right; the window between them holds a property. Subarray/substring problems.
- **Converging** — start at opposite ends and move inward. Pair-finding and counting on sorted data.
- **Fast / slow** — same start, different speeds. Cycle and midpoint detection; see [Linked Lists § Fast/Slow Pointers](./linked-lists.md#fastslow-pointers).

## Sliding Window

The workhorse. Extend the window on the right unconditionally; shrink it from the left until it's valid again; record. Each index enters and leaves the window exactly once, so it's $O(n)$ even with the inner `while`.

```typescript
function longestValid(nums: number[]): number {
  let best = 0;
  let l = 0;
  for (let r = 0; r < nums.length; r++) {
    add(nums[r]);
    // shrink until the window is legal again
    while (!isValid()) {
      remove(nums[l]);
      l++;
    }
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

Concretely, for the longest substring with no repeated character, "shrink until valid" is a single jump — the left edge can leap straight past the previous occurrence:

```typescript
function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>();
  let best = 0;
  let l = 0;
  for (let r = 0; r < s.length; r++) {
    const prev = lastSeen.get(s[r]);
    // only jump if the duplicate is inside the current window
    if (prev !== undefined && prev >= l) l = prev + 1;
    lastSeen.set(s[r], r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

Three window shapes, and the one that trips people up is the second:

| Goal              | Contract while...          | Record                            |
| ----------------- | -------------------------- | --------------------------------- |
| **Longest** valid | the window is **invalid**  | after contracting                 |
| **Shortest** valid | the window is **still valid** | inside the contract loop       |
| **Fixed size $k$** | `r - l + 1 > k`           | when the window is exactly $k$ wide |

**Counting variant.** When the property is monotone (dropping elements can't make a window invalid), every window ending at `r` and starting at or after `l` is valid, so `ans += r - l + 1` counts them all in one step. "Exactly $k$" then comes from `atMost(k) - atMost(k - 1)` — there's usually no direct window for "exactly".

> [!TIP]
> [3 Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) · [76 Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/) (shortest shape) · [438 Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/) (fixed size) · [992 Subarrays with K Different Integers](https://leetcode.com/problems/subarrays-with-k-different-integers/) (`atMost(k) - atMost(k-1)`) · [2461 Maximum Sum of Distinct Subarrays With Length K](https://leetcode.com/problems/maximum-sum-of-distinct-subarrays-with-length-k/)

## Converging Pointers

Sort, then walk inward from both ends. Each step rules out one endpoint for good.

### Triangle Number

Count triples that can form a triangle. Fix `c` (the largest side) from the right, then converge `a` and `b` inside it:

```typescript
function triangleNumber(nums: number[]): number {
  nums.sort((a, b) => a - b);
  let ans = 0;
  for (let ci = nums.length - 1; ci >= 2; ci--) {
    let ai = 0;
    let bi = ci - 1;
    while (ai < bi) {
      if (nums[ai] + nums[bi] > nums[ci]) {
        // sorted, so every a in [ai, bi) also works with this b
        ans += bi - ai;
        bi--;
      } else {
        ai++;
      }
    }
  }
  return ans;
}
```

The payoff is `ans += bi - ai`: the converging pattern counts **many valid pairs per step** instead of visiting them. $O(n^2)$ total.

### Three Sum

Same skeleton, plus duplicate skipping at three separate points — the outer index, and both pointers after a hit:

```typescript
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b);
  const ans: number[][] = [];
  for (let ai = 0; ai < nums.length - 2; ai++) {
    // skip duplicate values for the fixed element
    if (ai > 0 && nums[ai] === nums[ai - 1]) continue;
    let bi = ai + 1;
    let ci = nums.length - 1;
    while (bi < ci) {
      const sum = nums[ai] + nums[bi] + nums[ci];
      if (sum < 0) bi++;
      else if (sum > 0) ci--;
      else {
        ans.push([nums[ai], nums[bi], nums[ci]]);
        // advance past every copy of both values — don't stop at the first hit
        while (bi < ci && nums[bi] === nums[bi + 1]) bi++;
        while (bi < ci && nums[ci] === nums[ci - 1]) ci--;
        bi++;
        ci--;
      }
    }
  }
  return ans;
}
```

> [!TIP]
> [15 3Sum](https://leetcode.com/problems/3sum/) · [11 Container With Most Water](https://leetcode.com/problems/container-with-most-water/) · [42 Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/) · [977 Squares of a Sorted Array](https://leetcode.com/problems/squares-of-a-sorted-array/) · [611 Valid Triangle Number](https://leetcode.com/problems/valid-triangle-number/)

## Shared Pointer (Amortized)

When an inner bound only ever moves **right** as the outer index increases, hoist it out of the inner loop instead of re-searching. The pointer then travels $O(n)$ per outer iteration in total, not per inner iteration:

```typescript
for (let ai = 0; ai < nums.length - 2; ai++) {
  let ti = ai + 2;
  for (let bi = ai + 1; bi < nums.length - 1; bi++) {
    // never let the shared pointer fall behind the inner index
    if (ti <= bi) ti = bi + 1;
    while (ti < nums.length && stillValid(ai, bi, ti)) ti++;
    ans += ti - bi - 1;
  }
}
```

Drops $O(n^2 \log n)$ (binary searching the bound each time) to $O(n^2)$. The correctness requirement is monotonicity: growing `bi` must never move `ti` backwards.

## Window as a Running Count

Sometimes the window isn't a range you resize — it's a count you maintain. To count pairs where `from` is followed by `to` within `limit` positions, track how many `from`s are still in reach:

```typescript
function countPairsWithin(arr: string[], from: string, to: string, limit: number): number {
  let activeFroms = 0;
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    // the `from` at i - limit - 1 just fell out of reach of position i
    if (i - limit - 1 >= 0 && arr[i - limit - 1] === from) activeFroms--;
    if (arr[i] === to) count += activeFroms;
    if (arr[i] === from) activeFroms++;
  }
  return count;
}
```

One pass, $O(n)$, no explicit second pointer — the expiry index `i - limit - 1` _is_ the left edge. Order matters: expire, then count, then admit, or an element pairs with itself.
