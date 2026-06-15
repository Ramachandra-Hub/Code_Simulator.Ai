"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Send, Upload, Download, Copy, Check, Star, Loader2, Mic } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/lib/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { codingProblems, learningPaths, placementDrives, upcomingAssessments } from "@/lib/mock-data";
import { CODING_LANGUAGES, DSA_TOPICS, LEARNING_PATHS } from "@/lib/constants";
import { MonacoEditorPanel } from "@/components/coding/monaco-editor-panel";
import { analyzeResumeAsync, fetchLatestAnalysisAsync, fetchResumesAsync, setActiveResumeAsync, uploadResumeFileAsync } from "@/lib/resume-store";
import { fetchInterviewSessionsAsync } from "@/lib/interview-store";
import type { ResumeData } from "@/lib/resume-types";
import type { InterviewSession } from "@/lib/interview-types";

export function CoursesPanel() {
  const { toast } = useToast();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {learningPaths.map((path) => (
        <Card key={path.id} className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">{path.title}</CardTitle>
            <Badge variant="info">{path.level}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{path.description}</p>
            <Progress value={path.progress} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">{path.modules} modules · {path.duration}</p>
            <Button className="w-full mt-3" size="sm" onClick={() => toast({ title: `Continuing: ${path.title}`, variant: "success" })}>
              Continue Course
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LearningPathsPanel() {
  const { toast } = useToast();
  return (
    <div className="space-y-3">
      {LEARNING_PATHS.map((path) => (
        <Card key={path} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{path}</p>
              <p className="text-xs text-muted-foreground">Structured career path</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toast({ title: `Enrolled in ${path}`, variant: "success" })}>
              Enroll
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CodeEditorPanel() {
  return <MonacoEditorPanel />;
}

export function SubmissionsPanel() {
  return (
    <div className="space-y-3">
      {codingProblems.map((p) => (
        <Card key={p.id} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.topic} · {p.acceptance}% acceptance</p>
            </div>
            <Badge variant={p.solved ? "success" : "secondary"}>
              {p.solved ? "Accepted" : "Not solved"}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DSAPracticePanel() {
  const router = useRouter();
  const { toast } = useToast();
  const [topic, setTopic] = useState("Arrays");
  const filtered = codingProblems.filter((p) => p.topic === topic || topic === "All");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["All", ...DSA_TOPICS.slice(0, 6)].map((t) => (
          <Button key={t} size="sm" variant={topic === t ? "default" : "outline"} onClick={() => setTopic(t)}>
            {t}
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((p) => (
          <Card key={p.id} className="glass-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.topic}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">{p.difficulty}</Badge>
                <Button size="sm" onClick={() => { router.push(ROUTES.codingEditor); toast({ title: `Opening: ${p.title}`, variant: "success" }); }}>Solve</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DSARoadmapPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {DSA_TOPICS.map((topic, i) => (
        <Card key={topic} className="glass-card">
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <p className="font-medium">{topic}</p>
              <Badge variant="info">{Math.min(100, 20 + i * 8)}%</Badge>
            </div>
            <Progress value={Math.min(100, 20 + i * 8)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AssessmentsTakePanel() {
  const { toast } = useToast();
  return (
    <div className="space-y-3">
      {upcomingAssessments.map((a) => (
        <Card key={a.id} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.date} · {a.duration} · {a.type}</p>
            </div>
            <Button size="sm" onClick={() => toast({ title: `Starting: ${a.title}`, description: "Assessment environment loading...", variant: "success" })}>
              Start
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function QuestionBankPanel() {
  const { toast } = useToast();
  const questions = ["What is time complexity of binary search?", "Explain REST vs GraphQL", "Implement LRU Cache", "What is a closure in JavaScript?", "Design a URL shortener"];
  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <Card key={q} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm">{i + 1}. {q}</p>
            <Button size="sm" variant="outline" onClick={() => toast({ title: "Question Preview", description: q })}>Preview</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ResumeBuilderPanel() {
  const { toast } = useToast();
  const [name, setName] = useState("Arjun Mehta");
  const [title, setTitle] = useState("Software Engineer");
  const [summary, setSummary] = useState("Full-stack developer passionate about building scalable systems.");

  return (
    <Card className="glass-card max-w-2xl">
      <CardHeader><CardTitle>Resume Builder</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label>Summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
        <div className="flex gap-2">
          <Button onClick={() => toast({ title: "Resume saved", variant: "success" })}>Save Resume</Button>
          <Button variant="outline" onClick={() => toast({ title: "PDF exported", description: "resume.pdf downloaded", variant: "success" })}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResumeListPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumesAsync()
      .then(setResumes)
      .catch(() => setResumes([]))
      .finally(() => setLoading(false));
  }, []);

  const activate = async (id: string) => {
    await setActiveResumeAsync(id);
    setResumes(await fetchResumesAsync());
    toast({ title: "Active resume updated", variant: "success" });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading resumes...</p>;

  return (
    <div className="space-y-3">
      {resumes.length === 0 && (
        <p className="text-sm text-muted-foreground">No resumes yet. Create one in the Builder tab.</p>
      )}
      {resumes.map((r) => (
        <Card key={r.id} className="glass-card">
          <CardContent className="flex items-center justify-between p-4 gap-4 flex-wrap">
            <div>
              <p className="font-medium">
                {r.name} — {r.targetRole}
                {r.isActive && <Badge className="ml-2" variant="success">Active</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">ATS {r.atsScore}/100 · Updated {new Date(r.updatedAt).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              {!r.isActive && (
                <Button size="sm" variant="outline" onClick={() => activate(r.id)}>Set Active</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => router.push(`${ROUTES.interviewStart}&resume=${r.id}`)}>
                Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface AtsAnalysisResult {
  atsScore: number;
  aiQualityScore?: number;
  keywordMatchPct?: number;
  keywordsMatched: string[];
  keywordsMissing: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary?: string;
  atsBreakdown?: Record<string, number>;
}

export function ATSAnalyzePanel() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AtsAnalysisResult | null>(null);
  const [activeResume, setActiveResume] = useState<ResumeData | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  useEffect(() => {
    fetchResumesAsync().then((resumes) => {
      setActiveResume(resumes.find((r) => r.isActive) || resumes[0] || null);
    });
  }, []);

  const applyAnalysis = (analysis: Record<string, unknown>) => {
    setResult({
      atsScore: analysis.atsScore as number,
      aiQualityScore: analysis.aiQualityScore as number | undefined,
      keywordMatchPct: analysis.keywordMatchPct as number | undefined,
      keywordsMatched: (analysis.keywordsMatched as string[]) || [],
      keywordsMissing: (analysis.keywordsMissing as string[]) || [],
      strengths: (analysis.strengths as string[]) || [],
      weaknesses: (analysis.weaknesses as string[]) || [],
      recommendations: (analysis.recommendations as string[]) || [],
      summary: analysis.summary as string,
      atsBreakdown: analysis.atsBreakdown as Record<string, number> | undefined,
    });
  };

  const runAnalysis = async () => {
    if (!activeResume) {
      toast({ title: "No resume found", description: "Upload a PDF/DOCX or build a resume first.", variant: "error" });
      return;
    }
    setAnalyzing(true);
    try {
      const analysis = await analyzeResumeAsync(activeResume, activeResume.id);
      applyAnalysis(analysis);
      toast({ title: "Resume analyzed", description: `ATS ${analysis.atsScore}/100 · AI Quality ${analysis.aiQualityScore ?? "—"}/100`, variant: "success" });
    } catch {
      toast({ title: "Analysis failed", variant: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedName(file.name);
    try {
      const { resume, analysis } = await uploadResumeFileAsync(file);
      setActiveResume({
        ...(resume as unknown as ResumeData),
        id: resume.id as string,
      });
      applyAnalysis(analysis);
      toast({
        title: "Resume scanned",
        description: `${file.name} — ATS ${analysis.atsScore}/100`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not parse file",
        variant: "error",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="glass-card max-w-xl">
      <CardHeader><CardTitle>ATS Analysis — {activeResume?.name || "Upload resume"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Upload PDF or DOCX</p>
          <p className="text-xs text-muted-foreground mt-1">AI scans your file, extracts content, and scores ATS compatibility</p>
          {uploadedName && <p className="text-xs text-primary mt-2">Last upload: {uploadedName}</p>}
          <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleFileUpload} />
        </div>
        {result && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-3xl font-bold text-primary">{result.atsScore}/100</p>
              <p className="text-sm text-muted-foreground">ATS Score</p>
              {result.keywordMatchPct != null && (
                <p className="text-xs text-muted-foreground mt-1">{result.keywordMatchPct}% keyword match</p>
              )}
            </div>
            <div className="rounded-xl bg-violet-500/10 p-4 text-center">
              <p className="text-3xl font-bold text-violet-600">{result.aiQualityScore ?? "—"}/100</p>
              <p className="text-sm text-muted-foreground">AI Quality Score</p>
            </div>
          </div>
        )}
        {result?.summary && (
          <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">{result.summary}</p>
        )}
        <Button onClick={runAnalysis} className="w-full" disabled={analyzing || uploading || !activeResume}>
          {analyzing ? "Analyzing..." : "Re-analyze saved resume"}
        </Button>
        {uploading && <p className="text-xs text-center text-muted-foreground">Scanning and parsing your resume…</p>}
      </CardContent>
    </Card>
  );
}

export function ATSReportPanel() {
  const [result, setResult] = useState<AtsAnalysisResult | null>(null);

  useEffect(() => {
    fetchResumesAsync().then(async (resumes) => {
      const active = resumes.find((r) => r.isActive) || resumes[0];
      if (!active) return;
      const analysis = await fetchLatestAnalysisAsync(active.id).catch(() => null);
      if (analysis) {
        setResult({
          atsScore: analysis.atsScore as number,
          aiQualityScore: analysis.aiQualityScore as number | undefined,
          keywordMatchPct: analysis.keywordMatchPct as number | undefined,
          keywordsMatched: (analysis.keywordsMatched as string[]) || [],
          keywordsMissing: (analysis.keywordsMissing as string[]) || [],
          strengths: (analysis.strengths as string[]) || [],
          weaknesses: (analysis.weaknesses as string[]) || [],
          recommendations: (analysis.recommendations as string[]) || [],
          summary: analysis.summary as string,
          atsBreakdown: analysis.atsBreakdown as Record<string, number> | undefined,
        });
      } else if (active.atsScore) {
        setResult({
          atsScore: active.atsScore,
          keywordsMatched: active.keywordsMatched || [],
          keywordsMissing: active.keywordsMissing || [],
          strengths: [],
          weaknesses: active.atsFeedback,
          recommendations: [],
        });
      }
    });
  }, []);

  if (!result) {
    return <p className="text-sm text-muted-foreground">Run ATS analysis to see your report.</p>;
  }

  const breakdown = result.atsBreakdown;
  const items = [
    { label: "ATS Score", score: result.atsScore },
    { label: "AI Quality Score", score: result.aiQualityScore ?? 0 },
    { label: "Keyword Match", score: result.keywordMatchPct ?? (result.keywordsMatched.length
      ? Math.round((result.keywordsMatched.length / (result.keywordsMatched.length + result.keywordsMissing.length)) * 100)
      : 0) },
    ...(breakdown
      ? [
          { label: "Contact & Links", score: Math.round(((breakdown.contactInfo || 0) + (breakdown.links || 0)) / 10 * 100) },
          { label: "Content (Exp + Projects)", score: Math.round(((breakdown.experience || 0) + (breakdown.projects || 0)) / 25 * 100) },
        ]
      : []),
  ].filter((item) => item.label !== "AI Quality Score" || result.aiQualityScore != null);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{item.label}</span><span>{item.score}%</span>
            </div>
            <Progress value={item.score} />
          </div>
        ))}
      </div>
      {result.summary && (
        <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{result.summary}</p>
      )}
      {result.keywordsMatched.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Keywords Found</p>
          <div className="flex flex-wrap gap-2">
            {result.keywordsMatched.map((k) => <Badge key={k} variant="success">{k}</Badge>)}
          </div>
        </div>
      )}
      {result.keywordsMissing.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Missing Keywords</p>
          <div className="flex flex-wrap gap-2">
            {result.keywordsMissing.map((k) => <Badge key={k} variant="warning">{k}</Badge>)}
          </div>
        </div>
      )}
      {result.strengths.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Strengths</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {result.strengths.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
      {result.weaknesses.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Weaknesses</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {result.weaknesses.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
      {result.recommendations.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Recommendations</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {result.recommendations.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function InterviewStartPanel() {
  const { toast } = useToast();
  const types = ["HR Interview", "Technical Interview", "Coding Interview", "System Design"];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {types.map((type) => (
        <Card key={type} className="glass-card cursor-pointer hover:shadow-glass-lg transition-all" onClick={() => toast({ title: `${type} started`, description: "AI interviewer is ready. Good luck!", variant: "success" })}>
          <CardContent className="p-6 text-center">
            <p className="font-semibold">{type}</p>
            <p className="text-xs text-muted-foreground mt-1">30-45 min session</p>
            <Button className="mt-4" size="sm"><Play className="mr-2 h-4 w-4" /> Start</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InterviewHistoryPanel() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "score">("newest");

  useEffect(() => {
    fetchInterviewSessionsAsync()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions
    .filter((s) => s.status === "completed" || s.scores.overall > 0)
    .filter((s) => typeFilter === "all" || s.type === typeFilter)
    .filter((s) => {
      const q = search.toLowerCase();
      return !q || s.targetRole.toLowerCase().includes(q) || s.type.includes(q);
    })
    .sort((a, b) => {
      if (sort === "score") return b.scores.overall - a.scores.overall;
      const da = new Date(a.completedAt).getTime();
      const db = new Date(b.completedAt).getTime();
      return sort === "newest" ? db - da : da - db;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading interview history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search by role or type..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="hr">HR</option>
          <option value="technical">Technical</option>
          <option value="behavioral">Behavioral</option>
          <option value="coding">Coding</option>
          <option value="system_design">System Design</option>
        </select>
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="score">Highest score</option>
        </select>
      </div>
      {filtered.length === 0 && (
        <EmptyState
          icon={Mic}
          title="No interviews yet"
          description="Complete a mock interview to see your history, scores, and placement readiness reports here."
          actionLabel="Start Mock Interview"
          onAction={() => router.push(ROUTES.interviewStart)}
        />
      )}
      {filtered.map((s) => (
        <Card
          key={s.id}
          className="glass-card cursor-pointer hover:shadow-glass-lg transition-all"
          onClick={() => router.push(`${ROUTES.interviewReport}?id=${s.id}`)}
        >
          <CardContent className="flex items-center justify-between p-4 gap-4 flex-wrap">
            <div>
              <p className="font-medium capitalize">{s.type.replace("_", " ")} Interview — {s.targetRole}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.completedAt).toLocaleDateString()} · Placement Readiness {s.report.placementReadiness}%
              </p>
            </div>
            <Badge variant={s.scores.overall >= 70 ? "success" : "warning"}>
              Score: {s.scores.overall}%
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PortfolioBuilderPanel() {
  const { toast } = useToast();
  const [url, setUrl] = useState("nexusedge.ai/portfolio/arjun-mehta");
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`https://${url}`);
    setCopied(true);
    toast({ title: "Portfolio link copied!", variant: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass-card max-w-xl">
      <CardHeader><CardTitle>Portfolio Builder</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>Headline</Label><Input defaultValue="Full Stack Developer | AI Enthusiast" /></div>
        <div className="space-y-2"><Label>Portfolio URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} /></div>
        <div className="flex gap-2">
          <Button onClick={() => toast({ title: "Portfolio saved", variant: "success" })}>Save Portfolio</Button>
          <Button variant="outline" onClick={copyLink}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PortfolioSharePanel() {
  const { toast } = useToast();
  return (
    <Card className="glass-card max-w-md text-center p-8">
      <p className="text-sm text-muted-foreground mb-4">Share your portfolio with recruiters</p>
      <p className="font-mono text-primary mb-4">nexusedge.ai/portfolio/arjun-mehta</p>
      <Button onClick={() => { navigator.clipboard.writeText("https://nexusedge.ai/portfolio/arjun-mehta"); toast({ title: "Link copied!", variant: "success" }); }}>
        <Copy className="mr-2 h-4 w-4" /> Copy Share Link
      </Button>
    </Card>
  );
}

export function ProjectsNewPanel() {
  const { toast } = useToast();
  return (
    <Card className="glass-card max-w-xl">
      <CardHeader><CardTitle>Add New Project</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label>Project Name</Label><Input placeholder="E-commerce Platform" /></div>
        <div className="space-y-2"><Label>GitHub URL</Label><Input placeholder="https://github.com/user/repo" /></div>
        <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe your project..." /></div>
        <Button onClick={() => toast({ title: "Project uploaded", variant: "success" })}>
          <Send className="mr-2 h-4 w-4" /> Submit Project
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProjectsExplorePanel() {
  const projects = [
    { name: "AI Study Buddy", tech: "React, Python, OpenAI", score: 94 },
    { name: "Campus Connect", tech: "Next.js, PostgreSQL", score: 88 },
    { name: "Smart Attendance", tech: "IoT, ML, Flutter", score: 91 },
  ];
  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <Card key={p.name} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.tech}</p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{p.score}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PlacementsDrivesPanel() {
  const { toast } = useToast();
  return (
    <div className="space-y-3">
      {placementDrives.map((d) => (
        <Card key={d.id} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{d.company} — {d.role}</p>
              <p className="text-xs text-muted-foreground">{d.package} · Deadline: {d.deadline}</p>
            </div>
            <Button
              size="sm"
              disabled={!d.eligible}
              onClick={() => toast({ title: `Applied to ${d.company}`, variant: "success" })}
            >
              {d.eligible ? "Apply" : "Not Eligible"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PlacementsApplicationsPanel() {
  const apps = [
    { company: "Google", status: "Shortlisted", date: "Jun 10" },
    { company: "Microsoft", status: "Applied", date: "Jun 8" },
    { company: "Amazon", status: "Rejected", date: "Jun 1" },
  ];
  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <Card key={a.company} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{a.company}</p>
              <p className="text-xs text-muted-foreground">Applied: {a.date}</p>
            </div>
            <Badge variant={a.status === "Shortlisted" ? "success" : a.status === "Rejected" ? "destructive" : "info"}>
              {a.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AIRecommendationsPanel() {
  const recs = [
    { title: "Complete System Design Module", priority: "High" },
    { title: "Practice Graph Algorithms", priority: "High" },
    { title: "Update Resume Keywords", priority: "Medium" },
    { title: "Schedule Mock Interview", priority: "High" },
  ];
  return (
    <div className="space-y-3">
      {recs.map((r) => (
        <Card key={r.title} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm font-medium">{r.title}</p>
            <Badge variant={r.priority === "High" ? "destructive" : "warning"}>{r.priority}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AISkillGapPanel() {
  const gaps = [
    { skill: "System Design", current: 62, required: 85 },
    { skill: "Kubernetes", current: 45, required: 70 },
    { skill: "Graph Algorithms", current: 58, required: 80 },
  ];
  return (
    <div className="space-y-4 max-w-xl">
      {gaps.map((g) => (
        <div key={g.skill} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{g.skill}</span>
            <span className="text-muted-foreground">{g.current}% → {g.required}% needed</span>
          </div>
          <Progress value={g.current} />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsDashboardPanel() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Learning Hours", value: "124h" },
        { label: "Problems Solved", value: "245" },
        { label: "Assessments Taken", value: "18" },
        { label: "Interview Score", value: "82%" },
      ].map((s) => (
        <Card key={s.label} className="glass-card text-center p-4">
          <p className="text-2xl font-bold">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

export function LeaderboardRankingsPanel() {
  const ranks = [
    { rank: 1, name: "Priya Reddy", xp: 12400 },
    { rank: 2, name: "Arjun Mehta", xp: 8450 },
    { rank: 3, name: "Rahul Verma", xp: 7200 },
  ];
  return (
    <div className="space-y-3">
      {ranks.map((r) => (
        <Card key={r.rank} className="glass-card">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="text-2xl font-bold text-primary">#{r.rank}</span>
            <div className="flex-1"><p className="font-medium">{r.name}</p></div>
            <Badge variant="gradient">{r.xp.toLocaleString()} XP</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LeaderboardAchievementsPanel() {
  const badges = ["Code Warrior", "Streak Master", "Interview Pro", "DSA Champion", "Top 10%"];
  return (
    <div className="flex flex-wrap gap-4">
      {badges.map((b) => (
        <Card key={b} className="glass-card w-36 text-center p-4">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-sm font-medium">{b}</p>
        </Card>
      ))}
    </div>
  );
}
