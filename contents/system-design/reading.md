# Engineering Reading

Posts and papers worth reading in full. The post-mortems teach the most per page: each one is a real system failing in a way its designers didn't plan for.

## Classics

- [The Log: What every software engineer should know about real-time data's unifying abstraction](https://web.archive.org/web/20260612105408/https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) (Jay Kreps, LinkedIn, 2013). An append-only log as the backbone of data integration, and the idea behind Kafka. Pairs with [Queues & Streams](./queues-streams.md). The original page is gone, so this links an archived copy.
- [Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) (Amazon Builders' Library). When to retry, how long to wait, and why retries without jitter synchronize into waves. The [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) post simulates the variants.
- [Avoiding insurmountable queue backlogs](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/) (Amazon Builders' Library). A queue that falls behind can stay behind for good. Covers LIFO draining, per-tenant fairness and load shedding.
- [Static stability using Availability Zones](https://aws.amazon.com/builders-library/static-stability-using-availability-zones/) (Amazon Builders' Library). Provision ahead, so that losing a zone needs no reaction from the control plane.
- [Metastability and Distributed Systems](https://brooker.co.za/blog/2021/05/24/metastable.html) (Marc Brooker). Failures that keep going after their trigger is gone, usually through retry storms.
- [How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) (Martin Kleppmann). Why Redis Redlock depends on timing assumptions, and why fencing tokens are what make a lock safe.
- [Implementing Stripe-like Idempotency Keys in Postgres](https://brandur.org/idempotency-keys) (Brandur Leach). How to make a multi-step API call safe to retry.
- [Scaling your API with rate limiters](https://stripe.com/blog/rate-limiters) (Stripe). Stripe's four limiters, two on requests and two that shed load. Pairs with [Rate Limiting](./rate-limiting.md).
- [Jepsen analyses](https://jepsen.io/analyses). What real databases actually guarantee under network partitions, often less than their docs claim. Pairs with [Consistency & CAP](./consistency.md).
- [Site Reliability Engineering](https://sre.google/sre-book/table-of-contents/) (Google, free online). Covers SLOs, error budgets, on-call and postmortem culture.

## Post-Mortems

- [GitLab, January 2017](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/). An engineer deleted the primary database's data directory, and none of the backup methods turned out to work. About six hours of data were lost.
- [AWS S3, February 2017](https://aws.amazon.com/message/41926/). A mistyped command removed far more servers than intended. Restarting the index subsystem took hours, and much of us-east-1 went down with it.
- [Cloudflare, July 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/). One regex with catastrophic backtracking, deployed everywhere at once, used up the CPU on every edge server.
- [GitHub, October 2018](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/). A 43-second network partition triggered a cross-country database failover, followed by 24 hours of reconciling writes. Pairs with [Partitioning & Replication](./partitioning-replication.md).
- [Facebook, October 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/). A maintenance command cut the backbone, the DNS servers withdrew their BGP routes, and the tools needed to fix it were behind the same outage.
- [Roblox, October 2021](https://about.roblox.com/newsroom/2022/01/roblox-return-to-service-10-28-10-31-2021). A 73-hour outage caused by Consul under contention, which every service depended on.
- [Slack, January 2021](https://slack.engineering/slacks-outage-on-january-4th-2021/). On the first workday of the year, cloud network saturation and autoscaling made each other worse.
- [Atlassian, April 2022](https://www.atlassian.com/engineering/post-incident-review-april-2022-outage). A cleanup script was given the wrong IDs and deleted hundreds of customers' sites. Restoring them took up to two weeks.
- [danluu/post-mortems](https://github.com/danluu/post-mortems). A long index of public post-mortems, grouped by cause.

## Scaling Stories

- Discord: [billions of messages](https://discord.com/blog/how-discord-stores-billions-of-messages) (MongoDB to Cassandra), then [trillions](https://discord.com/blog/how-discord-stores-trillions-of-messages) (Cassandra to ScyllaDB, with request coalescing in front). Also [Why Discord is switching from Go to Rust](https://discord.com/blog/why-discord-is-switching-from-go-to-rust): garbage collector pauses in a latency-critical service.
- [Sharding & IDs at Instagram](https://web.archive.org/web/20210112134155/https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c) (archived copy). Many logical shards on few Postgres servers, and 64-bit time-sortable IDs generated inside the database.
- [Announcing Snowflake](https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake) (Twitter). The original timestamp + worker + sequence ID scheme.
- [Herding elephants: sharding Postgres at Notion](https://www.notion.com/blog/sharding-postgres-at-notion). Choosing a shard key, then a double-write migration.
- [How Figma's Databases Team Lived to Tell the Scale](https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/). Sharding Postgres horizontally behind a query-routing proxy.
- [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/). Real-time collaborative editing with a central server instead of operational transforms.
- [Why Uber Engineering Switched from Postgres to MySQL](https://www.uber.com/blog/postgres-to-mysql-migration/). Write amplification, replication and upgrade pain, explained down to the on-disk format.
- [Scaling Memcache at Facebook](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala) (NSDI 2013). Leases against thundering herds, regional pools and cross-region invalidation. Pairs with [Caching](./caching.md).
- [How we built Pingora](https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/) (Cloudflare). Replacing NGINX with a Rust proxy, largely for better connection reuse. Pairs with [Load Balancing](./load-balancing.md).
- [Inside the Magic Pocket](https://dropbox.tech/infrastructure/inside-the-magic-pocket) (Dropbox). Moving exabytes off S3 onto in-house storage.
- [Scaling Datastores at Slack with Vitess](https://slack.engineering/scaling-datastores-at-slack-with-vitess/). Moving from per-workspace shards to Vitess-managed MySQL.
- [A Pods Architecture to Allow Shopify to Scale](https://shopify.engineering/a-pods-architecture-to-allow-shopify-to-scale). Isolated copies of the full stack, each serving a subset of shops.

## Papers

- [Dynamo](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) (Amazon, 2007). Consistent hashing, quorums, vector clocks, hinted handoff.
- [The Google File System](https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf) (2003), [MapReduce](https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf) (2004) and [Bigtable](https://static.googleusercontent.com/media/research.google.com/en//archive/bigtable-osdi06.pdf) (2006). The designs that Hadoop and HBase copied.
- [Spanner](https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf) (Google, 2012). Globally consistent transactions, made possible by TrueTime's bounded clock uncertainty.
- [Raft](https://raft.github.io/raft.pdf) (2014). Consensus designed to be understandable. Read it before Paxos.

## Blogs to Follow

[Netflix TechBlog](https://netflixtechblog.com/) · [Cloudflare](https://blog.cloudflare.com/) · [Amazon Builders' Library](https://aws.amazon.com/builders-library/) · [All Things Distributed](https://www.allthingsdistributed.com/) · [Marc Brooker](https://brooker.co.za/blog/) · [Discord](https://discord.com/category/engineering) · [Stripe](https://stripe.com/blog/engineering) · [Figma](https://www.figma.com/blog/engineering/) · [Dropbox](https://dropbox.tech/) · [Uber](https://www.uber.com/blog/engineering/) · [High Scalability](https://highscalability.com/)
