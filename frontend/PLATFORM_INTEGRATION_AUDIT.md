# NexusEdge Platform Integration Audit

**Date:** 2026-06-11  
**Scope:** Full-stack audit — pages, APIs, services, agents, database, Digital Twin, integrations, dashboards, roles  
**Constraint:** Read-only audit. No features, agents, or schema changes.

---

## Executive Summary

NexusEdge is a **dual-layer platform**: a production-grade **AI career intelligence core** (Digital Twin, interviews, coding, resume, CareerOS, Virtual Office, Talent OS) sitting alongside **mock/placeholder institutional surfaces** (LMS, placements, role dashboards, analytics UI). Backend services consistently use Prisma; the primary integration gap is **UI pages that never call existing APIs**.

| Score | Value | Interpretation |
|-------|-------|----------------|
| **Feature Completion** | **62 / 100** | Core student AI flows are end-to-end; college/faculty/placement modules are largely demo UI |
| **Production Readiness** | **58 / 100** | Build passes; auth gaps, optional infra, mock fallbacks limit hard production |
| **Technical Debt** | **68 / 100** | High — unused schema, stub agents, duplicate surfaces, dead event wiring |
| **Maintenance Risk** | **72 / 100** | High — 107 APIs, 70 agents, no role ACL on routes, mock/real split |

### Classification Legend

| Status | Definition |
|--------|------------|
| **WORKING** | UI → API → Service → DB with real behavior; twin updated where applicable |
| **PARTIAL** | Mix of real APIs and mock/hardcoded UI; or heuristic engines without LLM |
| **PLACEHOLDER** | Static UI, toasts, or “coming soon” with no backend |
| **MOCK** | Primarily `@/lib/mock-data` or inline hardcoded arrays |
| **UNUSED** | Exists in codebase but superseded or unreachable from nav |
| **BROKEN** | Auth/routing mismatch or known non-functional path |

### Standard Trace Chain

```
UI → API → Service → [Agent | Engine] → Database → Digital Twin
```

---

## 1. Pages Audit (61 routes)

### 1.1 Public (3)

| Route | Status | Trace | Notes |
|-------|--------|-------|-------|
| `/` | PLACEHOLDER | None | Marketing landing |
| `/terms` | PLACEHOLDER | None | Static copy |
| `/privacy` | PLACEHOLDER | None | Static copy |

### 1.2 Auth (1)

| Route | Status | Trace | Notes |
|-------|--------|-------|-------|
| `/login` | WORKING | UI → `/api/auth/login`, `/api/auth/demo`, `/api/auth/logout` | Demo credentials for all 7 roles |

### 1.3 Role Dashboards (8)

| Route | Role | Status | Trace | Notes |
|-------|------|--------|-------|-------|
| `/dashboard/student` | student | MOCK | `useCurrentUser` only; stats from `mock-data` | Links to real feature routes |
| `/dashboard/faculty` | faculty | MOCK | Hardcoded stats/courses | Action dialogs → toast only |
| `/dashboard/college-admin` | college_admin | MOCK | `chartData` from mock-data | Beta links work |
| `/dashboard/super-admin` | super_admin | MOCK | mock-data stats | No institution API |
| `/dashboard/placement-officer` | placement_officer | MOCK | mock-data drives | No `PlacementDrive` API |
| `/dashboard/training-coordinator` | training_coordinator | MOCK | `learningPaths` mock | No LMS API |
| `/dashboard/recruiter` | recruiter | **UNUSED** | Hardcoded candidates | **Superseded by `/recruiter`**; middleware still redirects here |
| `/dashboard/professional-intelligence` | student | WORKING | UI → `/api/professional-intelligence` + `/api/integrations/*` | OAuth + sync → twin |

### 1.4 Beta Ops (4)

| Route | Status | Trace | Notes |
|-------|--------|-------|-------|
| `/dashboard/beta` | WORKING | UI → `/api/beta/dashboard` | Role gate: beta-admin |
| `/dashboard/beta/insights` | WORKING | UI → `/api/beta/insights` | |
| `/dashboard/beta/ai-quality` | WORKING | UI → `/api/beta/ai-quality` | |
| `/dashboard/beta/stability` | WORKING | UI → `/api/beta/stability`, `/api/beta/monitoring` | |

### 1.5 Student Feature Modules (18)

