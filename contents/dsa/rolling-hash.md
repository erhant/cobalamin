# Rolling Hash

Read a sequence as the digits of a number in base $B$, reduced modulo a prime $M$:

$$
h(a_0 \ldots a_{k-1}) = a_0 B^{k-1} + a_1 B^{k-2} + \cdots + a_{k-1} \pmod{M}
$$

Equal sequences always get equal hashes. Different ones rarely do, so comparing two subarrays becomes comparing two numbers. Both the elements and the hashes are plain integers, so it works the same on strings (char codes) and on number arrays.

The trick is **prefix hashes**. With $H_i$ the hash of the first $i$ elements, $H_{i+1} = H_i \cdot B + a_i$, and any subarray falls out in $O(1)$:

$$
h(a[l..r)) = H_r - H_l \cdot B^{r-l} \pmod{M}
$$

It is the same move as [Prefix Sums](./prefix-diff.md), except the left part has to be shifted up by $r - l$ digits before it is subtracted.

## Template

In JS the catch is that a `number` is exact only up to $2^{53}$, so the usual $M \approx 10^9$ overflows on the first multiplication. Picking both primes below $2^{26}$ keeps every product under $2^{52}$. Two of them together give a combined modulus of about $4.5 \cdot 10^{15}$, and the pair still packs into one safe integer for use as a `Map` / `Set` key.

```typescript
// both primes are below 2^26, so a product of two residues stays under 2^52 and exact in a number
const M1 = 67108859;
const M2 = 67108837;
// random bases: an input built to collide for one fixed base won't collide for these
const B1 = 1000 + Math.floor(Math.random() * (M1 - 2000));
const B2 = 1000 + Math.floor(Math.random() * (M2 - 2000));

class RollingHash {
  private readonly h1: Float64Array;
  private readonly h2: Float64Array;
  private readonly p1: Float64Array;
  private readonly p2: Float64Array;

  // values must be integers in [0, M2 - 1); compress larger or negative ones first
  constructor(a: ArrayLike<number>) {
    const n = a.length;
    this.h1 = new Float64Array(n + 1);
    this.h2 = new Float64Array(n + 1);
    this.p1 = new Float64Array(n + 1);
    this.p2 = new Float64Array(n + 1);
    this.p1[0] = this.p2[0] = 1;
    for (let i = 0; i < n; i++) {
      // + 1 so a zero still counts: otherwise [0, 5] and [5] share a hash
      this.h1[i + 1] = (this.h1[i] * B1 + a[i] + 1) % M1;
      this.h2[i + 1] = (this.h2[i] * B2 + a[i] + 1) % M2;
      this.p1[i + 1] = (this.p1[i] * B1) % M1;
      this.p2[i + 1] = (this.p2[i] * B2) % M2;
    }
  }

  // hash of a[l..r), as one integer below 2^52 that works as a Map or Set key
  get(l: number, r: number): number {
    const x = (this.h1[r] - ((this.h1[l] * this.p1[r - l]) % M1) + M1) % M1;
    const y = (this.h2[r] - ((this.h2[l] * this.p2[r - l]) % M2) + M2) % M2;
    return x * M2 + y;
  }
}
```

$O(n)$ to build, $O(1)$ per `get`. For a string, pass its char codes: `new RollingHash(Array.from(s, (c) => c.charCodeAt(0)))`. Values up to $10^9$ or negative values should be compressed to ranks first: sort the distinct values and replace each value with its index. Reducing them mod $M$ instead would merge values that differ by a multiple of $M$.

To compare subarrays of different lengths, compare the lengths too. The hash alone doesn't encode them.

## Sliding Window

When you only need every window of a fixed width $k$, skip the arrays and roll one hash along. This is **Rabin-Karp**: remove the element leaving on the left, shift, add the one entering on the right.

```typescript
// hash of every length-k window of a, using one modulus
function windowHashes(a: number[], k: number): number[] {
  // weight of the leftmost element in a window: B^(k-1)
  let pow = 1;
  for (let i = 0; i < k - 1; i++) pow = (pow * B1) % M1;
  let h = 0;
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) {
    // remove a[i - k], which carries the top weight
    if (i >= k) h = (h - ((a[i - k] + 1) * pow) % M1 + M1) % M1;
    h = (h * B1 + a[i] + 1) % M1;
    if (i >= k - 1) out.push(h);
  }
  return out;
}
```

