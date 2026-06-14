"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Brain,
  Code2,
  FileText,
  Github,
  GraduationCap,
  Linkedin,
  Loader2,
  Mic,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { apiFetch } from "@/lib/api-client";
import { ROUTES } from "@/lib/routes";

interface TwinData {
  profile: {
    placementScore: number;
    interviewReadiness: number;
    codingReadiness: number;
    algorithmSkills: number;
    problemSolving: number;
    optimizationSkills: number;
    communicationScore: number;
    technicalScore: number;
    confidenceScore: number;
    strengths: string[];
    weaknesses: string[];
    updatedAt: string;
  };
  metrics: {
    algorithmSkills: number;
    problemSolving: number;
    optimizationSkills: number;
    communication: number;
    technical: number;
    confidence: number;
    interviewReadiness: number;
    placementReadiness: number;
    codingReadiness: number;
  };
  trends: {
    placement: Array<{ date: string; overall: number; interview: number | null; coding: number | null; communication: number | null }>;
    snapshots: Array<{ date: string; trigger: string | null; placementScore: number | null; codingReadiness: number | null }>;
  };
  placementReadiness: {
    overallScore: number;
    interviewReadiness: number | null;
    codingReadiness: number | null;
    communicationScore: number | null;
    skillGaps: Record<string, number> | null;
    computedAt: string;
  } | null;
  activity: {
    interviews: number;
    codingSubmissions: number;
    codingInterviews: number;
    sources: Record<string, number>;
  };
  skillSignals: Array<{ id: string; skill: string; level: number; source: string; recordedAt: string }>;
  snapshots: Array<{ id: string; trigger: string | null; data: unknown; createdAt: string }>;
  recentInterviews: Array<{
    id: string;
    type: string;
    status: string;
    targetRole: string | null;
    startedAt: string;
    completedAt: string | null;
    placementReadiness: number | null;
    interviewScore: number | null;
  }>;
  recentAts: Array<{ score: number; createdAt: string }>;
}

const SOURCE_ICONS: Record<string, typeof Brain> = {
  "interview.completed": Mic,
  "resume.updated": FileText,
  "coding.submitted": Code2,
  "coding.interview.completed": Code2,
  "exam.completed": GraduationCap,
  "assignment.submitted": GraduationCap,
  "github.synced": Github,
  "linkedin.synced": Linkedin,
};

interface DashboardProps {
  tab?: "overview" | "skills" | "history";
}

