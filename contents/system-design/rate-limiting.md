# Rate Limiting

Cap how many requests a **key** (user, API token, IP, tenant, endpoint) may make per unit time, and reject or delay the rest. Why: **abuse** (credential stuffing, scraping, single-source DoS), **fairness** (one noisy tenant must not starve the rest), and **protecting downstream** (a database, a third-party quota, an expensive endpoint that falls over long before the front door does).

| Layer               | Keyed by                    | Notes                                                           |
| ------------------- | --------------------------- | --------------------------------------------------------------- |
| Edge / API gateway  | IP, API key, route          | Cheapest rejection point; coarse; sees all traffic              |
| Per service         | caller service, endpoint    | Protects the service's own dependencies; knows its real cost    |
| Per client (in SDK) | self                        | Cooperative; avoids hitting the server limit in the first place |

Usually more than one: a generous limit at the gateway against floods, tighter per-endpoint limits inside. See [Load Balancing](./load-balancing.md) for the layer in front.

## Algorithms

### Token bucket

A bucket holds up to `capacity` tokens and refills at `perSec`. Each request spends one token; empty bucket means reject. Allows bursts up to `capacity`, then a sustained `perSec`. Two numbers of state per key; `cost` lets expensive calls spend more than one token.

```ts
class TokenBucket {
  capacity: number;
  perSec: number;
  tokens: number;
  last: number;
  constructor(capacity: number, perSec: number, now = Date.now()) {
    this.capacity = this.tokens = capacity;
    this.perSec = perSec;
    this.last = now;
  }

  allow(now = Date.now(), cost = 1): boolean {
    // lazy refill: no timer, credit the elapsed time on each call
    const refill = ((now - this.last) / 1000) * this.perSec;
    this.tokens = Math.min(this.capacity, this.tokens + refill);
    this.last = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}
```

> [!TIP]
>
> If you were designing Stripe's API limiter, this is what their engineering blog describes: a token bucket per user kept in Redis, plus a separate concurrent-requests limiter for long-running endpoints. AWS API Gateway also documents its throttling as a token bucket (rate + burst).

### Leaky bucket

Requests enter a bounded FIFO that drains at a fixed rate. Output is perfectly smooth; bursts are queued (adding latency) or dropped when the queue is full. Good in front of something that hates spikes. Implemented here without a real queue: track when the next output slot is free and tell the caller how long to wait.

```ts
class LeakyBucket {
  capacity: number;
  intervalMs: number;
  // the next free output slot
  nextFree = 0;
  constructor(capacity: number, perSec: number) {
    this.capacity = capacity;
    this.intervalMs = 1000 / perSec;
  }

  // ms to delay this request before processing, or -1 if the queue is full
  schedule(now = Date.now()): number {
    const start = Math.max(now, this.nextFree);
    const wait = start - now;
    if (Math.ceil(wait / this.intervalMs) >= this.capacity) return -1;
    this.nextFree = start + this.intervalMs;
    return wait;
  }
}
```

With `capacity = 3, perSec = 10`, four requests at `t = 0` get `[0, 100, 200, -1]`. The "leaky bucket as a meter" variant (reject instead of delay) is equivalent to a token bucket; this slot-tracking form is essentially GCRA.

### Fixed window counter

Count per key per aligned window (`floor(now / windowMs)`), reset on the boundary. One counter per key, trivial to do in Redis.

```ts
class FixedWindow {
  limit: number;
  windowMs: number;
  window = -1;
  count = 0;
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(now = Date.now()): boolean {
    const w = Math.floor(now / this.windowMs);
    if (w !== this.window) {
      this.window = w;
      this.count = 0;
    }
    if (this.count >= this.limit) return false;
    this.count++;
    return true;
  }
}
```

**Boundary burst**: with 100/min, a client sends 100 at `t = 59.9s` (window 0) and 100 at `t = 60.0s` (window 1). All 200 pass, so 200 requests land in 100 ms: up to $2\times$ the limit in any span straddling the edge. Also, all clients reset together at the boundary, which synchronizes retries.

### Sliding window log

Keep every accepted timestamp; allow if fewer than `limit` fall in $(now - w, now]$. Exact, but memory is $O(\text{limit})$ per key. In Redis this is a sorted set: `ZREMRANGEBYSCORE`, `ZCARD`, `ZADD`.

```ts
class SlidingLog {
  limit: number;
  windowMs: number;
  log: number[] = [];
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(now = Date.now()): boolean {
    // evict timestamps that fell out of the window; shift() is O(n), use a ring buffer if limit is large
    while (this.log.length && this.log[0] <= now - this.windowMs) this.log.shift();
    if (this.log.length >= this.limit) return false;
    this.log.push(now);
    return true;
  }
}
```

### Sliding window counter

Keep the fixed-window counts for the current and previous window, and weight the previous one by how much of it still overlaps the sliding window:

$$
\text{estimate} = \text{prev} \cdot \left(1 - \frac{now \bmod w}{w}\right) + \text{curr}
$$

Two counters per key, smooths the boundary burst. It assumes the previous window's requests were spread uniformly, so it is an approximation.

```ts
class SlidingCounter {
  limit: number;
  windowMs: number;
  window = 0;
  curr = 0;
  prev = 0;
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(now = Date.now()): boolean {
    const w = Math.floor(now / this.windowMs);
    if (w !== this.window) {
      // a gap of 2+ windows means the previous window was empty
      this.prev = w === this.window + 1 ? this.curr : 0;
      this.curr = 0;
      this.window = w;
    }
    const elapsed = (now % this.windowMs) / this.windowMs;
    if (this.prev * (1 - elapsed) + this.curr >= this.limit) return false;
    this.curr++;
    return true;
  }
}
```

