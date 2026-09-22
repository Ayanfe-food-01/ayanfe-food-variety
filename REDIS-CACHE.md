# Redis Caching Layer

Redis sits between the API and the database as a **cache-aside** layer for the
public storefront. It is strictly optional: when Redis is not configured, or
whenever Redis is unreachable/failing, every cache read falls straight through
to the database and the website keeps working — no user-facing errors.

```
┌─────────────┐   GET request   ┌──────────────┐   Redis hit   ┌────────┐
│   Browser    │ ──────────────▶ │  Express API  │ ────────────▶ │  Redis │
└─────────────┘                 │              │ ◀──────────── └────────┘
                                │              │   cache hit /
                                │              │    stale miss
                                │              │ ─────────────▶ ┌────────┐
                                │              │  cache-aside    │  DB    │
                                └──────────────┘  (miss -> fetch,│(Prisma)│
                                                    store, return)│        │
                                                                  └────────┘
```

## What is cached

| Data                         | Redis key pattern            | TTL      | Cleared when                                  |
| ---------------------------- | ---------------------------- | -------- | --------------------------------------------- |
| Product listings             | `afvc:products:list:*`       | 10 min   | product create/update/delete, status, stock   |
| Product details              | `afvc:products:detail:*`     | 30 min   | product create/update/delete, status, stock, review approve/reject/delete |
| Product negative lookups     | `afvc:products:detail:*`     | 1 min    | (kept short so new products appear promptly)  |
| Search results               | `afvc:products:search:*`     | 5 min    | product create/update/delete, status, stock   |
| Categories (public list)     | `afvc:categories:public`     | 1 hour   | category create/update/status/delete          |
| Featured products rail       | `afvc:homepage:featured:*`   | 15 min   | featured status change, any product change    |
| Popular products rail        | `afvc:homepage:popular:*`    | 15 min   | any product/stock change                      |
| New arrivals rail            | `afvc:homepage:new-arrivals:*` | 15 min  | any product/stock change                      |
| Category product sections    | `afvc:homepage:category-sections:*` | 15 min | any product/category change         |
| Aggregated homepage (GET /api/v1/homepage) | `afvc:homepage:data` | 15 min | any product/category/stock change |

> The `afvc:` prefix is configurable via `CACHE_KEY_PREFIX` so several
> environments (staging, production) can safely share one Redis instance.

### Cache-aside flow (requirement 5)

Every cached read runs the standard pattern, implemented once in
`server/src/modules/cache/cache.service.ts` (`getOrSet`):

1. check Redis — on a hit, return the cached payload (DB untouched);
2. on a miss (or Redis error), run the normal database query;
3. store the freshly computed result in Redis with the TTL above;
4. return the data.

### Personalised data is never cached (security/privacy)

Product responses embed the viewer's **wishlist flags** and, for wholesale
customers, **wholesale prices**. Both are per-user data, so the cache only
serves anonymous retail reads. Authenticated and wholesale requests query the
database directly, exactly as before, and never get written to Redis. This
prevents any cross-user data leak in cache keys or values.

## Cache invalidation (requirement 6)

Invalidation is **pattern-based** using `SCAN ... MATCH` + `UNLINK` (never
`KEYS`), so it never blocks Redis and scales with the (page-bounded) number of
cached entries.

| Event                                         | Invalidated                      |
| --------------------------------------------- | -------------------------------- |
| Product created / updated / deleted           | `products:*`, `homepage:*`       |
| Product availability (active) toggled         | `products:*`, `homepage:*`       |
| Featured status changed                       | `homepage:featured:*` (+ aggregate) |
| Category created / updated / activated / deleted | `categories:*`, `products:*`, `homepage:*` |
| Stock deducted (order), restored (cancellation), or adjusted (admin) | `products:*`, `homepage:*` |
| Review approved / rejected / deleted (changes star rating on storefront cards and detail pages) | `products:*`, `homepage:*` |

Wiring lives in `server/src/modules/cache/invalidate.ts` and is called from
the service layer (`admin-product.service.ts`, `admin-product.write.service.ts`,
`category.service.ts`, `inventory.service.ts`, `inventory.adjust.service.ts`,
`review.admin.service.ts`),
right where the write happens. Stock changes use a 50 ms debounce so an order
that deducts several line items invalidates the cache once, not once per line.

Because admin endpoints never read through the cache, the dashboard always
shows live data; only storefront reads are cached.

## Cache hit / miss / error metrics (requirement 7)

Structured JSON logs are emitted on every cache operation, following the app's
existing `console.info`/`console.warn` convention:

- `{"event":"cache_hit",...}` — served from Redis
- `{"event":"cache_miss",...}` — loaded from DB and re-cached
- `{"event":"cache_disabled",...}` — caching switched off in config, straight DB read
- `{"event":"cache_down",...}` — Redis configured but unreachable; rate-limited to once per minute, then the DB serves traffic
- `{"event":"cache_error","operation":"get|set|unlink|invalidate",...}` — Redis failed; DB used
- `{"event":"cache_invalidated","pattern":"afvc:products:*",...}` — pattern purged
- `{"event":"redis_error"|"redis_reconnecting"|"redis_ready"|"redis_connect_failed",...}` — connection lifecycle

