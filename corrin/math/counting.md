# Counting

How many things satisfy a property — without listing them. Three families of tools cover most problems:

1. **Closed-form** counts on structured objects: permutations, combinations, compositions.
2. **Bijections** between hard sets and easy ones: stars-and-bars, Lehmer codes, Catalan paths.
3. **Sieves over a structured universe**: inclusion-exclusion, Möbius inversion, pigeonhole arguments.

The art is choosing the encoding that turns "count me" into arithmetic.

## Factorials, Permutations, Combinations

Standard primitives. Cache factorials for repeated use:

$$
P(n, k) = \frac{n!}{(n - k)!}, \qquad \binom{n}{k} = \frac{n!}{k! (n - k)!}
$$

For modular contexts ($p$ prime), precompute `fact[i]` and `invFact[i]` once and binomial coefficients become $O(1)$ each — see [Arithmetic § Modular Inverse](./arithmetic.md#modular-inverse). For small $n$, Pascal's recurrence $\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}$ avoids inverses entirely.

## Factorial Number System (Lehmer Codes)

The bijection between ranks and permutations is the **factorial base** (a.k.a. mixed radix). Any integer $r \in [0, n!)$ has a unique decomposition

$$
r = c_{n-1} \cdot (n-1)! + c_{n-2} \cdot (n-2)! + \cdots + c_1 \cdot 1! + c_0 \cdot 0!
$$

with $0 \le c_i \le i$. The digits $(c_{n-1}, c_{n-2}, \dots, c_0)$ are the **Lehmer code**: $c_i$ says "of the remaining unused elements, pick the $c_i$-th smallest" at position $n - 1 - i$ of the permutation.

Encoding and decoding are both $O(n^2)$ with a list, $O(n \log n)$ with a Fenwick tree of "still unused" counts.

```typescript
function kthPermutation(n: number, k: number): number[] {
  const fact = [1];
  for (let i = 1; i <= n; i++) fact.push(fact[i - 1] * i);
  const remaining = Array.from({ length: n }, (_, i) => i + 1);
  const out: number[] = [];
  k--;  // 1-indexed → 0-indexed rank
  for (let i = n; i >= 1; i--) {
    const idx = Math.floor(k / fact[i - 1]);
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
    k %= fact[i - 1];
  }
  return out;
}
```

This is the **rank → permutation** direction. The inverse (permutation → rank) walks the permutation left-to-right, counts how many smaller-and-unused elements remain, and reconstructs $r$ by Horner-style accumulation in the factorial base.

> [!TIP]
> [60 Permutation Sequence](https://leetcode.com/problems/permutation-sequence/) · [31 Next Permutation](https://leetcode.com/problems/next-permutation/) · [1830 Minimum Number of Operations to Make String Sorted](https://leetcode.com/problems/minimum-number-of-operations-to-make-string-sorted/)

## Pigeonhole Principle

If $n + 1$ objects go into $n$ boxes, some box gets $\ge 2$. Trivial to state, surprisingly powerful: it's how you prove an upper bound on **when** a process must repeat without computing the cycle directly.

### Modular pigeonhole

If you iterate any deterministic function on $\mathbb{Z}/k\mathbb{Z}$, after at most $k$ steps you've seen a repeat — so the process is eventually periodic with period $\le k$. This bounds the answer to "smallest $n$ such that $f^n(\text{start})$ has property P, when the state lives mod $k$."

Concrete example: the smallest positive integer whose decimal representation consists only of `1`s and is divisible by $k$ exists iff $\gcd(k, 10) = 1$, and has length $\le k$. The proof: track $r_i = \underbrace{11\dots1}_{i} \bmod k$; among $r_1, \dots, r_k, r_{k+1}$ two coincide, and their difference (which is $\underbrace{11\dots1}_{j - i} \cdot 10^i$) is divisible by $k$.

```typescript
function smallestRepunitDivisibleByK(k: number): number {
  let r = 0;
  for (let n = 1; n <= k; n++) {
    r = (r * 10 + 1) % k;
    if (r === 0) return n;
  }
  return -1;
}
```

The loop runs at most $k$ times — that's the pigeonhole bound. No need to construct the repunits as big integers; only their residues matter.

> [!TIP]
> [1015 Smallest Integer Divisible by K](https://leetcode.com/problems/smallest-integer-divisible-by-k/) · [202 Happy Number](https://leetcode.com/problems/happy-number/) (cycle in residues of digit-square sums)

## Stars and Bars

The number of ways to write $n$ as an ordered sum of $k$ non-negative integers is

$$
\binom{n + k - 1}{k - 1}
$$

The bijection: place $n$ "stars" in a row, choose $k - 1$ of the $n + k - 1$ gap positions to insert "bars", and read off the partition by counting stars between bars.

For **positive** parts (each $\ge 1$), substitute $x_i' = x_i - 1$:

$$
\binom{n - 1}{k - 1}
$$

Use stars-and-bars whenever a problem distributes indistinguishable items into distinguishable bins — "ways to put $n$ identical balls in $k$ boxes," "ways to split $n$ candies among $k$ kids," "compositions of $n$ into $k$ parts."

For **upper bounds** on each part, layer in **inclusion-exclusion** (next section): subtract distributions that violate one bound, add back those violating two, and so on.

## Inclusion-Exclusion

To count elements satisfying _none_ of bad events $A_1, \dots, A_m$:

$$
\left|\overline{A_1} \cap \cdots \cap \overline{A_m}\right|
= \sum_{S \subseteq \{1,\dots,m\}} (-1)^{|S|} \left|\bigcap_{i \in S} A_i\right|
$$

The signed-sum form lets you replace a tough "complement-of-union" count with $2^m$ easier intersection counts. Practical heuristic: it's tractable when intersections are structured (e.g. "elements divisible by all primes in $S$"), brutal when they aren't.

Common derivative formulas:

- **Derangements** $D_n$: permutations with no fixed point. $D_n = n! \sum_{k=0}^{n} (-1)^k / k!$.
- **Coprime count** up to $n$: $\sum_d \mu(d) \lfloor n/d \rfloor$ — see [Primes § Möbius / totient](./primes.md).
- **Surjections** from $[n]$ onto $[k]$: $k! \cdot S(n, k)$ where $S$ is the Stirling number of the second kind, computable via inclusion-exclusion over "image misses element $i$".

When $m$ is too large for $2^m$ subsets, look for symmetry — often all $\binom{m}{j}$ subsets of a given size contribute equally, collapsing the sum to $m + 1$ terms.

## Cheat Sheet

| Question                                              | Tool                                       | Formula / idea                      |
| ----------------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| Order matters, all distinct                           | Permutations                               | $n! / (n - k)!$                     |
| Order doesn't matter, all distinct                    | Combinations                               | $\binom{n}{k}$                      |
| Distribute indistinguishable into distinguishable     | Stars and bars                             | $\binom{n + k - 1}{k - 1}$          |
| $k$-th permutation by rank                            | Lehmer code                                | Factorial base decomposition        |
| Count avoiding many events                            | Inclusion-exclusion                        | Alternating sum over subsets        |
| "Must repeat by step $n$"                             | Pigeonhole                                 | $\le k$ states ⇒ cycle by step $k$ |
| Lattice paths, balanced parens, BST shapes            | Catalan numbers                            | $C_n = \binom{2n}{n}/(n+1)$         |
| Counting with a digit predicate                       | [Digit DP](../dsa/dp-digit.md)             | Position × tight flag × state       |
