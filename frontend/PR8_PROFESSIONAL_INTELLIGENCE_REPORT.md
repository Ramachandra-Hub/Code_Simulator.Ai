# PR-8 — Professional Profile Intelligence Report

**Date:** June 11, 2026  
**Status:** COMPLETE  
**Verification:** `npm run verify:pr8` → **32/32**  
**Build:** `npm run build` → **PASS**

---

## Summary

PR-8 deeply integrates **GitHub**, **LinkedIn**, **LeetCode**, and **HackerRank** into the Digital Twin. OAuth connects GitHub/LinkedIn with encrypted token storage. Username sync connects LeetCode/HackerRank. All platforms feed placement readiness and career coach recommendations.

---

## 1. APIs

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/integrations/status` | Connection status for all 4 providers |
| `GET` | `/api/integrations/github/authorize` | Start GitHub OAuth |
| `GET` | `/api/integrations/github/callback` | OAuth callback → token store → sync |
| `POST` | `/api/integrations/github` | Manual sync (username or stored OAuth token) |
| `GET` | `/api/integrations/linkedin/authorize` | Start LinkedIn OAuth |
| `GET` | `/api/integrations/linkedin/callback` | OAuth callback → sync |
| `POST` | `/api/integrations/linkedin` | Re-sync LinkedIn profile |
| `POST` | `/api/integrations/leetcode` | Sync by `{ username }` |
| `POST` | `/api/integrations/hackerrank` | Sync by `{ username }` |
| `GET` | `/api/professional-intelligence` | Dashboard aggregate scores + snapshots |

---

## 2. Database Changes

### `StudentIntelligenceProfile` (new fields)

| Field | Purpose |
|-------|---------|
| `githubScore` | GitHub intelligence score (0–100) |
| `linkedinScore` | LinkedIn profile score |
| `leetcodeScore` | LeetCode problem-solving score |
| `hackerrankScore` | HackerRank badges/certs score |
| `professionalReadiness` | Composite professional readiness |
| `portfolioStrength` | GitHub + LinkedIn portfolio signal |

### Snapshot / stats extensions

- **GithubSnapshot:** `username`, `forks`, `score`, `analysis` (JSON)
- **LinkedInSnapshot:** `projects`, `certifications`, `recommendations`, `score`, `analysis`
- **LeetCodeStats:** `username`, `contestRating`, `topics`, `score`, `analysis`
- **HackerRankStats:** `username`, `skillLevels`, `score`, `analysis`

### `IntegrationAccount`

Used for OAuth tokens (AES-256-GCM encrypted) + username metadata for LeetCode/HackerRank.

**Applied:** `npx prisma db push` to Supabase.

---

## 3. UI Changes

| Path | Description |
|------|-------------|
| `/dashboard/professional-intelligence` | Professional Intelligence Dashboard |
| Sidebar → **Professional Intel** (student nav) | Quick access |

**Dashboard shows:**

- GitHub Score
- LinkedIn Score
- Coding Score (LeetCode + HackerRank)
- Professional Readiness
- Portfolio Strength
- Per-platform connect/sync cards (OAuth + username sync)

---

## 4. Digital Twin Updates

**File:** `src/server/career-intelligence/memory/digital-twin.ts`

| Signal | Updates |
|--------|---------|
| `github` | `githubScore`, `technicalScore`, strengths/weaknesses |
| `linkedin` | `linkedinScore`, `communicationScore`, strengths/weaknesses |
| `leetcode` | `leetcodeScore`, `codingReadiness`, `algorithmSkills`, `problemSolving` |
| `hackerrank` | `hackerrankScore`, `codingReadiness` |
| All | `professionalReadiness`, `portfolioStrength`, `placementScore` (18% professional weight) |

**Events:** `github.synced`, `linkedin.synced`, `leetcode.synced`, `hackerrank.synced`

---

## 5. OAuth Flows

### GitHub

1. User clicks **OAuth Connect** → `GET /api/integrations/github/authorize`
2. Redirect to GitHub with `read:user repo` scope
3. Callback → exchange code → encrypt token → `IntegrationAccount`
4. Auto-sync profile → `GithubSnapshot` → Digital Twin event

**Env:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`

**Callback URL:** `{NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`

### LinkedIn

1. User clicks **OAuth Connect** → `GET /api/integrations/linkedin/authorize`
2. OpenID scopes: `openid profile email`
3. Callback → token exchange → encrypted storage → sync

**Env:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

### Token Security

- **Encryption:** `src/server/lib/token-crypto.ts` (AES-256-GCM)
- **Key:** `INTEGRATION_ENCRYPTION_KEY` (falls back to `JWT_SECRET`)
- **OAuth state:** Signed JWT (`oauth-state.ts`, 10 min expiry)

