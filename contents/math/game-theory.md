# Game Theory

Combinatorial games: two players, perfect information, no chance, moves alternate, and the game always ends. Under **normal play** the player who cannot move loses; under **misère play** they win. Every position is then either a win or a loss for the player to move, and the answer comes from a DP over positions, from XOR (Nim), or from Grundy values, which reduce sums of games to Nim.

## Win/Lose States

- **P-position** (previous player wins): the player to move loses.
- **N-position** (next player wins): the player to move wins.

The two rules, applied from terminal positions upward:

1. A position is **P** iff **every** move leads to an N-position (vacuously true for terminal positions under normal play).
2. A position is **N** iff **some** move leads to a P-position.

Because the game graph is acyclic, this is a memoized DFS or a bottom-up DP over states. Example: a pile of $n$ stones, each move removes 1, 3 or 4.

```typescript
function winTable(n: number, moves: number[]): boolean[] {
  const win = new Array(n + 1).fill(false);
  for (let i = 1; i <= n; i++) {
    // winning iff some move reaches a losing position
    win[i] = moves.some((m) => m <= i && !win[i - m]);
  }
  return win;
}

// PNPNNNNPNPNNNNPNPNNNN
console.log(winTable(20, [1, 3, 4]).map((w) => (w ? "N" : "P")).join(""));
```

Printing the table is the standard trick when $n$ is large (up to $10^{18}$): subtraction games are eventually periodic. Here the period is 7, and $n$ loses iff $n \bmod 7 \in \{0, 2\}$. Guess the period from the table, then answer in $O(1)$.

For a general state (tuples, strings, boards), memoize `win(state)` in a `Map` keyed by a canonical encoding, and return early on the first losing child.

