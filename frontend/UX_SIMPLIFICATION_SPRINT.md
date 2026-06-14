# UX Simplification Sprint — NexusEdge

**Date:** June 2026  
**Scope:** Student navigation, interview experience, performance audit, guided journey  
**Status:** Sprint complete — implementation landed; performance fixes phased below

---

## Executive Summary

Reduced student cognitive load from **19 sidebar items** to **5 primary pillars** with contextual sub-navigation. Replaced chatbot-style interview UI with a **Zoom-style AI Meeting Room**. Added a **guided placement journey** on Home and Interviews. Performance audit identified **5 high-severity bottlenecks** blocking the &lt;3s page load and &lt;5s interview response targets.

---

## Part 1 — Navigation Redesign

### New Navigation Map

```
STUDENT SIDEBAR (5 items)
│
├── Home                    → /dashboard/student
│     └── Journey widget, stats, next-step CTA
│
├── Learning                → /learn
│     ├── Courses              → /learn?tab=courses
│     ├── Learning Paths       → /learn?tab=paths
│     ├── Coding Lab           → /coding
│     ├── DSA Practice         → /dsa
│     └── Assessments          → /assessments
│
├── Career                  → /career-os
│     ├── Career Coach         → /career-os
│     ├── Goals & Missions     → /career-os/goals
│     ├── Resume Builder       → /resume
│     ├── ATS Analyzer         → /ats
│     ├── Intelligence Profile → /twin
│     ├── Portfolio            → /portfolio
│     └── Placements           → /placements
│
├── Interviews              → /interview
│     ├── Start Interview      → /interview?tab=start
│     └── Past Sessions        → /interview?tab=history
│
└── Workplace AI           → /office
      ├── Office Overview      → /office
      ├── Today's Work         → /office/work
      ├── Meetings             → /office/meetings
      └── Performance          → /office/performance
```

### Removed from Primary Nav (still reachable)

| Former Item | New Access |
|-------------|------------|
| Coding Lab, DSA, Assessments | Learning → sub-nav |
| Resume Builder, ATS | Career → sub-nav |
| Intelligence Profile, Professional Intel | Career → Intelligence Profile |
| CareerOS, AI Coach | Career → Career Coach (merged) |
| Virtual Office | Workplace AI |
| Portfolio, Projects | Career → Portfolio |
| Placements | Career → Placements |
| Analytics, Leaderboard | Home dashboard widgets / Profile |
| Profile | Header user menu (`/profile`) |

### Files Changed

- `src/lib/student-nav.ts` — 5-pillar nav + section matcher
- `src/lib/constants.ts` — student nav reduced to `STUDENT_PRIMARY_NAV`
- `src/components/dashboard/sidebar.tsx` — expandable contextual sub-nav
- `src/app/(dashboard)/learn/page.tsx` — removed duplicate Overview tab

---

## Part 2 — Interview Experience: AI Meeting Room

### Before vs After

| Before | After |
|--------|-------|
| Chat bubbles + textarea | Zoom-style video grid |
| All panelists implicit | Named tiles per interviewer |
| No turn indication | Active speaker glow + Speaking/Listening badges |
| Mic always available | Mic only on "Your turn" |
| Generic "AI" voice | Human names + role labels |

### AI Meeting Room Layout (Mockup)

```
┌─────────────────────────────────────────────────────────────────┐
│ Panel Interview Room          Interviewer speaking    Q 2/8     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  [EW]    │  │  [SC]    │  │  [RP]    │  │  [YOU]   │      │
│  │ Emily W. │  │ Sarah C. │  │ Raj P.   │  │  You     │      │
│  │ HR BP    │  │ Tech Lead│  │ Eng Mgr  │  │ Candidate│      │
│  │ Speaking │  │ Listening│  │ Listening│  │ Your turn│      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│       ▲ active glow ring (violet)                               │
├─────────────────────────────────────────────────────────────────┤
│ CURRENT QUESTION                                                │
│ "Please introduce yourself and why you're interested in this    │
│  role?"                                                         │
├─────────────────────────────────────────────────────────────────┤
│ [Your spoken answer preview]                                    │
│ [ Start Speaking ]  [ Submit answer ]   ← only when your turn │
├─────────────────────────────────────────────────────────────────┤
│        mic        user         bottom control bar               │
└─────────────────────────────────────────────────────────────────┘
```

### Turn Flow (Human-like)

