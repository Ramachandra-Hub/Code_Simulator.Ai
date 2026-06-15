# NexusEdge Product Restructure Sprint

**Goal:** Convert NexusEdge from a collection of tools into a single **Career Operating System** with four student pillars and merged workspaces.

**Status:** Implemented (navigation, hubs, home, workplace dashboard, interview room layout, redirects).

---

## 1. Navigation Map

### Primary (sidebar) — 4 items only

| Pillar | Route | Sub-nav (contextual) |
|--------|-------|----------------------|
| **Home** | `/dashboard/student` | — |
| **Career** | `/career-os` | Coach · Resume · ATS · Digital Twin · Reports |
| **Interviews** | `/interview` | Mock · Coding · Voice · Panel · History |
| **Workplace AI** | `/office` | Single dashboard (no sub-tabs in nav) |

### Hidden / redirected (mock learning & legacy)

| Old route | New destination |
|-----------|-----------------|
| `/learn`, `/dsa`, `/assessments`, `/coding` | `/dashboard/student` |
| `/resume`, `/ats`, `/twin` | `/career-os?tab=*` |
| `/portfolio` | `/career-os?tab=resume` |
| `/placements` | `/career-os?tab=reports` |
| `/office/work`, `/standups`, `/tasks`, `/performance`, `/promotion` | `/office` |
| `/career-os/missions`, `/goals`, `/habits`, etc. | Merged into Career tabs |

Deep links preserved: `/interview/voice`, `/interview/panel`, `/interview/coding`, `/office/meetings` (voice join).

---

## 2. Information Architecture

```
Career OS
├── Home (/dashboard/student)
│   ├── GET /api/career-os/overview
│   └── GET /api/office/overview
├── Career (/career-os)
│   ├── tab=coach    → Career Coach (missions, forecast, twin scores)
│   ├── tab=resume   → AI Resume Builder + list (DB)
│   ├── tab=ats      → ATS analyze + report (DB + agent)
│   ├── tab=twin     → Digital Twin dashboard (DB)
│   └── tab=reports  → Interview history + placement reports (DB)
├── Interviews (/interview)
│   ├── tab=mock     → Voice/text mock (→ /interview/voice)
│   ├── tab=coding   → Coding round (→ /interview/coding)
│   ├── tab=voice    → Voice-first mock
│   ├── tab=panel    → Panel room (→ /interview/panel)
│   └── tab=history  → Past sessions (DB)
└── Workplace AI (/office)
    ├── Today's tasks (PATCH /api/office/tasks/:id)
    ├── Standups (POST /api/office/standups)
    ├── Meetings (POST /api/office/meetings)
    ├── Performance (POST /api/office/performance)
    └── Promotion (POST /api/office/promotion)
```

### Dynamic question generation (no fixed flows)

Questions are produced by the interview workflow using:

- Resume content (`resumeId` on session create)
- Target role & company (from resume / session context)
- Digital Twin signals (`twin-service`, career coach)
- Previous answers (`/api/interviews/:id/answer` graph state)

**Backend:** `interview-graph.ts`, `question-generation` agent, `POST /api/interviews`, voice/panel clients.

---

## 3. Component Migration Plan

| Phase | Component / file | Action |
|-------|------------------|--------|
| P0 | `student-nav.ts` | 4 pillars, mock children removed |
| P0 | `career-hub.tsx` | New tabbed Career workspace |
| P0 | `career-coach-panel.tsx` | Extracted from career-os page |
| P0 | `career-os-shell.tsx` | Header only; tabs inside hub |
| P0 | `interview-hub.tsx` | 5 interview modes |
| P0 | `interview-type-select.tsx` | `mode` prop: mock/coding/voice/panel |
| P0 | `workplace-dashboard.tsx` | Unified virtual company |
| P0 | `office-shell.tsx` | Header only |
| P0 | `dashboard/student/page.tsx` | Real APIs; mock-data removed |
| P0 | `ai-meeting-room.tsx` | Side-by-side `transcriptPanel` slot |
| P0 | `voice-interview-session.tsx` | Zoom layout + transcript |
| P0 | `panel-interview-session.tsx` | Transcript in meeting room |
| P1 | `interview-session.tsx` | Optional: full meeting room for coding-only path |
| P1 | `tab-panels.tsx` | Deprecate mock panels not wired to DB |
| P2 | Delete or archive | `mock-data.ts` consumers in faculty/admin views |

