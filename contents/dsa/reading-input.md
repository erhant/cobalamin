# Reading Input

Most competitive programming judges (Codeforces, AtCoder, CSES, Kattis, ICPC-style contests) pass the input on **stdin** and read your answer from **stdout**. LeetCode is the exception: there you fill in a function and the platform parses for you. In Node, the fastest and simplest approach is to read all of stdin in one call, then walk through it token by token.

## Template

```typescript
import { readFileSync } from "fs";

class Reader {
  private readonly data: string;
  private pos = 0;

  // fd 0 is stdin; pass a string instead to test without it
  constructor(data: string = readFileSync(0, "utf8")) {
    this.data = data;
  }

  // codes <= 32 are whitespace (space, \t, \r, \n); past the end charCodeAt is NaN, which stops both loops
  skipSpace(): void {
    while (this.data.charCodeAt(this.pos) <= 32) this.pos++;
  }

  // move to the next whitespace or EOF, returning where the skipped run started
  seek(): number {
    const start = this.pos;
    while (this.data.charCodeAt(this.pos) > 32) this.pos++;
    return start;
  }

  // true once only whitespace remains
  eof(): boolean {
    this.skipSpace();
    return this.pos >= this.data.length;
  }

  next(): string {
    this.skipSpace();
    const start = this.seek();
    return this.data.slice(start, this.pos);
  }

  // parses digits in place, without allocating a substring (~2x faster than Number(next()))
  nextInt(): number {
    this.skipSpace();
    const neg = this.data[this.pos] === "-";
    if (neg) this.pos++;
    let x = 0;
    for (let d; (d = this.data.charCodeAt(this.pos) - 48) >= 0 && d <= 9; this.pos++) x = x * 10 + d;
    return neg ? -x : x;
  }

  // floats go through Number(): correct rounding and exponents like 1e-9 are hard to parse by hand
  nextFloat(): number {
    return Number(this.next());
  }

  // for values past 2^53
  nextBigInt(): bigint {
    return BigInt(this.next());
  }

  ints(n: number): number[] {
    return Array.from({ length: n }, () => this.nextInt());
  }

  // rest of the current line, without its line break
  nextLine(): string {
    const end = this.data.indexOf("\n", this.pos);
    const line = this.data.slice(this.pos, end === -1 ? undefined : end);
    this.pos = end === -1 ? this.data.length : end + 1;
    return line.replace(/\r$/, "");
  }
}

const r = new Reader();
const out: string[] = [];

// ... solve, pushing answers into out ...

process.stdout.write(out.join("\n") + "\n");
```

Token methods scan characters instead of splitting on newlines, so `\r\n` line endings, trailing spaces and blank lines need no special handling. `nextLine` is the exception: it returns the rest of the *current* line, so right after `nextInt()` it returns the empty remainder of that line. Call it once to drop the remainder, then again for the line you want. Passing a string to the constructor makes the reader easy to test without stdin.

For small inputs a one-liner is fine:

```typescript
const tokens = readFileSync(0, "utf8").split(/\s+/).filter(Boolean);
```

On around $10^6$ numbers, though, it allocates a million strings before you've started solving.

## Common Shapes

```typescript
// t test cases, each "n" then n numbers
const t = r.nextInt();
for (let tc = 0; tc < t; tc++) {
  const n = r.nextInt();
  const a = r.ints(n);
  out.push(String(a.reduce((s, x) => s + x, 0)));
}
```

```typescript
// n x m grid of characters, one row per line, no spaces inside a row
const n = r.nextInt();
const m = r.nextInt();
const grid = Array.from({ length: n }, () => r.next());
// grid[i][j] is a char; grid[i].charCodeAt(j) avoids creating one-char strings
```

```typescript
// n nodes, m undirected edges, 1-indexed in the input
const n = r.nextInt();
const m = r.nextInt();
const adj: number[][] = Array.from({ length: n }, () => []);
for (let i = 0; i < m; i++) {
  const u = r.nextInt() - 1;
  const v = r.nextInt() - 1;
  adj[u].push(v);
  adj[v].push(u);
}
```

```typescript
// unknown count: read until the input runs out
while (!r.eof()) out.push(String(r.nextInt() * 2));
```

See [Graph Representations](./graph-representations.md) for flat CSR arrays when $m$ reaches $10^6$. When a line's spaces matter (a sentence, or a row you want whole), use `nextLine()`.

## Output

Build the answer in an array and write it once. Calling `console.log` per line is a classic cause of time-limit errors at $10^5$ or more lines, because every call is a separate write.

```typescript
// one test case's array on a single line
out.push(a.join(" "));
// booleans in the usual judge format
out.push(ok ? "YES" : "NO");
```

## Gotchas

- **64-bit values.** `number` is exact only up to $2^{53}$. If inputs or answers can reach $10^{18}$, read with `r.nextBigInt()` and compute in `bigint`, or keep values under $2^{53}$ by reducing modulo $p$ (see [Modular Arithmetic](../math/arithmetic.md)).
- **Recursion depth.** Node's default stack overflows somewhere around $10^4$ nested calls. A DFS on a path-shaped tree with $n = 2 \cdot 10^5$ crashes. Judges rarely let you pass `--stack-size`, so write deep recursion with an explicit stack (see [Trees](./trees.md)).
- **1- vs 0-indexed.** Most inputs number things from 1. Subtract one when reading, and add it back when printing indices.
- **Multiple test cases share state.** Reset globals per test case, and keep the cost of each reset proportional to that test's $n$, not to the maximum $n$. The constraints usually bound "the sum of $n$ over all test cases".

## Interactive Problems

Here the judge answers your queries as you go, so you can't read everything up front. Read line by line and write each query as soon as it's ready:

```typescript
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
const readLine = async () => (await lines.next()).value as string;

async function main() {
  const n = Number(await readLine());
  // ask, then wait for the judge's reply before asking again
  console.log(`? 1 ${n}`);
  const reply = Number(await readLine());
  console.log(`! ${reply}`);
  rl.close();
}
main();
```

Each `console.log` goes out immediately, which is the "flush after every query" that interactive problems require. Don't buffer output here.

## Platforms

Language support changes, so check the judge's language list. As of writing:

- **Codeforces** offers Node.js, where the template above works. It also offers a bare "JavaScript V8" option with no `fs`, where `readline()` returns one line and `print()` writes one.
- **TypeScript** is available on some judges (AtCoder lists it) but not all. Where it's missing, strip the types and submit the JS.
- **Locally**, pipe a file in: `node sol.js < in.txt`. Recent Node versions run `.ts` files directly; on older ones add `--experimental-strip-types`.
