export type MeetingType = "sprint_planning" | "retrospective" | "client" | "design_review";

export interface MeetingAgenda {
  type: MeetingType;
  title: string;
  topics: string[];
  voiceEnabled: boolean;
  facilitator: string;
}

const MEETING_TEMPLATES: Record<MeetingType, Omit<MeetingAgenda, "type">> = {
  sprint_planning: {
    title: "Sprint Planning — Q2 Cycle 3",
    topics: ["Review velocity from last sprint", "Prioritize backlog items", "Capacity planning", "Definition of done"],
    voiceEnabled: true,
    facilitator: "engineering-manager",
  },
  retrospective: {
    title: "Sprint Retrospective",
    topics: ["What went well", "What didn't go well", "Action items for next sprint"],
    voiceEnabled: true,
    facilitator: "team-lead",
  },
  client: {
    title: "Client Sync — NexusEdge Pilot",
    topics: ["Demo progress", "Timeline alignment", "Open questions", "Next milestones"],
    voiceEnabled: true,
    facilitator: "client",
  },
  design_review: {
    title: "Architecture Design Review",
    topics: ["Problem statement", "Proposed design", "Trade-offs", "Rollout plan"],
    voiceEnabled: true,
    facilitator: "engineering-director",
  },
};

export function generateMeeting(type: MeetingType): MeetingAgenda {
  const template = MEETING_TEMPLATES[type];
  return { type, ...template };
}

export function defaultMeetingsForSession(): MeetingAgenda[] {
  return (["sprint_planning", "design_review", "client", "retrospective"] as MeetingType[]).map(generateMeeting);
}

export function scoreMeetingParticipation(transcript?: string): Record<string, number> {
  const text = (transcript || "").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const participation = Math.min(100, 40 + Math.floor(words / 3));
  const clarity = /\b(because|therefore|plan|next|blocker)\b/i.test(text) ? 75 : 55;
  return { participation, clarity, engagement: Math.round((participation + clarity) / 2) };
}