1. **AI Speaking** — one panelist tile glows; candidate tile shows "Listening"
2. **Natural pause** — 800ms between moderator intro and question
3. **Your Turn** — candidate tile glows green; mic controls unlock
4. **Processing** — active panelist shows "Thinking"; candidate waits
5. **Next speaker** — different panelist tile activates (one question only)

### Files Changed

- `src/components/interview/ai-meeting-room.tsx` — new meeting room component
- `src/components/interview/panel-interview-session.tsx` — integrated meeting room
- `src/components/interview/voice-interview-session.tsx` — single-interviewer meeting room
- `src/lib/speech-sanitize.ts` — strips markdown symbols before TTS

---

## Part 3 — Performance Audit

**Full data:** `UX_PERFORMANCE_AUDIT.json`  
**Script:** `scripts/audit-ux-performance.ts`

### Targets vs Current

| Metric | Target | Current (dev) | Status |
|--------|--------|---------------|--------|
| Page load (dashboard) | &lt;3s | ~3.5–5s (health API 4581ms) | FAIL |
| Interview submit perceived wait | &lt;5s | 15–45s (Ollama blocking) | FAIL |
| Panel start | &lt;5s | 3.5–4.8s | BORDERLINE |
| Auth/me | &lt;500ms | 350–2300ms | VARIABLE |

### Top Bottlenecks

| Priority | Bottleneck | Impact | Fix |
|----------|-----------|--------|-----|
| **P0** | submitAnswer / panel turn blocks on full Ollama LLM | 15–45s frozen UI | Optimistic response + streaming + fallback questions |
| **P0** | Cold API health/status on every page | +3–5s first paint | Cache 60s; defer status banner |
| **P1** | Monaco editor in bundle | Large JS on unrelated routes | Dynamic import only on /coding |
| **P1** | Deep Prisma includes per turn | 200–800ms DB | Slim selects; turn pagination |
| **P1** | Dashboard parallel API fan-out | auth + onboarding + beta perf | SWR cache; stagger non-critical |
| **P2** | Redis unavailable | Repeated cold DB hits | Enable Redis in dev/prod |
| **P2** | framer-motion in sidebar | Extra client JS | CSS transitions for sub-nav |
| **P2** | Strict mode double init | Duplicate panel starts | initRef guards (panel done) |

---

## Part 4 — Student Journey

### Guided Workflow

```
Learning → Assessment → Resume → Interview → Career Coach → Workplace AI
```

### Implementation

- `src/components/dashboard/student-journey.tsx` — visual stepper + Continue CTA
- Wired on **Home** (`/dashboard/student`) and **Interviews** (`/interview`)
- Each step links directly to the next action

---

## Implementation Plan (Phased)

### Phase 1 — Done (This Sprint)

- [x] 5-pillar student navigation
- [x] Contextual sub-navigation in sidebar
- [x] AI Meeting Room component
- [x] Panel + voice interview integration
- [x] Student journey widget
- [x] Remove Learn duplicate tab
- [x] Speech sanitization (no hash/asterisk in TTS)
- [x] Performance audit script + JSON report

### Phase 2 — Performance (Next Sprint)

- [ ] Optimistic interview submit (return in &lt;500ms, evaluate async)
- [ ] Panel question fallbacks without LLM when Ollama &gt;3s
- [ ] API response streaming for next question text
- [ ] Defer SystemStatusBanner + FeedbackWidget until after paint
- [ ] SWR cache for /api/auth/me and /api/user/onboarding
- [ ] Slim Prisma selects on panel turn
- [ ] @next/bundle-analyzer in CI

### Phase 3 — Polish (Following Sprint)

- [ ] Journey progress from real backend signals
- [ ] Profile/Analytics/Leaderboard in header dropdown only
- [ ] Meeting room avatar images per panelist
- [ ] Pre-warm browser voices on interview entry
- [ ] Mobile-responsive meeting grid

### Phase 4 — Production Hardening

- [ ] Redis session cache for interview state
- [ ] XTTS/Whisper health gate with graceful banner
- [ ] Protect /career-os and /office in middleware
- [ ] E2E test: full journey Learning → Interview → Report

---

## How to Verify

1. **Navigation:** Log in as student — sidebar shows 5 items; click Learning — sub-nav expands
2. **Meeting Room:** Start panel interview — see video grid, one speaker at a time
3. **Journey:** Home dashboard shows stepper with Continue button
4. **Performance:** Run `npx tsx scripts/audit-ux-performance.ts`