Same 100/min scenario: after 100 at `59.9s`, the burst at `60.0s` sees an estimate of 100 and is rejected; at `90s` the previous window weighs 50, so 50 more pass.

> [!TIP]
>
> Cloudflare's rate limiting blog post describes exactly this weighted two-counter approximation, reporting that it misjudged only a tiny fraction (~0.003%) of requests on real traffic.

### Comparison

| Algorithm              | State per key     | Bursts                    | Accuracy                 | Typical use                        |
| ---------------------- | ----------------- | ------------------------- | ------------------------ | ---------------------------------- |
| Token bucket           | 2 numbers         | Up to `capacity`          | Exact for its model      | Public APIs; default choice        |
| Leaky bucket (queue)   | 1 timestamp/queue | Smoothed (delayed)        | Exact; adds latency      | Traffic shaping, fragile backends  |
| Fixed window           | 1 counter         | Up to $2\times$ at edges  | Poor at boundaries       | Coarse quotas (per day/month)      |
| Sliding window log     | $O(\text{limit})$ | None beyond limit         | Exact                    | Low limits, strict guarantees      |
| Sliding window counter | 2 counters        | Mostly smoothed           | Approximate, close       | High-volume per-key limits         |

## Distributed limiting

With $N$ stateless servers behind a load balancer, a per-process limiter allows up to $N \times$ the limit. Options:

**Central store with atomic ops.** Every check hits Redis (or similar). Fixed window is `INCR key`; if the result is `1`, `EXPIRE key window`. Those are two commands, so a crash between them leaves a key that never expires; wrap them in a Lua script or `MULTI`. The token bucket needs read-modify-write, so it must be a script (Redis runs scripts atomically):

```lua
-- KEYS[1] = bucket; ARGV = capacity, refill per sec, now (ms), cost
local cap, rate, now, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local b = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = math.min(cap, (tonumber(b[1]) or cap) + (now - (tonumber(b[2]) or now)) / 1000 * rate)
local ok = tokens >= cost
if ok then tokens = tokens - cost end
redis.call("HSET", KEYS[1], "tokens", tokens, "ts", now)
-- an idle bucket is full again after cap/rate seconds, so it can be dropped
redis.call("PEXPIRE", KEYS[1], math.ceil(cap / rate * 1000))
return ok and 1 or 0
```

Pitfalls: `now` from app servers suffers clock skew (`redis.call("TIME")` inside the script avoids it); the store is a hot spot and a dependency, so decide whether to **fail open** (allow on Redis outage, usual for abuse limits) or **fail closed** (usual when protecting a hard quota). Shard keys across a cluster; see [Partitioning & Replication](./partitioning-replication.md).

**Local limits plus sync.** Each node enforces `limit / N` locally (needs to know $N$, wrong under uneven balancing), or keeps local counters and periodically pushes deltas to / pulls totals from a shared store. No network hop on the hot path; overshoot is bounded by `sync interval × rate × nodes`.

**Accuracy vs latency.** Central and atomic: exact, one RTT per request (~0.5 ms in-DC, see [Numbers](./numbers.md)). Local plus sync: no added latency, briefly over-admits. For abuse protection, approximate is fine; for billing quotas, be exact or reconcile afterwards. This is the usual [consistency](./consistency.md) trade, applied to counters.

## Responses

- **`429 Too Many Requests`** (RFC 6585). Use `503` when the server itself is overloaded rather than the client being over its quota.
- **`Retry-After`**: seconds (`Retry-After: 30`) or an HTTP date. Well-behaved clients wait at least this long.
- **RateLimit headers**: many APIs send de facto `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (with inconsistent `Reset` semantics: epoch seconds vs seconds-from-now). The IETF httpapi working group has a draft standardizing this; earlier drafts used `RateLimit-Limit` / `-Remaining` / `-Reset`, later ones moved to structured `RateLimit-Policy` and `RateLimit` fields. Still a draft at the time of writing, so check the current version before relying on exact syntax.

> [!TIP]
>
> GitHub's REST API is a good model: authenticated users get 5,000 requests/hour, every response carries `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset` (epoch seconds), and secondary limits come back with `retry-after`.

## Client side: backoff with jitter

On `429`/`503`, honor `Retry-After` if present; otherwise back off exponentially **with jitter**. Without jitter, every client that failed together retries together, and the retry waves keep re-tripping the limit.

```ts
function backoff(attempt: number, baseMs = 100, capMs = 20_000): number {
  // "full jitter": uniform in [0, min(cap, base * 2^attempt))
  return Math.random() * Math.min(capMs, baseMs * 2 ** attempt);
}
```

Cap the number of attempts, retry only idempotent operations (or use idempotency keys), and consider a retry budget (e.g. retries at most 10% of requests) so retries cannot multiply load during an outage. Retries in async pipelines, dead-letter queues and idempotent consumers are covered in [Queues & Streams](./queues-streams.md).

## Load shedding vs rate limiting

Rate limiting is **per key** and judged against a quota: "this client has had enough", regardless of how healthy the server is. Load shedding is **global** and judged against the server's own state: when CPU, queue depth or latency crosses a threshold, drop work (lowest priority first, e.g. background jobs before checkout, or cheap rejection of requests whose deadline has already passed) to keep the rest within its SLO. A system needs both: rate limits keep one client from eating capacity, shedding keeps the sum of well-behaved clients from overloading it. Stripe's post describes running both side by side.
