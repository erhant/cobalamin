# Digit DP

Count (or sum) integers in a range whose **decimal digits** satisfy some property: "how many in $[0, N]$ have digit sum $= s$", "how many contain digit 7 exactly twice", "how many avoid two equal adjacent digits", "how many are divisible by $k$". Brute enumeration is hopeless for $N$ up to $10^{18}$, but $N$ only has $\log_{10} N$ digits — so build numbers **digit by digit** rather than one by one.

## The trick: tight vs free

Pad every number $\le N$ to $\text{len}(N)$ digits with leading zeros. Walk left to right, and after placing the first $k$ digits ask: is my prefix **still equal to $N$'s prefix**?

- **Tight** — yes, equal so far. The next digit is bounded by $N[k]$. Placing anything strictly less drops you into "free" forever; placing exactly $N[k]$ keeps you tight.
- **Free** — already strictly less than $N$'s prefix. The rest of the digits range freely over $0..9$.

The whole DP is a two-mode walk. Free states share structure across totally different bounded prefixes — that's where memoization pays.

**Worked example: count integers in $[0, 357]$.**

Place the most significant digit $d_0$:

- $d_0 \in \{0, 1, 2\}$ — drops to free. Remaining two digits range over $00..99$ → $100$ each, $300$ total.
- $d_0 = 3$ — still tight. Recurse on bound $57$.
  - $d_1 \in \{0, 1, 2, 3, 4\}$ — free. $10$ each → $50$.
  - $d_1 = 5$ — still tight. Recurse on bound $7$.
    - $d_2 \in \{0..7\}$ — $8$ numbers.

Total: $300 + 50 + 8 = 358$. ✓

To count _with_ a digit property, just thread the property along as extra state.

## State

- `pos` — next digit position to fill (0 = most significant).
- `tight` — is the prefix still equal to $N$'s prefix? Sets the upper bound on the next digit.
- `leadingZero` — has the number "started"? Needed when the property cares about digit identity (e.g. "no two adjacent equal digits"), so the implicit zeros before the first real digit don't get counted as a run.
- **Property state** — whatever the problem tracks: digit sum so far, last digit placed, residue mod $k$, count of a specific digit, ….

Keep the property state as small as possible — extra components multiply the table size. Anything later digits don't need to look at, throw away.

## Skeleton

```typescript
// Count integers in [0, N] whose decimal digits sum to s.
function countWithDigitSum(N: number, s: number): number {
  const digits = String(N).split("").map(Number);
  const n = digits.length;
  const memo = new Map<string, number>();

  function solve(pos: number, sumSoFar: number, tight: boolean): number {
    if (pos === n) return sumSoFar === s ? 1 : 0;
    // memoize only free states — tight paths are unique per pos, so caching never hits
    if (!tight) {
      const hit = memo.get(`${pos},${sumSoFar}`);
      if (hit !== undefined) return hit;
    }
    const limit = tight ? digits[pos] : 9;
    let total = 0;
    for (let d = 0; d <= limit; d++) {
      total += solve(pos + 1, sumSoFar + d, tight && d === limit);
    }
    if (!tight) memo.set(`${pos},${sumSoFar}`, total);
    return total;
  }

  return solve(0, 0, true);
}
```

## Recipe

1. **Property state.** What does a partial number need to remember so a completion can be checked? Digit-sum so far? Residue mod $k$? Whether digit 7 has appeared yet? Last digit placed?
2. **Recurrence over `(pos, propertyState, tight, leadingZero?)`.**
3. **Base case** at `pos === n`: return $1$ if the property holds (for counting), else $0$. For sums or other aggregates, return the corresponding identity.
4. **Transition:** loop $d$ from $0$ to $\text{tight} \,?\, N[\text{pos}] : 9$; recurse with updated property and `tight && d === limit`.
5. **Memoize** on the non-tight states only.

## Variants

- **Range $[L, R]$.** The DP handles only a one-sided upper bound; for an interval compute $f(R) - f(L - 1)$.
- **Summing values, not counting.** Return a pair `(count, sum)`. Each placed digit $d$ contributes its place value once per matching completion: `(child.count, child.sum + d · 10^(n - pos - 1) · child.count)`.
- **Leading-zero subtlety.** For properties about digit identity ("no two adjacent equal digits", "exactly two 7s"), thread `leadingZero` through the state and only update the property once it flips off.
- **Other bases.** Same machinery — `len = log_b(N)`, digit limit is $b - 1$. Binary digit DPs come up in XOR problems and combinatorial-game counting.

## Complexity

$O(\text{len}(N) \cdot |\text{property-state}| \cdot 10)$ — for the digit-sum example, $O(\log_{10} N \cdot s \cdot 10)$. The factor $10$ is the per-position branching; the rest is state-space size.

> [!TIP]
> [233 Number of Digit One](https://leetcode.com/problems/number-of-digit-one/) · [902 Numbers At Most N Given Digit Set](https://leetcode.com/problems/numbers-at-most-n-given-digit-set/) · [600 Non-negative Integers without Consecutive Ones](https://leetcode.com/problems/non-negative-integers-without-consecutive-ones/) (binary digit DP) · [1012 Numbers With Repeated Digits](https://leetcode.com/problems/numbers-with-repeated-digits/) · [357 Count Numbers with Unique Digits](https://leetcode.com/problems/count-numbers-with-unique-digits/) · [3753 Total Waviness of Numbers in Range II](https://leetcode.com/problems/total-waviness-of-numbers-in-range-ii/)
