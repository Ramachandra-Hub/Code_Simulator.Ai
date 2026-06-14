# Deployment Readiness Report — NexusEdge External Beta

**Date:** June 11, 2026  
**Sprint:** Security & Deployment  
**Goal:** Prepare NexusEdge for external beta deployment.

---

## Executive Summary

| Area | Status | Notes |
|------|--------|-------|
| Security audit | ⚠️ Action required | Rotate JWT secrets before public launch |
| Production env template | ✅ Ready | `.env.production.example` |
| Rate limiting | ✅ Implemented | Interviews, coach, feedback, PDF, insights |
| Monitoring | ✅ Implemented | `/api/beta/monitoring` + stability UI |
| Backup strategy | ✅ Documented | See §5 below |
| Build / start | ✅ Passes | `npm run build && npm start` |
| Supabase | ✅ Connected | Schema synced |
| Ollama | ⚠️ Host-dependent | Must run on deployment server |
| Judge0 | ⚠️ Required in prod | `NODE_ENV=production` enforces Judge0 |

---

## 1. Security Audit

### JWT & Auth

| Check | Finding |
|-------|---------|
| `JWT_SECRET` | **Placeholder in dev** — must be `openssl rand -base64 48` before external beta |
| `NEXTAUTH_SECRET` | **Placeholder in dev** — must differ from `JWT_SECRET` |
| Token algorithm | HS256 via `jose`, 7-day expiry |
| Fallback secret | `dev-secret-change-me` only when env unset — **never in production** |

**Action:** Set both secrets in production `.env` before deploying. Run `npm run verify:deployment` to confirm.

### Supabase Keys

| Key | Exposure | Status |
|-----|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe (RLS) | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | ✅ Not in client code |
| `DATABASE_URL` | **Server-only** | ✅ Prisma only |

**Action:** Enable Row Level Security on Supabase tables if exposing anon key to untrusted clients. Current app uses Prisma with service credentials server-side.

### Environment Variables

Audited via `src/server/lib/env-security.ts` and exposed at `GET /api/beta/monitoring` (admin-only).

