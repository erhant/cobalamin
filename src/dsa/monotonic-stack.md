# Monotonic Stack

## Core Idea

A stack that maintains a sorted invariant by popping elements that violate the ordering when a new element arrives.

## Remove Duplicate Letters (Lexicographic Ordering)

Three mechanisms work together:

1. **Monotonic stack** — tries to keep letters in sorted order
2. **Last occurrence check** — prevents popping letters we can't recover (acts as a "wall")
3. **`isStacked` set** — ensures each letter appears exactly once

```typescript
const lastOccurrence: Record<string, number> = {};
for (let i = 0; i < s.length; i++) lastOccurrence[s[i]] = i;

const isStacked = new Set<string>();
const stack: string[] = [];

for (let i = 0; i < s.length; i++) {
  if (isStacked.has(s[i])) continue;

  while (
    stack.length &&
    s[i] < stack[stack.length - 1] &&
    lastOccurrence[stack[stack.length - 1]] > i
  ) {
    isStacked.delete(stack.pop()!);
  }

  stack.push(s[i]);
  isStacked.add(s[i]);
}

return stack.join("");
```

A "wall" in the stack (unpoppable element) doesn't break correctness — everything below it was already optimally ordered, everything above will be optimally ordered relative to it.

## Total Steps (Removal Simulation)

For "how many rounds until array is non-decreasing", the stack stores `[value, step]`:

```typescript
const stack: [number, number][] = [];
let ans = 0;

for (const num of nums) {
  let maxStep = 0;

  while (stack.length && stack[stack.length - 1][0] <= num) {
    maxStep = Math.max(maxStep, stack[stack.length - 1][1]);
    stack.pop();
  }

  const step = stack.length ? maxStep + 1 : 0;
  ans = Math.max(ans, step);
  stack.push([num, step]);
}
```

Each element's removal step = `max(steps of popped elements) + 1`. If nothing larger is to the left, it's never removed (step = 0).
