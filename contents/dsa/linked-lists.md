# Linked Lists

A **linked list** stores elements as nodes connected by `next` pointers (singly linked) or `next` + `prev` pointers (doubly linked). Compared to arrays:

| Concern               | Array            | Linked List                  |
| --------------------- | ---------------- | ---------------------------- |
| Random access         | $O(1)$           | $O(n)$                       |
| Insert/delete at head | $O(n)$           | $O(1)$                       |
| Insert/delete at tail | $O(1)$ amortized | $O(1)$ with tail pointer     |
| Insert/delete middle  | $O(n)$ shift     | $O(1)$ if you have the node  |
| Cache locality        | excellent        | poor (pointer chasing)       |
| Memory overhead       | small            | one pointer per node         |

In practice, arrays usually win — modern CPUs love contiguity. Linked lists earn their keep when you need **$O(1)$ splice/move** (LRU cache, the free list of an allocator, a scheduler's run queue) or **persistent structure sharing** (functional languages, undo stacks).

```typescript
class ListNode {
  val: number;
  next: ListNode | null = null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}
```

## Dummy Head (Sentinel) Trick

Many linked-list operations have an annoying edge case when the head itself is modified. The fix: prepend a **dummy node**, operate on its `next`, then return `dummy.next` at the end. Every "real" node now has a predecessor, eliminating the special case.

```typescript
function removeElements(head: ListNode | null, val: number): ListNode | null {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  while (prev.next) {
    if (prev.next.val === val) prev.next = prev.next.next;
    else prev = prev.next;
  }
  return dummy.next;
}
```

Without the dummy, the first iteration needs separate handling for "is the head the one we delete?" The sentinel collapses three cases (delete head, delete middle, delete tail) into one.

## Reversal

The textbook three-pointer dance:

```typescript
function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  while (curr) {
    // remember where we were going
    const next = curr.next;
    // flip the pointer
    curr.next = prev;
    // advance prev
    prev = curr;
    // advance curr
    curr = next;
  }
  return prev;
}
```

The loop invariant: everything strictly before `curr` is already reversed; `prev` is its new head. When `curr` becomes `null`, `prev` is the reversed list.

**Recursive variant** is two lines but blows the stack on long lists — prefer iterative in practice:

```typescript
function reverseRec(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;
  const newHead = reverseRec(head.next);
  // the next node now points back at us
  head.next.next = head;
  head.next = null;
  return newHead;
}
```

> [!TIP]
> [206 Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/) · [92 Reverse Linked List II](https://leetcode.com/problems/reverse-linked-list-ii/) · [25 Reverse Nodes in k-Group](https://leetcode.com/problems/reverse-nodes-in-k-group/)

## Fast/Slow Pointers

Walk two pointers down the list at different speeds. After $k$ steps, the fast pointer is $k$ ahead (or $2k - k = k$ ahead at speed 2 vs. 1). This yields three common idioms.

### Finding the middle

```typescript
function middle(head: ListNode | null): ListNode | null {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow;
}
```

When `fast` falls off the end, `slow` is at the midpoint. For even-length lists, `slow` lands on the **second** midpoint — adjust by starting `fast = head.next` if you want the first.

### Cycle detection (Floyd's Tortoise and Hare)

If there's a cycle, a 2×-speed pointer will eventually lap the 1×-speed one and they'll collide inside the cycle. If there's no cycle, the fast pointer hits null.

```typescript
function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```

$O(n)$ time, $O(1)$ space — strictly better than a `Set`-based "have I seen this node?" approach.

### Finding the cycle's start

A small piece of modular arithmetic does the work. Let $L$ be the distance from `head` to the cycle entrance and $C$ the cycle length. When `slow` and `fast` meet, `slow` has walked some distance $d$ and `fast` has walked $2d$, with $2d - d = d$ being a multiple of $C$. So $d = kC$ for some $k$. The meeting point sits at distance $L + (kC - L) \bmod C$ from the head.

The consequence: after the meeting, walk one pointer from `head` and one from the meeting point, both at speed 1. They collide exactly at the cycle's start.

```typescript
function cycleStart(head: ListNode | null): ListNode | null {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) {
      let p = head;
      while (p !== slow) { p = p!.next; slow = slow!.next; }
      return p;
    }
  }
  return null;
}
```

> [!TIP]
> [141 Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/) · [142 Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/) · [287 Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/) (Floyd's on indices)

### Gap-of-$k$ runner

To find the $k$-th from the end, advance `fast` by $k$ first, then walk both together. When `fast` hits the end, `slow` is the answer. The same trick removes the $k$-th from the end in one pass.

## Palindrome Check

Reusing two of the above: find the middle, reverse the second half, compare from both ends.

```typescript
function isPalindrome(head: ListNode | null): boolean {
  if (!head || !head.next) return true;
  const mid = middle(head);
  let r = reverse(mid);
  let l = head;
  while (r) {
    if (l!.val !== r.val) return false;
    l = l!.next; r = r.next;
  }
  return true;
}
```

$O(n)$ time, $O(1)$ space — beats stack-based or array-copy approaches. Restore the second half by reversing it again if the caller expects an unmodified list.

> [!TIP]
> [234 Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/) · [876 Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/)

## Merging Two Sorted Lists

Pull the smaller head off each list in turn, splicing into a new list. Dummy head again so the tail-append loop has no special first iteration:

```typescript
function merge(a: ListNode | null, b: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else                { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}
```

For **merging $k$ sorted lists**, push every head into a min-heap keyed on value and pop one at a time, pushing the popped node's successor. $O(N \log k)$ for $N$ total nodes — see the merge-K idiom in [Heap](./heap.md).

## LRU Cache: DLL + HashMap

The textbook composition. A **doubly linked list** keeps entries in recency order (most-recently-used at the head, least at the tail). A **hash map** maps each key to its node. Every operation — `get`, `put`, evict — is $O(1)$:

- `get(key)` — look up the node via the map, splice it out, push to head, return value.
- `put(key, val)` — if the key exists, update and move to head. Otherwise insert at head; if over capacity, evict the tail node and delete from map.

```typescript
class LRUNode {
  key: number; val: number;
  prev: LRUNode | null = null;
  next: LRUNode | null = null;
  constructor(key: number, val: number) { this.key = key; this.val = val; }
}

class LRUCache {
  private cap: number;
  private map = new Map<number, LRUNode>();
  // sentinel
  private head = new LRUNode(0, 0);
  // sentinel
  private tail = new LRUNode(0, 0);

  constructor(capacity: number) {
    this.cap = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private unlink(n: LRUNode) {
    n.prev!.next = n.next;
    n.next!.prev = n.prev;
  }

  private pushFront(n: LRUNode) {
    n.next = this.head.next;
    n.prev = this.head;
    this.head.next!.prev = n;
    this.head.next = n;
  }

  get(key: number): number {
    const n = this.map.get(key);
    if (!n) return -1;
    this.unlink(n);
    this.pushFront(n);
    return n.val;
  }

  put(key: number, value: number): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.val = value;
      this.unlink(existing);
      this.pushFront(existing);
      return;
    }
    if (this.map.size === this.cap) {
      const lru = this.tail.prev!;
      this.unlink(lru);
      this.map.delete(lru.key);
    }
    const n = new LRUNode(key, value);
    this.pushFront(n);
    this.map.set(key, n);
  }
}
```

Two sentinels (`head` and `tail`) eliminate every "is this the first/last node?" branch — the unlink and push-front routines are seven lines of pointer surgery with no nulls to check. **The eviction key must be stored on the node** (not just the value), because when you evict the tail, you need to delete its entry from the map.

> [!TIP]
> [146 LRU Cache](https://leetcode.com/problems/lru-cache/) · [460 LFU Cache](https://leetcode.com/problems/lfu-cache/) · [432 All O`one Data Structure](https://leetcode.com/problems/all-oone-data-structure/)

## When Not to Use a Linked List

If the problem allows random access and you don't need splice operations, an array (or `ArrayDeque`) is almost always faster despite the same asymptotic bounds — cache locality dominates. The classic interview lie is that a linked list is "faster for insertions" — only true if you already hold a pointer to the insertion site, which you usually don't.
