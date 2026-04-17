# Two Pointers

## Converging Two Pointers

Fix one variable from the outside loop, then use two pointers converging inward to count valid pairs.

### Triangle Number

Fix `c` (largest side) from the right. Use `a` and `b` pointers converging inward:

```typescript
nums.sort((a, b) => a - b);
let ans = 0;

for (let c_i = nums.length - 1; c_i >= 2; c_i--) {
  let a_i = 0;
  let b_i = c_i - 1;

  while (a_i < b_i) {
    if (nums[a_i] + nums[b_i] > nums[c_i]) {
      // all pairs (a_i..b_i-1, b_i) are valid
      ans += b_i - a_i;
      b_i--;
    } else {
      a_i++;
    }
  }
}
```

The converging pattern counts **many valid pairs in one step** (`ans += b_i - a_i`) rather than iterating through them.

### Three Sum

Same idea, but skip duplicates at three points:

```typescript
for (let a_i = 0; a_i < nums.length - 2; a_i++) {
  if (a_i > 0 && nums[a_i] === nums[a_i - 1]) continue; // skip dup a

  // ... two pointer loop ...
  if (sum === 0) {
    ans.push([a, b, c]);
    while (b_i < c_i && nums[b_i] === b) b_i++; // skip dup b
    while (b_i < c_i && nums[c_i] === c) c_i--; // skip dup c
    // DON'T break — keep searching
  }
}
```

## Shared Pointer (Amortized)

When the upper bound only moves right as the lower bound increases, **share the pointer** across iterations:

```typescript
for (let a_i = 0; a_i < nums.length - 2; a_i++) {
  let t_i = a_i + 2;

  for (let b_i = a_i + 1; b_i < nums.length - 1; b_i++) {
    if (t_i <= b_i) t_i = b_i + 1;

    while (t_i < nums.length && someCondition(t_i)) {
      t_i++;
    }
    ans += t_i - b_i - 1;
  }
}
```

The shared `t_i` moves at most $n$ times **total** per outer loop iteration, not $n$ times **each** inner iteration. Drops from $O(n^2 \log n)$ (binary search) to $O(n^2)$.

## Sliding Window for Counting

To count pairs where `fromWord` is followed by `toWord` within `limit` positions:

```typescript
let activeFroms = 0;
for (let i = 0; i < arr.length; i++) {
  if (i - limit > 0 && arr[i - limit - 1] === fromWord) activeFroms--;
  if (arr[i] === toWord) count += activeFroms;
  if (arr[i] === fromWord) activeFroms++;
}
```

Track active sources in a window; multiply when you hit a target. $O(n)$ single pass.
