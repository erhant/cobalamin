# Strings

Nearly every algorithm here is one of two ideas. **Double the string** so that rotations become plain substrings (`s + s`), or **reuse comparisons you already made** so the scan never backtracks — KMP, the Z-function and Manacher's are the same window-reuse skeleton wearing different hats. What's left is the trie.

Shapes worth recognizing on sight:

- **Rotation / periodicity** — doubling tricks on `s + s`.
- **Find a pattern in a text** — KMP or Z-function; rolling hash when you need many patterns or $O(1)$ substring equality.
- **Palindromes** — expand-around-center by default, Manacher's when $O(n)$ actually matters.
- **Prefix queries / many patterns at once** — trie, then Aho-Corasick.

> [!CAUTION]
> JS strings are immutable and every `slice` / `+` allocates. A `s.slice(...)` inside a loop quietly turns a linear algorithm quadratic — index into the original string, or work over `charCodeAt` values, in hot loops.

## Is `a` a Rotation of `b`?

Every rotation of `a` is a length-`n` window of `a + a`. So:

```typescript
function isRotation(a: string, b: string): boolean {
  return a.length === b.length && (a + a).includes(b);
}
```

$O(n)$ with a linear substring search (KMP, Z-function, etc.), $O(n^2)$ worst case with naive `.includes`.

## Repeated Substring Pattern

"Is `s` of the form `t^k` with `k ≥ 2`?"

```typescript
function repeatedSubstringPattern(s: string): boolean {
  return (s + s).slice(1, -1).includes(s);
}
```

**Why it works.** `s` always occurs in `s + s` at offsets `0` and `n`. Slicing off the first and last character destroys exactly those two occurrences and no others, so the test is really "does `s` occur at some **interior** offset `p ∈ [1, n)`?"

An interior occurrence means `s[i] = s[(p + i) \bmod n]` for all `i` — rotating `s` by `p` leaves it unchanged. Rotation invariance is closed under gcd, so `s` is also fixed by a rotation of $g = \gcd(p, n) < n$, which makes it $n/g \ge 2$ copies of its first $g$ characters. Conversely, `t^k` reappears in `t^{2k}` at offset `|t| ∈ [1, n)`. Picture `s` written on a circular tape: being periodic is exactly "some non-trivial rotation maps the tape to itself."

**Divisor-iteration alternative.** Try every proper divisor `d` of `n` as a candidate substring length:

```typescript
for (let d = 1; 2 * d <= n; d++) {
  if (n % d === 0 && s.slice(0, d).repeat(n / d) === s) return true;
}
return false;
```

$O(n \cdot \tau(n))$ where $\tau(n)$ is the number of divisors.

**Pitfall.** A common bug is iterating `k` (the repetition count) only up to `√n`. That misses periods smaller than `√n`. E.g. `s = "abc".repeat(5)` (`n = 15`, period `3`) needs `k = 5`, but `5 * 5 > 15`. Either iterate all `k ∈ [2, n]`, or iterate substring lengths `d ∈ [1, n/2]` — don't skip half the divisor pair.

