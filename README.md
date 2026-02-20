# Cloudflare Workers API Template

Production-ready API starter built with **Hono.js**, **Cloudflare D1**, **Drizzle ORM**, and **Zod** — organized using **vertical slice architecture** and **SOLID principles**.

Battle-tested patterns extracted from a production app serving real users.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Cloudflare Workers](https://developers.cloudflare.com/workers/) |
| Framework | [Hono](https://hono.dev) + [Zod OpenAPI](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Validation | [Zod](https://zod.dev/) |
| Storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) (optional) |
| Queues | [Cloudflare Queues](https://developers.cloudflare.com/queues/) (optional) |
| Durable Objects | [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) (optional) |
| Docs | Auto-generated OpenAPI 3.0 + Swagger UI |

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url> && cd cf-hono-d1-drizzle-template
npm install

# 2. Create your D1 database
npx wrangler d1 create my-app-db
# Copy the database_id into wrangler.toml

# 3. Set up local secrets
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set JWT_SECRET + JWT_SECRET_ADMIN

# 4. Run migrations
npm run db:migrate:local

# 5. Start dev server
npm run dev
# API running at http://localhost:8787
# Swagger UI at http://localhost:8787/docs
```

## Project Structure

```
src/
├── index.ts                        # Entry point — routes, middleware, cron, queue exports
├── di.ts                           # Service Container (dependency injection)
│
├── core/                           # Shared infrastructure
│   ├── types.ts                    # Global types (Bindings, Variables, User)
│   ├── config/
│   │   └── app-versions.ts         # Version allow-list for mobile clients
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT auth + user loading (composable factory)
│   │   ├── admin.middleware.ts      # Admin JWT auth (separate secret)
│   │   ├── error.middleware.ts      # Global error handler (Zod, HTTP, generic)
│   │   ├── rate-limit.middleware.ts # IP-based sliding window rate limiter
│   │   ├── request-id.middleware.ts # Correlation ID + request logging
│   │   ├── session-tracking.middleware.ts  # Fire-and-forget daily analytics
│   │   ├── subscription.middleware.ts      # Auto-downgrade expired subscriptions
│   │   └── version.middleware.ts           # Force-update for old mobile versions
│   ├── schemas/
│   │   └── common.schema.ts        # Reusable Zod schemas (Error, Pagination)
│   ├── services/
│   │   └── storage.service.ts      # R2 upload/delete utility
│   └── utils/
│       ├── error.ts                # Error message extraction
│       ├── logger.ts               # Structured JSON logger
│       ├── password.ts             # PBKDF2 hashing (Web Crypto API)
│       └── tokens.ts               # JWT sign/verify helpers
│
├── db/
│   ├── schema.ts                   # Drizzle schema (single source of truth)
│   └── index.ts                    # Drizzle client factory
│
├── features/                       # Vertical slices (one folder per feature)
│   ├── auth/
│   │   ├── api/                    # Routes + OpenAPI contracts
│   │   ├── core/                   # Business logic (service)
│   │   └── data/                   # Database access (repository)
│   ├── posts/                      # Full CRUD example
│   │   ├── api/
│   │   ├── core/
│   │   └── data/
│   └── ab-testing/                 # A/B testing with sticky assignments
│       ├── api/                    # Public + admin routes
│       ├── core/                   # Weighted random assignment logic
│       └── data/                   # Experiments, variants, assignments
│
├── cron/                           # Scheduled jobs
│   ├── index.ts                    # Registry mapping cron expressions → handlers
│   ├── types.ts                    # CronJobHandler type
│   └── jobs/
│       ├── cleanup-expired-subscriptions.ts
│       └── cleanup-rate-limits.ts
│
├── queues/                         # Async background jobs
│   └── example.consumer.ts         # Typed batch consumer with ack/retry
│
└── durable-objects/                # Stateful edge computing
    └── async-result.do.ts          # Store → poll → ack → auto-cleanup pattern

migrations/                         # D1 SQL migration files
```

## Architecture

### Vertical Slice Architecture

Each feature is a self-contained folder with three layers:

```
feature/
├── api/            Contract (Zod schemas + OpenAPI) → Route handlers
├── core/           Service (business logic, orchestration)
└── data/           Repository (database queries via Drizzle)
```

**Data flows in one direction:**

```
HTTP Request → Contract (validates) → Route → Service → Repository → D1
```

Features are isolated — a feature never imports from another feature's internals. Shared code lives in `core/`.

### SOLID Principles

| Principle | How it's applied |
|---|---|
| **S**ingle Responsibility | Routes handle HTTP, services handle logic, repos handle data |
| **O**pen/Closed | Add new features by adding folders, not modifying existing code |
| **L**iskov Substitution | Services depend on repository interfaces, not concrete implementations |
| **I**nterface Segregation | Each contract exposes only the schemas a route needs |
| **D**ependency Inversion | Services receive repos via constructor; auth middleware accepts a `getDb` factory |

### Dependency Injection

The `ServiceContainer` (`src/di.ts`) provides lazy-initialized services:

```typescript
const services = new ServiceContainer(c.env);
const post = await services.posts.getById(id, userId);
```

Each getter creates the repository and service on first access. Unused services cost nothing. The container is instantiated per request — no shared mutable state.

## Included Patterns

### Middleware Stack

| Middleware | What it does | Where to apply |
|---|---|---|
| **Request ID** | UUID correlation + structured request logging | Global |
| **CORS** | Environment-aware cross-origin handling | Global |
| **Auth** | JWT verification + user loading from DB | Per-feature |
| **Admin Auth** | Separate JWT secret for admin routes | Admin routes |
| **Rate Limiter** | IP-based sliding window with presets | Auth/sensitive routes |
| **Version Check** | Force mobile app updates, pass web through | API routes |
| **Session Tracking** | Fire-and-forget daily analytics via `waitUntil()` | After auth |
| **Subscription Check** | Auto-downgrade expired tiers mid-request | After auth |

### Cron Jobs

A type-safe registry that maps cron expressions to handlers:

```typescript
// src/cron/index.ts
const CRON_JOBS: CronRegistry = {
  "0 3 * * *": cleanupExpiredSubscriptions,
  "0 4 * * *": cleanupRateLimits,
};
```

Add a new job in 3 steps:
1. Create a handler in `cron/jobs/`
2. Import + register it in `cron/index.ts`
3. Add the same cron expression to `wrangler.toml`

### Queues (Async Background Jobs)

Typed batch consumer with individual message ack/retry:

```typescript
// In a route handler — fire and forget
c.executionCtx.waitUntil(c.env.MY_QUEUE.send({ type: "email", to: "...", ... }));

// Consumer processes with automatic retries on failure
for (const msg of batch.messages) {
  try {
    await process(msg.body);
    msg.ack();
  } catch {
    msg.retry(); // Cloudflare retries with backoff
  }
}
```

### Durable Objects (Async Result Polling)

The `AsyncResultDO` implements a production-grade polling pattern:

```
1. Producer stores result     →  PUT  /store  { data }
2. Client polls               →  GET  /       → 202 (pending) or 200 (ready)
3. Client acknowledges        →  DELETE /      → tombstone
4. Auto-cleanup after 24h     →  alarm()
```

### A/B Testing

Full feature with sticky user assignment, weighted random variants, and admin CRUD:

```
GET  /api/ab/assignment/:experimentKey     → returns assigned variant + config
GET  /api/ab/admin/experiments             → list all experiments
GET  /api/ab/admin/experiments/:key/stats  → assignment counts per variant
PUT  /api/ab/admin/experiments/:key/status → activate/pause/complete
PUT  /api/ab/admin/variants/:id            → update weight/enabled
```

### R2 Storage

Simple upload/delete utility for Cloudflare R2:

```typescript
const url = await uploadToCDN(env, file, "avatars");
// → "https://pub-xxx.r2.dev/avatars/1708000000000-photo.jpg"
```

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | - | Register a new user |
| `POST` | `/api/auth/login` | - | Login and get tokens |
| `GET` | `/api/auth/profile` | User | Get current user profile |

### Posts (CRUD)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/posts` | User | List posts (paginated) |
| `GET` | `/api/posts/:id` | User | Get a post by ID |
| `POST` | `/api/posts` | User | Create a new post |
| `PATCH` | `/api/posts/:id` | User | Update a post |
| `DELETE` | `/api/posts/:id` | User | Delete a post |

### A/B Testing

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ab/assignment/:key` | User | Get/assign variant |
| `GET` | `/api/ab/admin/experiments` | Admin | List experiments |
| `GET` | `/api/ab/admin/experiments/:key/stats` | Admin | Variant stats |
| `PUT` | `/api/ab/admin/experiments/:key/status` | Admin | Update status |
| `PUT` | `/api/ab/admin/variants/:id` | Admin | Update variant |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/doc` | OpenAPI JSON spec |

## Adding a New Feature

1. **Create the folder structure:**

```bash
mkdir -p src/features/comments/{api,core,data}
```

2. **Define the schema** — add a table in `src/db/schema.ts`:

```typescript
export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  body: text("body").notNull(),
  postId: text("post_id").notNull().references(() => posts.id),
  authorId: text("author_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
});
```

3. **Generate and apply the migration:**

```bash
npm run db:generate       # creates SQL migration from schema diff
npm run db:migrate:local  # applies to local D1
```

4. **Build the vertical slice:**
   - `data/comments.repository.ts` — Drizzle queries
   - `core/comments.service.ts` — business rules
   - `api/comments.contract.ts` — Zod schemas + OpenAPI route definitions
   - `api/comments.routes.ts` — Hono route handlers

5. **Register in the container** — add a getter to `src/di.ts`

6. **Mount the routes** — one line in `src/index.ts`:

```typescript
app.route("/api/comments", commentsApp);
```

## Enabling Optional Features

### R2 Storage

```bash
npx wrangler r2 bucket create my-app-cdn
```

Uncomment the R2 section in `wrangler.toml`, set `R2_PUBLIC_URL`, and use `uploadToCDN()` from your services.

### Queues

```bash
npx wrangler queues create my-queue
```

Uncomment the queues section in `wrangler.toml`. Send messages from routes with `c.env.MY_QUEUE.send(...)`.

### Durable Objects

Uncomment the durable objects section in `wrangler.toml`. Access from routes:

```typescript
const doId = c.env.ASYNC_RESULT.idFromName(resultId);
const stub = c.env.ASYNC_RESULT.get(doId);
const res = await stub.fetch("https://do/store", { method: "PUT", body: JSON.stringify(data) });
```

## Deployment

```bash
# Set production secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put JWT_SECRET_ADMIN

# Apply migrations to production D1
npm run db:migrate:remote

# Deploy
npm run deploy
```

### Staging Environment

```bash
npx wrangler deploy --env staging
npx wrangler d1 migrations apply my-app-db-staging --remote --env staging
```

## Development Tips

- **Swagger UI** is at `/docs` — test endpoints directly from the browser
- **Structured logs** — all logs are JSON with `requestId` for correlation
- **Error handling** — Zod errors auto-return 400 with field details; unhandled errors return 500
- **Auth middleware is composable** — `createAuthMiddleware((env) => env.OTHER_DB)` for multi-DB setups
- **Rate limiter gracefully degrades** — if the rate_limits table is missing, requests pass through
- **`waitUntil()` for background work** — session tracking, queue sends, and rate-limit cleanup never block responses
- **No Node.js dependencies** — password hashing uses Web Crypto API, JWT uses Hono built-ins

## License

MIT
