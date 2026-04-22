# Arithmetic

Fast algorithms for the basic arithmetic operations that show up everywhere — exponentiation, GCD, and modular inverse.

## Binary Exponentiation (Pow)

Compute $x^a$ in $O(\log a)$ multiplications by decomposing the exponent into its binary representation. If $a = \sum_i a_i\, 2^i$ with $a_i \in \{0, 1\}$, then

$$
x^a \;=\; \prod_{i \,:\, a_i = 1} x^{2^i}
$$

At each step, square the base and conditionally multiply into the result when the current bit is set.

```typescript
function pow(x: number, a: number): number {
  let ans = 1;
  while (a > 0) {
    if (a & 1) {
      ans *= x;
    }
    x *= x;
    a >>= 1;
  }
  return ans;
}
```

For modular exponentiation (common in problems that ask for "answer mod $10^9 + 7$"), replace the multiplications with modular ones:

```typescript
function powmod(x: number, a: number, mod: number): number {
  let ans = 1;
  x %= mod;
  while (a > 0) {
    if (a & 1) {
      ans = (ans * x) % mod;
    }
    x = (x * x) % mod;
    a >>= 1;
  }
  return ans;
}
```

> Use `BigInt` if `mod` is large enough that intermediate products overflow `Number.MAX_SAFE_INTEGER`.

### Shamir-Strauss Trick (Multi-Exponentiation)

Efficiently computes $x^a \cdot y^b$ in a **single pass** over the bits of both exponents (MSB to LSB). Instead of two separate exponentiations ($\sim 2 \log n$ squarings), this uses $\sim \log n$ squarings by precomputing $xy$ and handling all four bit-pair combinations per step:

| bit of $a$ | bit of $b$ | multiply by |
| ---------- | ---------- | ----------- |
| 1          | 1          | $xy$        |
| 1          | 0          | $x$         |
| 0          | 1          | $y$         |
| 0          | 0          | (nothing)   |

```typescript
// Computes (x^a * y^b) % mod
function shamirStraus(
  x: number,
  a: number,
  y: number,
  b: number,
  mod: number,
): number {
  x %= mod;
  y %= mod;
  const xy = (x * y) % mod;
  let result = 1;

  // Scan from highest bit to lowest
  const bits = Math.max(a, b).toString(2).length;
  for (let i = bits - 1; i >= 0; i--) {
    result = (result * result) % mod;
    const bitA = (a >> i) & 1;
    const bitB = (b >> i) & 1;
    if (bitA && bitB) {
      result = (result * xy) % mod;
    } else if (bitA) {
      result = (result * x) % mod;
    } else if (bitB) {
      result = (result * y) % mod;
    }
  }

  return result;
}
```

> In additive group notation (e.g. elliptic curves), this computes $[a]B + [c]D$ — the same idea powers fast ECDSA signature verification.

## GCD (Greatest Common Divisor)

Euclidean algorithm — repeatedly replace the larger number with the remainder until one reaches zero. Runs in $O(\log \min(a, b))$.

```typescript
function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}
```

LCM follows directly: $\operatorname{lcm}(a, b) = \frac{a}{\gcd(a, b)} \cdot b$ (divide first to avoid overflow).

## Extended GCD (XGCD)

Finds integers $x, y$ such that $a x + b y = \gcd(a, b)$. Essential for computing modular inverses: if $\gcd(a, m) = 1$, then $x$ from $\operatorname{xgcd}(a, m)$ is the modular inverse of $a$ mod $m$.

```typescript
// Returns [g, x, y] where a*x + b*y = g = gcd(a, b)
function xgcd(a: number, b: number): [number, number, number] {
  if (b === 0) {
    return [a, 1, 0];
  }
  const [g, x1, y1] = xgcd(b, a % b);
  // b*x1 + (a % b)*y1 = g
  // b*x1 + (a - floor(a/b)*b)*y1 = g
  // a*y1 + b*(x1 - floor(a/b)*y1) = g
  return [g, y1, x1 - Math.floor(a / b) * y1];
}
```

## Modular Inverse

The **inverse** of $a$ modulo $m$ is the integer $a^{-1}$ with

$$
a \cdot a^{-1} \equiv 1 \pmod{m}
$$

It exists iff $\gcd(a, m) = 1$ — non-coprime elements have no inverse, since they can't generate the full group $(\mathbb{Z}/m)^{\ast}$. Two standard ways to compute it.

### Via XGCD (any modulus)

If $\gcd(a, m) = 1$ then XGCD gives $x, y$ with $a x + m y = 1$. Reducing mod $m$ kills the $m y$ term, so $a x \equiv 1 \pmod{m}$ and $x$ is the inverse. Normalize the sign at the end since XGCD can return negative coefficients:

```typescript
// Returns x such that (a * x) % m === 1, assumes gcd(a, m) === 1
function modinv(a: number, m: number): number {
  const [, x] = xgcd(a, m);
  return ((x % m) + m) % m; // normalize to [0, m)
}
```

$O(\log m)$ steps. **The general-case workhorse** — the only requirement is coprimality, with no assumption on the structure of $m$.

### Via Fermat's Little Theorem (prime modulus)

If $p$ is prime and $\gcd(a, p) = 1$, Fermat gives

$$
a^{p-1} \equiv 1 \pmod{p} \;\implies\; a^{p-2} \equiv a^{-1} \pmod{p}
$$

So the inverse is a single modular exponentiation:

```typescript
// Returns x such that (a * x) % p === 1, assumes p prime and a % p !== 0
function modinvPrime(a: number, p: number): number {
  return powmod(a, p - 2, p);
}
```

$O(\log p)$ multiplications. Slower than XGCD by a small constant (fast-exp does ~$1.5 \log p$ multiplies vs XGCD's ~$\log m$ divisions), but one line — convenient when `powmod` is already in your toolbox.

**Generalization — Euler.** For any coprime pair, Euler's theorem gives $a^{\varphi(m) - 1} \equiv a^{-1} \pmod{m}$. Only practical when $\varphi(m)$ is easy (prime, prime power, or $m$ with known factorization); for general $m$, fall back to XGCD.

### When to use which

- **Arbitrary modulus** — XGCD. Always works.
- **Prime modulus, already using `powmod`** — Fermat. One line, no new machinery.
- **Many inverses modulo the same prime $p$** — precompute $\operatorname{inv}[1 .. p-1]$ via the $O(p)$ recurrence $\operatorname{inv}[i] = -\lfloor p/i \rfloor \cdot \operatorname{inv}[p \bmod i] \bmod p$, with $\operatorname{inv}[1] = 1$. Cheaper than $p$ separate `powmod` calls, and amortizes even better if many queries.

> See [Primes](./primes.md) for primality testing, sieves, and Euler's totient $\varphi$.