> [!TIP]
> [459 Repeated Substring Pattern](https://leetcode.com/problems/repeated-substring-pattern/) · [796 Rotate String](https://leetcode.com/problems/rotate-string/)

## Palindromes

### Expand-Around-Center

Every palindrome has a center (one character for odd length, between two for even). Expand outward while characters match:

```typescript
function longestPalindrome(s: string): string {
  let start = 0,
    end = 0;
  const expand = (l: number, r: number) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      l--;
      r++;
    }
    if (r - l - 1 > end - start) {
      start = l + 1;
      end = r;
    }
  };
  for (let i = 0; i < s.length; i++) {
    // odd
    expand(i, i);
    // even
    expand(i, i + 1);
  }
  return s.slice(start, end);
}
```

$O(n^2)$ time, $O(1)$ space. Simple, fast in practice.

### Manacher's Algorithm

$O(n)$ for longest palindromic substring, by reusing work. Transform `s` into `^#a#b#a#$` so odd/even cases merge, then maintain the rightmost-reaching palindrome `(center, right)` seen so far:

```typescript
function manacher(s: string): number[] {
  const t = "^#" + s.split("").join("#") + "#$";
  const p = new Array(t.length).fill(0);
  let center = 0,
    right = 0;

  for (let i = 1; i < t.length - 1; i++) {
    const mirror = 2 * center - i;
    if (i < right) p[i] = Math.min(right - i, p[mirror]);

    while (t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++;

    if (i + p[i] > right) {
      center = i;
      right = i + p[i];
    }
  }
  // p[i] = palindrome radius in original string at position i in t
  return p;
}
```

The trick: inside the current `(center, right)` window, the mirror position `2*center - i` already has its answer, and reflection gives a free lower bound for `p[i]`. Then we only extend past what we know. The `right` pointer only moves forward — that's what makes it linear.

> [!TIP]
> [5 Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/) · [647 Palindromic Substrings](https://leetcode.com/problems/palindromic-substrings/) · [516 Longest Palindromic Subsequence](https://leetcode.com/problems/longest-palindromic-subsequence/) (DP, see [2D DP](./dp-2d.md)) · [1763 Longest Nice Substring](https://leetcode.com/problems/longest-nice-substring/) (divide-and-conquer)

## Pattern Matching

Given pattern `p` (length `m`) and text `t` (length `n`), find occurrences of `p` in `t`.

### KMP (Failure Function)

Precompute, for each prefix of `p`, the length of the longest proper prefix that is also a suffix (the "LPS" / "failure" array). On mismatch, shift by falling back through the failure links instead of re-scanning.

```typescript
function buildLPS(p: string): number[] {
  const lps = new Array(p.length).fill(0);
  let len = 0;
  for (let i = 1; i < p.length; ) {
    if (p[i] === p[len]) lps[i++] = ++len;
    else if (len > 0) len = lps[len - 1];
    else lps[i++] = 0;
  }
  return lps;
}

function kmp(t: string, p: string): number[] {
  const lps = buildLPS(p);
  const out: number[] = [];
  for (let i = 0, j = 0; i < t.length; ) {
    if (t[i] === p[j]) {
      i++;
      j++;
      if (j === p.length) {
        out.push(i - j);
        j = lps[j - 1];
      }
    } else if (j > 0) j = lps[j - 1];
    else i++;
  }
  return out;
}
```

$O(n + m)$. The `i` pointer in the text never goes backward — that's the core efficiency.

**Bonus**: `n - lps[n-1]` is the shortest period of `p` if it divides `n`; otherwise `p` has no full periodic structure. This gives another route to "repeated substring pattern": `s` is `t^k` iff `n % (n - lps[n-1]) === 0` and `lps[n-1] > 0`.

### Z-Function

`z[i]` = length of the longest substring starting at `i` that is also a prefix of `s`. Same $O(n)$ window-reuse trick as Manacher's.

```typescript
function zFunction(s: string): number[] {
  const n = s.length;
  const z = new Array(n).fill(0);
  let l = 0,
    r = 0;
  for (let i = 1; i < n; i++) {
    if (i < r) z[i] = Math.min(r - i, z[i - l]);
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
    if (i + z[i] > r) {
      l = i;
      r = i + z[i];
    }
  }
  return z;
}
```

To find `p` in `t`: compute `z` of `p + "#" + t` and look for positions where `z[i] === p.length`.

Often easier to reason about than KMP, with the same $O(n + m)$ cost.

### Rabin-Karp (Rolling Hash)

Slide a fixed-width window over `t`, updating a polynomial hash in $O(1)$ per step. On a hash match, confirm with a direct compare:

$$
h(s) = \sum_{i=0}^{m-1} s[i] \cdot b^{m-1-i} \pmod{M}
$$

Shifting by one: `h' = (h - s[i] * b^{m-1}) * b + s[i + m]`, all mod `M`.

```typescript
function rabinKarp(t: string, p: string): number[] {
  const m = p.length,
    n = t.length;
  const B = 257n,
    MOD = (1n << 61n) - 1n;
  let hp = 0n,
    ht = 0n,
    power = 1n;
  for (let i = 0; i < m; i++) {
    hp = (hp * B + BigInt(p.charCodeAt(i))) % MOD;
    ht = (ht * B + BigInt(t.charCodeAt(i))) % MOD;
    if (i < m - 1) power = (power * B) % MOD;
  }

  const out: number[] = [];
  for (let i = 0; i + m <= n; i++) {
    if (hp === ht && t.slice(i, i + m) === p) out.push(i);
    if (i + m < n) {
      ht =
        ((ht - ((BigInt(t.charCodeAt(i)) * power) % MOD) + MOD * MOD) * B +
          BigInt(t.charCodeAt(i + m))) %
        MOD;
    }
  }
  return out;
}
```

Average $O(n + m)$, worst case $O(nm)$ on adversarial hash collisions. A large prime modulus (e.g. Mersenne `2^61 − 1`) and a good base make collisions vanishingly unlikely.

The reason to reach for it: multiple patterns, 2D matching, comparing arbitrary substrings in $O(1)$ after $O(n)$ preprocessing.

> [!TIP]
> [28 Find the Index of the First Occurrence](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/) · [438 Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/) · [187 Repeated DNA Sequences](https://leetcode.com/problems/repeated-dna-sequences/) · [49 Group Anagrams](https://leetcode.com/problems/group-anagrams/) · [387 First Unique Character in a String](https://leetcode.com/problems/first-unique-character-in-a-string/)

## Trie (Prefix Tree)

One node per character along a path; words end at a node marked terminal. Good for prefix queries and multi-pattern work.

```typescript
class Trie {
  private root: { children: Record<string, any>; end: boolean } = {
    children: {},
    end: false,
  };

  insert(word: string) {
    let node = this.root;
    for (const c of word) {
      node.children[c] ??= { children: {}, end: false };
      node = node.children[c];
    }
    node.end = true;
  }

  search(word: string): boolean {
    let node = this.root;
    for (const c of word) {
      if (!node.children[c]) return false;
      node = node.children[c];
    }
    return node.end;
  }

  startsWith(prefix: string): boolean {
    let node = this.root;
    for (const c of prefix) {
      if (!node.children[c]) return false;
      node = node.children[c];
    }
    return true;
  }
}
```

Insert / search / prefix-check are all $O(L)$ where `L` is the word length, independent of the dictionary size.

Extends to **Aho-Corasick** (KMP over a trie) for matching many patterns at once in $O(n + m + z)$ where `z` is the number of matches.

> [!TIP]
> [208 Implement Trie](https://leetcode.com/problems/implement-trie-prefix-tree/) · [211 Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) · [212 Word Search II](https://leetcode.com/problems/word-search-ii/) · [648 Replace Words](https://leetcode.com/problems/replace-words/)

## Cheat Sheet

| Problem                       | Tool                            | Time                |
| ----------------------------- | ------------------------------- | ------------------- |
| `a` is a rotation of `b`      | `(a+a).includes(b)`             | $O(n)$              |
| `s = t^k`, `k ≥ 2`            | `(s+s).slice(1,-1).includes(s)` | $O(n)$              |
| Longest palindromic substring | Expand-around-center            | $O(n^2)$            |
| Longest palindromic substring | Manacher's                      | $O(n)$              |
| Single pattern in text        | KMP / Z-function                | $O(n + m)$          |
| Multiple patterns in text     | Aho-Corasick                    | $O(n + m + z)$      |
| Arbitrary substring equality  | Rolling hash                    | $O(1)$ after $O(n)$ |
| Prefix queries                | Trie                            | $O(L)$              |
