import { apiFetch } from "./api-client";

export interface PanelMemberInfo {
  id: string;
  name: string;
  role: string;
  persona: string;
  voiceId?: string | null;
  personality?: string | null;
  hiringRecommendation?: string | null;
  technicalScore?: number;
  communicationScore?: number;
  confidenceScore?: number;
  feedback?: string;
}

export interface PanelStartResult {
  panelSessionId: string;
  interviewSessionId: string;
  mode: string;
  targetRole: string;
  moderatorMessage: string;
  firstQuestion: string;
  activeSpeaker: { id: string; name: string; role: string; voiceId?: string | null };
  panel: PanelMemberInfo[];
  progress: { turnCount: number; maxTurns: number };
  tts: { audioBase64: string | null; source: string; useBrowserFallback: boolean; voiceId: string; speaker: string } | null;
  moderatorTts: { audioBase64: string | null; source: string; useBrowserFallback: boolean; voiceId: string; speaker: string } | null;
  sttAvailable: boolean;
}

export async function startPanelInterview(input?: { resumeId?: string; mode?: "voice" | "text" }) {
  return apiFetch<PanelStartResult>("/panel/start", {
    method: "POST",
    body: JSON.stringify(input || { mode: "voice" }),
  });
}

export async function submitPanelTranscript(input: {
  panelSessionId: string;
  transcript?: string;
  audioBase64?: string;
  audioDurationMs?: number;
}) {
  return apiFetch<{
    phase: string;
    nextQuestion: string | null;
    activeSpeaker: { id: string; name: string; role: string; voiceId?: string | null };
    progress: { turnCount: number; maxTurns: number };
    interrupted: boolean;
    panelistFeedback: { feedback: string; hiringRecommendation: string };
    tts: { audioBase64: string | null; useBrowserFallback: boolean; voiceId: string; speaker: string } | null;
  }>("/panel/transcript", { method: "POST", body: JSON.stringify(input) });
}

export async function submitPanelAnswer(panelSessionId: string, answer: string) {
  return apiFetch("/panel/answer", {
    method: "POST",
    body: JSON.stringify({ panelSessionId, answer }),
  });
}

export async function getPanelSession(panelSessionId: string) {
  return apiFetch(`/panel/${panelSessionId}`);
}
