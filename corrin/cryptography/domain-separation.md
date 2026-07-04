# Domain Separation

When the same hash function is reused for different purposes, an output produced for one purpose can be mistaken for a valid output of another. **Domain separation** prevents this by binding a unique, unambiguous _tag_ into the input, so that the hashes used in distinct contexts behave like **independent functions** that share no inputs.

## The problem

Suppose a protocol hashes both leaf data and internal nodes of a Merkle tree with the same $H$:

$$
\text{leaf} = H(x), \qquad \text{node} = H(L \,\| \, R)
$$

An attacker who controls a leaf $x = L \,\|\, R$ can make a leaf collide with an internal node — a **second-preimage attack** on the tree, where a single leaf is presented as if it were a whole subtree. The two domains (`leaf`, `node`) were never separated, so a digest valid in one is valid in the other.

The same failure appears whenever one key or one hash serves multiple roles:

- Signing a message vs. signing a protocol challenge with the same hash.
- Deriving an encryption key and a MAC key from one shared secret.
- A Fiat–Shamir transform whose transcript hash isn't bound to the specific proof statement.

## The fix: tag the input

Prefix (or otherwise bind) a distinct, fixed label per context:

$$
\text{leaf} = H(\texttt{0x00} \,\|\, x), \qquad \text{node} = H(\texttt{0x01} \,\|\, L \,\|\, R)
$$

Now no input to the `leaf` hash can equal an input to the `node` hash, so their output sets are effectively disjoint. This is exactly how [**RFC 6962** Certificate Transparency](https://datatracker.ietf.org/doc/html/rfc6962#section-2.1) defines its Merkle tree:

$$
\text{leaf hash} = H(\texttt{0x00} \,\|\, \text{entry}), \qquad \text{node hash} = H(\texttt{0x01} \,\|\, L \,\|\, R)
$$

```ts
import { createHash } from "node:crypto";

const h = (tag: number, ...parts: Buffer[]) =>
  createHash("sha256")
    .update(Buffer.concat([Buffer.from([tag]), ...parts]))
    .digest();

const LEAF = 0x00;
const NODE = 0x01;

const leafHash = (entry: Buffer) => h(LEAF, entry);
const nodeHash = (l: Buffer, r: Buffer) => h(NODE, l, r);
```

## Doing it safely

A single-byte prefix works only when the remaining input is fixed-length or otherwise unambiguous. With variable-length data, prefer a tag that cannot be confused with the payload:

- **Length-prefix** each field (`len(tag) ‖ tag ‖ len(x) ‖ x`) so the parse is unambiguous — this is _injective encoding_, the property domain separation really needs.
- **Unique ASCII context strings**, e.g. a protocol name and version: `"MyProto-v1:leaf"`. Long, human-readable tags also document intent.
- Standard primitives bake this in:
  - **HKDF** takes an `info` parameter precisely to separate keys derived from the same master secret.
  - **`hash_to_curve` (RFC 9380)** requires a `DST` (Domain Separation Tag) string; reusing a DST across protocols is a documented vulnerability.
  - **SHA-3 / cSHAKE** offers a built-in customization string $S$ for exactly this.
  - **TLS 1.3** labels every derived secret (`"c hs traffic"`, `"s ap traffic"`, …).

## Rule of thumb

> If one hash, key, or random oracle is used for more than one thing, separate the domains — or assume an attacker will treat an output of one as an input to the other.
