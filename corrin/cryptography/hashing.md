# Hashing

A cryptographic hash function $H: \{0,1\}^{\ast} \to \{0,1\}^{n}$ maps arbitrary-length input to a fixed $n$-bit digest. Beyond being deterministic and fast, it must satisfy:

- **Preimage resistance.** Given $y$, hard to find $m$ with $H(m) = y$. ($\sim 2^{n}$ work.)
- **Second-preimage resistance.** Given $m_1$, hard to find $m_2 \neq m_1$ with $H(m_2) = H(m_1)$.
- **Collision resistance.** Hard to find _any_ $m_1 \neq m_2$ with $H(m_1) = H(m_2)$. Bounded by the **birthday attack** at $\sim 2^{n/2}$ work, so a 256-bit hash gives only ~128-bit collision security.

In proofs we often idealize $H$ as a **random oracle**: a function returning a uniformly random output for each fresh input, consistent on repeats. Real constructions (SHA-2, SHA-3/Keccak, BLAKE2/3) only approximate this.

```ts
import { createHash } from "node:crypto";

const digest = createHash("sha256").update("hello").digest("hex");
// 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
```

A few footguns worth their own pages:

- **Length-extension.** Merkle–Damgård hashes (MD5, SHA-1, SHA-256) leak enough state that, given $H(m)$ and $\lvert m \rvert$, an attacker can compute $H(m \,\|\, \text{pad} \,\|\, m')$ without knowing $m$. This breaks naive `H(secret || message)` MACs — use HMAC or SHA-3 instead.
- **Mixing contexts.** Feeding values from different uses into the same hash invites cross-protocol collisions — addressed by [domain separation](./domain-separation.md).
