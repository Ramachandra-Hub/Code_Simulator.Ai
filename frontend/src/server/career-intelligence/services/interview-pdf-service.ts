import { prisma } from "../../core/db/prisma";
import { getReport } from "./interview-service";
import { getCareerCoachResults } from "./career-coach-service";
import { createTextPdf } from "./pdf-generator";

export async function generateInterviewReportPdf(sessionId: string, userId: string) {
  const report = await getReport(sessionId, userId);
  if (!report || !report.report) throw new Error("Interview report not found");

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      codingSessions: {
        where: { status: "completed" },
        include: { evaluations: { take: 1, orderBy: { createdAt: "desc" } } },
      },
      voiceSession: {
        include: {
          metrics: { orderBy: { turnIndex: "asc" } },
          feedback: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      panelSession: true,
      panelMembers: true,
    },
  });

  const scores = report.scores as {
    overall?: number;
    communication?: number;
    confidence?: number;
    technicalKnowledge?: number;
    relevance?: number;
    fluency?: number;
  } | null;

  const r = report.report as {
    placementReadiness: number;
    resumeScore: number;
    interviewScore: number;
    combinedScore: number;
    strengths: string[];
    improvements: string[];
    roleFit: string | null;
    recommendation: string | null;
    hiringProbability: string | null;
    data?: { answers?: unknown[] };
  };

  const coach = await getCareerCoachResults(userId);
  const codingEvals = session?.codingSessions || [];

  const sections = [
    {
      heading: "Interview Summary",
      lines: [
        `Type: ${report.type}`,
        `Target Role: ${report.targetRole || "—"}`,
        `Placement Readiness: ${r.placementReadiness}/100`,
        `Hiring Probability: ${r.hiringProbability || "—"}`,
        `Role Fit: ${r.roleFit || "—"}`,
      ],
    },
    {
      heading: "Technical Scores",
      lines: [
        `Overall: ${scores?.overall ?? r.interviewScore}/100`,
        `Technical Knowledge: ${scores?.technicalKnowledge ?? "—"}/100`,
        `Relevance: ${scores?.relevance ?? "—"}/100`,
        `Resume Score: ${r.resumeScore}/100`,
        `Combined Score: ${r.combinedScore}/100`,
      ],
    },
    {
      heading: "Coding Scores",
      lines:
        codingEvals.length > 0
          ? codingEvals.map((c) => {
              const e = c.evaluations[0];
              return `Session ${c.id.slice(0, 8)}: ${e?.overallScore ?? c.score ?? "—"}/100 (${e?.verdict || "—"}) TC: ${e?.timeComplexity || "—"}`;
            })
          : ["No linked coding sessions"],
    },
    {
      heading: "Communication & Confidence",
      lines: [
        `Communication: ${scores?.communication ?? "—"}/100`,
        `Confidence: ${scores?.confidence ?? "—"}/100`,
        `Fluency: ${scores?.fluency ?? "—"}/100`,
      ],
    },
    ...(session?.voiceSession
      ? [
          {
            heading: "Voice Communication Analysis",
            lines: [
              `Mode: Voice (${session.voiceSession.voiceProfile})`,
              `Avg Speaking Pace: ${
                session.voiceSession.metrics.length
                  ? Math.round(
                      session.voiceSession.metrics.reduce((s, m) => s + (m.wordsPerMinute || 0), 0) /
                        session.voiceSession.metrics.length
                    )
                  : "—"
              } WPM`,
              `Total Filler Words: ${session.voiceSession.metrics.reduce((s, m) => s + m.fillerCount, 0)}`,
              `Avg Clarity: ${
                session.voiceSession.metrics.length
                  ? Math.round(
                      session.voiceSession.metrics.reduce((s, m) => s + (m.clarityScore || 0), 0) /
                        session.voiceSession.metrics.length
                    )
                  : "—"
              }/100`,
              `Voice Confidence: ${
                session.voiceSession.metrics.length
                  ? Math.round(
                      session.voiceSession.metrics.reduce((s, m) => s + (m.confidenceEstimate || 0), 0) /
                        session.voiceSession.metrics.length
                    )
                  : "—"
              }/100`,
            ],
          },
          {
            heading: "Voice Recommendations",
            lines: session.voiceSession.feedback[0]?.recommendations?.length
              ? session.voiceSession.feedback[0].recommendations.map((r) => `• ${r}`)
              : ["Practice reducing filler words and structuring spoken answers"],
          },
        ]
      : []),
    ...(session?.type === "panel" && session.panelSession?.moderatorReport
      ? (() => {
          const pr = session.panelSession.moderatorReport as {
            summary?: string;
            overallRecommendation?: string;
            strengths?: string[];
            weaknesses?: string[];
            panelEvaluations?: Array<{
              name: string;
              role: string;
              technicalScore: number;
              communicationScore: number;
              confidenceScore: number;
              hiringRecommendation: string;
              feedback: string;
            }>;
            executiveCommunication?: number;
            stakeholderManagement?: number;
            pressureHandling?: number;
            panelReadiness?: number;
          };
          return [
            {
              heading: "Panel Interview Summary",
              lines: [
                pr.summary || "Panel interview completed",
                `Overall Recommendation: ${pr.overallRecommendation || "—"}`,
                `Panel Readiness: ${pr.panelReadiness ?? "—"}/100`,
                `Executive Communication: ${pr.executiveCommunication ?? "—"}/100`,
                `Stakeholder Management: ${pr.stakeholderManagement ?? "—"}/100`,
                `Pressure Handling: ${pr.pressureHandling ?? "—"}/100`,
              ],
            },
            {
              heading: "Panel Member Feedback",
              lines: (pr.panelEvaluations || []).map(
                (e) =>
                  `${e.name} (${e.role}): Tech ${e.technicalScore} | Comm ${e.communicationScore} | Conf ${e.confidenceScore} → ${e.hiringRecommendation}. ${e.feedback}`
              ),
            },
            {
              heading: "Panel Hiring Recommendations",
              lines: (pr.panelEvaluations || []).map((e) => `${e.name}: ${e.hiringRecommendation}`),
            },
            {
              heading: "Panel Strengths",
              lines: (pr.strengths || []).length ? (pr.strengths || []).map((s) => `+ ${s}`) : ["See panel feedback"],
            },
            {
              heading: "Panel Weaknesses",
              lines: (pr.weaknesses || []).length ? (pr.weaknesses || []).map((s) => `- ${s}`) : ["See panel feedback"],
            },
          ];
        })()
      : []),
    {
      heading: "Strengths",
      lines: r.strengths.length ? r.strengths.map((s) => `+ ${s}`) : ["None recorded"],
    },
    {
      heading: "Weaknesses",
      lines: r.improvements.length ? r.improvements.map((s) => `- ${s}`) : ["None recorded"],
    },
    {
      heading: "AI Recommendation",
      lines: [r.recommendation || "Complete more mock interviews for personalized guidance."],
    },
    {
      heading: "Career Roadmap",
      lines: coach.roadmap
        ? [
            coach.roadmap.title,
            ...coach.roadmap.items.slice(0, 8).map((item, i) => `${i + 1}. [${item.type}] ${item.title}`),
          ]
        : ["Run Career Coach to generate a roadmap"],
    },
    {
      heading: "Placement Readiness",
      lines: [
        `Score: ${coach.placementReadiness?.overallScore ?? r.placementReadiness}/100`,
        coach.placementReadiness?.skillGaps
          ? `Skill Gaps: ${JSON.stringify(coach.placementReadiness.skillGaps)}`
          : "",
      ].filter(Boolean),
    },
  ];

  const title = `NexusEdge Interview Report — ${report.targetRole || "Placement"}`;
  const buffer = createTextPdf(title, sections);
  const content = new Uint8Array(buffer);
  const filename = `interview-report-${sessionId.slice(0, 8)}.pdf`;

  const stored = await prisma.interviewReportPdf.upsert({
    where: { sessionId },
    create: {
      userId,
      sessionId,
      filename,
      content,
      size: content.length,
      metadata: {
        placementReadiness: r.placementReadiness,
        interviewScore: r.interviewScore,
        generatedAt: new Date().toISOString(),
      } as object,
    },
    update: {
      filename,
      content,
      size: content.length,
      metadata: {
        placementReadiness: r.placementReadiness,
        interviewScore: r.interviewScore,
        generatedAt: new Date().toISOString(),
      } as object,
    },
  });

  return { buffer, filename, storedId: stored.id, size: buffer.length };
}

export async function getStoredInterviewPdf(sessionId: string, userId: string) {
  const pdf = await prisma.interviewReportPdf.findFirst({
    where: { sessionId, userId },
  });
  return pdf;
}