| Route | Status | Trace | Twin? |
|-------|--------|-------|-------|
| `/learn` | PARTIAL | Courses: mock; shell only | No |
| `/coding` | PARTIAL | `MonacoEditorPanel` → `/api/coding/sessions/*`; submissions tab mock | On submit → `coding` |
| `/dsa` | PARTIAL | Mock problems; links to coding | Indirect |
| `/assessments` | MOCK | Hardcoded; start → toast | No |
| `/resume` | WORKING | `/api/resume` CRUD | On save → `resume` |
| `/resume-analysis` | WORKING | `/api/resume/analysis` | Via resume |
| `/ats` | WORKING | Resume + analysis APIs | Via resume |
| `/interview` | PARTIAL | History → `/api/interviews`; type select | On complete → `interview` |
| `/interview/session` | WORKING | `/api/interviews/*` | Yes |
| `/interview/voice` | WORKING | `/api/voice/*` → voice-interview-service | Yes (`voice`) |
| `/interview/panel` | WORKING | `/api/panel/*` → panel-interview-service | Yes (`panel` direct) |
| `/interview/coding` | WORKING | `/api/coding/sessions`, coding-round | Yes |
| `/interview/report` | WORKING | `/api/interviews/{id}/report`, pdf | No new twin |
| `/twin` | WORKING | `/api/twin` → twin-service | Display only |
| `/portfolio` | PLACEHOLDER | Hardcoded URL; save → toast | No |
| `/projects` | PLACEHOLDER | Form → toast | No |
| `/placements` | MOCK | `placementDrives` mock | No (`PlacementDrive` unused) |
| `/ai-coach` | WORKING | `/api/career/coach`, recommendations | Via coach graph |
| `/analytics` | **MOCK** | **No API call** — hardcoded panel | APIs exist at `/api/analytics/*` |
| `/leaderboard` | MOCK | Hardcoded rankings | No API |
| `/profile` | PARTIAL | localStorage + `/api/user/onboarding` | No server profile |

### 1.6 CareerOS (8) — `/career-os/*`

| Route | Status | Trace | Twin? |
|-------|--------|-------|-------|
| `/career-os` | WORKING | `/api/career-os/overview` | Reads twin |
| `/career-os/missions` | WORKING | `/api/missions`, `/api/career-os/missions/generate` | Heuristic missions |
| `/career-os/goals` | WORKING | `/api/goals` | |
| `/career-os/habits` | WORKING | `/api/career-os/habits` | |
| `/career-os/progress` | WORKING | `/api/career-os/progress` | |
| `/career-os/forecast` | WORKING | `/api/predictions` | |
| `/career-os/potential` | WORKING | `/api/potential`, `/api/velocity` | |
| `/career-os/achievements` | WORKING | `/api/career-os/achievements` | |

**Middleware gap:** `/career-os` not in `PROTECTED_PREFIXES` — page reachable without auth cookie (APIs still 401).

### 1.7 Virtual Office (8) — `/office/*`

| Route | Status | Trace | Twin? |
|-------|--------|-------|-------|
| `/office` | WORKING | `/api/office/overview` | Reads + updates |
| `/office/work` | WORKING | `/api/office/work`, tasks PATCH | Yes (`office`) |
| `/office/standups` | WORKING | `/api/office/standups` | Yes |
| `/office/tasks` | WORKING | `/api/office/tasks` | Yes |
| `/office/meetings` | PARTIAL | `/api/office/meetings` | Yes; voice UI not embedded |
| `/office/code-reviews` | WORKING | `/api/office/code-reviews` | Yes |
| `/office/performance` | WORKING | `/api/office/performance` | Yes |
| `/office/promotion` | WORKING | `/api/office/promotion` | Yes |

**Middleware gap:** `/office` not protected at edge.

### 1.8 Recruiter Talent OS (8) — `/recruiter/*`

| Route | Status | Trace | Twin? |
|-------|--------|-------|-------|
| `/recruiter` | WORKING | `/api/recruiter/overview` | Reads candidate twins |
| `/recruiter/candidates` | WORKING | `/api/recruiter/candidates` | |
| `/recruiter/candidates/[id]` | WORKING | `/api/recruiter/candidates/{id}` | |
| `/recruiter/radar` | WORKING | `/api/talent/radar` | |
| `/recruiter/copilot` | WORKING | `/api/copilot` → recruiter-copilot agent | |
| `/recruiter/jobs` | WORKING | `/api/jobs`, match | |
| `/recruiter/shortlists` | WORKING | `/api/recruiter/shortlists` | |
| `/recruiter/analytics` | WORKING | `/api/recruiter/analytics` | |

