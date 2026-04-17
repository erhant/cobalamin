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

**Modular inverse** using XGCD:

```typescript
// Returns x such that (a * x) % m === 1, assumes gcd(a, m) === 1
function modinv(a: number, m: number): number {
  const [, x] = xgcd(a, m);
  return ((x % m) + m) % m; // ensure positive
}
```

> Alternatively, when $m$ is prime, the modular inverse is $a^{m-2} \bmod m$ by Fermat's little theorem:
>
> $$
> a^{m-1} \equiv 1 \pmod{m} \;\implies\; a^{m-2} \equiv a^{-1} \pmod{m}
> $$

> See [Primes](./math-primes.md) for primality testing, sieves, and Euler's totient $\varphi$.
