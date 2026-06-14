# Stability Sprint Report — NexusEdge Beta

**Date:** June 11, 2026  
**Goal:** Prepare NexusEdge for uninterrupted beta usage via production build validation, dev-server independence, performance observability, structured error logging, and a stability dashboard.

---

## 1. Production Build Validation

| Check | Status |
|-------|--------|
| `npm run build` | Pass (after fixing `BetaDashboardData` typing) |
| `npm start` | Verified — serves pre-built `.next` output |
| TypeScript | Clean |
| ESLint | Next.js plugin warning only (non-blocking) |
| Edge runtime | `jose` CompressionStream warning in middleware (pre-existing, non-blocking) |

**Fix applied:** `getBetaDashboard()` now returns typed `BetaDashboardData` so the beta dashboard page compiles under strict production type-checking.

**Recommendation for beta:** Run `npm run build && npm start` on the host machine. Production mode eliminates dev-only compile latency (5–15s per route) and chunk/HMR issues.

---

## 2. Dev Server Dependency Audit

| Issue | Root cause | Mitigation |
|-------|------------|------------|
| Hot reload stops / `ERR_CONNECTION_REFUSED` | Dev process exits when terminal closes or crashes | Use `npm start` (production) for beta sessions |
| `layout.css` 404 | Stale `.next` cache after dev restarts | `rm -rf .next` then rebuild; production build serves static CSS reliably |
| Chunk loading failures | Dev HMR invalidates chunks mid-session | Production build bundles stable hashed chunks |
| Hydration warnings | Theme/localStorage mismatch on first paint | `suppressHydrationWarning` on `<html>`; dashboard shell uses `getStoredSession()` synchronously |

**Verdict:** Beta testers should use the **production server** (`npm run build && npm start`), not `npm run dev`.

---

## 3. Performance Dashboard

### Tracked metrics

| Category | Source | Route / trigger |
|----------|--------|-----------------|
| `page_load` | Client `PageLoadTracker` | `POST /api/beta/performance` on each dashboard navigation |
| `interview_response` | Server | `POST /api/interviews/:id/answer` |
| `career_coach` | Server | `POST /api/career/coach` |
| `database` | Prisma extension | All DB operations (excludes metric tables) |
| `interview_generation` | Server | Interview create/complete (existing) |
| `ollama` | Server | Insights refresh (existing) |

### UI

- **Beta Dashboard** (`/dashboard/beta`) — 24h performance summary
- **Stability Dashboard** (`/dashboard/beta/stability`) — slowest pages, slowest APIs, category breakdown, 24h/72h/7d windows

---

## 4. Error Logging — `SystemError` Table

```prisma
model SystemError {
  source     String   // api | ollama | prisma | client
  route      String?
  message    String
  statusCode Int?
  ...
}
```

### Wired sources

| Source | Where |
|--------|-------|
| `api` | Beta dashboard, insights, career coach, interview answer routes |
| `ollama` | `model-gateway.ts` on Ollama adapter failures |
| `prisma` | Prisma client extension on query failures |

Logging is **non-blocking** — failures to write errors never break user requests.

---

## 5. Beta Stability Report

Available at **`/dashboard/beta/stability`** and **`GET /api/beta/stability?hours=24`**.

| Metric | Description |
|--------|-------------|
| Crash frequency | Total errors + errors/hour + breakdown by source |
| Slowest pages | Aggregated `page_load` metrics by route |
| Slowest APIs | Aggregated API/interview/career/DB timings |
| Most common errors | Grouped by source + message prefix |
| Recent errors | Last 20 `SystemError` rows |

---

## Verification

```bash
npm run db:push          # apply SystemError table
npm run build            # production compile
npm run verify:stability # 12/12 checks
npm start                # serve on :3000
```

---

## Files Added / Changed

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | `SystemError` model |
| `src/server/beta/system-error-service.ts` | Error logging helpers |
| `src/server/beta/stability-service.ts` | Stability report aggregation |
| `src/app/api/beta/stability/route.ts` | Stability API |
| `src/app/api/beta/performance/route.ts` | Page load ingest |
| `src/app/(dashboard)/dashboard/beta/stability/page.tsx` | Stability UI |
| `src/components/beta/page-load-tracker.tsx` | Client page timing |
| `src/server/core/db/prisma.ts` | DB latency + Prisma error hooks |
| `scripts/verify-stability.ts` | Automated verification |

---

## Known Remaining Risks (out of sprint scope)

- Ollama inference latency (15–60s) — infrastructure, not app bug
- Remote Supabase latency — consider connection pooling / region
- Judge0 offline in dev — coding round execution uses fallback
- Admin role dashboards still use mock data
- JWT secrets in `.env` should be rotated before public launch

---

**Sprint status: COMPLETE**
