# In-place Array Tricks

A family of techniques that reuse the input array's own storage as scratch space, turning $O(n)$-extra-space algorithms into $O(1)$. The unifying idea: **the array's indices, values, or sign bits already carry information you can encode into**. The trick is choosing an encoding that round-trips — you can read the original value back when you need it.

When this comes up:

- Interview prompts that explicitly say "$O(1)$ extra space".
- Problems where the value range matches the index range (`nums[i] ∈ [1, n]`), unlocking cyclic-sort / index-as-bucket.
- Matrix transformations where allocating a copy is wasteful.
- Constant-space bridges between arrays and graph algorithms (Floyd's-on-indices).

## Cyclic Sort

When `nums[i] ∈ [1, n]` (or any bijection between values and indices), **place each value at the index it owns**. After one pass, the array is sorted; mismatched slots reveal duplicates and missing values.

```typescript
function cyclicSort(nums: number[]): void {
  for (let i = 0; i < nums.length; ) {
    const target = nums[i] - 1;  // where nums[i] belongs
    if (nums[i] !== nums[target]) {
      [nums[i], nums[target]] = [nums[target], nums[i]];
    } else {
      i++;
    }
  }
}
```

The inner swap is conditional on `nums[i] !== nums[target]` — not on `nums[i] !== i + 1` — so duplicates don't loop. Each swap places at least one value into its final slot, so the total swap count is $\le n$: **$O(n)$ time, $O(1)$ space**.

### First Missing Positive

The classic application. Run cyclic sort restricted to values in $[1, n]$, then the first index where `nums[i] !== i + 1` is the answer.

```typescript
function firstMissingPositive(nums: number[]): number {
  const n = nums.length;
  for (let i = 0; i < n; ) {
    const v = nums[i];
    if (v >= 1 && v <= n && nums[v - 1] !== v) {
      [nums[i], nums[v - 1]] = [nums[v - 1], nums[i]];
    } else {
      i++;
    }
  }
  for (let i = 0; i < n; i++) if (nums[i] !== i + 1) return i + 1;
  return n + 1;
}
```

The clever observation: the answer is in $[1, n + 1]$. Values outside $[1, n]$ are irrelevant — there are at most $n$ slots, so at most $n$ distinct positives in range can be present. Any "gap" in the slot layout reveals the smallest missing positive.

> [!TIP]
> [41 First Missing Positive](https://leetcode.com/problems/first-missing-positive/) · [268 Missing Number](https://leetcode.com/problems/missing-number/) · [448 Find All Numbers Disappeared in an Array](https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/)

## Sign Marking

When values fit in $[1, n]$ and you don't actually need them after the scan, **negate `nums[v - 1]` to record "v has been seen"**. The sign bit is free storage that doesn't disturb the magnitude. Read back with `Math.abs`.

```typescript
function findDuplicates(nums: number[]): number[] {
  const out: number[] = [];
  for (const x of nums) {
    const i = Math.abs(x) - 1;
    if (nums[i] < 0) out.push(Math.abs(x));
    else nums[i] = -nums[i];
  }
  return out;
}
```

On the second sighting of value $v$, the slot at index $v - 1$ is already negative — that's how you detect a duplicate. **$O(n)$ time, $O(1)$ extra space**.

Restriction: values must be strictly positive (so the sign bit is unused) and within $[1, n]$. If zero is in range, shift up by 1 or use a different marker.

> [!TIP]
> [442 Find All Duplicates in an Array](https://leetcode.com/problems/find-all-duplicates-in-an-array/) · [287 Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/) (also doable in $O(1)$ via [Floyd's on indices](./linked-lists.md#cycle-detection-floyds-tortoise-and-hare)) · [645 Set Mismatch](https://leetcode.com/problems/set-mismatch/)

## Two Values per Slot (Modular Encoding)

When you need to write a new value while still reading the old one — e.g. Game of Life's "next generation depends on current" — pack both into one slot. If both old and new values are in $[0, k)$, encode as $\text{old} + k \cdot \text{new}$:

- read old: `cell % k`
- read new: `Math.floor(cell / k)`

After one pass, divide every cell by $k$ to commit the new state. This generalizes: any time you need to write while still observing the original, look for an encoding that keeps both readable.

The same trick handles Boolean state ($k = 2$): pack the next bit into bit 1 of a slot whose low bit is the current value. After updating, right-shift to commit.

## Matrix Rotation In Place

Rotating an $n \times n$ matrix 90° clockwise: **transpose, then reverse each row**.

```typescript
function rotate(matrix: number[][]): void {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }
  for (const row of matrix) row.reverse();
}
```

Why it works: transposition sends $(i, j) \to (j, i)$; reversing each row sends $(j, i) \to (j, n - 1 - i)$. The composed mapping $(i, j) \to (j, n - 1 - i)$ is exactly a 90° clockwise rotation. For counter-clockwise, swap the steps (reverse each row, then transpose).

The triangle traversal `j = i + 1` avoids re-swapping the same pair twice — only the strictly-above-diagonal slots are touched. **$O(n^2)$ time** (you have to read every cell), **$O(1)$ extra space**.

For non-square or arbitrary-angle rotations, you need a fresh buffer.

> [!TIP]
> [48 Rotate Image](https://leetcode.com/problems/rotate-image/) · [54 Spiral Matrix](https://leetcode.com/problems/spiral-matrix/) · [73 Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/) (use the first row/column as marker storage)

## Floyd's on Indices

When `nums[i] ∈ [1, n]` and there's exactly one duplicate, treat the array as a function $f(i) = \text{nums}[i]$ — i.e. a linked list where node $i$ points to node $\text{nums}[i]$. The duplicate creates a cycle, and the cycle's entrance is the duplicate value.

Apply [Floyd's tortoise-and-hare](./linked-lists.md#cycle-detection-floyds-tortoise-and-hare) to find the cycle's start without modifying the array:

```typescript
function findDuplicate(nums: number[]): number {
  let slow = nums[0], fast = nums[0];
  do {
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);
  slow = nums[0];
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }
  return slow;
}
```

$O(n)$ time, $O(1)$ space, **non-destructive** — sign-marking modifies the array. The duality is striking: the same algorithm that finds a cycle in a linked list finds a duplicate in a constrained array, because they're the same problem under a different visualization.

## Common Pitfalls

- **Cyclic sort with duplicates** — guard with `nums[i] !== nums[target]`, not `nums[i] !== i + 1`, or you'll spin forever swapping two equal values.
- **Sign marking with zero** — `-0 === 0` in JS; if zero is a legal value, shift up or pick a different marker.
- **Modular encoding overflow** — `old + k * new` must fit in `Number`. For 32-bit ints with large $k$, this is fine; for already-large values, you may need BigInt or a fresh array.
- **Forgetting to restore** — if the caller doesn't expect the array to be mutated, document the side effect or use Floyd's-on-indices instead.
