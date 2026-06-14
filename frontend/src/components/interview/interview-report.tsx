"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api-client";
import { RatingFeedback } from "@/components/beta/feedback-widget";
import { INTERVIEW_TYPES } from "@/lib/interview-types";
import { ROUTES } from "@/lib/routes";
import { useToast } from "@/hooks/use-toast";

interface ServerReport {
  id: string;
  type: string;
  targetRole: string | null;
  scores: {
    overall: number;
    communication: number;
    confidence: number;
    relevance: number;
    technicalKnowledge: number;
    fluency: number;
  } | null;
  report: {
    placementReadiness: number;
    resumeScore: number;
    interviewScore: number;
    combinedScore: number;
    strengths: string[];
    improvements: string[];
    roleFit: string | null;
    recommendation: string | null;
    hiringProbability: string | null;
  } | null;
  transcript: Array<{ role: string; text: string }>;
}

interface ReportPayload {
  data?: {
    answers: Array<{ question: string; answer: string; scores: { overall: number }; feedback: string; answerType: string }>;
  };
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="text-center">
      <p className={`text-4xl font-bold ${color}`}>{score}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export function InterviewReport() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<ServerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      setError("No interview ID provided");
      setLoading(false);
      return;
    }
    apiFetch<ServerReport>(`/interviews/${id}/report`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data || !data.report) {
    return (
      <div className="text-center p-12 space-y-4">
        <p className="text-muted-foreground">{error || "Report not yet generated. Complete an interview first."}</p>
        <Button onClick={() => router.push(ROUTES.interviewStart)}>Start Mock Interview</Button>
      </div>
    );
  }

  const { report, scores, type, targetRole } = data;
  const typeLabel = INTERVIEW_TYPES.find((t) => t.id === type)?.label || type;
  const reportData = (report as unknown as ReportPayload).data;
  const answers = reportData?.answers || [];

  const probColor =
    report.hiringProbability === "Very High" ? "success"
      : report.hiringProbability === "High" ? "info"
        : report.hiringProbability === "Moderate" ? "warning"
          : "destructive";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 mb-2">
          <Award className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Placement Readiness Report</h2>
        <p className="text-muted-foreground">{targetRole || "Target role"} · {typeLabel}</p>
      </div>

      <Card className="glass-card border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <ScoreRing score={report.placementReadiness} label="Placement Readiness" />
            <ScoreRing score={report.resumeScore} label="Resume Score" />
            <ScoreRing score={report.interviewScore} label="Interview Score" />
            <ScoreRing score={report.combinedScore} label="Combined Score" />
          </div>
          <div className="mt-6 text-center">
            <Badge variant={probColor as "success" | "info" | "warning" | "destructive"} className="text-sm px-4 py-1">
              Hiring Probability: {report.hiringProbability || "—"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.strengths.map((s) => (
              <p key={s} className="text-sm flex gap-2">
                <span className="text-emerald-500">✓</span> {s}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.improvements.map((s) => (
              <p key={s} className="text-sm flex gap-2">
                <span className="text-amber-500">→</span> {s}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      {scores && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Skill Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              ["Communication", scores.communication],
              ["Confidence", scores.confidence],
              ["Technical Knowledge", scores.technicalKnowledge],
              ["Relevance", scores.relevance],
              ["Fluency", scores.fluency],
            ] as const).map(([label, val]) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-medium">{val}%</span>
                </div>
                <Progress value={val} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> AI Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{report.recommendation}</p>
          <p className="text-sm text-muted-foreground">
            <strong>Role Fit:</strong> {report.roleFit}
          </p>
        </CardContent>
      </Card>

      {data.transcript && data.transcript.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Full Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {data.transcript.map((t, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${t.role === "ai" || t.role === "interviewer" ? "bg-muted/50" : "bg-violet-500/10"}`}
              >
                <p className="text-xs font-medium opacity-60 mb-1">
                  {t.role === "student" ? "You" : "AI Interviewer"}
                </p>
                <p className="leading-relaxed whitespace-pre-wrap">{t.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {answers.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Question-by-Question Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((a, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-medium">Q{i + 1}: {a.question}</p>
                  <Badge variant={a.scores.overall >= 70 ? "success" : "warning"}>
                    {a.scores.overall}/100
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.answer}</p>
                <p className="text-xs text-primary">{a.feedback}</p>
                {a.answerType && (
                  <Badge variant="outline" className="text-[10px]">{a.answerType.replace(/_/g, " ")}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RatingFeedback
        type="rate_interview"
        title="How was your mock interview experience?"
        context={{ interviewId: searchParams.get("id"), type, targetRole }}
      />

      <div className="flex flex-wrap gap-3 justify-center pb-8">
        <Button variant="outline" onClick={() => router.push(ROUTES.interviewStart)}>
          <RotateCcw className="mr-2 h-4 w-4" /> Practice Again
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const id = searchParams.get("id");
            if (!id) return;
            try {
              const res = await fetch(`/api/interviews/${id}/pdf`, { credentials: "include" });
              if (!res.ok) throw new Error("PDF failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `interview-report-${id.slice(0, 8)}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
              toast({ title: "Report downloaded", variant: "success" });
            } catch {
              toast({ title: "Download failed", description: "Complete interview and try again.", variant: "error" });
            }
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Download Report
        </Button>
        <Button variant="gradient" onClick={() => router.push(ROUTES.twin)}>
          View Intelligence Profile
        </Button>
      </div>
    </div>
  );
}