**Middleware gap:** `/recruiter` not protected at edge. Uses `RecruiterShell` (no `DashboardShell`).

### Page Summary

| Status | Count |
|--------|-------|
| WORKING | 35 |
| PARTIAL | 8 |
| MOCK | 10 |
| PLACEHOLDER | 5 |
| UNUSED | 1 |
| BROKEN | 1 (`/dashboard/recruiter` redirect mismatch) |

---

## 2. API Audit (107 routes)

### 2.1 Auth Classification

| Guard | Route count (approx) | Examples |
|-------|---------------------|----------|
| Student JWT (`getUserFromRequest`) | ~75 | `/api/twin`, `/api/office/*`, `/api/career-os/*` |
| Recruiter (`requireRecruiterAccess`) | ~16 | `/api/recruiter/*`, `/api/jobs/*`, `/api/talent/*` |
| Beta admin (`isBetaAdmin`) | ~8 | `/api/beta/dashboard`, insights, ai-quality |
| Public / infra | ~9 | `/api/health/*`, `/api/auth/login`, `/api/coding/run` |
| Weak / missing auth | **4** | See security section |

### 2.2 APIs by Domain

#### Auth — WORKING
`/api/auth/login`, `demo`, `logout`, `me` — Prisma users, JWT cookie.

#### Health — WORKING
`/api/health`, `live`, `ready`, `/api/system/status` — probes prisma, redis, qdrant, judge0, ollama.

#### Digital Twin & Career Intelligence — WORKING
| API | Service | DB | Twin |
|-----|---------|-----|------|
| `/api/twin` | twin-service | StudentIntelligenceProfile | Read |
| `/api/career/coach` | career-coach-service | Roadmap, Recommendation | Indirect |
| `/api/career/recommendations` | career-coach-service | Same | |
| `/api/career/roadmap` | career-coach-service | CareerRoadmap | |
| `/api/placement/readiness` | placement-service | PlacementReadiness | Recompute |

#### Interview Stack — WORKING
| API | Service | Twin signal |
|-----|---------|-------------|
| `/api/interviews/*` | interview-service | `interview` via event |
| `/api/voice/*` | voice-interview-service | `voice` direct |
| `/api/panel/*` | panel-interview-service | `panel` direct |
| `/api/coding/sessions/*` | coding-service | `coding.interview.completed` |
| `/api/coding/submit` | coding-evaluation agent | `coding.submitted` |
| `/api/coding/run` | coding-interview-graph | **PUBLIC** — Judge0 only |

#### Resume — WORKING
`/api/resume/*` → resume-service → `resume.updated` event.

#### Integrations — PARTIAL
`/api/integrations/*` → profile-integration-service. **Mock fallback** when external APIs fail (github, linkedin, leetcode, hackerrank clients).

#### CareerOS (PR-12) — WORKING
All `/api/career-os/*`, `/api/goals`, `/api/missions`, `/api/predictions`, `/api/velocity`, `/api/potential` → career-os-service + engines. Heuristic (not LLM) mission copy.

#### Virtual Office (PR-13) — WORKING
All `/api/office/*` → virtual-office-service + 5 engines. Heuristic standup/code-review/performance.

#### Talent / Recruiter (PR-10) — WORKING
`/api/recruiter/*`, `/api/jobs/*`, `/api/matching/*`, `/api/talent/*`, `/api/copilot` → talent-intelligence-service + engines.

#### Analytics — WORKING (API) / MOCK (UI)
`/api/analytics/student`, `college`, `placement`, `track` → analytics-service. **Student `/analytics` page does not call these.**

#### Beta — WORKING
`/api/beta/*` — monitoring, insights, ai-quality, production metrics.

#### Agents — PARTIAL
| API | Status | Issue |
|-----|--------|-------|
| `/api/agents` | WORKING | Public registry list |
| `/api/agents/[id]/invoke` | **PARTIAL** | Weak auth — userId optional |

### 2.3 APIs With No UI Consumer

