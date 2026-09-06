# Sqrt Decomposition

## Core Idea

Split operations into **heavy** (small stride, many accesses) and **light** (large stride, few accesses) based on a threshold $T = \sqrt{n}$.

- **Light** ($k \ge T$): brute-force each query, at most $n / k \le \sqrt{n}$ steps each
- **Heavy** ($k < T$): batch into buckets by $k$, process with difference arrays

Total complexity: $O\bigl((n + q) \sqrt{n}\bigr)$ instead of $O(q \cdot n)$.

## Applied to Strided Range Multiply

```typescript
const T = Math.floor(Math.sqrt(n));
const buckets = Array.from({ length: T }, () => []);

for (const [l, r, k, v] of queries) {
  if (k < T) {
    buckets[k].push([l, r, v]); // batch for later
  } else {
    // brute-force: at most sqrt(n) steps
    for (let i = l; i <= r; i += k) {
      nums[i] = mulmod(nums[i], v);
    }
  }
}

// process each bucket with a multiplicative difference array
for (let k = 1; k < T; k++) {
  if (buckets[k].length === 0) continue;

  diffs.fill(1);
  for (const [l, r, v] of buckets[k]) {
    diffs[l] = mulmod(diffs[l], v);
    const cancel = l + (Math.floor((r - l) / k) + 1) * k;
    if (cancel < diffs.length) {
      diffs[cancel] = mulmod(diffs[cancel], modInverse(v));
    }
  }

  // propagate with stride k (handles all "lanes" in one pass)
  for (let i = k; i < n; i++) {
    diffs[i] = mulmod(diffs[i], diffs[i - k]);
  }

  // apply
  for (let i = 0; i < n; i++) {
    nums[i] = mulmod(nums[i], diffs[i]);
  }
}
```

## Performance: Avoid BigInt in JS

`BigInt` operations are extremely slow in JavaScript. For modular arithmetic with $M = 10^9 + 7$, use split multiplication to stay in `Number`:

```typescript
function mulmod(a: number, b: number): number {
  const aHi = Math.floor(a / 65536);
  const aLo = a % 65536;
  return (((aHi * b) % M) * 65536 + aLo * b) % M;
}
```

Splits $a$ into 16-bit halves so partial products stay under $2^{53}$.

If you must use BigInt, prefer `BigInt64Array` over `Array<bigint>` — it uses contiguous memory and is significantly faster for bulk operations.