Grep these from your log provider (Render, managed logging, etc.):

```bash
grep cache_hit app.log | wc -l      # hits
grep cache_miss app.log | wc -l     # misses
grep cache_error app.log | wc -l    # Redis problems (should be rare)
```

## Graceful fallback (requirements 8–9)

- No secrets are exposed to the frontend: `REDIS_URL`, `CACHE_KEY_PREFIX` and
  `CACHE_ENABLED` are server-side only, read in `server/src/config/env.ts`.
- `disableOfflineQueue: true` + a 2 s command timeout mean a dead Redis never
  queues commands silently and never stalls a request.
- Every cache helper catches Redis errors and degrades to the database.
- Reconnection is automatic with capped exponential backoff
  (`server/src/modules/cache/redis.client.ts`), so a transient outage self-heals.
- Graceful shutdown (`closeRedis`) uses a non-blocking disconnect that cancels
  the reconnect loop, so a deploy never hangs waiting on a dead Redis peer.

### Known trade-off: writes while Redis is down

Invalidation is fire-and-forget. If Redis is unreachable at the exact moment an
admin edits a product/category/review or stock moves, that invalidation is
lost. During the outage Redis is also not serving any cached page, and entries
that predate the outage expire by TTL (5–30 min), so the storefront self-heals
once Redis is back without manual action.

## Installation

Install the Redis client (already done):

```bash
cd server
npm install redis        # adds the `redis` driver (v4+)
```

### Local Redis

```bash
# Option A — Docker
docker run -d --name ayanfe-redis -p 6379:6379 redis:7-alpine

# Option B — Homebrew (macOS)
brew install redis && redis-server

# Verify
redis-cli ping            # -> PONG
```

### Environment

Two reference templates live next to the API code:

- **Development** → `server/.env.example`
- **Production** → `server/.env.production.example`

The API loads its environment from the repository-root `.env` file (see
`server/src/config/env.ts`), so for local development copy the dev template
into the root `.env`. For production, use the prod template as a checklist and
enter the values in the Render dashboard instead (they are never written to a
file on the server).

```bash
# Development (root .env):
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
CACHE_KEY_PREFIX=afvc
```

Run the API:

```bash
cd server
npm run dev
```

Watch the cache working — the first request logs
`{"event":"cache_miss",...}` (or `cache_down` once per minute if Redis is
down), repeat requests log `{"event":"cache_hit",...}`. Browse `/`, `/shop`, a
product page, or run a search, then verify keys:

```bash
redis-cli --scan --pattern 'afvc:*'
```

Flush everything if you want a clean slate:

```bash
redis-cli --scan --pattern 'afvc:*' | xargs -r redis-cli unlink
```

### Testing Redis failure fallback

Stop Redis (`docker stop ayanfe-redis`) and repeat the same requests — pages
still load, response logs show `cache_error`/`cache_down` instead of the
Redis events, and nothing breaks. Restart Redis and within seconds the cache
heals on its own.

## Deployment (Render)

1. Create a managed Redis (Render "Redis" blueprint, or any of Upstash/Redis
   Cloud) and copy its TLS connection string (`rediss://...`).
2. In the `ayanfe-food-variety-api` service settings add the environment
   variables (already declared in `render.yaml`):
   - `REDIS_URL` = your `rediss://...` URL
   - `CACHE_ENABLED` = `true`
   - `CACHE_KEY_PREFIX` = `afvc` (unique per environment if sharing a Redis)
3. Deploy. The `/ready` health endpoint keeps working; the cache warms
   lazily on first traffic (no seed step).

Deploying without `REDIS_URL` is fully supported — the store simply runs
cacheless against the database until you add it.

## Scaling hints

- The homepage aggregate endpoint (`GET /api/v1/homepage`) collapses five
  storefront calls into one cached payload — enabled automatically for
  anonymous visitors.
- Product detail (30 min) and listing (10 min) TTLs favour "many product
  views". Stock changes invalidate immediately, so cached pages never show
  items as available after they sell out.
- If you later outgrow a single cache tier, the key naming is already
  structured for blue/green Redis failover or a CDN edge cache in front.

## Files

- `server/src/modules/cache/redis.client.ts` — connection, auto-reconnect, env-driven enable
- `server/src/modules/cache/cache.service.ts` — `getOrSet`, hit/miss/error logging, SCAN invalidate
- `server/src/modules/cache/cache.keys.ts` — key builders and TTLs
- `server/src/modules/cache/invalidate.ts` — domain invalidators
- `server/src/modules/homepage/` — aggregate homepage service/controller
- Read-side caching: `products/product.list.service.ts`, `products/product.popular.service.ts`, `categories/category.service.ts`
- Write-side invalidation: `products/admin-product.service.ts`, `products/admin-product.write.service.ts`, `categories/category.service.ts`, `inventory/inventory.service.ts`, `inventory/inventory.adjust.service.ts`