| API | Status |
|-----|--------|
| `/api/analytics/student` | UNUSED by pages |
| `/api/analytics/college` | UNUSED |
| `/api/analytics/placement` | UNUSED |
| `/api/recruiter/screen` | UNUSED in recruiter UI |
| `/api/recruiter/pipelines` | UNUSED |
| `/api/placement/readiness` | No dedicated page (twin page indirect) |
| `/api/matching/run` | Partial — jobs UI uses per-job match |

---

## 3. Services Audit (18 files)

| Service | Status | Called by | Twin integration |
|---------|--------|-----------|------------------|
| `virtual-office-service` | WORKING | office APIs, office-agents | `updateDigitalTwin(office)` |
| `career-os-service` | WORKING | career APIs, career-os-agents, virtual-office | `ensureDigitalTwin` |
| `talent-intelligence-service` | WORKING | recruiter APIs, talent-agents | Reads twin |
| `interview-service` | WORKING | interview APIs | Emits `interview.completed` |
| `coding-service` | WORKING | coding APIs | Emits `coding.interview.completed` |
| `voice-interview-service` | WORKING | voice APIs | Direct `voice` twin update |
| `panel-interview-service` | WORKING | panel APIs | Direct `panel` twin update |
| `career-coach-service` | WORKING | career APIs | Reads twin |
| `resume-service` | WORKING | resume APIs | Emits `resume.updated` |
| `twin-service` | WORKING | `/api/twin` | Read aggregate |
| `placement-service` | WORKING | placement API, recruiter screen | |
| `placement-readiness-service` | WORKING | Internal only | Recompute from twin |
| `analytics-service` | WORKING | analytics APIs | No UI wiring |
| `profile-integration-service` | PARTIAL | integrations APIs | Emits sync events; mock fallback |
| `professional-intelligence-service` | WORKING | professional-intelligence API | Reads twin + integrations |
| `interview-pdf-service` | WORKING | interview pdf API | |
| `pdf-generator` | WORKING | interview-pdf only | Pure utility |
| `career-coach-types` | WORKING | Types only | |

---

## 4. Engines Audit (13 files)

| Engine | Domain | Status | Logic type |
|--------|--------|--------|------------|
| `task-engine` | Virtual Office | WORKING | Heuristic templates by role |
| `standup-evaluator` | Virtual Office | WORKING | Rule-based scoring |
| `code-review-engine` | Virtual Office | WORKING | Heuristic + fixed questions |
| `meeting-engine` | Virtual Office | WORKING | Templates + participation score |
| `performance-review-engine` | Virtual Office | WORKING | Weighted dimensions |
| `mission-engine` | CareerOS | WORKING | Twin-gap heuristics |
| `placement-prediction-engine` | CareerOS | WORKING | Statistical |
| `learning-velocity-engine` | CareerOS | WORKING | Trend-based |
| `future-potential-engine` | CareerOS | WORKING | Composite |
| `growth-potential-engine` | Talent | WORKING | Twin + snapshots |
| `career-velocity-engine` | Talent | WORKING | History deltas |
| `job-fit-engine` | Talent | WORKING | Role/skill match |
| `hiring-recommendation-engine` | Talent | WORKING | Multi-factor |

---

## 5. Agents Audit (70 unique)

### Registration order (`init.ts`)
1. `registerAllAgents` — 47 agents  
2. `registerTalentAgents` — 8 (overrides 3 IDs)  
3. `registerCareerOSAgents` — 8  
4. `registerOfficeAgents` — 10  

### Override conflict (duplicate IDs)

| ID | register-all (stub) | Final (talent) |
|----|---------------------|----------------|
| `recruiter-screening` | Threshold stub | `gatherCandidateIntelligence` |
| `candidate-ranking` | Sort array | `listTalentCandidates` |
| `hiring-recommendation` | Score threshold | `computeHiringRecommendation` |

### Agents by status

| Category | Count | Examples |
|----------|-------|----------|
| **WORKING** (service/engine/API) | ~26 | interview agents, coding-evaluation, talent 8, career-os 8, office 10 |
| **PARTIAL** (LLM + heuristic) | ~12 | career-coach, evaluation, resume-analysis, placement-readiness |
| **STUB** (LLM one-shot only) | ~30 | skill-gap, behavioral-interview, virtual-manager, workplace-simulation, college-analytics |
| **UNUSED** (superseded) | 2 | `virtual-manager`, `workplace-simulation` → PR-13 office agents |

