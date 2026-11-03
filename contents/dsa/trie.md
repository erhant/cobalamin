# Trie

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

## Counting Prefixes

Store a `count` on every node and increment it along the insert path. `count` then means "how many inserted words pass through here". This answers "how many words start with $p$?" in $O(|p|)$, and it makes deletion easy: decrement along the path and drop any node whose count reaches $0$.

> [!TIP]
> [2416 Sum of Prefix Scores of Strings](https://leetcode.com/problems/sum-of-prefix-scores-of-strings/) · [1804 Implement Trie II](https://leetcode.com/problems/implement-trie-ii-prefix-tree/)

## Binary Trie (Max XOR)

Insert numbers by their bits, from the highest bit down, so each node has two children. To maximize $x \oplus y$ over the inserted $y$, walk down greedily and **take the opposite bit** whenever that child exists. A 1 in a higher bit is worth more than all lower bits combined, so the greedy choice is optimal.

```typescript
// B: bit width, e.g. 31 for non-negative 32-bit ints
class BinaryTrie {
  // flat arrays: child[node * 2 + bit], node 0 is the root
  private child: number[] = [0, 0];

  insert(x: number, B = 31): void {
    let node = 0;
    for (let b = B - 1; b >= 0; b--) {
      const bit = (x >> b) & 1;
      if (!this.child[node * 2 + bit]) {
        this.child[node * 2 + bit] = this.child.length / 2;
        this.child.push(0, 0);
      }
      node = this.child[node * 2 + bit];
    }
  }

  // max of x ^ y over inserted y; the trie must be non-empty
  maxXor(x: number, B = 31): number {
    let node = 0;
    let res = 0;
    for (let b = B - 1; b >= 0; b--) {
      const want = ((x >> b) & 1) ^ 1;
      if (this.child[node * 2 + want]) {
        res |= 1 << b;
        node = this.child[node * 2 + want];
      } else {
        node = this.child[node * 2 + (want ^ 1)];
      }
    }
    return res;
  }
}
```

Each operation is $O(B)$. The flat `child` array avoids allocating an object per node, which matters at $10^5$ numbers × 31 levels. Add a `count` per node to support deletion, as in the section above.

The typical problem is "maximum XOR with an element, subject to a limit": sort the queries by limit and insert the numbers as the limit grows (offline, as in [Line Sweep](./line-sweep.md)).

> [!TIP]
> [421 Maximum XOR of Two Numbers in an Array](https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/) · [1707 Maximum XOR With an Element From Array](https://leetcode.com/problems/maximum-xor-with-an-element-from-array/) · [2935 Maximum Strong Pair XOR II](https://leetcode.com/problems/maximum-strong-pair-xor-ii/)

