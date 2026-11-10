# Interval DP

Subproblem indexed by an interval $[i, j]$ of a single sequence. The recurrence usually picks a **split point** $k \in [i, j]$ and combines the two halves:

$$
\text{dp}[i][j] = \min_{i \le k < j} \big( \text{dp}[i][k] + \text{dp}[k + 1][j] + \text{merge cost} \big)
$$

Or, for "pick a last/first element from $[i, j]$":

$$
\text{dp}[i][j] = \text{best}_{k \in [i, j]} \big( \text{cost}(k, i, j) + \text{dp}[i][k - 1] + \text{dp}[k + 1][j] \big)
$$

Iterate by interval **length** so smaller intervals are filled first.

## Burst Balloons

Burst balloons one at a time; bursting the $k$-th in interval $[i, j]$ yields $\text{nums}[i-1] \cdot \text{nums}[k] \cdot \text{nums}[j+1]$ (using sentinels for the edges). The trick is to fix $k$ as the **last** balloon burst in $(i, j)$, so the two halves are independent. In the code, `dp[i][j]` covers the open interval: balloons strictly between `i` and `j` of the padded array.

```typescript
function maxCoins(nums: number[]): number {
  const a = [1, ...nums, 1];
  const n = a.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  // len = j - i; need at least one balloon strictly inside
  for (let len = 2; len < n; len++) {
    for (let i = 0; i + len < n; i++) {
      const j = i + len;
      for (let k = i + 1; k < j; k++) {
        dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k][j] + a[i] * a[k] * a[j]);
      }
    }
  }
  return dp[0][n - 1];
}
```

**Why "last burst" works.** If you fix the **first** burst, the two halves still see each other through the gap. Fixing the **last** burst makes both halves independently-burstable subproblems — the trick reorders the operation sequence so the recurrence is clean. $O(n^3)$.

## Palindrome Partitioning II

Min cuts to partition `s` into palindromes. Two DPs in tandem: an `isPal[i][j]` table (as in [2D DP § Longest Palindromic Substring](./dp-2d.md#longest-palindromic-substring)), then a 1D `cuts[i]` = min cuts for `s[0..i)`:

```typescript
function minCut(s: string): number {
  const n = s.length;
  const pal: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
  // i descending so pal[i + 1][*] is filled before row i reads it
  for (let i = n - 1; i >= 0; i--)
    for (let j = i; j < n; j++)
      pal[i][j] = s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1]);

  const cuts = new Array(n + 1).fill(Infinity);
  // empty prefix needs -1 cuts (cancels the +1 below)
  cuts[0] = -1;
  for (let i = 1; i <= n; i++)
    for (let j = 0; j < i; j++)
      // last piece s[j..i) is a palindrome: one cut after the best split of s[0..j)
      if (pal[j][i - 1]) cuts[i] = Math.min(cuts[i], cuts[j] + 1);
  return cuts[n];
}
```

## Matrix Chain Multiplication

Given dimensions $p[0], p[1], \dots, p[n]$, find the optimal parenthesization of $A_1 \cdot A_2 \cdots A_n$ minimizing scalar multiplications. State `dp[i][j]` = min cost to multiply the chain $A_i \cdots A_j$.

$$
\text{dp}[i][j] = \min_{i \le k < j} \big( \text{dp}[i][k] + \text{dp}[k + 1][j] + p[i - 1] \cdot p[k] \cdot p[j] \big)
$$

Same "split point" interval DP — the cost of merging $[i, k]$ with $[k+1, j]$ is the product of the bordering dimensions.

> [!TIP]
> [312 Burst Balloons](https://leetcode.com/problems/burst-balloons/) · [132 Palindrome Partitioning II](https://leetcode.com/problems/palindrome-partitioning-ii/) · [1547 Minimum Cost to Cut a Stick](https://leetcode.com/problems/minimum-cost-to-cut-a-stick/) · [1039 Minimum Score Triangulation of Polygon](https://leetcode.com/problems/minimum-score-triangulation-of-polygon/) · [664 Strange Printer](https://leetcode.com/problems/strange-printer/)
