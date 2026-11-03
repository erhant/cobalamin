# Sorting

In practice, call `arr.sort(cmp)`. It runs in $O(n \log n)$, it's stable (guaranteed since ES2019), and V8 implements it as TimSort. The algorithms below are worth knowing for what they **leave behind**: merge sort's merge step counts inversions, quicksort's partition step gives quickselect and the Dutch flag, and counting sort beats $O(n \log n)$ when the keys are small integers.

| Algorithm     | Time                           | Space        | Stable | Use it for                                     |
| ------------- | ------------------------------ | ------------ | ------ | ---------------------------------------------- |
| Merge sort    | $O(n \log n)$                  | $O(n)$       | yes    | inversion counting, linked lists, external sort |
| Quicksort     | $O(n \log n)$ avg, $O(n^2)$ worst | $O(\log n)$  | no     | in-place sorting, quickselect, partitioning     |
| Heap sort     | $O(n \log n)$                  | $O(1)$       | no     | see [Heap](./heap.md)                          |
| Counting sort | $O(n + k)$                     | $O(n + k)$   | yes    | integer keys in $[0, k)$                       |
| Radix sort    | $O(d \cdot (n + b))$           | $O(n + b)$   | yes    | fixed-width integers or strings                |

Comparison sorts can't beat $\Omega(n \log n)$: there are $n!$ possible orders, and each comparison has two outcomes, so at least $\log_2 n! \approx n \log_2 n$ comparisons are needed. Counting and radix sort get around this by never comparing elements.

## JS Pitfalls

> [!CAUTION]
> `[10, 9, 1].sort()` returns `[1, 10, 9]`. Without a comparator, JS converts elements to **strings** and compares those. Always pass `(a, b) => a - b` for numbers.

- A comparator returns a **number**: negative if `a` comes first, positive if `b` does, and `0` if they're tied. Returning a boolean silently misbehaves.
- `a - b` overflows into imprecision for `bigint`-sized values and fails for `bigint` itself. Use `a < b ? -1 : a > b ? 1 : 0` there.
- **Multi-key sorts** chain with `||`: `(a, b) => a.x - b.x || b.y - a.y` sorts by `x` ascending, then `y` descending. This works because `0` is falsy.
- `sort` mutates in place. Use `[...arr].sort(cmp)` or `arr.toSorted(cmp)` to keep the original.
- **Typed arrays** sort numerically by default: `new Int32Array(arr).sort()` is correct, and often faster than `Array.prototype.sort` with a comparator.

**Custom orders** only have to be consistent (transitive). For "largest number from concatenation" (LC 179), the order is `(a, b) => (b + a).localeCompare(a + b)`. It isn't numeric at all, but it's transitive, so sorting by it is valid.

