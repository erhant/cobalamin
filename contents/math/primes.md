# Primes

```mermaid
flowchart TB
  subgraph r1[" "]
    direction LR
    n2["2"] ~~~ n3["3"] ~~~ n4["4"] ~~~ n5["5"] ~~~ n6["6"] ~~~ n7["7"]
  end
  subgraph r2[" "]
    direction LR
    n8["8"] ~~~ n9["9"] ~~~ n10["10"] ~~~ n11["11"] ~~~ n12["12"] ~~~ n13["13"]
  end
  subgraph r3[" "]
    direction LR
    n14["14"] ~~~ n15["15"] ~~~ n16["16"] ~~~ n17["17"] ~~~ n18["18"] ~~~ n19["19"]
  end
  subgraph r4[" "]
    direction LR
    n20["20"] ~~~ n21["21"] ~~~ n22["22"] ~~~ n23["23"] ~~~ n24["24"] ~~~ n25["25"]
  end
  subgraph r5[" "]
    direction LR
    n26["26"] ~~~ n27["27"] ~~~ n28["28"] ~~~ n29["29"] ~~~ n30["30"] ~~~ n31["31"]
  end

  classDef prime stroke-width:3px,fill:none
  classDef comp stroke-dasharray:3 3,fill:none,opacity:0.35

  class n2,n3,n5,n7,n11,n13,n17,n19,n23,n29,n31 prime
  class n4,n6,n8,n9,n10,n12,n14,n15,n16,n18,n20,n21,n22,n24,n25,n26,n27,n28,n30 comp

  style r1 fill:none,stroke:none
  style r2 fill:none,stroke:none
  style r3 fill:none,stroke:none
  style r4 fill:none,stroke:none
  style r5 fill:none,stroke:none
```

Three primitives that cover most "is this prime / list all primes up to N / count coprimes" questions.

## Trial Division

> [!NOTE]
> Also known as the "Naive Primality Test".

To check whether $n$ is prime, try to divide by every candidate factor. Two observations cut the work:

1. If $n = a \cdot b$ with $a \le b$, then $a \le \sqrt{n}$ — so we only need to test divisors up to $\sqrt{n}$.
2. After ruling out $2$, every prime is odd, so we can step by $2$.

```typescript
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true; // 2 and 3
  if (n % 2 === 0) return false;
  for (let p = 3; p * p <= n; p += 2) {
    if (n % p === 0) return false;
  }
  return true;
}
```

$O(\sqrt{n})$ divisions.

### The 6k ± 1 optimization

Every prime $> 3$ is of the form $6k \pm 1$ — because $6k,\, 6k+2,\, 6k+4$ are divisible by $2$, and $6k+3$ is divisible by $3$. Stepping in pairs of $\{+2,\, +4\}$ skips ~1/3 more candidates:

```typescript
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  // candidates: 5, 7, 11, 13, 17, 19, ... (6k ± 1)
  for (let p = 5; p * p <= n; p += 6) {
    if (n % p === 0 || n % (p + 2) === 0) return false;
  }
  return true;
}
```

Same big-O, ~3× faster in practice.

> [!IMPORTANT]
> For $n$ beyond $\sim 10^{12}$, trial division is too slow. Use **Miller-Rabin** (probabilistic, fast) or deterministic variants with fixed witness sets that work up to specific bounds — e.g. witnesses $\{2,\, 3,\, 5,\, 7,\, 11,\, 13,\, 17,\, 19,\, 23,\, 29,\, 31,\, 37\}$ are deterministic up to $3.3 \cdot 10^{14}$.

## Sieve of Eratosthenes

To list all primes up to $N$, flip the script: instead of asking "what divides $n$?", mark off every composite by walking its multiples.

```typescript
function sieve(N: number): boolean[] {
  const isPrime = new Array(N + 1).fill(true);
  isPrime[0] = isPrime[1] = false;
  for (let p = 2; p * p <= N; p++) {
    if (isPrime[p]) {
      for (let k = p * p; k <= N; k += p) {
        isPrime[k] = false;
      }
    }
  }
  return isPrime;
}
```

Two subtleties:

1. **Start the inner loop at $p^2$, not $2p$.** Every composite $kp$ with $k < p$ has already been crossed off by a smaller prime factor (since $k$ contains a prime factor $\le k < p$).
2. **Outer loop stops at $\sqrt{N}$.** Any composite $\le N$ has a prime factor $\le \sqrt{N}$, so everything unmarked after this point is guaranteed prime.

Complexity is $O(N \log \log N)$ — the harmonic-ish sum $\sum_{p \le N} N / p$ over primes.