Critical for production:
- `DATABASE_URL`, `DIRECT_URL`
- `JWT_SECRET`, `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (production domain)
- `OLLAMA_BASE_URL`
- `JUDGE0_URL` (required when `NODE_ENV=production`)

### Role Permissions

| Role | Beta admin access |
|------|-------------------|
| `super_admin` | ✅ |
| `college_admin` | ✅ |
| `placement_officer` | ✅ |
| `student`, `faculty`, `recruiter`, etc. | ❌ API returns 403 |

Enforced by `isBetaAdmin()` on all `/api/beta/*` routes and feedback GET.

### Admin Route Protection

| Layer | Protection |
|-------|------------|
| Dashboard pages (`/dashboard/*`) | Middleware JWT cookie/header check |
| Beta APIs | `getUserFromRequest` + `isBetaAdmin` |
| Feedback POST | Authenticated users only |
| Feedback GET | Beta admin only |

**Gap (acceptable for beta):** `/dashboard/beta` UI loads for any authenticated user; data APIs return 403 for non-admins.

---

## 2. Production Environment

Template: **`.env.production.example`**

```bash
cp .env.production.example .env
# Fill all [REQUIRED] values
npm run db:push    # or prisma migrate deploy
npm run build
npm start
```

### Required Variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase pooler (port 6543) |
| `DIRECT_URL` | Supabase direct (port 5432) for migrations |
| `JWT_SECRET` | API auth tokens |
| `NEXTAUTH_SECRET` | Session signing |
| `NEXTAUTH_URL` | Public app URL |
| `OLLAMA_BASE_URL` | AI inference host |
| `OLLAMA_MODEL` | Default model (`qwen3:8b`) |
| `JUDGE0_URL` | Code execution (required in prod) |

See `.env.production.example` for the full list with comments.

---

## 3. Rate Limiting

Implemented in `src/server/lib/rate-limit.ts`, enforced in `src/middleware.ts` for all `/api/*` routes.

| Route prefix | Limit | Window |
|--------------|-------|--------|
| `/api/interviews` (PDF paths) | 10 req | 60s / IP |
| `/api/interviews` | 30 req | 60s / IP |
| `/api/career/coach` | 10 req | 60s / IP |
| `/api/feedback` | 20 req | 60s / IP |
| `/api/beta/insights` | 15 req | 60s / IP |
| `/api/agents`, `/api/coding`, `/api/voice` | 100 req | 60s / IP |

Returns `429` with `Retry-After: 60` when exceeded.

**Note:** In-memory buckets suit single-instance deployments. For multi-instance, use Redis-backed rate limiting.

---

## 4. Monitoring

### Endpoints

| Endpoint | Access | Metrics |
|----------|--------|---------|
| `GET /api/beta/monitoring?hours=1` | Beta admin | Error rate, API/Ollama/DB latency, env security audit |
| `GET /api/beta/stability?hours=24` | Beta admin | Crashes, slowest pages/APIs, common errors |
| `GET /api/system/status` | Public | DB, Ollama, Judge0 health |
| `GET /api/health` | Public | Full dependency probe |

### Tracked Metrics

| Metric | Source |
|--------|--------|
| Error rate | `SystemError` count vs `PerformanceMetric` samples |
| API latency | `PerformanceMetric` (api, interview, career categories) |
| Ollama latency | `ollama`, `career_coach`, `interview_response`, `interview_generation` |
| Database latency | Prisma extension (`category: database`) |

UI: **Stability dashboard** (`/dashboard/beta/stability`) shows live monitoring cards.

---

## 5. Backup Strategy

### Supabase Backups

| Method | Frequency | Recovery |
|--------|-----------|----------|
| **Supabase automated backups** | Daily (Pro plan) / PITR on paid tiers | Dashboard → Database → Backups → Restore |
| **Manual `pg_dump`** | Before each release | `pg_dump $DIRECT_URL > backup-$(date +%F).sql` |
| **Schema-only export** | Each sprint | `prisma/schema.prisma` in git |

**Recommendation:** Enable Point-in-Time Recovery on Supabase Pro before external beta.

### Prisma Migrations

```bash
# Development
npm run db:push          # prototype / beta

# Production (recommended)
npx prisma migrate deploy
```

Keep `prisma/migrations/` in version control. Never edit applied migrations.

### Disaster Recovery Runbook

1. **Database loss:** Restore from Supabase backup or latest `pg_dump`. Run `prisma migrate deploy`.
2. **App server loss:** Redeploy from git. Restore `.env` from secrets manager (not git).
3. **Ollama loss:** Re-pull models (`ollama pull qwen3:8b`). Interviews/coach degrade until restored.
4. **Judge0 loss:** Coding rounds fail in production. Restart Judge0 container or set maintenance banner.
5. **JWT compromise:** Rotate `JWT_SECRET` + `NEXTAUTH_SECRET`. All users must re-login.

**RTO target (beta):** 4 hours. **RPO target:** 24 hours (daily backup).

---

## 6. Deployment Validation

### Commands

```bash
cd frontend
npm run verify:deployment   # security + deps + monitoring
npm run verify:stability      # observability layer
npm run verify:beta           # beta features
npm run build
npm start
```

### Dependency Matrix

| Service | Dev | Production |
|---------|-----|------------|
| Supabase | ✅ Required | ✅ Required |
| Ollama | ✅ Required for AI | ✅ Required (GPU host recommended) |
| Judge0 | Optional (fallback) | **Required** (`NODE_ENV=production`) |
| Redis | Optional | Optional (queues) |

### Pre-Launch Checklist

- [ ] Rotate `JWT_SECRET` and `NEXTAUTH_SECRET`
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Confirm Ollama reachable from app server
- [ ] Deploy Judge0 and set `JUDGE0_URL`
- [ ] Run `npm run build && npm start` on target host
- [ ] Run `npm run verify:deployment` — aim for 100%
- [ ] Enable Supabase daily backups
- [ ] Store `.env` in secrets manager (AWS SSM, Vault, etc.)

---

## Files Added / Changed

| Path | Purpose |
|------|---------|
| `.env.production.example` | Production env template |
| `src/server/lib/env-security.ts` | Env audit helpers |
| `src/server/lib/rate-limit.ts` | Rate limit rules + checker |
| `src/server/beta/monitoring-service.ts` | Latency + error rate aggregates |
| `src/app/api/beta/monitoring/route.ts` | Monitoring + security API |
| `src/middleware.ts` | Expanded rate limiting |
| `scripts/verify-deployment.ts` | Automated deployment checks |

---

**Sprint status: COMPLETE**