export function StudentIntelligenceDashboard({ tab = "overview" }: DashboardProps) {
  const [data, setData] = useState<TwinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TwinData>("/twin")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load twin"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm text-muted-foreground">{error || "No twin data yet"}</p>
          <p className="text-xs text-muted-foreground">Complete an interview, resume, or coding submission to populate your Digital Twin.</p>
        </CardContent>
      </Card>
    );
  }

  const { profile, metrics, trends, placementReadiness, activity, skillSignals, snapshots, recentInterviews, recentAts } = data;
  const isCold = profile.placementScore === 0 && activity.interviews === 0 && activity.codingSubmissions === 0;

  if (tab === "skills") {
    return (
      <div className="space-y-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Recent Skill Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {skillSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No signals yet — start an interview, build a resume, or submit code to populate your twin.</p>
            ) : (
              <div className="space-y-3">
                {skillSignals.map((s) => {
                  const Icon = SOURCE_ICONS[s.source] || Activity;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium capitalize truncate">{s.skill}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.source} · {new Date(s.recordedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{Math.round(s.level)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {placementReadiness?.skillGaps && Object.keys(placementReadiness.skillGaps).length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Skill Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(placementReadiness.skillGaps).map(([skill, gap]) => (
                <div key={skill} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{skill}</span>
                    <span className="text-amber-600">-{gap} pts to target</span>
                  </div>
                  <Progress value={Math.max(0, 100 - gap)} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (tab === "history") {
    return (
      <div className="space-y-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {snapshots.map((s) => {
                  const Icon = SOURCE_ICONS[s.trigger || ""] || Activity;
                  return (
                    <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{(s.trigger || "event").replace(/\./g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" /> Recent Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInterviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No interviews yet. <Link href={ROUTES.interviewStart} className="text-primary underline">Start one</Link>.</p>
            ) : (
              <div className="space-y-3">
                {recentInterviews.map((s) => (
                  <Link
                    key={s.id}
                    href={s.status === "completed" ? `${ROUTES.interviewReport}?id=${s.id}` : `${ROUTES.interviewSession}?id=${s.id}`}
                    className="block p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium capitalize">{s.type.replace(/_/g, " ")} {s.targetRole ? `· ${s.targetRole}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.startedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={s.status === "completed" ? "success" : "info"}>{s.status}</Badge>
                        {s.placementReadiness !== null && (
                          <span className="text-xs text-primary font-medium">PR: {Math.round(s.placementReadiness)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = trends.placement.map((p) => ({
    date: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    placement: Math.round(p.overall),
    interview: p.interview != null ? Math.round(p.interview) : null,
    coding: p.coding != null ? Math.round(p.coding) : null,
  }));

  // Overview
  return (
    <div className="space-y-6">
      <Card className="glass-card border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <ScoreTile label="Placement" value={metrics.placementReadiness} highlight />
            <ScoreTile label="Interview" value={metrics.interviewReadiness} />
            <ScoreTile label="Coding" value={metrics.codingReadiness} />
            <ScoreTile label="Algorithms" value={metrics.algorithmSkills} />
            <ScoreTile label="Problem Solving" value={metrics.problemSolving} />
            <ScoreTile label="Optimization" value={metrics.optimizationSkills} />
            <ScoreTile label="Communication" value={metrics.communication} />
            <ScoreTile label="Confidence" value={metrics.confidence} />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Technical: {Math.round(metrics.technical)}/100 · Last updated: {new Date(profile.updatedAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {chartData.length > 1 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Placement Readiness Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="placement" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Placement" />
                <Line type="monotone" dataKey="interview" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Interview" />
                <Line type="monotone" dataKey="coding" stroke="#06b6d4" strokeWidth={2} dot={false} name="Coding" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {trends.snapshots.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Historical Snapshots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trends.snapshots.map((s, i) => (
              <div key={i} className="flex justify-between text-sm p-2 rounded-lg bg-muted/20">
                <span className="capitalize">{(s.trigger || "event").replace(/\./g, " ")}</span>
                <span className="text-muted-foreground">{new Date(s.date).toLocaleString()}</span>
                {s.placementScore != null && <Badge variant="outline">PR {Math.round(s.placementScore)}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isCold && (
        <Card className="glass-card border-dashed">
          <CardContent className="p-6 text-center space-y-3">
            <Brain className="h-10 w-10 text-primary mx-auto" />
            <h3 className="font-semibold">Your Digital Twin is empty</h3>
            <p className="text-sm text-muted-foreground">Take an action to start populating your intelligence profile:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href={ROUTES.resumeBuilder}><Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Build Resume</Button></Link>
              <Link href={ROUTES.interviewStart}><Button variant="outline" size="sm"><Mic className="h-4 w-4 mr-1" /> Mock Interview</Button></Link>
              <Link href={ROUTES.codingEditor}><Button variant="outline" size="sm"><Code2 className="h-4 w-4 mr-1" /> Solve Problem</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Strengths will appear after your first interview or resume.</p>
            ) : (
              profile.strengths.map((s) => (
                <p key={s} className="text-sm flex gap-2">
                  <span className="text-emerald-500">✓</span> {s}
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weaknesses identified yet.</p>
            ) : (
              profile.weaknesses.map((s) => (
                <p key={s} className="text-sm flex gap-2">
                  <span className="text-amber-500">→</span> {s}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Activity Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ActivityTile label="Interviews" value={activity.interviews} icon={Mic} />
            <ActivityTile label="Coding Subs" value={activity.codingSubmissions} icon={Code2} />
            <ActivityTile label="Coding Interviews" value={activity.codingInterviews ?? 0} icon={Code2} />
            <ActivityTile label="ATS Scans" value={recentAts.length} icon={FileText} />
          </div>
        </CardContent>
      </Card>

      {placementReadiness && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Latest Placement Readiness
            </CardTitle>
            <Link href={ROUTES.aiCoach}><Button variant="outline" size="sm">AI Career Coach</Button></Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Overall Readiness</span>
              <span className="font-semibold text-primary">{Math.round(placementReadiness.overallScore)}/100</span>
            </div>
            <Progress value={placementReadiness.overallScore} />
            <p className="text-xs text-muted-foreground">Computed: {new Date(placementReadiness.computedAt).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreTile({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  const display = Math.round(value);
  const color = display >= 80 ? "text-emerald-500" : display >= 60 ? "text-amber-500" : display > 0 ? "text-rose-500" : "text-muted-foreground";
  return (
    <div className={`text-center p-3 rounded-xl ${highlight ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
      <p className={`text-3xl font-bold ${color}`}>{display}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ActivityTile({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Brain }) {
  return (
    <div className="text-center p-4 rounded-xl bg-muted/30 border border-border">
      <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
