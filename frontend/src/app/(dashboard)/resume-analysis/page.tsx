"use client";

import { Suspense, useEffect, useState } from "react";
import { FileSearch } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeResumeAsync,
  fetchLatestAnalysisAsync,
  fetchResumesAsync,
} from "@/lib/resume-store";
import type { ResumeData } from "@/lib/resume-types";
import { ROUTES } from "@/lib/routes";

function ResumeAnalysisContent() {
  const { toast } = useToast();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResumesAsync().then(async (resumes) => {
      const active = resumes.find((r) => r.isActive) || resumes[0] || null;
      setResume(active);
      if (active) {
        const latest = await fetchLatestAnalysisAsync(active.id).catch(() => null);
        setAnalysis(latest);
      }
    });
  }, []);

  const runAnalysis = async () => {
    if (!resume) return;
    setLoading(true);
    try {
      const result = await analyzeResumeAsync(resume, resume.id);
      setAnalysis(result);
      toast({ title: "Analysis complete", description: `ATS: ${result.atsScore}/100`, variant: "success" });
    } catch {
      toast({ title: "Analysis failed", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <InteractiveModulePage
      title="Resume Analysis"
      subtitle="Heuristic ATS scoring with LLM-powered summary, strengths, weaknesses, and keyword suggestions."
      icon={FileSearch}
      gradient="from-teal-600 via-cyan-600 to-blue-600"
      defaultTab="analysis"
      actions={[{ label: "Run Analysis", href: ROUTES.resumeAnalysis }]}
      tabs={[
        {
          id: "analysis",
          label: "Analysis",
          content: (
            <div className="space-y-6 max-w-3xl">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>{resume ? `${resume.name} — ${resume.targetRole}` : "No resume"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={runAnalysis} disabled={!resume || loading}>
                    {loading ? "Running ResumeAnalysisAgent..." : "Run Full Analysis"}
                  </Button>
                  {analysis && (
                    <>
                      <div className="rounded-xl bg-primary/10 p-6 text-center">
                        <p className="text-4xl font-bold text-primary">{analysis.atsScore as number}/100</p>
                        <p className="text-sm text-muted-foreground">Heuristic ATS Score (source of truth)</p>
                        <p className="text-xs text-muted-foreground mt-1">{analysis.source as string}</p>
                      </div>
                      {analysis.summary && (
                        <p className="text-sm text-muted-foreground">{analysis.summary as string}</p>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium mb-2">Strengths</p>
                          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                            {((analysis.strengths as string[]) || []).map((s) => <li key={s}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Weaknesses</p>
                          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                            {((analysis.weaknesses as string[]) || []).map((s) => <li key={s}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Keyword Suggestions</p>
                        <div className="flex flex-wrap gap-2">
                          {((analysis.keywordSuggestions as string[]) || []).map((k) => (
                            <Badge key={k} variant="info">{k}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">ATS Tips</p>
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                          {((analysis.atsTips as string[]) || (analysis.recommendations as string[]) || []).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <Progress value={analysis.atsScore as number} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          ),
        },
      ]}
      sections={[
        { title: "Heuristic ATS", description: "Rule-based scoring remains authoritative.", items: ["Keyword match", "Section completeness", "Role alignment"] },
        { title: "LLM Insights", description: "Qwen3 via Ollama + PromptRegistry v2.", items: ["Summary", "Strengths", "Gaps", "ATS tips"], badge: "AI" },
      ]}
    />
  );
}

export default function ResumeAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ResumeAnalysisContent />
    </Suspense>
  );
}