> [!TIP]
> [179 Largest Number](https://leetcode.com/problems/largest-number/) · [56 Merge Intervals](https://leetcode.com/problems/merge-intervals/) · [406 Queue Reconstruction by Height](https://leetcode.com/problems/queue-reconstruction-by-height/) (two keys)

## Merge Sort

Split the array in half, sort each half recursively, then **merge** the two sorted halves with two pointers. The recursion has $\log n$ levels, and each level merges $n$ elements, so it's $O(n \log n)$ in every case.

```typescript
function mergeSort(a: number[]): number[] {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));
  const right = mergeSort(a.slice(mid));
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    // <= takes from the left on ties, which keeps the sort stable
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  }
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}
```

The slices allocate on every call. For speed, sort in place with a single shared buffer and pass index ranges instead.

**Counting inversions.** An inversion is a pair $i < j$ with $a[i] > a[j]$. During a merge, whenever an element is taken from the **right** half, it's smaller than every element still waiting in the left half. So it forms `left.length - i` inversions at once. Adding that count to the merge step counts all inversions in $O(n \log n)$:

```typescript
// sorts a in place; returns the number of inversions
function countInversions(a: number[], lo = 0, hi = a.length, buf = new Array(a.length)): number {
  if (hi - lo <= 1) return 0;
  const mid = (lo + hi) >> 1;
  let inv = countInversions(a, lo, mid, buf) + countInversions(a, mid, hi, buf);
  let i = lo;
  let j = mid;
  let k = lo;
  while (i < mid && j < hi) {
    if (a[i] <= a[j]) {
      buf[k++] = a[i++];
    } else {
      // a[j] jumps ahead of every element left in a[i..mid)
      inv += mid - i;
      buf[k++] = a[j++];
    }
  }
  while (i < mid) buf[k++] = a[i++];
  while (j < hi) buf[k++] = a[j++];
  for (let t = lo; t < hi; t++) a[t] = buf[t];
  return inv;
}
```

The same trick handles "count pairs $i < j$ with $a[i] > 2 \cdot a[j]$" (LC 493). Count the pairs with a separate two-pointer pass over the two sorted halves, then merge as usual. A [Fenwick Tree](./fenwick-tree.md) over compressed values is the other standard way to count inversions.

Merge sort is also the natural sort for **linked lists**: find the middle with fast/slow pointers, then merge by relinking nodes. That takes $O(1)$ extra space besides the recursion (see [Linked Lists](./linked-lists.md)).

> [!TIP]
> [912 Sort an Array](https://leetcode.com/problems/sort-an-array/) · [315 Count of Smaller Numbers After Self](https://leetcode.com/problems/count-of-smaller-numbers-after-self/) · [493 Reverse Pairs](https://leetcode.com/problems/reverse-pairs/) · [148 Sort List](https://leetcode.com/problems/sort-list/)

## Quicksort

Pick a **pivot**, then **partition**: move everything smaller than the pivot to its left and everything larger to its right. The pivot is then in its final position. Recurse on both sides.

```typescript
function quickSort(a: number[], lo = 0, hi = a.length - 1): void {
  if (lo >= hi) return;
  // random pivot: sorted or adversarial input no longer forces O(n^2)
  const p = lo + Math.floor(Math.random() * (hi - lo + 1));
  [a[p], a[hi]] = [a[hi], a[p]];
  const pivot = a[hi];
  // Lomuto partition: a[lo..store) < pivot
  let store = lo;
  for (let i = lo; i < hi; i++) {
    if (a[i] < pivot) {
      [a[i], a[store]] = [a[store], a[i]];
      store++;
    }
  }
  [a[store], a[hi]] = [a[hi], a[store]];
  quickSort(a, lo, store - 1);
  quickSort(a, store + 1, hi);
}
```

The average is $O(n \log n)$ and the worst case is $O(n^2)$. The worst case happens when each pivot is the minimum or maximum, so every partition peels off only one element.

- **A random pivot** fixes adversarial and sorted inputs. Always pivoting on the first or last element degrades to $O(n^2)$ on already-sorted arrays, which is exactly what test cases contain.
- **Many duplicates** still cause $O(n^2)$ with a two-way partition: on an all-equal array, every element lands on one side. Use the three-way partition below, which groups everything equal to the pivot in the middle and never recurses into it.
- **Recurse on the smaller side** and loop on the larger one to keep the stack at $O(\log n)$ even in bad cases.

### Three-Way Partition (Dutch National Flag)

Split into `< pivot`, `= pivot`, `> pivot` in one pass with three pointers. Everything before `lt` is smaller, everything after `gt` is larger, and `i` scans the unknown middle:

```typescript
// partitions a[lo..hi] around pivot; returns [lt, gt], the bounds of the equal block
function partition3(a: number[], lo: number, hi: number, pivot: number): [number, number] {
  let lt = lo;
  let i = lo;
  let gt = hi;
  while (i <= gt) {
    if (a[i] < pivot) {
      [a[i], a[lt]] = [a[lt], a[i]];
      lt++;
      i++;
    } else if (a[i] > pivot) {
      // the swapped-in element is unexamined, so don't advance i
      [a[i], a[gt]] = [a[gt], a[i]];
      gt--;
    } else {
      i++;
    }
  }
  return [lt, gt];
}
```

This is the full solution to "sort colors" (LC 75) with pivot $1$. In quicksort, recurse only on `[lo, lt - 1]` and `[gt + 1, hi]`.

### Quickselect

To find the **k-th smallest** element, partition once and recurse into **only the side that contains index $k$**. The expected work is $n + n/2 + n/4 + \dots = O(n)$, compared with $O(n \log n)$ for sorting or $O(n \log k)$ for a [heap](./heap.md).

```typescript
// k is 0-indexed; reorders a
function quickSelect(a: number[], k: number): number {
  let lo = 0;
  let hi = a.length - 1;
  while (true) {
    const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))];
    const [lt, gt] = partition3(a, lo, hi, pivot);
    if (k < lt) hi = lt - 1;
    else if (k > gt) lo = gt + 1;
    else return pivot;
  }
}
```

The three-way partition makes it safe on inputs with many duplicates. Afterwards, `a` is partitioned around position $k$: everything before it is $\le a[k]$ and everything after is $\ge a[k]$. So the $k$ smallest elements come for free as `a.slice(0, k)`, in no particular order.

> [!TIP]
> [215 Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/) · [75 Sort Colors](https://leetcode.com/problems/sort-colors/) · [973 K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/) · [324 Wiggle Sort II](https://leetcode.com/problems/wiggle-sort-ii/)

## Counting Sort

When the keys are integers in a small range $[0, k)$, count how many times each key occurs, then write the keys back in order. No comparisons, so it's $O(n + k)$.

```typescript
// a[i] in [0, k)
function countingSort(a: number[], k: number): number[] {
  const cnt = new Array(k).fill(0);
  for (const x of a) cnt[x]++;
  const out: number[] = [];
  for (let v = 0; v < k; v++) {
    for (let c = 0; c < cnt[v]; c++) out.push(v);
  }
  return out;
}
```

For keys in $[\min, \max]$, offset by `min` so that $k = \max - \min + 1$. It's only worth it when $k$ is comparable to $n$. With $k = 10^9$, the count array alone doesn't fit.

**Sorting records by key, stably.** When the items carry data beyond the key, writing back "key $v$, `cnt[v]` times" loses the data. Instead, turn the counts into **starting positions** with a prefix sum, then place each item at its key's next free slot. Going through the input in order keeps equal keys in their original order:

```typescript
function countingSortBy<T>(items: T[], key: (x: T) => number, k: number): T[] {
  const start = new Array(k + 1).fill(0);
  for (const x of items) start[key(x) + 1]++;
  // start[v]: first output index for key v
  for (let v = 0; v < k; v++) start[v + 1] += start[v];
  const out = new Array<T>(items.length);
  for (const x of items) out[start[key(x)]++] = x;
  return out;
}
```

This is the same construction as the [CSR](./graph-representations.md#flat-arrays-csr) adjacency layout.

**Radix sort** builds on the stable version. Sort by the lowest digit, then the next one, and so on. Each pass is stable, so ties on the current digit keep the order of all lower digits. With base $b = 256$, 32-bit integers take 4 passes, $O(4 \cdot (n + 256))$. Negative numbers need their sign bit flipped first.

**Bucket sort** is the same idea for a known range rather than exact keys. Split the range into $n$ buckets, put each value in its bucket, and only compare within buckets. A common use is "maximum gap" (LC 164): by pigeonhole, the answer is never inside a bucket, only between neighboring non-empty ones.

> [!TIP]
> [1122 Relative Sort Array](https://leetcode.com/problems/relative-sort-array/) · [274 H-Index](https://leetcode.com/problems/h-index/) (count capped at $n$) · [164 Maximum Gap](https://leetcode.com/problems/maximum-gap/) (buckets) · [451 Sort Characters By Frequency](https://leetcode.com/problems/sort-characters-by-frequency/)
