# Bit Manipulation

Working on integers one bit at a time — useful for compact set encodings (see [bitmask DP](./dp.md#bitmask-dp)), tight inner loops, hash mixing, low-level encoding, and the occasional one-liner that's clearer than its branchy equivalent.

In JavaScript / TypeScript, bitwise operators coerce their operands to **32-bit signed** integers. Two consequences worth keeping in front of mind:

- Shifts and bitwise ops on values $\ge 2^{31}$ wrap (`1 << 31 === -2147483648`). To read a 32-bit result as unsigned, finish with `x >>> 0`.
- For wider integers, use `BigInt` — it supports `&`, `|`, `^`, `~`, `<<`, `>>`, but **not** `>>>`.

## Cheat-sheet

| Expression            | Meaning                                               |
| --------------------- | ----------------------------------------------------- |
| `n & 1`               | parity (1 if odd, 0 if even)                          |
| `n >> 1`              | divide by 2 (floor, for non-negatives)                |
| `n << k`              | multiply by $2^k$                                     |
| `n & (1 << i)`        | is bit $i$ set?                                       |
| `n \| (1 << i)`       | set bit $i$                                           |
| `n & ~(1 << i)`       | clear bit $i$                                         |
| `n ^ (1 << i)`        | toggle bit $i$                                        |
| `n & -n`              | isolate lowest set bit                                |
| `n & (n - 1)`         | clear lowest set bit                                  |
| `(n & (n - 1)) === 0` | is $n$ a power of two? (assuming $n > 0$)             |
| `Math.clz32(n)`       | count leading zeros (32-bit)                          |
| `31 - Math.clz32(n)`  | index of highest set bit ($\lfloor \log_2 n \rfloor$) |
| `n & ((1 << k) - 1)`  | $n \bmod 2^k$ (for $n \ge 0$)                         |

## Bit length approximation

The exact bit length of a positive $n$ is $\lfloor \log_2 n \rfloor + 1$, but you rarely need an exact value — you usually want a feel for whether $n$ fits in 32 bits, 53 (JS `Number` safe), or 64. Two conversion factors do all the work:

$$\log_2 10 \approx 3.322, \qquad 2^{10} = 1024 \approx 10^3$$

The second is the practical one: **every 10 bits buys ≈ one factor of 1000** (three more decimal digits). So to estimate the bit length of $10^d$, multiply $d$ by $\tfrac{10}{3}$ and round up; or remember the table below.

| Range         | Bits  | Notes                                                                |
| ------------- | ----- | -------------------------------------------------------------------- |
| $\le 10^3$    | 10    | $2^{10} = 1024$                                                      |
| $\le 10^4$    | 14    | $10^4 = 10000 < 16384 = 2^{14}$                                      |
| $\le 10^6$    | 20    | $2^{20} \approx 1.05 \times 10^6$ (mebi vs. mega)                    |
| $\le 10^9$    | 30    | just under signed `int32` max ($2^{31} - 1 \approx 2.15 \cdot 10^9$) |
| $\le 10^{12}$ | 40    | trillion                                                             |
| $\le 10^{15}$ | 50    | near JS `Number.MAX_SAFE_INTEGER` ($2^{53} - 1$)                     |
| $\le 10^{18}$ | 60    | fits in signed `int64` ($2^{63} - 1 \approx 9.2 \cdot 10^{18}$)      |
| $\le 10^{19}$ | 63–64 | only the smaller half fits in signed `int64`                         |

Two rules of thumb worth memorizing — competitive-programming bounds are designed around them:

- **$10^9$ ≈ 30 bits** — "$n \le 10^9$" is "just fits signed `int32`".
- **$10^{18}$ ≈ 60 bits** — "$n \le 10^{18}$" is "just fits signed `int64`".

For an exact bit length, the branch-free 32-bit form:

```typescript
function bitLength(n: number): number {
  return n === 0 ? 0 : 32 - Math.clz32(n);
}
```

For `BigInt` or any width: `n.toString(2).length`.

## Parity

```typescript
const isOdd = n & 1; // 1 if odd, 0 if even
```

The generalization is more interesting: `n & ((1 << k) - 1)` is `n mod 2^k` for $n \ge 0$, since the mask keeps only the low $k$ bits. Useful for hashing into power-of-two-sized tables — replaces a `%` with an AND.

## Check if power of two

A power of two has exactly one bit set. Subtracting 1 flips that bit and turns every lower bit on, so the two share no bits:

```typescript
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
```

The `n > 0` guard matters: $0$ also satisfies `(n & (n - 1)) === 0` and would be falsely classified.

## Lowest set bit and popcount

`n & -n` isolates the lowest set bit. In two's complement, `-n = ~n + 1`: the trailing zeros of $n$ become ones in $\sim n$, then the `+ 1` carries through them and stops at the lowest 1 of $n$ — which is the unique bit where $n$ and $-n$ agree.

Pair it with `n & (n - 1)`, which _clears_ the lowest set bit, to walk the set bits one at a time — **Brian Kernighan's popcount**:

```typescript
function popcount(n: number): number {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}
```

Cost is $O(\text{popcount}(n))$ rather than $O(\log n)$ — beats the naive loop when most bits are zero. For dense masks the SWAR version is faster and branch-free:

```typescript
function popcount32(n: number): number {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  n = (n + (n >>> 4)) & 0x0f0f0f0f;
  return (n * 0x01010101) >>> 24;
}
```

The magic constants pair up bits, then nibbles, then bytes; the final multiply broadcasts every byte's count into the top byte, and the shift extracts it.

## Iterating set bits

```typescript
let m = mask;
while (m) {
  const lsb = m & -m; // isolate
  const i = 31 - Math.clz32(lsb); // index
  // ... use i ...
  m ^= lsb; // clear (equivalently m &= m - 1)
}
```

`Math.clz32` is hardware-backed (CLZ instruction) on modern engines, making this the cleanest way to recover a bit's _index_ rather than its mask.

## Bit smearing

"Smear" the highest set bit downward so every position from it to bit 0 becomes 1. The trick: double the run length each step.

```typescript
let x = n;
x |= x >>> 1; // every set bit now has a 1 immediately below it (run length 2)
x |= x >>> 2; // runs of length 4
x |= x >>> 4; // 8
x |= x >>> 8; // 16
x |= x >>> 16; // 32
```

After the cascade, every bit from the top of $n$ down to bit 0 is 1 — i.e. `x = 2^{⌊log₂ n⌋ + 1} - 1`, one less than the next power of two $\ge n$. For 64-bit values add `x |= x >>> 32` (in `BigInt`).

Bit smearing is the engine behind round-up-to-power-of-two, "highest set bit" without `Math.clz32`, and constructing low-bit masks of arbitrary width.

## Nearest power of two

**Round up** — smallest power of two $\ge n$. Smear, then add 1. The `n--` handles the case where $n$ is already a power of two (otherwise you'd jump to the _next_ one):

```typescript
function nextPow2(n: number): number {
  if (n <= 1) return 1;
  n--;
  n |= n >>> 1;
  n |= n >>> 2;
  n |= n >>> 4;
  n |= n >>> 8;
  n |= n >>> 16;
  return n + 1;
}
```

**Round down** — largest power of two $\le n$. One shift from the highest set bit:

```typescript
function prevPow2(n: number): number {
  return 1 << (31 - Math.clz32(n)); // requires n > 0
}
```

The pre-`Math.clz32` idiom was "smear, then `(x + 1) >>> 1`" — same idea, more steps.

## Bit reversal

Reverse the order of bits in a 32-bit word. Each step swaps adjacent groups of size 1, 2, 4, 8, 16 — a butterfly pattern:

```typescript
function reverse32(n: number): number {
  n = ((n & 0xaaaaaaaa) >>> 1) | ((n & 0x55555555) << 1);
  n = ((n & 0xcccccccc) >>> 2) | ((n & 0x33333333) << 2);
  n = ((n & 0xf0f0f0f0) >>> 4) | ((n & 0x0f0f0f0f) << 4);
  n = ((n & 0xff00ff00) >>> 8) | ((n & 0x00ff00ff) << 8);
  return ((n >>> 16) | (n << 16)) >>> 0;
}
```

The mask `0xaaaaaaaa` is `1010…1010` (every odd bit), `0x55555555` is `0101…0101` (every even bit) — they're complements. Each pair `(0xaa…, 0x55…)`, `(0xcc…, 0x33…)`, `(0xf0…, 0x0f…)`, `(0xff00…, 0x00ff…)` is the same complementary split at the next granularity. The final `>>> 0` re-reads the result as unsigned.

Used in FFT (bit-reversal permutation of inputs), hash construction, and reversing arbitrary-width fields after shifting them to the top of the word.

## XOR identities

XOR is its own inverse: `a ^ a === 0` and `a ^ 0 === a`. That gives a handful of one-liners:

- **Find the single non-repeated element** in an array where every other element appears twice: XOR everything together; pairs cancel, the loner survives. $O(n)$ time, $O(1)$ space.
- **Swap without a temp** — `a ^= b; b ^= a; a ^= b;`. Mostly a curiosity; the temp version is faster and clearer.
- **Toggle on a flag** — `n ^ (1 << i)` toggles bit $i$ unconditionally, while `n ^ (flag << i)` toggles only when `flag` is 1. Branch-free.

## Gray code

A Gray code orders integers so consecutive values differ in exactly one bit. Used for ADCs, rotary encoders, and iterating subsets in a way that flips one element at a time (useful when computing $f(\text{set})$ incrementally).

- **Binary → Gray:** `g = n ^ (n >>> 1)`.
- **Gray → Binary:** smear of XOR — `b = g; b ^= b >>> 1; b ^= b >>> 2; b ^= b >>> 4; b ^= b >>> 8; b ^= b >>> 16;`.

The encoder is a single XOR because each Gray bit is the XOR of two adjacent binary bits; the decoder inverts this by propagating XORs leftward, exactly the bit-smearing cascade.

## JS-specific pitfalls

- **32-bit signed overflow.** `1 << 31` is negative; shifts wrap mod $2^{32}$. For $i \ge 31$ either work in `BigInt` or compute table sizes via `2 ** n` and avoid `1 << i` past 30.
- **Signed vs. unsigned right shift.** `>>` sign-extends (top bit replicated); `>>>` zero-fills. After bit work on values that should be unsigned, finish with `x >>> 0` to get a `number` in $[0, 2^{32})$.
- **Operator precedence.** `&`, `|`, `^` bind _looser_ than `===`, `<`, `+`. Always parenthesize comparisons: write `(n & mask) === 0`, not `n & mask === 0`.
- **`BigInt` has no `>>>`.** Mask explicitly to a width: `x & ((1n << 32n) - 1n)`.