> [!TIP]
> [204 Count Primes](https://leetcode.com/problems/count-primes/) · [2523 Closest Prime Numbers in Range](https://leetcode.com/problems/closest-prime-numbers-in-range/) · [952 Largest Component Size by Common Factor](https://leetcode.com/problems/largest-component-size-by-common-factor/) (SPF + DSU)

### Variant: smallest prime factor (SPF)

The **smallest prime factor** of $n$, written $\operatorname{spf}(n)$, is the smallest prime dividing $n$ — for primes themselves $\operatorname{spf}(p) = p$. E.g. $\operatorname{spf}(12) = 2$, $\operatorname{spf}(35) = 5$, $\operatorname{spf}(7) = 7$.

Why store it: with $\operatorname{spf}[n]$ precomputed for every $n \le N$, you can **factor any $n \le N$ in $O(\log n)$** — keep dividing by $\operatorname{spf}[n]$ until you hit 1. Without precomputation, factoring costs $O(\sqrt{n})$ per query, which adds up fast over many queries.

The construction is a one-line tweak of Eratosthenes: instead of recording "is $k$ composite?", record the prime that first reached $k$. Since outer primes are visited in ascending order, the first to mark $k$ is its smallest factor.

```typescript
function spfSieve(N: number): number[] {
  const spf = new Array(N + 1).fill(0);
  for (let p = 2; p <= N; p++) {
    if (spf[p] === 0) {
      // p is prime
      for (let k = p; k <= N; k += p) {
        if (spf[k] === 0) spf[k] = p;
      }
    }
  }
  return spf;
}

// factor any n <= N in O(log n)
function factor(n: number, spf: number[]): number[] {
  const factors: number[] = [];
  while (n > 1) {
    factors.push(spf[n]);
    n = Math.floor(n / spf[n]);
  }
  return factors;
}
```

Same $O(N \log \log N)$ build cost as the boolean sieve. The same template — store something more informative than a bit per slot — gives sieves for the Möbius function $\mu(n)$, the divisor count $\tau(n)$, the divisor sum $\sigma(n)$, and any multiplicative function with a clean formula on prime powers (totient is the worked example below).

### Variant: linear sieve

The classical sieve marks each composite once **per prime factor** — that's where the $\log \log N$ factor comes from. Mark each composite exactly once and you get $O(N)$.

The trick: every composite $c$ has a unique smallest prime factor $p$, so $c = p \cdot m$ with $\operatorname{spf}(m) \ge p$. Iterate $m$ in the outer loop, and in the inner loop multiply by primes $p \le \operatorname{spf}(m)$ — that decomposition hits every composite once and only once.

```typescript
function linearSieve(N: number): { spf: number[]; primes: number[] } {
  const spf = new Array(N + 1).fill(0);
  const primes: number[] = [];
  for (let i = 2; i <= N; i++) {
    if (spf[i] === 0) {
      spf[i] = i;
      primes.push(i);
    }
    for (const p of primes) {
      if (p > spf[i] || p * i > N) break;
      spf[p * i] = p;
    }
  }
  return { spf, primes };
}
```

The break on `p > spf[i]` is what makes it linear: once $p$ exceeds $\operatorname{spf}(i)$, the composite $p \cdot i$ would be reached more "naturally" by a different pair (smaller prime, larger $i'$), so we skip it here to avoid double-marking.

In practice the constant factor is close enough to the classical sieve that the latter usually wins for $N \le 10^7$. The linear sieve shines when you also need primes, SPF, $\mu$, and $\varphi$ computed simultaneously in one pass — each can be updated at the unique mark-point of every composite.

### Variant: segmented sieve

For $N$ beyond what fits in memory (say $N \sim 10^{12}$, or you only want primes in a high window like $[10^{12},\, 10^{12} + 10^6]$), sieve in chunks. The observation: every composite $c \le R$ has a prime factor $\le \sqrt{R}$, so the **small primes** up to $\sqrt{R}$ are enough to cross out composites in any window $[L, R]$.

```typescript
function segmentedSieve(L: number, R: number): boolean[] {
  const limit = Math.floor(Math.sqrt(R));
  const small = sieve(limit); // classical sieve, from above
  const isPrime = new Array(R - L + 1).fill(true);

  for (let p = 2; p <= limit; p++) {
    if (!small[p]) continue;
    // first multiple of p that is >= max(L, p^2)
    let start = Math.max(p * p, Math.ceil(L / p) * p);
    for (let k = start; k <= R; k += p) isPrime[k - L] = false;
  }
  // 0 and 1 are not prime; handle them if they fall in the window
  for (let i = Math.max(L, 0); i <= Math.min(R, 1); i++) isPrime[i - L] = false;
  return isPrime;
}
```

Memory drops from $O(R)$ to $O(\sqrt{R} + (R - L))$. Time is the same $O((R - L) \log \log R + \sqrt{R} \log \log \sqrt{R})$. Real-world prime-counting tools (`primecount`, large-bound Sieve-of-Atkin implementations) work this way under the hood, paged across many windows so that the working set stays in cache.

### Memory note

For $N$ up to $\sim 10^8$, the boolean array is ~100 MB — too big in most environments. Pack into a `Uint8Array` (1 byte/slot, ~100 MB) or better a bitset (1 bit/slot, ~12 MB). In JavaScript:

```typescript
const bits = new Uint8Array((N >> 3) + 1);
const get = (i: number) => (bits[i >> 3] >> (i & 7)) & 1;
const set = (i: number) => {
  bits[i >> 3] |= 1 << (i & 7);
};
```

## Bertrand's Postulate

> For every integer $n \ge 1$, there is a prime $p$ with $n < p \le 2n$.

Equivalently, consecutive primes $p_k, p_{k+1}$ satisfy $p_{k+1} < 2 p_k$ — the gap never exceeds the prime itself. Proved by Chebyshev (1852); Erdős later gave a short combinatorial proof using central binomial coefficients.

Useful whenever you need "a prime larger than $X$":

- **Random prime sampling.** Scan up from $X + 1$ (or sample uniformly from $(X, 2X]$) and primality-test each candidate. A prime is guaranteed within $X$ steps; the Prime Number Theorem gives an expected gap of $\sim \ln X$ near $X$, so in practice it's $O(\log X)$ trials. This is the workhorse for picking rolling-hash bases, double-hashing moduli, and RSA-style key generation.
- **Existence arguments** — "there's a prime somewhere in this range" without caring which one. Classic application: $n!$ always has a prime factor in $(n/2, n]$.

The sharp modern form is the Prime Number Theorem: $\pi(2n) - \pi(n) \sim n / \ln n$, so there aren't just $\ge 1$ primes in $(n, 2n]$ — there are asymptotically $n / \ln n$ of them.

## Euler's Totient Function

$\varphi(n)$ counts the integers in $[1, n]$ that are coprime to $n$:

$$
\varphi(n) \;=\; \#\bigl\{\, k \in [1, n] \;:\; \gcd(k, n) = 1 \,\bigr\}
$$

It answers "how many residues mod $n$ are invertible?" — exactly the size of $(\mathbb{Z}/n\mathbb{Z})^{\ast}$.

### Values on building blocks

| $n$                            | $\varphi(n)$                                         | Why                                                                                                                  |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| prime $p$                      | $p - 1$                                              | every non-zero residue is coprime to $p$                                                                             |
| prime power $p^k$              | $p^k - p^{k-1} = p^k\!\left(1 - \tfrac{1}{p}\right)$ | throw out the $p^{k-1}$ multiples of $p$                                                                             |
| product $mn$, $\gcd(m, n) = 1$ | $\varphi(m)\,\varphi(n)$                             | CRT: $(\mathbb{Z}/mn\mathbb{Z})^{\ast} \cong (\mathbb{Z}/m\mathbb{Z})^{\ast} \times (\mathbb{Z}/n\mathbb{Z})^{\ast}$ |

Combining via unique factorization gives the **Euler product**:

$$
\varphi(n) \;=\; n \prod_{p \mid n}\!\left(1 - \tfrac{1}{p}\right)
$$

### Euler's theorem

The key consequence — and the reason $\varphi$ appears everywhere in public-key crypto:

$$
\gcd(a, n) = 1 \;\implies\; a^{\varphi(n)} \equiv 1 \pmod{n}
$$

Fermat's little theorem is just the special case $n = p$ prime, where $\varphi(p) = p - 1$. This is what makes RSA decryption work: with $d \equiv e^{-1} \pmod{\varphi(N)}$,

$$
m^{e d} = m^{1 + k\,\varphi(N)} = m \cdot \bigl(m^{\varphi(N)}\bigr)^k \equiv m \pmod{N}
$$

### Computing a single value

Factor $n$, then apply the product formula. Each prime is divided out completely before moving on:

```typescript
function totient(n: number): number {
  let result = n;
  for (let p = 2; p * p <= n; p++) {
    if (n % p === 0) {
      while (n % p === 0) n = Math.floor(n / p);
      result -= Math.floor(result / p); // result *= (1 - 1/p)
    }
  }
  if (n > 1) result -= Math.floor(result / n); // leftover prime factor
  return result;
}
```

$O(\sqrt{n})$ — dominated by trial-dividing to find the prime factors.

### Computing all values up to $N$

Piggyback on the sieve structure. Start with $\varphi[k] = k$, then for each prime $p$ multiply every multiple of $p$ by $(1 - 1/p)$:

```typescript
function totientSieve(N: number): number[] {
  const phi = Array.from({ length: N + 1 }, (_, i) => i);
  for (let p = 2; p <= N; p++) {
    if (phi[p] === p) {
      // p is prime (untouched so far)
      for (let k = p; k <= N; k += p) {
        phi[k] -= Math.floor(phi[k] / p);
      }
    }
  }
  return phi;
}
```

$O(N \log \log N)$, same cost as the prime sieve.

> **Identity worth remembering:** $\sum_{d \mid n} \varphi(d) = n$. This pops up in counting primitive roots, Möbius inversion, and "how many fractions $k/n$ are in lowest terms" problems.
