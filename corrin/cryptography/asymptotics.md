# Asymptotics

Cryptographic security is **asymptotic**. We index everything by a security parameter $n$ — typically a key length or $\log_2$ of the group order — and reason about how things scale as $n \to \infty$. Two halves to pin down:

- "Efficient adversary" = runs in **polynomial time** in $n$.
- "Adversary's success probability" = some function $\mu(n)$, and we want this to be **negligible**.

This chapter defines those words precisely. Once they're nailed down, every security definition in this section follows the same template: *"for every poly-time adversary, the advantage is negligible"*.

## Negligible functions

A function $\mu : \mathbb{N} \to \mathbb{R}_{\ge 0}$ is **negligible** if for every positive polynomial $p$, there exists $n_0$ such that

$$
\mu(n) \;<\; \frac{1}{p(n)} \quad \text{for all } n \ge n_0.
$$

Equivalently, $\mu(n) \in O(1/p(n))$ for *every* polynomial $p$ — i.e. $\mu$ decays faster than any inverse polynomial.

The intuition: negligible means **"you can ignore it"**. Given polynomial computational resources, you can never amplify a negligible event into a noticeable one (see closure rules below). It's the formal version of "vanishingly small."

| Function       | Negligible? | Why                                        |
| -------------- | :---------: | ------------------------------------------ |
| $2^{-n}$       |     yes     | exponential decay beats every polynomial   |
| $1/n!$         |     yes     | factorial decay beats every polynomial     |
| $1/n^{\log n}$ |     yes     | super-polynomial denominator               |
| $1/n^{100}$    |     no      | inverse polynomial — $p(n) = n^{101}$ wins |
| $1/\log n$     |     no      | decays slower than any inverse polynomial  |
| $1$ (constant) |     no      | doesn't decay at all                       |

## Noticeable functions

The opposite extreme. A function $f : \mathbb{N} \to \mathbb{R}_{\ge 0}$ is **noticeable** if there exists a polynomial $p$ and an $n_0$ such that

$$
f(n) \;\ge\; \frac{1}{p(n)} \quad \text{for all } n \ge n_0.
$$

It's eventually bounded *below* by some inverse polynomial. This is the threshold for "the adversary actually has a real chance." A scheme that lets the adversary win with noticeable probability is broken in any practical sense.

## Non-negligible $\ne$ noticeable

A subtle point that catches people the first time. Negate the negligible definition carefully:

| Property        | Definition (informal)                                      | Quantifier  |
| --------------- | ---------------------------------------------------------- | ----------- |
| negligible      | eventually below *every* inverse polynomial                | for all $p$ |
| noticeable      | eventually above *some* inverse polynomial                 | exists $p$  |
| non-negligible  | *not* eventually below every inverse polynomial            | (negation)  |

A non-negligible function only needs to *occasionally* exceed inverse polynomials; a noticeable function must do so *eventually for all large $n$*. The two coincide for monotone-ish functions, but oscillating ones can be non-negligible without being noticeable. Example:

$$
f(n) \;=\; \begin{cases} 1/n & n \text{ even} \\ 2^{-n} & n \text{ odd} \end{cases}
$$

This is non-negligible (at every even $n$ it exceeds $1/n$) but not noticeable (at every odd $n$ it dips below every inverse polynomial). Such pathologies don't usually occur in practice, but the formal distinction is why some security definitions specify "noticeable" rather than the seemingly-equivalent "non-negligible".

## Overwhelming functions

$f$ is **overwhelming** if $1 - f$ is negligible — equivalently, $f(n) \ge 1 - \mu(n)$ for some negligible $\mu$.

These are the "almost certainly happens" probabilities: correctness of decryption ("decrypts the right message with overwhelming probability"), soundness of zero-knowledge proofs, completeness of interactive protocols, etc.

## Closure rules

These definitions are useful precisely because they're **closed under the operations that appear in security reductions**:

| Operation                                       | Result       |
| ----------------------------------------------- | ------------ |
| negligible $+$ negligible                       | negligible   |
| sum of polynomially many negligible functions   | negligible   |
| polynomial $\times$ negligible                  | negligible   |
| polynomial $\times$ polynomial                  | polynomial   |
| $1 -$ negligible                                | overwhelming |
| $1 -$ overwhelming                              | negligible   |

The crucial one — **poly × negligible = negligible** — is what powers reduction proofs. If a single subroutine fails with negligible probability $\mu(n)$, and we call it $q(n)$ times for some polynomial $q$, the chance that *any* call fails is at most $q(n) \cdot \mu(n)$ by the [union bound](../math/probability.md#events) — still negligible. So a polynomial-time adversary can only ever face polynomially many bad events, and the total badness stays negligible.

## A typical security statement

With this language, the standard security format becomes:

> For every probabilistic polynomial-time adversary $\mathcal{A}$, there exists a negligible function $\mu$ such that
> $$\Pr[\mathcal{A} \text{ wins game } G(n)] \;\le\; \tfrac{1}{2} + \mu(n).$$

The $1/2$ is the trivial "guess randomly" baseline; everything above is the adversary's **advantage**, and we insist that advantage is negligible. Whenever you read a theorem about IND-CPA, EUF-CMA, etc., this is the shape.

## Aside: space is bounded by time

Any cell of memory you write costs at least one time step to access, so for any algorithm

$$
S(n) \;\le\; T(n).
$$

A polynomial-time algorithm uses polynomial space, never more. This is why asymptotic security analyses can usually focus on time alone — bounding time bounds space for free, so a "PPT adversary" doesn't need a separate space restriction.
