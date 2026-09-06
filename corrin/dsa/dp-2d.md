# 2D DP

State indexed by two integers. Almost always one of three shapes:

1. **Two pointers over two sequences** — `(i, j)` reading prefixes / suffixes of two strings or arrays. LCS, edit distance, regex match.
2. **One sequence + a numeric budget** — `(i, w)` with `i` an item index and `w` a capacity / time / amount. Knapsack, subset sum, partition equal subset.
3. **Two indices over one sequence** — `(i, j)` indexing **substring or subarray** boundaries. Palindromic subsequence, palindrome partitioning, burst balloons, matrix chain. These are the **interval DPs** — see [Interval DP](#interval-dp) below.

The unifying skill is reading the recurrence off the neighbors of `(i, j)` in the table — three or four cells, almost always at the same offsets across problems of the same shape.

## 0/1 Knapsack

$n$ items with weights and values; choose a subset whose total weight is $\le W$, maximizing value. Each item is either in or out — hence "0/1."

State `dp[i][w]` = best value using items in `[0, i)` with capacity $w$.

```typescript
function knapsack01(weight: number[], value: number[], W: number): number {
  const n = weight.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w]; // skip item i-1
      if (weight[i - 1] <= w)
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weight[i - 1]] + value[i - 1]);
    }
  }
  return dp[n][W];
}
```

Row $i$ depends only on row $i - 1$, so a rolling 1D array works — iterate $w$ **descending** so `dp[w - weight[i-1]]` still refers to the previous row:

```typescript
const dp = new Array(W + 1).fill(0);
for (let i = 0; i < n; i++)
  for (let w = W; w >= weight[i]; w--)
    dp[w] = Math.max(dp[w], dp[w - weight[i]] + value[i]);
```

### Unbounded knapsack

Same problem, but each item can be used **any number of times**. The only change is the inner loop direction — iterate $w$ **ascending**, so `dp[w - weight[i]]` already reflects "item $i$ used" within this row:

```typescript
const dp = new Array(W + 1).fill(0);
for (let i = 0; i < n; i++)
  for (let w = weight[i]; w <= W; w++)
    dp[w] = Math.max(dp[w], dp[w - weight[i]] + value[i]);
```

That single direction flip is the difference between 0/1 and unbounded. Worth memorizing as a pair.

### Subset sum / partition

When weights equal values (or you only care about reachability), `dp[w]` becomes a boolean. The same descending-loop skeleton answers "is sum $w$ achievable?" — used directly in Partition Equal Subset Sum (target = total / 2) and Last Stone Weight II.

> [!TIP]
> [416 Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/) · [494 Target Sum](https://leetcode.com/problems/target-sum/) · [474 Ones and Zeroes](https://leetcode.com/problems/ones-and-zeroes/) (2D knapsack) · [1049 Last Stone Weight II](https://leetcode.com/problems/last-stone-weight-ii/) · [518 Coin Change II](https://leetcode.com/problems/coin-change-ii/) (unbounded, **counting** — coins outer, amount inner)

## Longest Common Subsequence (LCS)

The canonical two-pointer DP. State `dp[i][j]` = LCS length of `a[0..i)` and `b[0..j)`. Match: extend; mismatch: best of skipping one side.

```typescript
function lcs(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
```

Each cell looks at three neighbors: NW (diagonal), N (above), W (left). Rolling-array optimization is possible (keep only two rows), but you'll need a temp variable for the NW value or to write the recurrence diagonally.

To **reconstruct** the actual subsequence, walk back from `(a.length, b.length)`: if `a[i-1] === b[j-1]`, emit the char and go NW; else step in whichever direction equals the cell value.

### Longest Common Substring (contiguous)

Variant: the substring must be contiguous in both strings. Change exactly two things — mismatch resets to 0, and the answer is $\max_{i, j} dp[i][j]$ instead of the bottom-right corner:

```typescript
dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : 0;
best = Math.max(best, dp[i][j]);
```

The "contiguous vs subsequence" distinction often turns into "do mismatches reset to 0 or carry forward."

> [!TIP]
> [1143 Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/) · [583 Delete Operation for Two Strings](https://leetcode.com/problems/delete-operation-for-two-strings/) · [712 Minimum ASCII Delete Sum](https://leetcode.com/problems/minimum-ascii-delete-sum-for-two-strings/) · [1035 Uncrossed Lines](https://leetcode.com/problems/uncrossed-lines/) (LCS in disguise)

## Distinct Subsequences

Count how many distinct subsequences of `s` equal `t`. Pure [pick/leave](./dp.md#pick--leave): the pick branch is guarded by a character match, and the combinator is **sum** rather than `max`.

State `dp[i][j]` = number of ways `s[0..i)` produces `t[0..j)`.

```typescript
function numDistinct(s: string, t: string): number {
  const dp: number[][] = Array.from({ length: s.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i++) dp[i][0] = 1; // empty target: one way (use nothing)
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] = dp[i - 1][j]                                    // leave s[i-1]
        + (s[i - 1] === t[j - 1] ? dp[i - 1][j - 1] : 0);        // pick s[i-1] for t[j-1]
    }
  }
  return dp[s.length][t.length];
}
```

The asymmetry with LCS is the thing to notice: there both `dp[i-1][j]` and `dp[i][j-1]` are options because either string may skip a character. Here `t` must be consumed **entirely**, so only `s` gets to leave — and a match doesn't force a pick, it adds a second way, which is why the two branches are summed instead of maxed.

Same rolling collapse as 0/1 knapsack, for the same reason — iterate `j` **descending** so `dp[j-1]` still holds row `i - 1`:

```typescript
const dp = new Array(t.length + 1).fill(0);
dp[0] = 1;
for (let i = 1; i <= s.length; i++)
  for (let j = t.length; j >= 1; j--)
    if (s[i - 1] === t[j - 1]) dp[j] += dp[j - 1];
```

$O(nm)$ time, $O(m)$ space. Counting DPs overflow fast — 115 promises the answer fits in 32 bits, but the intermediate `dp` values are not similarly bounded in the general version; use `BigInt` or a modulus if the problem doesn't guarantee it.

> [!TIP]
> [115 Distinct Subsequences](https://leetcode.com/problems/distinct-subsequences/) · [940 Distinct Subsequences II](https://leetcode.com/problems/distinct-subsequences-ii/) (one string, dedupe by last character) · [1638 Substrings That Differ by One Character](https://leetcode.com/problems/count-substrings-that-differ-by-one-character/)

## Edit Distance

State `dp[i][j]` = edit distance between `a[0..i)` and `b[0..j)`. Three operations — insert, delete, replace — give three transitions:

```typescript
function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
```

Base cases `dp[i][0] = i` and `dp[0][j] = j` are "delete everything" / "insert everything." When the characters match, the diagonal value is used **without** the `+ 1` — the match is free, edits are only for mismatches.

The cost model can be parameterized: weighted insertion / deletion / substitution (Needleman-Wunsch in bioinformatics), or set substitution cost to $\infty$ to forbid it (turning edit distance into "delete and insert only", which is LCS in disguise).

> [!TIP]
> [72 Edit Distance](https://leetcode.com/problems/edit-distance/) · [161 One Edit Distance](https://leetcode.com/problems/one-edit-distance/) · [97 Interleaving String](https://leetcode.com/problems/interleaving-string/) (3-string variant)

## Longest Palindromic Subsequence / Substring

Two related problems with the same `(i, j)` shape — but one is a substring (contiguous) and one is a subsequence.

### Longest Palindromic Subsequence (LPS)

`dp[i][j]` = LPS length of `s[i..j]`. If endpoints match, the middle is free to be anything; otherwise drop one side.

```typescript
function lps(s: string): number {
  const n = s.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) dp[i][i] = 1;
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len <= n; i++) {
      const j = i + len - 1;
      dp[i][j] = s[i] === s[j]
        ? (len === 2 ? 2 : dp[i + 1][j - 1] + 2)
        : Math.max(dp[i + 1][j], dp[i][j - 1]);
    }
  }
  return dp[0][n - 1];
}
```

Iterate by **interval length**, not by `i` or `j` directly — the recurrence reads strictly smaller intervals, so length-ascending is the topological order.

**Tip.** LPS$(s)$ = LCS$(s, \text{reverse}(s))$. If you've already implemented LCS, that one-liner gets you LPS for free.

### Longest Palindromic Substring

Contiguous variant. `dp[i][j]` is **boolean** — is `s[i..j]` a palindrome? — and the recurrence reads only the inner palindrome:

```typescript
dp[i][j] = (s[i] === s[j]) && (j - i < 2 || dp[i + 1][j - 1]);
```

Track the best `(i, j)` as you fill. $O(n^2)$ time and space. The expand-around-center trick (see [Strings § Expand-Around-Center](./strings.md#expand-around-center)) achieves the same $O(n^2)$ time with $O(1)$ space and is usually preferred. For optimal $O(n)$, use [Manacher's](./strings.md#manachers-algorithm).

> [!TIP]
> [516 Longest Palindromic Subsequence](https://leetcode.com/problems/longest-palindromic-subsequence/) · [5 Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/) · [647 Palindromic Substrings](https://leetcode.com/problems/palindromic-substrings/) · [1312 Minimum Insertion Steps to Make a String Palindrome](https://leetcode.com/problems/minimum-insertion-steps-to-make-a-string-palindrome/) (= $n - \text{LPS}$)

## Grid DPs

For grids, the state is the cell coordinate `(r, c)` and the transitions are "from above" and "from the left" (sometimes diagonal). The recurrence shape is dictated by the move set.

### Unique Paths

Count monotonic paths from `(0, 0)` to `(m - 1, n - 1)` moving only right or down.

```typescript
const dp = new Array(n).fill(1);
for (let r = 1; r < m; r++)
  for (let c = 1; c < n; c++) dp[c] += dp[c - 1];
return dp[n - 1];
```

Rolling 1D: `dp[c] += dp[c - 1]` is exactly the 2D recurrence `dp[r][c] = dp[r-1][c] + dp[r][c-1]` with `dp[c]` holding the previous row before the write, then the current row after.

Closed-form alternative: the answer is $\binom{m + n - 2}{m - 1}$ — counting paths is counting sequences of $m - 1$ "downs" and $n - 1$ "rights." See [Counting § Combinations](../math/counting.md#factorials-permutations-combinations).

### Minimum Path Sum

Replace `+=` (count) with `min(...) +`. Same shape:

```typescript
dp[r][c] = grid[r][c] + Math.min(dp[r - 1][c], dp[r][c - 1]);
```

The combinator changes (`sum` → `min`); the state space and transitions don't.

> [!TIP]
> [62 Unique Paths](https://leetcode.com/problems/unique-paths/) · [63 Unique Paths II](https://leetcode.com/problems/unique-paths-ii/) (with obstacles) · [64 Minimum Path Sum](https://leetcode.com/problems/minimum-path-sum/) · [221 Maximal Square](https://leetcode.com/problems/maximal-square/) · [931 Minimum Falling Path Sum](https://leetcode.com/problems/minimum-falling-path-sum/)

## Regex / Wildcard Matching

`dp[i][j]` = does `p[0..j)` match `s[0..i)`? Two patterns:

- **`?` and `*`** (wildcard, [44](https://leetcode.com/problems/wildcard-matching/)). `?` matches one char; `*` matches any (possibly empty) sequence. `*` gives two transitions: "match zero" (`dp[i][j-1]`) or "match one more" (`dp[i-1][j]`).
- **`.` and `*`** (regex, [10](https://leetcode.com/problems/regular-expression-matching/)). `.` matches one char; `c*` matches zero or more of `c` (note: `*` here applies to the **preceding character**, not "any sequence"). Two transitions when the pattern ends in `*`: drop the `c*` pair (`dp[i][j-2]`), or consume one `c` from `s` if it matches (`dp[i-1][j]`).

Both come out as a few-line recurrence once you correctly tabulate base cases for patterns that match the empty string (e.g. `a*b*c*`).

> [!TIP]
> [44 Wildcard Matching](https://leetcode.com/problems/wildcard-matching/) · [10 Regular Expression Matching](https://leetcode.com/problems/regular-expression-matching/)

## Interval DP

Subproblem indexed by an interval `[i, j]` of a single sequence. The recurrence usually picks a **split point** `k ∈ [i, j]` and combines the two halves:

$$
\text{dp}[i][j] = \min_{i \le k < j} \big( \text{dp}[i][k] + \text{dp}[k + 1][j] + \text{merge cost} \big)
$$

Or, for "pick a last/first element from `[i, j]`":

$$
\text{dp}[i][j] = \text{best}_{k \in [i, j]} \big( \text{cost}(k, i, j) + \text{dp}[i][k - 1] + \text{dp}[k + 1][j] \big)
$$

Iterate by interval **length** so smaller intervals are filled first.

### Burst Balloons

Burst balloons one at a time; bursting the $k$-th in interval `[i, j]` yields `nums[i-1] * nums[k] * nums[j+1]` (using sentinels for the edges). The trick is to fix `k` as the **last** balloon burst in `(i, j)`, so the two halves are independent.

```typescript
function maxCoins(nums: number[]): number {
  const a = [1, ...nums, 1];
  const n = a.length;
  const dp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
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

### Palindrome Partitioning II

Min cuts to partition `s` into palindromes. Two DPs in tandem: an `isPal[i][j]` table (from longest palindromic substring above), then a 1D `cuts[i]` = min cuts for `s[0..i)`:

```typescript
function minCut(s: string): number {
  const n = s.length;
  const pal: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--)
    for (let j = i; j < n; j++)
      pal[i][j] = s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1]);

  const cuts = new Array(n + 1).fill(Infinity);
  cuts[0] = -1; // empty prefix needs -1 cuts (cancels the +1 below)
  for (let i = 1; i <= n; i++)
    for (let j = 0; j < i; j++)
      if (pal[j][i - 1]) cuts[i] = Math.min(cuts[i], cuts[j] + 1);
  return cuts[n];
}
```

### Matrix Chain Multiplication

Given dimensions `p[0], p[1], ..., p[n]`, find the optimal parenthesization of $A_1 \cdot A_2 \cdots A_n$ minimizing scalar multiplications. State `dp[i][j]` = min cost to multiply the chain $A_i \cdots A_j$.

$$
\text{dp}[i][j] = \min_{i \le k < j} \big( \text{dp}[i][k] + \text{dp}[k + 1][j] + p[i - 1] \cdot p[k] \cdot p[j] \big)
$$

Same "split point" interval DP — the cost of merging `[i, k]` with `[k+1, j]` is the product of the bordering dimensions.

> [!TIP]
> [312 Burst Balloons](https://leetcode.com/problems/burst-balloons/) · [132 Palindrome Partitioning II](https://leetcode.com/problems/palindrome-partitioning-ii/) · [1547 Minimum Cost to Cut a Stick](https://leetcode.com/problems/minimum-cost-to-cut-a-stick/) · [1039 Minimum Score Triangulation of Polygon](https://leetcode.com/problems/minimum-score-triangulation-of-polygon/) · [664 Strange Printer](https://leetcode.com/problems/strange-printer/)
