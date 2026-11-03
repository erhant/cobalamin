# Line Sweep

Sweep an imaginary line across the plane, usually left-to-right along $x$. It only stops at **events**, the coordinates where something starts or ends. Between two events nothing changes, so a 2D problem collapses into a sorted sequence of 1D updates to an **active set**.

The template is always the same:

1. Turn each object into events: `[coord, type, ...payload]`.
2. Sort events by coordinate, and break ties deliberately (see below).
3. Walk the events. Update the active set, then read off the answer for the gap before the next event.

The cost is $O(n \log n)$ for the sort plus whatever the active set costs per update. That might be a counter, a heap, a sorted set, or a [Segment Tree](./segment-tree.md).

**Tie-breaking is where the bugs live.** When a start and an end share a coordinate, the order decides whether touching intervals count as overlapping:

- Half-open $[s, e)$, so that touching ≠ overlapping: process **ends before starts**.
- Closed $[s, e]$, so that touching = overlapping: process **starts before ends**.

## Max Overlap (Meeting Rooms)

How many intervals are active at once, at most? Each interval is a $+1$ event at `s` and a $-1$ at `e`. Sort by `(coord, delta)` so that $-1$ sorts before $+1$ at ties, which gives the half-open behavior.

```typescript
function maxOverlap(intervals: [number, number][]): number {
  const events: [number, number][] = [];
  for (const [s, e] of intervals) events.push([s, 1], [e, -1]);
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let best = 0;
  for (const [, d] of events) {
    cur += d;
    best = Math.max(best, cur);
  }
  return best;
}
```

This is the [difference array](./prefix-diff.md) idea over sparse coordinates: sorting the events replaces indexing into a dense array. If coordinates are small and dense, use the difference array directly and skip the sort. If intervals arrive online, keep the events in a sorted map and re-sweep, or use a lazy segment tree.

> [!TIP]
> [253 Meeting Rooms II](https://leetcode.com/problems/meeting-rooms-ii/) · [731 My Calendar II](https://leetcode.com/problems/my-calendar-ii/) · [732 My Calendar III](https://leetcode.com/problems/my-calendar-iii/) · [1851 Minimum Interval to Include Each Query](https://leetcode.com/problems/minimum-interval-to-include-each-query/)

## Skyline

Buildings are `[l, r, h]`. Output the points where the outline's height changes. The sweep moves along $x$, and the active set is a **max-heap of heights**. At each event coordinate, apply every event there, then compare the current max to the last emitted height.

Removing an arbitrary height from a heap is awkward, so use **lazy deletion**: store `[h, r]` and pop the top only while its $r \le x$, meaning that building has already ended.

```typescript
function skyline(buildings: [number, number, number][]): [number, number][] {
  const xs = [...new Set(buildings.flatMap(([l, r]) => [l, r]))].sort((a, b) => a - b);
  // [height, right]; MinHeap from the Heap chapter, flipped into a max-heap by height
  const heap = new MinHeap<[number, number]>((a, b) => a[0] > b[0]);
  const res: [number, number][] = [];
  let i = 0;
  for (const x of xs) {
    // buildings are sorted by l: push every one that has started
    while (i < buildings.length && buildings[i][0] <= x) {
      heap.push([buildings[i][2], buildings[i][1]]);
      i++;
    }
    // lazily drop buildings that have ended
    while (heap.size() && heap.peek()![1] <= x) heap.pop();
    const h = heap.size() ? heap.peek()![0] : 0;
    if (!res.length || res[res.length - 1][1] !== h) res.push([x, h]);
  }
  return res;
}
```

Stale entries buried under a taller live building don't matter, because only the top is ever read. Each building is pushed and popped once, so the total is $O(n \log n)$.

> [!TIP]
> [218 The Skyline Problem](https://leetcode.com/problems/the-skyline-problem/)

## Area of Union of Rectangles

Rectangles are `[x1, y1, x2, y2]`. Sweep along $x$, where each rectangle is an "open" event at `x1` and a "close" event at `x2` carrying its $y$-interval. Between consecutive events, the covered area is `(covered y-length) × (x gap)`.

The active set has to answer one question: **how much of the $y$-axis is covered by at least one active interval?** Compress the $y$ coordinates, keep a coverage count per elementary slab, and sum the slabs with a nonzero count.

```typescript
function unionArea(rects: [number, number, number, number][]): number {
  const ys = [...new Set(rects.flatMap(([, y1, , y2]) => [y1, y2]))].sort((a, b) => a - b);
  const yi = new Map(ys.map((y, i) => [y, i]));
  // [x, +1 open / -1 close, y1, y2]
  const events: [number, number, number, number][] = [];
  for (const [x1, y1, x2, y2] of rects) {
    events.push([x1, 1, y1, y2], [x2, -1, y1, y2]);
  }
  events.sort((a, b) => a[0] - b[0]);

  // cnt[k]: active rectangles covering slab [ys[k], ys[k + 1])
  const cnt = new Array(ys.length).fill(0);
  let area = 0;
  let prevX = events[0][0];
  for (const [x, d, y1, y2] of events) {
    // area of the strip since the last event, before applying this one
    let covered = 0;
    for (let k = 0; k + 1 < ys.length; k++) {
      if (cnt[k] > 0) covered += ys[k + 1] - ys[k];
    }
    area += covered * (x - prevX);
    prevX = x;
    // O(n) per event, so O(n²) total; use a segment tree over slabs for O(n log n)
    for (let k = yi.get(y1)!; k < yi.get(y2)!; k++) cnt[k] += d;
  }
  return area;
}
```

Ties don't matter here, because the strip between two events at the same $x$ has width 0.

**Segment tree upgrade:** store `count` and `covered` per node. A node's `covered` is its full length when `count > 0`, and otherwise the sum of its children's. A range update never has to push down, because removals exactly mirror earlier insertions. This makes each event $O(\log n)$.

> [!TIP]
> [850 Rectangle Area II](https://leetcode.com/problems/rectangle-area-ii/) · [391 Perfect Rectangle](https://leetcode.com/problems/perfect-rectangle/) · [3454 Separate Squares II](https://leetcode.com/problems/separate-squares-ii/)

## Further

- **Closest pair of points** in $O(n \log n)$: sweep by $x$ and keep the points within the current best distance $d$ in a set ordered by $y$. Only $O(1)$ of them can be within $d$ of the new point.
- **Segment intersections (Bentley–Ottmann)**: sweep by $x$ and keep the active segments ordered by their $y$ at the sweep line. Only segments that are **adjacent** in that order can intersect next, so test each pair as it becomes adjacent. This runs in $O((n + k) \log n)$ for $k$ intersections, built on the `intersects` primitive from [Geometry](./geometry.md).
- **Offline queries**: sort queries together with the data as extra events, then answer each query when the sweep reaches it. This is the "add as you go, answer at your stop" pattern in [1851](https://leetcode.com/problems/minimum-interval-to-include-each-query/) and in many Fenwick-tree counting problems.
