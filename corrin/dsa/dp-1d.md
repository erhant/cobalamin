# 1D DP

State indexed by a single integer — almost always **a position in a sequence**. Recurrence reads "the answer ending at (or up to) index $i$ is some combination of the answers at a few smaller indices." If you can write $V(i) = f(V(i - 1), V(i - 2), \ldots, V(i - k))$ with $k$ small and constant, you're in 1D DP territory, and the loop is usually one line.

The classic shape is "best / count / feasibility involving a sequence of choices, where each choice depends only on a constant number of previous outcomes." When $V(i)$ depends only on a constant prefix of prior values, drop the array and keep $k$ scalars — that's the **rolling-window** optimization.

## Climbing Stairs

The Hello-World of DP. $V(n)$ = number of ways to reach stair $n$ taking 1 or 2 steps. Recurrence $V(n) = V(n - 1) + V(n - 2)$, base $V(0) = V(1) = 1$. The Fibonacci-shaped dependency means only the last two values are ever needed:

```typescript
function climbStairs(n: number): number {
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
```

$O(n)$ time, $O(1)$ space — and the same skeleton powers anything with a "step in $\{1, 2\}$" or "step in $\{1, 2, 3\}$" style recurrence.

> [!TIP]
> [70 Climbing Stairs](https://leetcode.com/problems/climbing-stairs/) · [746 Min Cost Climbing Stairs](https://leetcode.com/problems/min-cost-climbing-stairs/) · [509 Fibonacci Number](https://leetcode.com/problems/fibonacci-number/)

## House Robber

Max sum of non-adjacent picks. The choice at each house is "rob (skip the previous one) or skip (carry the previous answer forward)."

```typescript
function rob(nums: number[]): number {
  let prev2 = 0, prev1 = 0;
  for (const x of nums) {
    const curr = Math.max(prev1, prev2 + x);
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
```

State $V(i) = \max(V(i - 1),\, V(i - 2) + \text{nums}[i - 1])$; two scalars suffice. The pattern — "two transitions, one with a per-step cost, one without" — generalizes to "max alternating sum", "min cost to traverse with skip" and many others.

### Circular variant (House Robber II)

The first and last houses are now adjacent. Run the linear DP twice: once on `nums[0..n-2]` (exclude last) and once on `nums[1..n-1]` (exclude first); take the max. Excluding one endpoint breaks the cycle.

> [!TIP]
> [198 House Robber](https://leetcode.com/problems/house-robber/) · [213 House Robber II](https://leetcode.com/problems/house-robber-ii/) · [740 Delete and Earn](https://leetcode.com/problems/delete-and-earn/) (reduces to house robber on a count array)

## Kadane's Algorithm — Maximum Subarray

The right state is **not** "answer using `nums[0..i]`" — it's "best subarray **ending at** $i$." That subproblem has a clean recurrence: either extend the previous best-ending-here, or start fresh at $i$.

```typescript
function maxSubArray(nums: number[]): number {
  let best = nums[0], here = nums[0];
  for (let i = 1; i < nums.length; i++) {
    here = Math.max(nums[i], here + nums[i]);
    best = Math.max(best, here);
  }
  return best;
}
```

$V(i) = \max(\text{nums}[i],\, V(i - 1) + \text{nums}[i])$, and the answer is $\max_i V(i)$. Picking the right "ending-at-$i$" state is the move worth internalizing — it's also how LIS and "max subarray with one deletion" come out clean.

### Max Product Subarray

Same shape, but with **two states per position** because a large-negative `here` is valuable: a future negative number flips it to large-positive.

```typescript
function maxProduct(nums: number[]): number {
  let lo = nums[0], hi = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const a = nums[i] * lo, b = nums[i] * hi;
    lo = Math.min(nums[i], a, b);
    hi = Math.max(nums[i], a, b);
    best = Math.max(best, hi);
  }
  return best;
}
```

The general lesson: when the operator can flip sign (or otherwise lose order), track both the **min** and the **max** ending at $i$.

> [!TIP]
> [53 Maximum Subarray](https://leetcode.com/problems/maximum-subarray/) · [152 Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/) · [918 Maximum Sum Circular Subarray](https://leetcode.com/problems/maximum-sum-circular-subarray/) · [1186 Maximum Subarray Sum with One Deletion](https://leetcode.com/problems/maximum-subarray-sum-with-one-deletion/)

## Longest Increasing Subsequence

Two implementations — same problem, different complexity classes.

### $O(n^2)$ DP

State $\text{dp}[i] =$ length of the LIS **ending at** `nums[i]`.

```typescript
function lengthOfLIS_dp(nums: number[]): number {
  const dp = new Array(nums.length).fill(1);
  for (let i = 1; i < nums.length; i++)
    for (let j = 0; j < i; j++)
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
  return Math.max(...dp);
}
```

Simple, easy to extend (e.g. track predecessor for reconstruction, change `<` to `<=` for longest non-decreasing).

### $O(n \log n)$ Patience Sorting

Maintain a sorted array `tails` where `tails[k]` = smallest possible tail of any increasing subsequence of length `k + 1`. For each `num`, binary-search the position to replace (or append at the end).

```typescript
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  for (const num of nums) {
    let l = 0, r = tails.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (tails[m] < num) l = m + 1; else r = m;
    }
    tails[l] = num; // replace or append
  }
  return tails.length;
}
```

`tails` is **not** an actual LIS — just optimal tail values. The length is correct; reconstructing the sequence needs predecessor pointers stored alongside. See also [Binary Trees § LIS](./binary-trees.md#lis-patience-sorting) for the same algorithm with reconstruction.

> [!TIP]
> [300 Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) · [354 Russian Doll Envelopes](https://leetcode.com/problems/russian-doll-envelopes/) (LIS in 2D after sort) · [673 Number of Longest Increasing Subsequence](https://leetcode.com/problems/number-of-longest-increasing-subsequence/) · [1671 Minimum Number of Removals to Make Mountain Array](https://leetcode.com/problems/minimum-number-of-removals-to-make-mountain-array/)

## Coin Change

Minimum number of coins to make `amount`. State `dp[a]` = fewest coins summing to `a`, with `dp[0] = 0` and `dp[a] = ∞` if unreachable. Each coin gives a transition $a \to a - c$.

```typescript
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

Looping `a` outer / coins inner is the classic "unbounded knapsack" indexing — each coin is reusable, so a given amount can be reached from multiple coins in the same iteration. To **count the number of ways** instead, swap loop order (coins outer, amount inner) — see [Coin Change II](https://leetcode.com/problems/coin-change-ii/) and the 0/1 vs. unbounded discussion in [2D DP § Knapsack](./dp-2d.md#01-knapsack).

> [!TIP]
> [322 Coin Change](https://leetcode.com/problems/coin-change/) · [518 Coin Change II](https://leetcode.com/problems/coin-change-ii/) · [279 Perfect Squares](https://leetcode.com/problems/perfect-squares/) · [983 Minimum Cost For Tickets](https://leetcode.com/problems/minimum-cost-for-tickets/)

## Decode Ways

Count the ways to decode a digit string under the mapping `1→A, 2→B, …, 26→Z`. State `dp[i]` = number of decodings of the first `i` characters. Two transitions: consume one digit (if non-zero), or consume two digits (if in `[10, 26]`).

```typescript
function numDecodings(s: string): number {
  const n = s.length;
  if (s[0] === "0") return 0;
  let prev2 = 1, prev1 = 1;
  for (let i = 1; i < n; i++) {
    let curr = 0;
    if (s[i] !== "0") curr += prev1;
    const two = +s.slice(i - 1, i + 1);
    if (two >= 10 && two <= 26) curr += prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
```

Standard "Fibonacci-shape with feasibility guards." The two `if`s encode the alphabet's structure; everything else is the climbing-stairs skeleton.

> [!TIP]
> [91 Decode Ways](https://leetcode.com/problems/decode-ways/) · [639 Decode Ways II](https://leetcode.com/problems/decode-ways-ii/) · [62 Unique Paths](https://leetcode.com/problems/unique-paths/) (2D analogue)

## Word Break

Can `s` be segmented into dictionary words? State `dp[i]` = is `s[0..i)` segmentable?

```typescript
function wordBreak(s: string, wordDict: string[]): boolean {
  const words = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && words.has(s.slice(j, i))) { dp[i] = true; break; }
    }
  }
  return dp[s.length];
}
```

$O(n^2 L)$ where $L$ is the max word length (the `slice` and `has`). Capping the inner range to `j >= i - maxWordLen` shaves it to $O(n \cdot L^2)$, useful when the dictionary has bounded-length words.

> [!TIP]
> [139 Word Break](https://leetcode.com/problems/word-break/) · [140 Word Break II](https://leetcode.com/problems/word-break-ii/) (enumerate all segmentations — needs reconstruction via memoized recursion or a back-edge graph)

## Jump Game Family

A cluster of problems "given an array of step bounds / costs, reach the end." Each variant changes the combinator and the transition structure:

- **Jump Game I** — _feasibility_, $\oplus =$ OR. Greedy beats DP (track the farthest reachable index in one pass).
- **Jump Game II** — _min jumps_, $\oplus =$ min. Greedy (BFS in disguise — track the current and next "fringes") in $O(n)$.
- **Jump Game VI** — _max score_ with bounded step. $V(i) = \text{nums}[i] + \max_{i - k \le j < i} V(j)$. The inner max over a sliding window is a [monotonic deque](./monotonic-stack-queue.md#sliding-window-maximum) — $O(n)$ amortized.
- **Jump Game VII** — _feasibility_ with bounded step. $V(i) = \text{OR}_{i - \text{maxJ} \le j \le i - \text{minJ}} V(j)$ when `s[i] === '0'`. Range-OR is monotone, so a prefix-sum-of-reachable count + window check gives $O(n)$.

The shared moral: a 1D DP with a **sliding-window** dependency over the last $k$ states upgrades from $O(nk)$ to $O(n)$ via either a deque (for min/max) or a running sum (for additive aggregates).

> [!TIP]
> [55 Jump Game](https://leetcode.com/problems/jump-game/) · [45 Jump Game II](https://leetcode.com/problems/jump-game-ii/) · [1696 Jump Game VI](https://leetcode.com/problems/jump-game-vi/) · [1871 Jump Game VII](https://leetcode.com/problems/jump-game-vii/)

## Paint House / State-per-Position

When each position has **a small fixed number of states** (e.g. "house painted red / green / blue, can't match neighbor"), make the state $(i, \text{color})$ and run the DP over the $O(nk)$ table.

```typescript
function minCostPaint(costs: number[][]): number {
  // costs[i][c] = cost to paint house i in color c
  let prev = costs[0].slice();
  for (let i = 1; i < costs.length; i++) {
    const curr = costs[i].slice();
    for (let c = 0; c < curr.length; c++) {
      let best = Infinity;
      for (let c2 = 0; c2 < prev.length; c2++)
        if (c2 !== c) best = Math.min(best, prev[c2]);
      curr[c] += best;
    }
    prev = curr;
  }
  return Math.min(...prev);
}
```

For $k$ colors the inner $\min$ is $O(k)$, so total is $O(nk^2)$. With "track the best and second-best from `prev`" precomputation, drop to $O(nk)$ — useful when $k$ is large.

The general principle: **when the state at $i$ depends on a small categorical value of $i - 1$, expand the state to track that category explicitly.** Same trick powers stock-buy-sell-with-cooldown (state = "holding / not-holding / cooldown") and many "color the array" problems.

> [!TIP]
> [256 Paint House](https://leetcode.com/problems/paint-house/) · [265 Paint House II](https://leetcode.com/problems/paint-house-ii/) · [309 Best Time to Buy and Sell Stock with Cooldown](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) · [188 Best Time to Buy and Sell Stock IV](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iv/)
