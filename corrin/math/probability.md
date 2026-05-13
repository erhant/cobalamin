# Probability

The slice of probability that cryptography actually leans on is small but heavily used: finite sample spaces, the union bound, independence, and a few named results (XOR uniformity, the birthday paradox). Most security proofs are careful bookkeeping with these tools.

## Sample space and distributions

A **sample space** (or **universe**) $U$ is the finite set of all possible outcomes of an experiment. In crypto, $U$ is almost always $\{0, 1\}^n$ — the set of $n$-bit strings — or a finite group like $(\mathbb{Z}/p\mathbb{Z})^{\ast}$.

A **probability distribution** on $U$ is a function $P : U \to [0, 1]$ with

$$
\sum_{x \in U} P(x) = 1.
$$

Two distributions show up constantly:

- **Uniform.** $P(x) = 1/|U|$ for every $x$. Maximum unpredictability — every outcome equally likely.
- **Point** (a.k.a. **Dirac**). $P(x_0) = 1$ for some specific $x_0$, and $P(x) = 0$ everywhere else. Maximum determinism — one outcome happens with certainty.

When we sample $x$ from a distribution we write $x \leftarrow P$, or for uniform sampling specifically, $x \xleftarrow{\$} U$.

## Events

An **event** $A$ is a subset $A \subseteq U$. Its probability is the sum of the probabilities of its outcomes:

$$
\Pr[A] \;=\; \sum_{x \in A} P(x) \;\in\; [0, 1].
$$

Complement, intersection, and union of events are just the corresponding set operations on subsets of $U$.

### The two facts about unions

For any events $A_1, A_2$:

$$
\Pr[A_1 \cup A_2] \;\le\; \Pr[A_1] + \Pr[A_2] \quad \text{(union bound — always holds)}
$$

$$
A_1, A_2 \text{ disjoint} \;\implies\; \Pr[A_1 \cup A_2] \;=\; \Pr[A_1] + \Pr[A_2].
$$

The union bound is the workhorse of security proofs. When we want to bound the chance that *any* of $k$ bad things happens, we sum the individual probabilities. It's loose — it ignores correlation — but loose-and-tractable beats tight-and-impossible. Combined with the fact that summing polynomially many [negligible](../cryptography/asymptotics.md) bounds stays negligible, this is what lets reduction proofs chain.

## Random variables

A **random variable** $X : U \to V$ is a function from the sample space to some value set $V$. Despite the name, an RV is just a deterministic function — it's "random" because its input is sampled randomly.

The distribution of $X$ is

$$
\Pr[X = v] \;=\; \sum_{x \,:\, X(x) = v} P(x).
$$

**Example.** Let $U = \{0, 1\}^n$ with the uniform distribution and define $X(a) = \text{lsb}(a)$ — the least significant bit of $a$. Then $\Pr[X = 0] = \Pr[X = 1] = 1/2$, so $X$ is uniform on $\{0, 1\}$.

**Randomized algorithms** are RVs in disguise. Write $y \gets F(x; r)$ for an algorithm whose internal randomness is $r \xleftarrow{\$} \{0, 1\}^n$. Holding $x$ fixed, the output is a random variable with a distribution induced by $r$. Crypto encryption is exactly this: $\text{Enc}(k, m; r)$ produces a different-looking ciphertext each time even with the same key and message.

## Independence

Two events $A, B$ are **independent** when

$$
\Pr[A \cap B] \;=\; \Pr[A] \cdot \Pr[B].
$$

Two random variables $X, Y$ are independent when $\Pr[X = a \,\land\, Y = b] = \Pr[X = a] \cdot \Pr[Y = b]$ for all $a, b$.

Independence is a strong assumption — it says knowing one outcome tells you nothing about the other. Crypto designs *engineer* independence (fresh nonces, freshly sampled keys) precisely because proofs become tractable when randomness is independent.

## Conditional probability and Bayes

The probability of $A$ given that $B$ occurred:

$$
\Pr[A \mid B] \;=\; \frac{\Pr[A \cap B]}{\Pr[B]}, \quad \Pr[B] > 0.
$$

Independence is exactly the case $\Pr[A \mid B] = \Pr[A]$.

**Law of total probability.** If $E_1, \ldots, E_k$ partition $U$ (disjoint, covering all of $U$), then for any event $A$:

$$
\Pr[A] \;=\; \sum_i \Pr[A \mid E_i] \cdot \Pr[E_i].
$$

The case-split tool: condition on which case you're in, sum the cases weighted by their probabilities. Every "let's split based on whether the adversary did X" argument secretly runs this.

**Bayes' theorem.** Flip the order of conditioning:

$$
\Pr[A \mid B] \;=\; \frac{\Pr[B \mid A] \cdot \Pr[A]}{\Pr[B]}.
$$

Useful when you want $\Pr[\text{cause} \mid \text{evidence}]$ but only know $\Pr[\text{evidence} \mid \text{cause}]$ — typical of any inference setup.