### Global button rule

Every visible control must **Read DB**, **Write DB**, **Trigger Agent**, or **Trigger Workflow**. Mock-only buttons on Home and Learning were removed or redirected.

---

## 4. UI Wireframe Descriptions

### Home (`/dashboard/student`)

- **Top:** Welcome + onboarding checklist (beta).
- **Row 1:** Four stat cards (placement readiness, potentials, sprint %) — each links to Career or Workplace.
- **Row 2 left:** Today's career missions from `career-os/overview`; generate button calls agent workflow.
- **Row 2 right:** Quick Start — Mock Interview, Resume, Workplace AI.
- **Row 3:** Virtual company strip — company name, role badge, today's tasks from `office/overview`.

### Career (`/career-os`)

- **Header:** "Career Operating System" gradient band.
- **Horizontal tabs:** Coach | Resume | ATS | Digital Twin | Reports.
- **Coach tab:** 4 metric cards, action plan card, placement forecast bars.
- **Resume tab:** Full-width builder + saved resumes list.
- **ATS tab:** Upload/analyze stack + report panel.
- **Twin tab:** Intelligence profile overview.
- **Reports tab:** Interview history table with scores and report links.

### Interviews (`/interview`)

- **Header:** Interview Room title + dynamic-generation subtitle.
- **Tabs:** Mock | Coding | Voice | Panel | History.
- **Start flows:** Resume gate card → type grid or panel card → routes to live session pages.

### Interview Room (live: `/interview/voice`, `/interview/panel`)

- **Layout:** 60/40 grid on large screens.
- **Left — Zoom-style room:**
  - Dark meeting chrome, live badge, question progress bar.
  - Grid of participant tiles (interviewer(s) + candidate).
  - Active speaker: purple glow (interviewer) or green glow (candidate).
  - Name + role label under each tile; voice badges (Speaking / Listening / Your turn).
  - Current question caption bar; speech input + submit when candidate's turn.
- **Right — Transcript panel:**
  - Scrollable Q/A/feedback log with timestamps.

### Workplace AI (`/office`)

- **Header:** Virtual Company + role/culture line.
- **Hero card:** Company name, sprint name, % progress, days left.
- **Two-column grid:**
  - Today's tasks (complete → PATCH) + manager messages (from overview).
  - Standup form (POST) + meeting scheduler (POST).
- **Bottom row:**
  - Performance review dimensions + Run review (agent).
  - Promotion readiness score + Assess (agent).

---

## 5. Files Touched (this sprint)

- `src/lib/student-nav.ts`
- `src/lib/routes.ts`
- `src/components/career/career-hub.tsx`
- `src/components/career/career-coach-panel.tsx`
- `src/components/career-os/career-os-shell.tsx`
- `src/components/interview/interview-hub.tsx`
- `src/components/interview/interview-type-select.tsx`
- `src/components/interview/ai-meeting-room.tsx`
- `src/components/interview/voice-interview-session.tsx`
- `src/components/interview/panel-interview-session.tsx`
- `src/components/virtual-office/workplace-dashboard.tsx`
- `src/components/virtual-office/office-shell.tsx`
- `src/app/(dashboard)/career-os/page.tsx`
- `src/app/(dashboard)/interview/page.tsx`
- `src/app/(dashboard)/office/page.tsx`
- `src/app/(dashboard)/dashboard/student/page.tsx`
- `next.config.ts` (redirects)

---

## 6. Next steps (P1)

1. Wire `interview-session.tsx` coding path to meeting room layout.
2. Pass `targetCompany` explicitly on interview create from resume UI.
3. Surface manager messages in `office/overview` API if not populated.
4. Remove remaining `mock-data` imports in non-student roles.
5. Run performance audit script after deploy.