### LeetCode / HackerRank

No OAuth — username-based sync via dashboard or API.

---

## 6. Intelligence Analysis

**Evaluator:** `professional-profile-evaluator.ts`

### GitHub analyzes

- Repositories, languages, stars, forks, commits
- README quality (structure, install, code blocks)
- Project complexity, testing practices
- Architecture pattern detection (microservices, CI/CD, ML, etc.)

### LinkedIn analyzes

- Headline, experience, skills, projects
- Certifications, recommendations
- Profile completeness score

### LeetCode analyzes

- Problems solved (easy/medium/hard)
- Topic distribution, contest rating
- Updates coding readiness, algorithm skills, problem solving

### HackerRank analyzes

- Badges, certifications, skill levels
- Updates hackerrank score + coding readiness

---

## 7. Career Coach Integration

**Files:** `career-coach-service.ts`, `career-coach-types.ts`, `career-coach-graph.ts`

Coach context now includes:

- `leetcodeSummary`, `hackerrankSummary`
- `professionalScores` (all 6 composite scores)
- Richer `githubSummary` / `linkedinSummary` with scores

LLM recommendations prompt receives all professional signals.

---

## 8. Placement Readiness Integration

**Files:** `placement-readiness-service.ts`, `career-metrics.ts`

- `professionalReadiness` included in placement metrics
- **15% weight** in `computePlacementHeuristic` when professional data exists
- Twin `placementScore` formula includes 18% professional readiness

---

## 9. Key Files

```
src/server/lib/token-crypto.ts
src/server/lib/oauth-state.ts
src/server/lib/oauth-redirect.ts
src/server/career-intelligence/evaluators/professional-profile-evaluator.ts
src/server/career-intelligence/integrations/github-client.ts
src/server/career-intelligence/integrations/linkedin-client.ts
src/server/career-intelligence/integrations/leetcode-client.ts
src/server/career-intelligence/integrations/hackerrank-client.ts
src/server/career-intelligence/services/profile-integration-service.ts
src/server/career-intelligence/services/professional-intelligence-service.ts
src/app/(dashboard)/dashboard/professional-intelligence/page.tsx
src/lib/professional-intelligence-client.ts
scripts/verify-pr8.ts
```

---

## 10. Testing Guide

### Automated

```bash
cd frontend
npm run verify:pr8    # 32/32 checks
npm run build         # production build
```

### Manual — OAuth (requires app credentials)

1. Set in `.env`:
   ```
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   INTEGRATION_ENCRYPTION_KEY=<openssl rand -base64 48>
   ```
2. Register OAuth callback URLs in GitHub/LinkedIn developer consoles
3. Login as `arjun@nexusedge.edu` / `demo1234`
4. Open `/dashboard/professional-intelligence`
5. Click **OAuth Connect** for GitHub/LinkedIn
6. Verify scores update on dashboard and `/twin`

### Manual — Username sync (no OAuth)

```bash
# LeetCode
curl -X POST http://localhost:3000/api/integrations/leetcode \
  -H "Cookie: nexusedge_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"leetcode_username"}'

# HackerRank
curl -X POST http://localhost:3000/api/integrations/hackerrank \
  -H "Cookie: nexusedge_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"hackerrank_username"}'

# GitHub (manual, no OAuth)
curl -X POST http://localhost:3000/api/integrations/github \
  -H "Cookie: nexusedge_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"username":"octocat"}'
```

### Verify Digital Twin

1. Sync any platform
2. Visit `/twin` — skill signals should show `github`, `linkedin`, `leetcode`, or `hackerrank` sources
3. Run career coach (`/ai-coach` → refresh) — recommendations should reference platform data

### Verify Placement

```bash
curl http://localhost:3000/api/placement/readiness \
  -H "Cookie: nexusedge_token=<token>"
```

Score should reflect professional readiness after sync.

---

## 11. Fallback Behavior

| Platform | Offline / no credentials |
|----------|---------------------------|
| GitHub | Mock profile for username sync; OAuth returns 503 if not configured |
| LinkedIn | Mock profile when API unavailable |
| LeetCode | Mock stats if GraphQL unreachable |
| HackerRank | Mock stats if REST unreachable |

Mock data is flagged with `_mock: true` in raw responses.

---

## 12. Stop Condition

PR-8 deliverables complete. No Panel Interview or Recruiter Platform work started.

**Next suggested (out of scope):** Real LinkedIn Marketing API for full experience/skills; OAuth for LeetCode if API keys become available.