## XOR uniformity

XOR ($\oplus$) is bitwise addition mod 2 on $\{0, 1\}^n$. The single most-used fact about it in cryptography:

> **Theorem.** If $X$ is *any* random variable over $\{0, 1\}^n$ and $Y$ is uniform on $\{0, 1\}^n$ and independent of $X$, then $Z = X \oplus Y$ is uniform on $\{0, 1\}^n$.

**Proof.** For any fixed $z \in \{0, 1\}^n$,

$$
\Pr[Z = z] \;=\; \sum_x \Pr[X = x] \cdot \Pr[Y = z \oplus x] \;=\; \sum_x \Pr[X = x] \cdot \frac{1}{2^n} \;=\; \frac{1}{2^n}.
$$

(Used: $Y$ is uniform, so $\Pr[Y = z \oplus x] = 1/2^n$ for every $x$, and $\sum_x \Pr[X = x] = 1$.) ∎

Operational reading: **XOR-with-uniform "kills" the distribution of $X$**. The output is uniform regardless of how skewed $X$ was. This is exactly why the one-time pad is unconditionally secure — ciphertext = message $\oplus$ key, with a uniform key independent of the message.

## The Birthday Paradox

> **Theorem.** Let $r_1, \ldots, r_n$ be independent uniform samples from a set of size $B$. If $n \ge 1.2 \sqrt{B}$, then
> $$\Pr[\,\exists\, i \ne j : r_i = r_j\,] \;\ge\; \tfrac{1}{2}.$$

In plain English: sampling about $\sqrt{B}$ items from a universe of size $B$ is enough to almost certainly see a repeat. The naive guess is $\sim B$; the surprise is the square root.

**Proof.** Bound the complement (no collisions among $n$ samples):

$$
\Pr[\text{no collision}] \;=\; \prod_{i=1}^{n-1} \frac{B - i}{B} \;=\; \prod_{i=1}^{n-1} \!\left(1 - \frac{i}{B}\right).
$$

Use $1 - x \le e^{-x}$:

$$
\;\le\; \prod_{i=1}^{n-1} e^{-i/B} \;=\; \exp\!\left(-\frac{1}{B} \sum_{i=1}^{n-1} i\right) \;\le\; \exp\!\left(-\frac{n^2}{2B}\right).
$$

Plug in $n = 1.2 \sqrt{B}$: the no-collision probability is at most $e^{-0.72} \approx 0.487$, so the collision probability is at least $\approx 0.513 > 1/2$. ∎

You can convince yourself empirically:

```typescript
// First sample index at which a collision appears in a universe of size B.
function firstCollision(B: number): number {
  const seen = new Set<number>();
  for (let n = 1; ; n++) {
    const x = Math.floor(Math.random() * B);
    if (seen.has(x)) return n;
    seen.add(x);
  }
}
// Averaging over many trials lands near 1.25 * sqrt(B).
```

**Why crypto cares.** A hash with $k$-bit output has $B = 2^k$ possible digests, so finding *any* collision takes $\approx 2^{k/2}$ hashes — not $2^k$. To get 128-bit collision security you need a 256-bit hash. The same square-root law governs:

- generic discrete-log attacks (Pollard's rho — see [Discrete Logarithm](../cryptography/discrete-log.md)),
- meet-in-the-middle attacks on double encryption,
- nonce collision in stream-cipher modes,
- any "are these two random samples equal?" question.

## Entropy

**Shannon entropy** measures average uncertainty in a random variable:

$$
H(X) \;=\; -\!\sum_x \Pr[X = x] \,\log_2 \Pr[X = x].
$$

Units are bits when the log is base 2. A uniform distribution on $N$ outcomes has $H = \log_2 N$ — the maximum. A point distribution has $H = 0$ — no uncertainty.

For cryptographic key material, the more important quantity is **min-entropy**:

$$
H_\infty(X) \;=\; -\log_2 \!\left(\max_x \Pr[X = x]\right).
$$

It captures the *worst-case* predictability — driven by the most likely outcome, not the average. A distribution can have respectable Shannon entropy while having one outcome that's still easy to guess; min-entropy refuses to let the average wash out the danger.

> **Rule of thumb.** A random variable is "good for crypto keys" when its **min-entropy** (not its Shannon entropy) is large enough — typically $H_\infty \ge \lambda$ for security parameter $\lambda$.

**Mutual information** $I(X; Y)$ measures how much $Y$ tells you about $X$:

$$
I(X; Y) \;=\; \sum_{x, y} \Pr[X = x,\, Y = y] \,\log_2 \frac{\Pr[X = x,\, Y = y]}{\Pr[X = x]\,\Pr[Y = y]}.
$$

Symmetric in $X$ and $Y$. $I(X; Y) = 0$ iff $X$ and $Y$ are independent. Side-channel and leakage-resilience proofs use it to bound how much an adversary's observations reveal about a secret.