### PR-13 vs legacy workplace agents

| Legacy (stub) | Replacement |
|---------------|-------------|
| `VirtualManagerAgent` | `CEOAgent`, `EngineeringManagerAgent` |
| `WorkplaceSimulationAgent` | Full virtual-office-service + 10 agents |
| `LeadershipAssessmentAgent` | `PerformanceReviewAgent`, office performance engine |

---

## 6. Database Audit (109 models)

### Models by usage

| Bucket | Count | Status |
|--------|-------|--------|
| **Active** (referenced in `src`) | ~84 | WORKING |
| **Schema-only / unused** | ~25 | UNUSED |

### Unused or disconnected models

| Model | Status | Notes |
|-------|--------|-------|
| `College` | UNUSED | No college CRUD API |
| `Account`, `Session` | UNUSED | NextAuth adapter not wired |
| `Course`, `Lesson`, `Enrollment` | UNUSED | `/learn` uses mock-data |
| `Assignment`, `Submission` | UNUSED | Twin listener exists, **no emitter** |
| `PracticeQuestion` | UNUSED | |
| `Assessment`, `Exam`, `ExamAttempt` | UNUSED | Twin listener exists, **no emitter** |
| `Event` | UNUSED | Calendar |
| `CodingProblem` | UNUSED | Problem bank in code, not Prisma |
| `InterviewQuestion` | UNUSED | |
| `CodingInterviewSubmission` | UNUSED | |
| `QuestionBank`, `RoleProfile`, `CompanyProfile`, `CompanyQuestion` | UNUSED | Qdrant used instead |
| `PlacementDrive`, `Application` | UNUSED | UI uses mock-data |
| `CandidateRanking`, `HiringRecommendation` | UNUSED | Agent IDs exist; Prisma tables empty |
| `WorkflowRun` | UNUSED | |
| `AnalyticsSnapshot` | UNUSED | |

### Active model clusters

| Cluster | Key models | Wired to UI |
|---------|------------|-------------|
| Identity | User, StudentProfile | Login, profile |
| Digital Twin | StudentIntelligenceProfile, SkillSignal, DigitalTwinSnapshot | `/twin` |
| Interview | InterviewSession, CodingSession, Voice*, Panel* | Interview flows |
| Resume | Resume, ResumeAnalysisRecord, AtsScore | Resume, ATS |
| Integrations | IntegrationAccount, *Snapshot, LeetCode*, HackerRank* | Professional intel |
| CareerOS | CareerGoal, DailyMission, HabitTracker, *Snapshot | `/career-os` |
| Virtual Office | OfficeSession, WorkTask, Meeting, StandupReport, etc. | `/office` |
| Talent | JobDescription, TalentMatch, CandidateShortlist | `/recruiter` |
| Beta | UsageEvent, PerformanceMetric, UserFeedback | Beta dashboards |

---

## 7. Digital Twin Update Paths

### Signal types (`deriveUpdates`)

| Signal | Trigger sources | Fields updated |
|--------|-----------------|----------------|
| `voice` | voice-interview-service (direct) | communication, confidence, speaking, interviewReadiness |
| `interview` | interview-service event | interviewReadiness, communication, technical, strengths/weaknesses |
| `coding` | coding submit event, coding-service | codingReadiness, algorithm, problemSolving, technical |
| `resume` | resume-service event | technical (ATS-derived) |
| `exam` | **No emitter** | technical |
| `assignment` | **No emitter** | technical |
| `github` | profile-integration event | githubScore, technical |
| `linkedin` | profile-integration event | linkedinScore, communication |
| `leetcode` | profile-integration event | leetcodeScore, coding, algorithm |
| `hackerrank` | profile-integration event | hackerrankScore, coding |
| `panel` | panel-interview-service (direct) | executiveCommunication, stakeholder, panelReadiness |
| `office` | virtual-office-service (direct) | leadership, ownership, collaboration, promotion, stakeholder |

Always recomputes: `professionalReadiness`, `portfolioStrength`, `placementScore`.

### Event bus wiring

