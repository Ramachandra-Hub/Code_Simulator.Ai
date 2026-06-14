# PR-9 — Panel Interview Intelligence Report

**Date:** June 11, 2026  
**Status:** COMPLETE  
**Verification:** `npm run verify:pr9` → **29/29**  
**Build:** `npm run build` → **PASS**

---

## Summary

PR-9 delivers **MNC-style panel interviews** with 5 distinct personas, a **PanelModeratorAgent** controlling turn order/interruptions/flow, **voice support** (PR-7 infrastructure), per-panelist evaluation, Digital Twin updates, and enriched PDF reports.

---

## 1. Panel Composition

| Persona | Name | Role | Voice ID |
|---------|------|------|----------|
| `hr` | Emily Watson | HR Business Partner | `panel_hr_female` |
| `technical_lead` | Sarah Chen | Technical Lead | `panel_tech_lead` |
| `engineering_manager` | Raj Patel | Engineering Manager | `panel_em_male` |
| `director` | Priya Sharma | Director of Engineering | `panel_director_female` |
| `recruiter` | Marcus Johnson | Senior Technical Recruiter | `panel_recruiter_male` |

Each panelist has: **role**, **expertise**, **personality**, **questioning style**, **unique voice profile**.

**Config:** `src/server/career-intelligence/panel/panel-personas.ts`

---

## 2. PanelModeratorAgent

**File:** `src/server/career-intelligence/agents/panel-moderator-agent.ts`

Controls:
- **Turn order** — longest-silent rotation + expertise-based routing
- **Interruptions** — weak/vague answers trigger redirect (~45% chance)
- **Speaker selection** — tech/leadership/culture keyword routing
- **Interview flow** — HR opens, Director closes, follow-ups, challenges, cross-questions

Actions: `question` | `follow_up` | `interrupt` | `challenge` | `cross_question`

Registered in `register-all.ts` as `panel-moderator`.

---

## 3. Dynamic Questioning

**File:** `src/server/career-intelligence/workflows/panel-graph.ts`

- Uses persona-specific agents (`hr-interview`, `technical-interview`, `behavioral-interview`)
- LLM-generated questions with persona prompt context
- References recent transcript for cross-questioning
- Fallback question bank per persona

---

## 4. Voice Architecture (PR-7 reuse)

```
Student mic → Whisper STT (or browser) → submitPanelAnswer
       ↓
PanelModeratorAgent → Persona question generation
       ↓
TTSAdapter (per-panelist voiceId) → XTTS or browser Speech Synthesis
```

| Component | Path |
|-----------|------|
| STT | `whisper-adapter.ts` + `/api/voice/stt` |
| TTS | `tts-adapter.ts` — `voiceId` per panelist |
| Browser voices | `src/lib/panel-voices.ts` — pitch/rate per persona |
| Voice transcript API | `POST /api/panel/transcript` |

---

## 5. APIs

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/panel/start` | Create panel session + 5 members + opening question |
| `POST` | `/api/panel/answer` | Text answer → panel turn |
| `POST` | `/api/panel/transcript` | Voice answer (STT → turn) |
| `POST` | `/api/panel/tts` | Synthesize speech for any panelist voice |
| `GET` | `/api/panel/[id]` | Session state, roster, scores, transcript |

---

## 6. Database Changes

### `PanelInterviewSession` (new)

`interviewSessionId`, `userId`, `status`, `mode`, `currentSpeakerId`, `turnCount`, `maxTurns`, `moderatorReport`, `metadata`

### `PanelMember` (extended)

`personality`, `expertise[]`, `questioningStyle`, `evaluation` (Json), `hiringRecommendation`, `lastSpokeAt`

### `StudentIntelligenceProfile` (new fields)

| Field | Purpose |
|-------|---------|
| `executiveCommunication` | Director/executive-style communication |
| `stakeholderManagement` | EM/Director stakeholder signals |
| `pressureHandling` | Interruption/challenge composure |
| `panelReadiness` | Overall panel interview readiness |

**Applied:** `npx prisma db push`

---

## 7. Evaluation

Per panelist (after each answer):
- `technicalScore`
- `communicationScore`
- `confidenceScore`
- `hiringRecommendation` — `strong_hire` | `hire` | `hold` | `no_hire`
- `feedback`

**Moderator final report** (`buildModeratorReport`):
- Summary, overall recommendation
- Aggregated strengths/weaknesses
- All panelist evaluations
- Twin metrics (executive communication, etc.)

**Files:** `panel-evaluation-evaluator.ts`, `panel-interview-service.ts`

---

## 8. Digital Twin

**Signal type:** `panel`  
**Event:** `panel.completed`

Updates: `executiveCommunication`, `stakeholderManagement`, `pressureHandling`, `panelReadiness`, `communicationScore`, `confidenceScore`, `interviewReadiness`, `placementScore` (10% panel weight)

---

## 9. PDF Report

**File:** `interview-pdf-service.ts`

New sections for `type === "panel"`:
- Panel Interview Summary
- Panel Member Feedback (per-persona scores)
- Panel Hiring Recommendations
- Panel Strengths / Weaknesses

---

## 10. UI

| Path | Component |
|------|-----------|
| `/interview/panel` | `panel-interview-session.tsx` |

**Displays:**
- Active speaker highlight
- Panel roster (5 members)
- Live transcript with speaker names
- Per-panelist scores + hiring badges
- Voice waveform + mic (default mode)
- Progress bar (8 turns)

**Hub:** Mock Interview → **Panel Interview** card (PR-9 badge) — removed from Coming Soon.

---

## 11. Key Files

```
src/server/career-intelligence/panel/panel-personas.ts
src/server/career-intelligence/agents/panel-moderator-agent.ts
src/server/career-intelligence/workflows/panel-graph.ts
src/server/career-intelligence/services/panel-interview-service.ts
src/server/career-intelligence/evaluators/panel-evaluation-evaluator.ts
src/components/interview/panel-interview-session.tsx
src/lib/panel-client.ts
src/lib/panel-voices.ts
scripts/verify-pr9.ts
```

---

## 12. Testing Guide

### Automated

```bash
cd frontend
npm run verify:pr9    # 29/29
npm run build
```

### Manual

1. Login: `arjun@nexusedge.edu` / `demo1234`
2. Ensure resume exists
3. **Mock Interview** → **Panel Interview** → Start
4. Allow microphone access
5. Answer 8 panel questions (tap mic to record)
6. Observe:
   - Different speakers in transcript
   - Active speaker badge on roster
   - Scores updating per panelist
   - Possible interruption toast
7. On complete → redirected to report
8. Download PDF — verify Panel sections
9. Check `/twin` for panel readiness metrics

### API smoke test

```bash
# Start (with auth cookie)
curl -X POST http://localhost:3000/api/panel/start \
  -H "Cookie: nexusedge_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"text"}'

# Answer
curl -X POST http://localhost:3000/api/panel/answer \
  -H "Cookie: nexusedge_token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"panelSessionId":"<id>","answer":"I led a team of 5 engineers..."}'
```

---

## 13. Stop Condition

PR-9 complete. No Recruiter Platform or additional interview modes started.
