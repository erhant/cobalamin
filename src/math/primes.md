# Primes

Three primitives that cover most "is this prime / list all primes up to N / count coprimes" questions.

## Naive Primality Test (Trial Division)

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

### Variant: smallest prime factor (SPF)

Store the smallest prime factor of each $n$ instead of a boolean. This gives $O(\log n)$ **factoring** for free afterward — repeatedly divide by $\operatorname{spf}[n]$.

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

> **Linear sieve variant.** A slightly trickier sieve marks each composite exactly once by its smallest prime factor, running in $O(N)$ and building SPF + Möbius + totient in one sweep. The $\log \log N$ factor in the classical sieve comes from composites being marked multiple times (once per prime factor) — fix that and you get $O(N)$. Rarely worth the complexity for $N \le 10^7$, where the classical sieve is already fast enough.

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