```
interview.completed     ← interview-service          → twin ✓
resume.updated          ← resume-service             → twin ✓
coding.submitted        ← /api/coding/submit         → twin ✓
coding.interview.completed ← coding-service          → twin ✓
github/linkedin/leetcode/hackerrank.synced ← profile-integration → twin ✓
assignment.submitted    ← (none)                     → twin ✗ DEAD LISTENER
exam.completed          ← (none)                     → twin ✗ DEAD LISTENER
placement.recompute     ← updateDigitalTwin          → placement-readiness-service ✓
panel.completed         ← panel-service              → twin via DIRECT call (not listener)
```

### Twin gaps

| Gap | Severity |
|-----|----------|
| CareerOS actions don't emit twin events (missions are read-mostly) | Low |
| Office voice meetings don't update twin from voice metrics | Medium |
| Analytics page doesn't surface twin trends over time | Low |
| `MemoryRecord` model exists; Qdrant is primary semantic store | Medium |

---

## 8. Integrations Audit

| Integration | Status | Path | Fallback |
|-------------|--------|------|----------|
| **PostgreSQL / Prisma** | WORKING | All services | Required |
| **Ollama / LLM gateway** | PARTIAL | model adapters, agents | Heuristic adapter |
| **Judge0** | PARTIAL | coding-service, coding-evaluation | Local/mock execution |
| **Redis** | PARTIAL | cache, rate-limit, BullMQ | In-memory / skip |
| **Qdrant** | PARTIAL | agent memory, semantic search | try/catch skip |
| **GitHub OAuth + API** | PARTIAL | integrations routes | Mock profile on failure |
| **LinkedIn OAuth** | PARTIAL | integrations routes | Mock on failure |
| **LeetCode GraphQL** | PARTIAL | sync route | Mock stats |
| **HackerRank API** | PARTIAL | sync route | Mock stats |
| **Whisper STT** | PARTIAL | `/api/voice/stt` | Empty string |
| **XTTS TTS** | PARTIAL | voice/panel tts | Browser TTS fallback |

---

## 9. Dashboards by Role

| Role | Home | Dashboard status | Nav highlights | API-backed features |
|------|------|------------------|----------------|---------------------|
| **student** | `/dashboard/student` | MOCK shell | 19 nav items | interview, resume, twin, career-os, office, ai-coach, prof-intel |
| **faculty** | `/dashboard/faculty` | MOCK | 7 items | None — all mock |
| **college_admin** | `/dashboard/college-admin` | MOCK | 13 items | Beta suite only |
| **super_admin** | `/dashboard/super-admin` | MOCK | 12 items | Beta suite only |
| **placement_officer** | `/dashboard/placement-officer` | MOCK | 11 items | Beta + mock placements |
| **training_coordinator** | `/dashboard/training-coordinator` | MOCK | 6 items | None |
| **recruiter** | `/recruiter` | WORKING | 8 items | Full talent OS |

**Role enforcement:** Sidebar nav only. **No route-level ACL** — any authenticated user can open any dashboard URL.

---

## 10. Cross-Cutting Issues

### 10.1 Dead Code

| Item | Location | Notes |
|------|----------|-------|
| `/dashboard/recruiter` page | `dashboard/recruiter/page.tsx` | Replaced by `/recruiter` |
| `virtual-manager`, `workplace-simulation` agents | register-all.ts | Superseded by PR-13 |
| LMS Prisma models | schema.prisma | ~15 models, zero API |
| `CandidateRanking`, `HiringRecommendation` tables | schema.prisma | Logic in engines, not persisted |
| Twin listeners `assignment.submitted`, `exam.completed` | digital-twin.ts | No emitters |
| `college-analytics`, `placement-analytics` agents | register-all | Hardcoded stub outputs |

### 10.2 Duplicate Logic

| Duplication | Instances |
|-------------|-----------|
| Recruiter dashboard | `/dashboard/recruiter` (mock) vs `/recruiter` (API) |
| Placement data | `mock-data.placementDrives` vs `PlacementDrive` model |
| Workplace simulation | Stub agents vs virtual-office-service |
| Candidate ranking | register-all stub overridden by talent agent |
| Mission/heuristic copy | mission-engine vs career-coach LLM recommendations |
| Growth/velocity math | talent engines reused in career-os (intentional but coupled) |

### 10.3 Mock Data Hotspots