To find a pattern in a text, compare each window's hash against the pattern's hash, and confirm a hit with a direct compare if false positives matter. For a single pattern, [KMP or the Z-function](./strings.md#pattern-matching) are exact and just as fast. Hashing pays off with many patterns of the same length, or once the comparison is between arbitrary subarrays.

## Uses

**Longest repeated subarray.** If a repeat of length $L$ exists, repeats of every shorter length exist too, so binary search on $L$ and check each candidate with a set of window hashes. That is $O(n \log n)$ overall.

```typescript
function longestDupSubstring(s: string): string {
  const h = new RollingHash(Array.from(s, (c) => c.charCodeAt(0)));
  // start of some substring of length len that occurs twice, or -1
  const find = (len: number): number => {
    const seen = new Set<number>();
    for (let i = 0; i + len <= s.length; i++) {
      const k = h.get(i, i + len);
      if (seen.has(k)) return i;
      seen.add(k);
    }
    return -1;
  };
  let lo = 0,
    hi = s.length - 1,
    start = 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const i = find(mid);
    if (i === -1) hi = mid - 1;
    else {
      lo = mid;
      start = i;
    }
  }
  return s.slice(start, start + lo);
}
```

The same skeleton gives the longest common subarray of two or more arrays. Collect window hashes per array and intersect the sets.

Other common uses:

- **Count distinct subarrays** of length $k$: put `get(i, i + k)` for every `i` in a `Set`. Doing this for every $k$ costs $O(n^2)$.
- **Palindrome checks.** Hash `a` and its reverse. `a[l..r)` is a palindrome iff its hash equals the hash of the mirrored range `[n - r, n - l)` in the reversed array.
- **Longest common prefix of two suffixes** in $O(\log n)$: binary search on the length, comparing with `get`. That makes comparing two suffixes fast, which is enough to sort them.
- **Order doesn't matter** (anagrams, multisets): a polynomial hash is the wrong tool. Give each value a random 30-bit weight and add the weights up, or xor them, which also makes the hash slide in $O(1)$.

## Collisions

Two different length-$n$ sequences collide under a random base with probability at most about $n / M$, because their hash difference is a nonzero polynomial in $B$ of degree below $n$, with at most $n - 1$ roots. With many hashes in play, the [birthday bound](../math/probability.md#the-birthday-paradox) applies: among $k$ hashes some pair collides once $k^2 \gtrsim M$.

- A single $M \approx 6.7 \cdot 10^7$ breaks at around $10^4$ distinct windows. Always use two moduli.
- Two of them ($\approx 4.5 \cdot 10^{15}$) stay safe up to about $10^6$ hashes in one set, which covers the usual constraints.
- **Pick the base at random at runtime.** On Codeforces, a fixed base and modulus can be hacked by someone who builds a colliding test. C++ solutions that rely on $2^{64}$ overflow are broken by the Thue-Morse string no matter the base.
- If a wrong answer is unacceptable, confirm a hash match with a direct compare. That is cheap when matches are rare.

For moduli near $10^9$, multiply with the split [`mulmod`](./sqrt-decomposition.md#performance-avoid-bigint-in-js). `BigInt` with $M = 2^{61} - 1$ is the safest choice, but several times slower.

> [!TIP]
> [1044 Longest Duplicate Substring](https://leetcode.com/problems/longest-duplicate-substring/) · [718 Maximum Length of Repeated Subarray](https://leetcode.com/problems/maximum-length-of-repeated-subarray/) · [1923 Longest Common Subpath](https://leetcode.com/problems/longest-common-subpath/) · [187 Repeated DNA Sequences](https://leetcode.com/problems/repeated-dna-sequences/) · [214 Shortest Palindrome](https://leetcode.com/problems/shortest-palindrome/) · [1316 Distinct Echo Substrings](https://leetcode.com/problems/distinct-echo-substrings/)
