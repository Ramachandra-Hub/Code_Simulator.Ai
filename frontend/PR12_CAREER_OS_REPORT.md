# PR-12 — AI Career Operating System (CareerOS)

**Status:** COMPLETE  
**Verification:** `npm run verify:pr12`  
**Vision:** Tell students *what exactly to do today* — powered by Digital Twin

---

## 1. Modified / Created Files

### Database
- `prisma/schema.prisma` — 10 models + User relations

### Engines (`src/server/career-os/engines/`)
- `mission-engine.ts` — daily/weekly/monthly missions + goal templates
- `placement-prediction-engine.ts` — 30/60/90 day probability
- `learning-velocity-engine.ts` — slow/moderate/fast/exceptional
- `future-potential-engine.ts` — current/future/ceiling/leadership/technical

### Services & Agents
- `src/server/career-os/services/career-os-service.ts`
- `src/server/career-os/agents/career-os-agents.ts`
- `src/server/init.ts` — registers CareerOS agents

### APIs
- `/api/career-os/overview`, `/missions/generate`, `/habits`, `/achievements`, `/progress`
- `/api/goals`, `/api/missions`, `/api/predictions`, `/api/velocity`, `/api/potential`

### UI
- `src/app/(dashboard)/career-os/*` — 8 sections
- `src/components/career-os/career-os-shell.tsx`
- `src/lib/career-os-client.ts`
- `src/lib/constants.ts` — student nav "CareerOS"

### Verification
- `scripts/verify-pr12.ts`, `package.json` — `verify:pr12`

---

## 2. Agents (extend BaseAgent)

| ID | Agent |
|----|-------|
| `career-manager` | CareerManagerAgent |
| `goal-planner` | GoalPlannerAgent |
| `task-planner` | TaskPlannerAgent |
| `habit-coach` | HabitCoachAgent |
| `progress-tracking` | ProgressTrackingAgent |
| `placement-prediction` | PlacementPredictionAgent |
| `learning-velocity` | LearningVelocityAgent |
| `future-potential` | FuturePotentialAgent |

---

## 3. Database Models

`CareerGoal`, `DailyMission`, `WeeklyMission`, `MonthlyMission`, `HabitTracker`, `ProgressSnapshot`, `PlacementPrediction`, `LearningVelocitySnapshot`, `FuturePotentialSnapshot`, `CareerMilestone`

**Apply:** `cd frontend && npm run db:push`

---

## 4. Dashboard Routes

| Route | Section |
|-------|---------|
| `/career-os` | Overview |
| `/career-os/missions` | Daily Missions |
| `/career-os/goals` | Goals |
| `/career-os/habits` | Habits |
| `/career-os/progress` | Progress |
| `/career-os/forecast` | Placement Forecast |
| `/career-os/potential` | Future Potential |
| `/career-os/achievements` | Achievements |

---

## 5. Scoring Formulas

### Placement Prediction (30/60/90 days)
```
probability = placementReadiness×0.55 + velocityBoost + habitBoost + coachBoost + horizonBoost
  − penalties for low interview/coding/professional
improves[] / reduces[] from twin weaknesses and habits
```

### Learning Velocity
```
score = skill×0.22 + coding×0.25 + interview×0.28 + professional×0.15 + consistency×0.10
Tiers: <40 slow | <60 moderate | <80 fast | ≥80 exceptional
```

### Future Potential
```
currentPotential = placement×0.35 + growth×0.25 + velocity×0.20 + consistency×0.20
futurePotential = current × growthMultiplier + projectActivity
growthCeiling, leadershipPotential, technicalPotential derived from twin + panel
```

### Daily Missions
Generated from twin: weaknesses, coding/interview readiness, GitHub score, roadmap pending items, target role — **no hardcoded student lists**.

---

## 6. Testing Guide

1. `npm run db:push`
2. `npm run verify:pr12`
3. `npm run dev` → login as student (`arjun@nexusedge.edu` / `demo1234`)
4. Open `/career-os` → verify overview metrics
5. Click "Generate today's missions" → check daily/weekly/monthly tasks
6. `/career-os/goals` → pick "Backend Engineer"
7. `/career-os/habits` → log a habit, verify streak
8. `/career-os/forecast` → 30/60/90 probabilities with improves/reduces
9. `GET /api/career-os/overview` with auth cookie

---

## 7. Gap Report

| Area | Status | Notes |
|------|--------|-------|
| Digital Twin integration | ✅ | `gatherCareerOSContext` + coach context |
| 8 agents | ✅ | Registered in init |
| Mission engine | ✅ | Twin-gap driven |
| Placement prediction | ✅ | Explainable improves/reduces |
| Habit coach | ✅ | Streaks + reminders |
| Achievements | ✅ | Auto-award on twin milestones |
| LLM mission copy | ⚠️ | Heuristic task titles; can wire Ollama later |
| Push notifications | 🔲 | Future — habit reminders in-app only |
| Virtual Office / Faculty / College | 🔲 | Out of scope (PR-12 stop) |

---

**PR-12 complete. Do not start Virtual Office Simulator, Faculty Platform, or College Platform.**