- `src/lib/mock-data.ts` — student dashboard, placements, leaderboard, faculty, admin charts
- `src/lib/profile.ts` — localStorage profile seeded from demo users
- Integration clients — fallback mock profiles when API fails
- Role dashboards — 6 of 7 use mock exclusively

### 10.4 Security Gaps

| Issue | Severity | Detail |
|-------|----------|--------|
| `/career-os`, `/office`, `/recruiter` not in `PROTECTED_PREFIXES` | **Critical** | Pages render without middleware auth |
| No role-based route ACL | **Critical** | Student can hit `/dashboard/super-admin` |
| `/api/agents/[id]/invoke` weak auth | **High** | Optional userId |
| `/api/coding/run` public | **High** | Judge0 sandbox exposure |
| `/api/recruiter/screen`, `/api/recruiter/pipelines` student auth only | **High** | Not recruiter-gated |
| Recruiter login redirect → `/dashboard/recruiter` | **Medium** | Wrong home path |
| JWT secret default `dev-secret-change-me` | **Medium** | env-security risk in prod |
| `/api/agents` public agent list | **Low** | Information disclosure |

### 10.5 Performance Bottlenecks

| Area | Risk |
|------|------|
| `getCareerOSOverview` | Many parallel Prisma queries per request |
| `gatherCandidateIntelligence` | Heavy joins; called per candidate in matching |
| `getOrCreateOfficeSession` | Session bootstrap creates tasks + meetings on first hit |
| Qdrant optional | Semantic memory silently skipped on failure |
| No API response caching | Redis available but not uniformly used |
| 148 static pages at build | Large surface area |

### 10.6 Missing Integrations

| Expected wire | Current state |
|---------------|---------------|
| `/analytics` page → `/api/analytics/student` | **Missing** |
| `/placements` → `PlacementDrive` API | **Missing** |
| `/learn` → Course/Enrollment API | **Missing** |
| Assignments/exams → twin events | **Missing emitters** |
| Office meetings → PR-7 voice UI | **Missing embedded voice** |
| Faculty nav → real class/roster APIs | **Missing** |
| College admin → institution management | **Missing** |

---

## 11. End-to-End Trace Matrix (Core Flows)

### Flow A: Mock Interview (text) — WORKING
```
/interview/session → POST /api/interviews → interview-service
  → interview-graph + agents (question-generation, evaluation, feedback)
  → InterviewSession, InterviewTurn, Evaluation (DB)
  → emit interview.completed → digital-twin (interview signal)
  → /interview/report → GET /api/interviews/{id}/report
```

### Flow B: Voice Interview — WORKING
```
/interview/voice → /api/voice/start|transcript|stt|tts|stop
  → voice-interview-service → VoiceInterviewSession (DB)
  → updateDigitalTwin(voice) direct
```

### Flow C: CareerOS Daily Mission — WORKING (heuristic)
```
/career-os → GET /api/career-os/overview → career-os-service
  → gatherCareerOSContext → ensureDigitalTwin
  → mission-engine, placement-prediction-engine, etc.
  → DailyMission, PlacementPrediction (DB)
```

### Flow D: Virtual Office Standup — WORKING (heuristic)
```
/office/standups → POST /api/office/standups → virtual-office-service
  → standup-evaluator → StandupReport (DB)
  → updateDigitalTwin(office)
```

### Flow E: Recruiter Candidate Profile — WORKING
```
/recruiter/candidates/[id] → GET /api/recruiter/candidates/{id}
  → talent-intelligence-service → gatherCandidateIntelligence
  → growth-potential-engine, hiring-recommendation-engine
  → reads StudentIntelligenceProfile (twin)
```

### Flow F: Student Analytics — BROKEN WIRE
```
/analytics → AnalyticsDashboardPanel (hardcoded)
  ✗ /api/analytics/student (exists, unused)
```

### Flow G: Placements Apply — MOCK
```
/placements → placementDrives from mock-data
  ✗ PlacementDrive, Application (DB unused)
```

---

## 12. Scores (Methodology)

### Feature Completion — 62/100
- **+40** Core AI student journey (twin, interview, coding, resume, coach, career-os, office)
- **+12** Recruiter talent OS fully wired
- **+10** Beta ops + professional integrations
- **−20** Institutional modules (LMS, placements, role dashboards, analytics UI) mock/placeholder
- **−10** Partial flows (learn, dsa, assessments, office voice)

