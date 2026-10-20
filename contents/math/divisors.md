# Divisors

Divisors come in pairs. If $d \mid n$, then $n/d \mid n$ too, and one of the two is $\le \sqrt{n}$. Almost every divisor technique is built on that pairing or on the prime factorization.

For GCD and LCM, see [Arithmetic](./arithmetic.md). For factorization, see [Primes](./primes.md).

## Enumerating Divisors

Walk $d$ up to $\sqrt{n}$ and emit both halves of each pair. When $d = n/d$ (a perfect square), emit it once.

```typescript
function divisors(n: number): number[] {
  const small: number[] = [];
  const large: number[] = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d === 0) {
      small.push(d);
      if (d !== n / d) large.push(n / d);
    }
  }
  // small is ascending and large is descending, so this is sorted
  return small.concat(large.reverse());
}
```

This is $O(\sqrt{n})$, and the output comes out sorted for free.

**How many divisors can there be?** Far fewer than $\sqrt{n}$. The maximum $\tau(n)$ is 128 for $n \le 10^5$, 240 for $n \le 10^6$, 1344 for $n \le 10^9$, and 103680 for $n \le 10^{18}$. So an inner loop over the divisors of $n$ is usually cheap. Enumerating them is the bottleneck, not iterating over them.

> [!TIP]
> [1492 The kth Factor of n](https://leetcode.com/problems/the-kth-factor-of-n/) · [507 Perfect Number](https://leetcode.com/problems/perfect-number/) · [1390 Four Divisors](https://leetcode.com/problems/four-divisors/) · [2427 Number of Common Factors](https://leetcode.com/problems/number-of-common-factors/)

## From the Prime Factorization

Write $n = p_1^{e_1} p_2^{e_2} \cdots p_k^{e_k}$. A divisor picks an exponent $0 \le a_i \le e_i$ for each prime independently, which gives closed forms for the **divisor count** $\tau$ and the **divisor sum** $\sigma$:

$$
\tau(n) = \prod_{i} (e_i + 1) \qquad \sigma(n) = \prod_{i} \frac{p_i^{e_i + 1} - 1}{p_i - 1}
$$

Both are **multiplicative**: $f(ab) = f(a) f(b)$ when $\gcd(a, b) = 1$.

To list the divisors themselves, extend the list one prime at a time. Multiply every divisor found so far by $p, p^2, \dots, p^e$. With the SPF sieve from [Primes](./primes.md), factoring is $O(\log n)$, so this costs $O(\log n + \tau(n))$ per query instead of $O(\sqrt{n})$. That matters for many queries on small numbers.

```typescript
// factors: prime factors with repetition and grouped, e.g. from the SPF `factor`
function divisorsFromFactors(factors: number[]): number[] {
  let divs = [1];
  for (let i = 0; i < factors.length; ) {
    const p = factors[i];
    let e = 0;
    while (factors[i] === p) {
      e++;
      i++;
    }
    const next: number[] = [];
    for (const d of divs) {
      for (let k = 0, pk = 1; k <= e; k++, pk *= p) next.push(d * pk);
    }
    divs = next;
  }
  // unsorted: sort if order matters
  return divs;
}
```

> [!TIP]
> [2521 Distinct Prime Factors of Product of Array](https://leetcode.com/problems/distinct-prime-factors-of-product-of-array/) · [1735 Count Ways to Make Array With Product](https://leetcode.com/problems/count-ways-to-make-array-with-product/)

## Divisor Sieve

Flip the question around: instead of asking "what divides $n$?", ask "what is $d$ a divisor of?". Each $d$ divides $d, 2d, 3d, \dots$, so loop over every $d$ and its multiples:

```typescript
function divisorLists(N: number): number[][] {
  const divs: number[][] = Array.from({ length: N + 1 }, () => []);
  for (let d = 1; d <= N; d++) {
    for (let m = d; m <= N; m += d) divs[m].push(d);
  }
  // each list comes out sorted, because d increases
  return divs;
}
```

The cost is the harmonic sum $\sum_{d=1}^{N} N/d = O(N \log N)$. Replace `push(d)` with `cnt[m]++` or `sum[m] += d` to sieve $\tau$ or $\sigma$ without storing the lists. Storing the lists takes $O(N \log N)$ memory, about $1.4 \cdot 10^7$ numbers for $N = 10^6$. If that's too much, use the SPF sieve and generate divisors on demand.

The same multiples loop powers **counting by GCD**. Let $\text{cnt}[d]$ be the number of array elements divisible by $d$, which is the multiples loop over a frequency table. Then the number of pairs with $\gcd$ _exactly_ $g$ is the pairs that are all divisible by $g$, minus the pairs whose $\gcd$ is a larger multiple of $g$. Work from large $g$ down to small so that those larger answers are already known:

```typescript
// exact[g] = number of pairs (i < j) with gcd(a[i], a[j]) === g
function gcdPairCounts(a: number[]): number[] {
  const M = Math.max(...a);
  const freq = new Array(M + 1).fill(0);
  for (const x of a) freq[x]++;
  const exact = new Array(M + 1).fill(0);
  for (let g = M; g >= 1; g--) {
    let c = 0;
    for (let m = g; m <= M; m += g) c += freq[m];
    exact[g] = (c * (c - 1)) / 2;
    // subtract pairs whose gcd is a larger multiple of g
    for (let m = 2 * g; m <= M; m += g) exact[g] -= exact[m];
  }
  return exact;
}
```

This runs in $O(M \log M)$, where $M$ is the largest value, and doesn't depend on $n^2$.

> [!TIP]
> [3312 Sorted GCD Pair Queries](https://leetcode.com/problems/sorted-gcd-pair-queries/) · [1819 Number of Different Subsequences GCDs](https://leetcode.com/problems/number-of-different-subsequences-gcds/) · [2183 Count Array Pairs Divisible by K](https://leetcode.com/problems/count-array-pairs-divisible-by-k/)

## Floor-Division Blocks

Summing over divisors of every number up to $n$ is the same as counting how many multiples each $d$ has:

$$
\sum_{k=1}^{n} \tau(k) = \sum_{d=1}^{n} \left\lfloor \frac{n}{d} \right\rfloor
$$

The right side has only $O(\sqrt{n})$ **distinct** values of $\lfloor n/d \rfloor$, so jump straight to the last $d$ that shares the current quotient:

```typescript
function sumTau(n: number): number {
  let s = 0;
  for (let d = 1; d <= n; ) {
    const q = Math.floor(n / d);
    // largest d' with floor(n / d') === q
    const last = Math.floor(n / q);
    s += q * (last - d + 1);
    d = last + 1;
  }
  return s;
}
```

This is $O(\sqrt{n})$, so it works even for $n \approx 10^{12}$ where no sieve fits. Replace `q * count` with `q * (sum of d over the block)` to get $\sum_{k \le n} \sigma(k)$.
