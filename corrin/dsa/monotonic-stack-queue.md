# Monotonic Stack & Queue

A **monotonic** structure maintains a sorted invariant by evicting elements that violate the ordering when a new one arrives. The pattern shows up wherever a problem reduces to "for each position, what's the nearest larger/smaller thing on one side?" or "what's the extremum over a sliding window?".

Monotonicity itself is a broader theme — [Binary Search](./binary-search.md) exploits a monotone predicate over an index range, and [Two Pointers](./two-pointers.md) often relies on a monotone window invariant to advance without backtracking. The stack and queue variants below are the data-structure flavor: they amortize $O(n)$ across the whole sequence because each element is pushed and popped at most once.

## Monotonic Stack

A stack that maintains a sorted invariant by popping elements that violate the ordering when a new element arrives. The canonical use case is **next greater (or smaller) element**: scan left-to-right keeping a decreasing stack; when `nums[i]` exceeds the top, the popped element's "next greater" is `nums[i]`.

```typescript
const nextGreater = new Array<number>(nums.length).fill(-1);
const stack: number[] = []; // indices, values decreasing

for (let i = 0; i < nums.length; i++) {
  while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
    nextGreater[stack.pop()!] = nums[i];
  }
  stack.push(i);
}
```

This skeleton — push index, pop while violation, record answer on pop — generalizes to **largest rectangle in histogram**, **daily temperatures**, **trapping rain water**, [**remove duplicate letters**](https://leetcode.com/problems/remove-duplicate-letters/), and the two problems below.

> [!TIP]
> [739 Daily Temperatures](https://leetcode.com/problems/daily-temperatures/) · [496 Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/) · [503 Next Greater Element II](https://leetcode.com/problems/next-greater-element-ii/) · [84 Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/) · [20 Valid Parentheses](https://leetcode.com/problems/valid-parentheses/) (plain stack)

### Remove Duplicate Letters (Lexicographic Ordering)

Three mechanisms work together:

1. **Monotonic stack** — tries to keep letters in sorted order
2. **Last occurrence check** — prevents popping letters we can't recover (acts as a "wall")
3. **`isStacked` set** — ensures each letter appears exactly once

```typescript
const lastOccurrence: Record<string, number> = {};
for (let i = 0; i < s.length; i++) lastOccurrence[s[i]] = i;

const isStacked = new Set<string>();
const stack: string[] = [];

for (let i = 0; i < s.length; i++) {
  if (isStacked.has(s[i])) continue;

  while (
    stack.length &&
    s[i] < stack[stack.length - 1] &&
    lastOccurrence[stack[stack.length - 1]] > i
  ) {
    isStacked.delete(stack.pop()!);
  }

  stack.push(s[i]);
  isStacked.add(s[i]);
}

return stack.join("");
```

A "wall" in the stack (unpoppable element) doesn't break correctness — everything below it was already optimally ordered, everything above will be optimally ordered relative to it.

### Total Steps (Removal Simulation)

For "how many rounds until array is non-decreasing", the stack stores `[value, step]`:

```typescript
const stack: [number, number][] = [];
let ans = 0;

for (const num of nums) {
  let maxStep = 0;

  while (stack.length && stack[stack.length - 1][0] <= num) {
    maxStep = Math.max(maxStep, stack[stack.length - 1][1]);
    stack.pop();
  }

  const step = stack.length ? maxStep + 1 : 0;
  ans = Math.max(ans, step);
  stack.push([num, step]);
}
```

Each element's removal step = `max(steps of popped elements) + 1`. If nothing larger is to the left, it's never removed (step = 0).

## Monotonic Queue

A deque that maintains a sorted invariant from both ends: pop from the **back** to enforce monotonicity as new elements enter, and pop from the **front** to evict elements that have slid out of the window. The front always holds the current extremum.

### Sliding Window Maximum

For each window of size $k$, report the maximum. Naive scanning is $O(nk)$; a decreasing deque gives $O(n)$.

```typescript
const dq: number[] = []; // indices, values decreasing
const ans: number[] = [];

for (let i = 0; i < nums.length; i++) {
  // evict indices that fell out of the window
  if (dq.length && dq[0] <= i - k) dq.shift();

  // maintain decreasing order
  while (dq.length && nums[dq[dq.length - 1]] < nums[i]) dq.pop();

  dq.push(i);

  if (i >= k - 1) ans.push(nums[dq[0]]);
}
```

Two invariants do the work:

1. **Decreasing values from front to back** — any smaller element to the left of a larger one is useless (the larger one dominates it for every window containing both), so we discard it on insertion.
2. **Indices within the window** — the front is the leftmost surviving candidate; once its index ages out, pop it.

Each index is pushed and popped at most once, so the total work is $O(n)$ amortized.

> [!NOTE]
>
> `Array.prototype.shift` is $O(n)$ in V8; for a true deque use a linked list, a ring buffer, or a head index that you advance instead of mutating the array. The snippet above is written for clarity.

### Why a Queue and Not a Stack?

A stack only answers questions anchored at the current scan position (nearest-greater-on-the-left, etc.) because the only accessible end is the top. A queue lets the window have **two moving boundaries** — new elements enter the back, old elements expire from the front — which is exactly what sliding-window extrema need.

### Other Uses

- **Shortest subarray with sum ≥ K** (with negatives) — monotonic deque over prefix-sum indices, increasing values, gives $O(n)$.
- **Constrained 1D DP** — recurrences like $dp[i] = \min_{i-k \le j < i} dp[j] + c_i$ are sliding-window minima; a monotonic deque turns the inner $O(k)$ scan into $O(1)$ amortized.
- **Jump Game VI** and similar — same DP-with-window-min pattern.

> [!TIP]
> [239 Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/) · [1696 Jump Game VI](https://leetcode.com/problems/jump-game-vi/) · [862 Shortest Subarray with Sum at Least K](https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/)