### Production Readiness — 58/100
- **+25** Build passes, health endpoints, rate limiting, security headers (PR-11)
- **+15** Auth on most APIs, recruiter gates, beta-admin gates
- **+10** Disaster recovery docs, backup scripts
- **−20** Middleware gaps on `/office`, `/career-os`, `/recruiter`
- **−12** No role ACL, weak agent invoke auth
- **−10** Optional redis/qdrant/judge0 with silent fallbacks

### Technical Debt — 68/100 (higher = worse)
- ~25 unused Prisma models
- ~30 stub agents still registered
- Duplicate recruiter surfaces
- Dead twin event listeners
- Mock UI alongside real APIs
- Agent ID override pattern

### Maintenance Risk — 72/100 (higher = worse)
- 107 API routes, 70 agents, 61 pages
- No centralized route guard by role
- Heuristic engines diverging from LLM agents
- Tight coupling career-os ↔ talent engines
- Large schema without usage audit automation

---

## 13. Prioritized Fixes

### Critical (do before production)

1. **Add `/career-os`, `/office`, `/recruiter` to `PROTECTED_PREFIXES`** in `middleware-auth.ts` — pages currently bypass middleware auth.
2. **Implement role-based route guards** — middleware or layout checks so students cannot access admin/recruiter dashboards.
3. **Fix recruiter login redirect** — middleware `rolePaths.recruiter` should be `/recruiter`, not `/dashboard/recruiter`.
4. **Harden `/api/agents/[id]/invoke`** — require authentication; reject anonymous invocations.
5. **Gate `/api/recruiter/screen` and `/api/recruiter/pipelines`** with `requireRecruiterAccess`.

### High

6. **Wire `/analytics` page to `/api/analytics/student`** — remove hardcoded panel; trace usage events.
7. **Remove or redirect `/dashboard/recruiter`** — eliminate duplicate mock recruiter dashboard.
8. **Add auth or API key to `/api/coding/run`** — public Judge0 proxy risk.
9. **Emit `assignment.submitted` / `exam.completed`** when LMS is built — or remove dead twin listeners.
10. **Unregister superseded stub agents** (`virtual-manager`, `workplace-simulation`) to reduce confusion.
11. **Enforce `JWT_SECRET` in production** — fail startup if default secret (production-guards exists; verify enforced).

### Medium

12. **Wire `/placements` to `PlacementDrive` + `Application` APIs** — replace mock-data.
13. **Wire `/learn` to Course/Enrollment APIs** — or remove LMS models from schema until ready.
14. **Embed PR-7 voice in office meetings UI** — complete virtual office voice loop.
15. **Persist hiring recommendations** to `HiringRecommendation` / `CandidateRanking` tables.
16. **Add role dashboard data APIs** — faculty, college-admin at minimum read from Prisma.
17. **Document agent registration order** — prevent accidental stub overrides.
18. **Cache `getCareerOSOverview` and `gatherCandidateIntelligence`** via Redis.

### Low

19. **Remove unused Prisma models** or mark `@ignore` until LMS phase — reduce migration noise.
20. **Consolidate growth/velocity** into shared module with single import path.
21. **Add leaderboard API** or remove `/leaderboard` nav item.
22. **Portfolio/projects backend** — or demote nav visibility.
23. **Sync `MemoryRecord` with Qdrant** or deprecate table.
24. **College model CRUD** for multi-tenant college features.

---

## 14. Appendix: File Reference Map

| Layer | Primary paths |
|-------|---------------|
| Pages | `src/app/(dashboard)/**`, `src/app/(recruiter)/**` |
| APIs | `src/app/api/**/route.ts` (107 files) |
| Services | `src/server/*/services/*.ts` |
| Engines | `src/server/*/engines/*.ts` |
| Agents | `register-all.ts`, `talent-agents.ts`, `career-os-agents.ts`, `office-agents.ts` |
| Twin | `src/server/career-intelligence/memory/digital-twin.ts` |
| Auth | `src/middleware.ts`, `src/server/lib/middleware-auth.ts` |
| Nav/Roles | `src/lib/constants.ts` |
| Mock data | `src/lib/mock-data.ts` |
| Schema | `prisma/schema.prisma` (109 models) |

---

**Audit complete. No code changes made. Stop after audit.**