> [!TIP]
> [292 Nim Game](https://leetcode.com/problems/nim-game/) · [464 Can I Win](https://leetcode.com/problems/can-i-win/) (bitmask state) · [CSES Stick Game](https://cses.fi/problemset/task/1729)

## Nim

$k$ piles of sizes $a_1, \dots, a_k$. A move removes any positive number of stones from one pile. The position is losing iff

$$
a_1 \oplus a_2 \oplus \cdots \oplus a_k = 0.
$$

**Proof sketch.** The terminal position has XOR $0$. From XOR $0$, changing one pile changes its bits and therefore the total, so every move goes to XOR $\ne 0$. From XOR $x \ne 0$, take the highest set bit of $x$; some pile $a_i$ has that bit set, so $a_i \oplus x < a_i$, and shrinking $a_i$ to $a_i \oplus x$ makes the XOR $0$. Those are exactly the two P/N rules.

```typescript
function nimMove(piles: number[]): [number, number] | null {
  const x = piles.reduce((a, b) => a ^ b, 0);
  // already losing: no move restores XOR = 0
  if (x === 0) return null;
  for (let i = 0; i < piles.length; i++) {
    // only piles with x's top bit set satisfy this
    if ((piles[i] ^ x) < piles[i]) return [i, piles[i] ^ x];
  }
  return null;
}

// [0, 1]: shrink pile 0 from 3 to 1
nimMove([3, 4, 5]);
```

**Misère Nim:** play as in normal Nim, unless every pile has size $\le 1$. Then the player to move wins iff the number of non-empty piles is even.

## Sprague-Grundy

Every impartial game (both players have the same moves) is equivalent to a single Nim pile. The pile's size is the position's **Grundy value**:

$$
g(s) = \operatorname{mex}\{\, g(t) : s \to t \,\}
$$

where $\operatorname{mex}$ is the smallest non-negative integer missing from the set. Terminal positions have $g = 0$.

- A position is losing iff $g(s) = 0$.
- A **sum** of independent games, where each move is made in exactly one component, has $g = g_1 \oplus g_2 \oplus \cdots \oplus g_k$.

The second rule is the point of the theorem: compute $g$ once per component size, then XOR. Plain win/lose bits cannot be combined like this.

```typescript
function mex(s: Set<number>): number {
  let m = 0;
  while (s.has(m)) m++;
  return m;
}

function grundySubtraction(n: number, moves: number[]): number[] {
  const g = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    const seen = new Set<number>();
    for (const m of moves) if (m <= i) seen.add(g[i - m]);
    g[i] = mex(seen);
  }
  return g;
}

// 0 1 0 1 2 3 2 0 1 0 1 2 3 2 0
grundySubtraction(14, [1, 3, 4]);
```

Several piles under the $\{1, 3, 4\}$ rule: the first player wins iff $\bigoplus g(a_i) \ne 0$.

### Splitting into subgames

When a move splits one component into two independent ones, the successor's value is the XOR of the two parts. In **Grundy's game**, a move splits a pile into two non-empty piles of different sizes.

```typescript
function grundysGame(n: number): number[] {
  const g = new Array(n + 1).fill(0);
  for (let i = 3; i <= n; i++) {
    const seen = new Set<number>();
    // i = a + (i - a), with a < i - a
    for (let a = 1; 2 * a < i; a++) seen.add(g[a] ^ g[i - a]);
    g[i] = mex(seen);
  }
  return g;
}
```

Computing the table is $O(n^2)$. For Grundy's game, $g(n) = 0$ for only 41 values of $n$, the largest being 1222; computations far beyond that find no more, so CSES-sized inputs reduce to a lookup. The same idea covers **Lasker's Nim** (remove stones, or split a pile into two), whose pattern is $g(4k+1) = 4k+1$, $g(4k+2) = 4k+2$, $g(4k+3) = 4k+4$, $g(4k+4) = 4k+3$. It also covers **several tokens on a board**, where each token is its own game and the board's value is the XOR of the tokens' values.

> [!TIP]
> [CSES Nim Game I](https://cses.fi/problemset/task/1730) · [CSES Nim Game II](https://cses.fi/problemset/task/1098) · [CSES Stair Game](https://cses.fi/problemset/task/1099) · [CSES Grundy's Game](https://cses.fi/problemset/task/2207)

## Classic Patterns

| Game                                       | Losing iff                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Bash**: one pile, take $1..k$            | $n \bmod (k+1) = 0$                                                                                |
| **Nim**                                    | $\bigoplus a_i = 0$                                                                                |
| **Subtraction game**, take from set $S$    | $g(n) = 0$; the table is eventually periodic                                                       |
| **Wythoff**: take any from one pile, or the same from both | $(a, b) = (\lfloor k\varphi \rfloor, \lfloor k\varphi^2 \rfloor)$, $\varphi$ the golden ratio |
| **Staircase Nim**: move coins down one step | XOR of the piles on **odd** steps is $0$; even steps are irrelevant                               |
| **Token on a DAG**                         | $g(v) = 0$, with $g$ the mex over out-neighbors, computed in reverse topological order             |
| **Graph with cycles**                      | Retrograde BFS from terminal states; positions never labeled are draws                             |

Staircase Nim works because a move from an even step to an odd step can be undone by moving the same coins on from that odd step, which restores parity. Only odd-to-even moves matter, and those act like Nim moves.

## Minimax for Scored Games

When the game ends with scores, not a win or loss, each player maximizes their own score minus the opponent's. On a row where each player takes from either end (Stone Game, Predict the Winner), let $dp[i][j]$ be the best difference the player to move can get on $a[i..j]$:

$$
dp[i][j] = \max\big(a[i] - dp[i+1][j],\; a[j] - dp[i][j-1]\big), \qquad dp[i][i] = a[i].
$$

The subtraction is the turn swap: the opponent's best difference is the mover's loss.

```typescript
function scoreDiff(a: number[]): number {
  const n = a.length;
  // dp[i][j] = mover's total minus opponent's total on a[i..j]
  const dp = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0);
    row[i] = a[i];
    return row;
  });
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      dp[i][j] = Math.max(a[i] - dp[i + 1][j], a[j] - dp[i][j - 1]);
    }
  }
  return dp[0][n - 1];
}

// first player wins iff the difference is >= 0 (Predict the Winner counts ties as wins)
scoreDiff([1, 5, 233, 7]);
```

This runs in $O(n^2)$ time and space. For Stone Game III, where a player takes 1 to 3 stones from the front, the state is one-dimensional: $dp[i] = \max_{k \le 3}\big(\sum a[i..i+k) - dp[i+k]\big)$.

For search-based games too large to tabulate (chess-like trees), use minimax with **alpha-beta pruning**: skip a branch once it provably cannot beat the best option already found. With good move ordering, the effective branching factor drops to about its square root.

> [!TIP]
> [877 Stone Game](https://leetcode.com/problems/stone-game/) · [486 Predict the Winner](https://leetcode.com/problems/predict-the-winner/) · [1406 Stone Game III](https://leetcode.com/problems/stone-game-iii/)
