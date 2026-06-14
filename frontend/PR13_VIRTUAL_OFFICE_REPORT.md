# PR-13 — Virtual Office Simulator

## Summary

Virtual Office Simulator lets students experience working inside an AI-driven company before their first job. Built on CareerOS, Digital Twin, Talent Intelligence patterns, and PR-7 voice infrastructure — without redesigning existing architecture.

## 1. New Agents (10)

All extend `BaseAgent` via `createAgent()` and register in `registerOfficeAgents()`:

| ID | Agent | Role |
|----|-------|------|
| `ceo` | CEOAgent | Company vision and priorities |
| `engineering-director` | EngineeringDirectorAgent | Architecture and design reviews |
| `engineering-manager` | EngineeringManagerAgent | Sprint planning and delivery |
| `team-lead` | TeamLeadAgent | Retrospectives and unblocking |
| `senior-engineer` | SeniorEngineerAgent | Code review (design, scale, failures) |
| `qa` | QAAgent | Quality and regression tasks |
| `product-manager` | ProductManagerAgent | Backlog and customer alignment |
| `hr-business-partner` | HRBusinessPartnerAgent | Performance reviews |
| `client` | ClientAgent | Stakeholder meetings |
| `performance-review` | PerformanceReviewAgent | Holistic performance + promotion |

**Path:** `src/server/virtual-office/agents/office-agents.ts`

## 2. Database Changes

**New models (10):** `VirtualCompany`, `VirtualDepartment`, `OfficeSession`, `WorkTask`, `Meeting`, `StandupReport`, `CodeReview`, `PerformanceReview`, `PromotionAssessment`, `OfficeAchievement`

**Digital Twin fields on `StudentIntelligenceProfile`:**
- `leadershipScore`
- `ownershipScore`
- `collaborationScore`
- `promotionReadiness`

**Apply locally:**
```bash
cd frontend
npm run db:push
npx prisma generate
```

## 3. APIs

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/office/overview` | GET | Session, twin office scores, analytics |
| `/api/office/work` | GET | Today's pending/completed tasks |
| `/api/office/standups` | GET, POST | Standup history and submission |
| `/api/office/tasks` | GET, POST | List / generate tasks |
| `/api/office/tasks/[id]` | PATCH | Complete task |
| `/api/office/meetings` | GET, POST | List / schedule meetings |
| `/api/office/meetings/[id]` | PATCH | Complete meeting (voice notes) |
| `/api/office/code-reviews` | GET, POST | Code review history / submit |
| `/api/office/performance` | GET, POST | Reviews / run weekly or monthly |
| `/api/office/promotion` | GET, POST | Assessments / run promotion check |
| `/api/office/analytics` | GET | Task, meeting, review, performance trends |

## 4. Dashboard Routes

| Route | Section |
|-------|---------|
| `/office` | Overview |
| `/office/work` | Today's Work |
| `/office/meetings` | Meetings |
| `/office/standups` | Standups |
| `/office/tasks` | Tasks |
| `/office/code-reviews` | Code Reviews |
| `/office/performance` | Performance |
| `/office/promotion` | Promotion Readiness |

**Shell:** `src/components/virtual-office/office-shell.tsx`  
**Client:** `src/lib/office-client.ts`  
**Nav:** Student sidebar — "Virtual Office" (PR-13)

## 5. Digital Twin Updates

New signal type `office` in `digital-twin.ts` updates:
- Leadership (`leadershipScore`)
- Ownership (`ownershipScore`)
- Collaboration (`collaborationScore`)
- Stakeholder Management (`stakeholderManagement`)
- Promotion Readiness (`promotionReadiness`)
- Communication and technical scores when present

Emitted from standups, task completion, code reviews, meetings, and performance reviews via `updateDigitalTwin()`.

## 6. Testing Guide

### Automated
```bash
cd frontend
npm run verify:pr13
npx next build
```

### Manual (demo student: `arjun@nexusedge.edu` / `demo1234`)

1. **Bootstrap:** Open `/office` — session auto-creates with seeded company (NexusEdge Labs, CloudScale, Velocity AI).
2. **Standup:** `/office/standups` — submit yesterday/today/blockers; verify scores and twin update on `/twin`.
3. **Tasks:** `/office/tasks` — complete tasks; check analytics on overview.
4. **Code review:** `/office/code-reviews` — submit sample code; verify SeniorEngineer feedback.
5. **Meetings:** `/office/meetings` — schedule sprint/retro/client/design; mark attended with notes (voice via PR-7 `/api/voice/*` when integrated in meeting UI).
6. **Performance:** `/office/performance` — run weekly and monthly reviews.
7. **Promotion:** `/office/promotion` — run assessment; verify readiness score and gaps.

## 7. Gap Report

| Area | Status | Notes |
|------|--------|-------|
| Agents | ✅ Complete | 10 agents registered |
| Database | ✅ Schema ready | Run `db:push` locally |
| Task engine | ✅ Heuristic | Role-based templates; not LLM-generated |
| Standup eval | ✅ Heuristic | Rule-based comm/ownership/pro scores |
| Code review | ✅ Heuristic | SeniorEngineer questions + scoring |
| Meetings | ✅ Partial | Agenda + completion; full voice UI hook to PR-7 not embedded in meeting modal |
| Performance | ✅ Complete | Weekly/monthly 6 dimensions |
| Digital Twin | ✅ Complete | `office` signal type |
| Analytics | ✅ Complete | Task, meeting, review, performance trends |
| CareerOS reuse | ✅ | `gatherCareerOSContext` for session bootstrap |
| Talent Intel reuse | ⚠️ Indirect | Promotion uses office-derived scores, not full `gatherCandidateIntelligence` |
| Interview/Coding | ⚠️ Future | Tasks reference work style; no direct interview/coding session launch |
| UI polish | ✅ Corporate sim | Gradient header, glass cards, big-tech culture seeds |

## Engines

- `src/server/virtual-office/engines/task-engine.ts`
- `src/server/virtual-office/engines/standup-evaluator.ts`
- `src/server/virtual-office/engines/code-review-engine.ts`
- `src/server/virtual-office/engines/meeting-engine.ts`
- `src/server/virtual-office/engines/performance-review-engine.ts`

## Service

`src/server/virtual-office/services/virtual-office-service.ts` — session lifecycle, twin signals, analytics.

---

**Verification:** `npm run verify:pr13`  
**Stop after PR-13** — Faculty/College platforms not started.
