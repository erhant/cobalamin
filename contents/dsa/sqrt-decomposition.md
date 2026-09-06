# Sqrt Decomposition

Cut a problem of size $n$ into $\sqrt{n}$ pieces of size $\sqrt{n}$, so that whichever half of the work is expensive, you only ever pay for $\sqrt{n}$ of it. It's the blunt instrument of range queries: worse than a [segment tree](./segment-tree.md)'s $O(\log n)$, but it applies to aggregates a segment tree can't express, and the code is short enough to write from memory under pressure.

Two distinct patterns wear the name:

- **Block decomposition** — partition the _array_ into blocks of $\sqrt{n}$ and cache an aggregate per block. Range query touches $O(\sqrt n)$ elements (partial end blocks) plus $O(\sqrt n)$ block aggregates.
- **Heavy / light threshold** — partition the _operations_ at $T = \sqrt{n}$: rare-but-expensive ones brute-forced, frequent-but-cheap ones batched.

Reach for it when:

- The aggregate **doesn't compose** — mode, k-th smallest, "how many elements equal $v$ in $[l, r]$". A block can hold a frequency table; a segment tree node can't hold anything that doesn't merge in $O(1)$.
- All queries are known **offline**, so they can be reordered (Mo's algorithm below).
- An operation is only fast **in bulk**, so you want to batch by some parameter.
- You want $O(\sqrt n)$ in twenty lines rather than $O(\log n)$ in eighty.

## Block Decomposition

Blocks of size $b = \lceil \sqrt n \rceil$; `blockAgg[i]` is the aggregate of block `i`. A point update fixes one element and one block; a range query walks the partial blocks element-by-element and the interior blocks aggregate-by-aggregate.

```typescript
class SqrtArray {
  private b: number;
  private blockSum: number[];

  constructor(private a: number[]) {
    this.b = Math.ceil(Math.sqrt(a.length));
    this.blockSum = new Array(Math.ceil(a.length / this.b)).fill(0);
    for (let i = 0; i < a.length; i++) this.blockSum[(i / this.b) | 0] += a[i];
  }

  update(i: number, val: number): void {
    this.blockSum[(i / this.b) | 0] += val - this.a[i];
    this.a[i] = val;
  }

  query(l: number, r: number): number {
    let sum = 0;
    while (l <= r) {
      // l starts a whole block that fits — take the cached aggregate and skip it
      if (l % this.b === 0 && l + this.b - 1 <= r) {
        sum += this.blockSum[(l / this.b) | 0];
        l += this.b;
      } else {
        sum += this.a[l];
        l++;
      }
    }
    return sum;
  }
}
```

$O(n)$ build, $O(1)$ update, $O(\sqrt n)$ query. At most two partial blocks exist (one at each end), and at most $\sqrt n$ whole blocks between them — that's the entire complexity argument.

For sum this loses to a [Fenwick tree](./fenwick-tree.md) on every axis. It earns its place when `blockSum` becomes something richer: a per-block **frequency map** answers "count of $v$ in $[l, r]$", a per-block **sorted copy** answers "how many elements $\le x$ in $[l, r]$" in $O(\sqrt n \log n)$, and a per-block candidate list answers range-mode queries. None of those merge cheaply enough for a segment tree node.

## Mo's Algorithm

For **offline** range queries where the answer for $[l, r]$ can be updated in $O(1)$ when either endpoint moves by one. Sort the queries so those endpoint moves total $O((n + q)\sqrt n)$ instead of $O(nq)$:

- primary key: block of `l` (i.e. `l / b | 0`)
- secondary key: `r` (ascending; alternate direction per block to shave a constant)

```typescript
const b = Math.ceil(Math.sqrt(n));
queries.sort((x, y) => {
  const bx = (x.l / b) | 0, by = (y.l / b) | 0;
  return bx !== by ? bx - by : x.r - y.r;
});

// add(i) / remove(i) fold index i into the running answer `cur`
let curL = 0, curR = -1;
for (const q of queries) {
  // grow both ends first, then shrink — never the other way round
  while (curR < q.r) add(++curR);
  while (curL > q.l) add(--curL);
  while (curR > q.r) remove(curR--);
  while (curL < q.l) remove(curL++);
  q.ans = cur;
}
```

Why it's $O((n + q)\sqrt n)$: within one block of `l`, `r` only moves forward — $O(n)$ per block over $\sqrt n$ blocks. And `l` never travels more than $b$ per query — $O(q\sqrt n)$ total. The catch is the **order of the four while loops**: grow before you shrink, or the window can transiently invert (`curL > curR + 1`) and `remove` will be called on elements that were never added.

## Heavy / Light Threshold

The other flavor splits the _operations_ rather than the array. Anything with a stride, a group size, or a repetition count $k$ has two regimes on either side of $T = \sqrt n$:

- **Light** ($k \ge T$) — few steps per query ($n / k \le \sqrt n$), so brute-force each one.
- **Heavy** ($k < T$) — many steps per query, but only $\sqrt n$ distinct values of $k$ exist, so batch queries by $k$ and pay once per bucket.

Applied to strided range multiply — "multiply `nums[i]` by `v` for every $i \in [l, r]$ with $i \equiv l \pmod k$":

```typescript
const T = Math.floor(Math.sqrt(n));
const buckets: [number, number, number][][] = Array.from({ length: T }, () => []);

for (const [l, r, k, v] of queries) {
  if (k < T) {
    // batch for later — too many steps to walk now
    buckets[k].push([l, r, v]);
  } else {
    // at most sqrt(n) steps, just walk it
    for (let i = l; i <= r; i += k) nums[i] = mulmod(nums[i], v);
  }
}

for (let k = 1; k < T; k++) {
  if (buckets[k].length === 0) continue;
  // one multiplicative difference array per stride, shared by every query in the bucket
  diffs.fill(1);
  for (const [l, r, v] of buckets[k]) {
    diffs[l] = mulmod(diffs[l], v);
    const cancel = l + (Math.floor((r - l) / k) + 1) * k;
    if (cancel < diffs.length) diffs[cancel] = mulmod(diffs[cancel], modInverse(v));
  }
  // propagating with stride k handles every residue class in one pass
  for (let i = k; i < n; i++) diffs[i] = mulmod(diffs[i], diffs[i - k]);
  for (let i = 0; i < n; i++) nums[i] = mulmod(nums[i], diffs[i]);
}
```

$O((n + q)\sqrt n)$ instead of $O(qn)$. The cancellation sits one **stride** past the last affected index, not at $r + 1$ — see [Prefix Sums § Difference Array](./prefix-diff.md#difference-array) for the additive original this generalizes.

## Performance: Avoid BigInt in JS

`BigInt` is dramatically slower than `Number` in V8, which matters when the whole point was to shave a $\sqrt n$ factor. For modular arithmetic with $M = 10^9 + 7$, split the multiplication so partial products stay under $2^{53}$:

```typescript
function mulmod(a: number, b: number): number {
  const aHi = Math.floor(a / 65536);
  const aLo = a % 65536;
  return (((aHi * b) % M) * 65536 + aLo * b) % M;
}
```

If you genuinely need `BigInt`, prefer `BigInt64Array` over `Array<bigint>` — contiguous memory, far faster in bulk.

> [!TIP]
> [307 Range Sum Query - Mutable](https://leetcode.com/problems/range-sum-query-mutable/) (block decomposition is the $O(\sqrt n)$ answer; Fenwick is the $O(\log n)$ one) · [1157 Online Majority Element In Subarray](https://leetcode.com/problems/online-majority-element-in-subarray/) (range mode — the aggregate a segment tree can't merge) · [3356 Zero Array Transformation II](https://leetcode.com/problems/zero-array-transformation-ii/) (difference-array batching). Mo's algorithm is rare on LeetCode — it shows up on Codeforces, where queries arrive offline by design.
