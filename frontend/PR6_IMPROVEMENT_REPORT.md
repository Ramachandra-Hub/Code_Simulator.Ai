# PR-6 — Self-Improving Intelligence Layer

**Status:** Complete  
**Verify:** `npm run verify:pr6`

---

## Summary

PR-6 closes the loop between beta usage signals and platform improvement. Heuristic scoring is the source of truth; Ollama generates human-readable weekly summaries on top.

---

## 1. Recommendation Learning Engine

**Tracks:** shown → accepted / dismissed / ignored / completed  
**Metrics:** adoption rate, placement delta, coach rating correlation  
**Persistence:** `RecommendationEffectiveness`, `RecommendationOutcome`

**Hooks:**
- `runCareerCoach()` — records all recommendations as `shown`
- Career Coach UI — "I'll do this" / Dismiss buttons
- Roadmap "Done" — `completed` outcome
- Coach rating feedback — correlates to recent recommendations

---

## 2. Interview Quality Analytics

**Tracks:** question asked, answered, follow-up, session abandoned  
**Metrics:** completion rate, skip/abandon rate, follow-up rate  
**Persistence:** `QuestionEffectiveness`, `InterviewQualityEvent`

**Hooks:**
- `createSession()` — first question asked
- `submitAnswer()` — answer scored + next question asked
- `completeSession()` — detects unanswered final question (abandonment)
- Interview rating — updates question `ratingImpact`

---

## 3. Career Coach Quality Analytics

**Metrics:**
- Recommendation acceptance rate
- Roadmap completion rate (`RoadmapItem.status = completed`)
- Career coach rating correlation (`rate_career_coach` feedback)

---

## 4. AI Improvement Dashboard

**URL:** `/dashboard/beta/ai-quality`  
**API:** `GET/POST /api/beta/ai-quality`

Shows best/worst questions, best/worst recommendations, student improvement trends, weekly AI report.

---

## 5–6. Intelligence Engines

### Question Effectiveness Score (0–100)

```
40% completion rate
30% avg answer score
15% engagement (answer length)
10% follow-up improvement
5%  rating impact
-15% abandon penalty
```

### Recommendation Effectiveness Score (0–100)

```
35% adoption (accepted / shown)
25% completion rate
25% placement delta boost
25% rating boost
-20% ignore penalty
```

---

## 7. Weekly AI Improvement Report

**Model:** `IntelligenceImprovementReport`  
**Generation:** Heuristics first → Ollama summary (20s timeout) → fallback to heuristics  
**Refresh:** `POST /api/beta/ai-quality` or dashboard button

### Example Report Bullets

```
• Best interview question: "Explain a challenging project you led..." (82/100 effectiveness).
• Worst interview question: "Describe your experience with distributed systems..." (34/100) — consider revising or retiring.
• Most useful recommendation: "Complete 2 mock technical interviews this week" (67% adoption).
• Least useful recommendation: "Apply to 10 companies daily" — 4 ignores.
• Interview question completion rate: 71% (abandon rate 18%).
• Career coach acceptance: 52% · roadmap completion: 38%.
• Student improvement trending positive: 5 students up vs 2 down.
• Recommended platform changes: Personalize career coach recommendations using twin signals.
```

---

## Database Changes

| Model | Purpose |
|-------|---------|
| `QuestionEffectiveness` | Aggregated per-question scores |
| `RecommendationEffectiveness` | Aggregated per-recommendation-title scores |
| `RecommendationOutcome` | Individual user actions |
| `InterviewQualityEvent` | Raw interview funnel events |
| `IntelligenceImprovementReport` | Weekly heuristic + AI summaries |

**Apply:** `npm run db:push`

---

## APIs

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/beta/ai-quality` | GET | Admin | Dashboard + weekly report |
| `/api/beta/ai-quality` | POST | Admin | Force report regeneration |
| `/api/intelligence/recommendations/outcome` | POST | User | Track accept/dismiss/ignore |
| `/api/intelligence/roadmap/complete` | POST | User | Mark roadmap item done |

**Analytics events added:**
- `recommendation_accepted`
- `recommendation_dismissed`
- `recommendation_completed`
- `roadmap_item_completed`

---

## Modified Files

```
prisma/schema.prisma
src/server/intelligence/
  intelligence-keys.ts
  question-intelligence-service.ts
  recommendation-intelligence-service.ts
  ai-quality-dashboard-service.ts
  improvement-report-service.ts
src/server/career-intelligence/services/
  interview-service.ts
  career-coach-service.ts
src/server/beta/
  analytics-events.ts
  feedback-service.ts
src/server/core/db/prisma.ts
src/app/api/beta/ai-quality/route.ts
src/app/api/intelligence/recommendations/outcome/route.ts
src/app/api/intelligence/roadmap/complete/route.ts
src/app/(dashboard)/dashboard/beta/ai-quality/page.tsx
src/components/career/career-coach-panels.tsx
src/lib/beta-client.ts
src/lib/constants.ts
scripts/verify-pr6.ts
```

---

## Verification Checklist

- [ ] `npm run db:push` — 5 new PR-6 tables
- [ ] `npm run verify:pr6` — all checks pass
- [ ] Restart dev server after schema push
- [ ] Complete a mock interview → `QuestionEffectiveness` row created
- [ ] Rate interview → rating impact applied
- [ ] Run Career Coach → recommendations tracked as `shown`
- [ ] Click "I'll do this" → `accepted` outcome recorded
- [ ] Mark roadmap item Done → `completed` outcome
- [ ] Admin → AI Quality dashboard loads
- [ ] Regenerate Weekly Report → bullets appear (AI or rule-based)

---

## Constraints Honored

- No new AI agents
- No new interview types
- Heuristics = source of truth; Ollama = summary layer only
- PR-6 scope only — stopped after deliverables above
