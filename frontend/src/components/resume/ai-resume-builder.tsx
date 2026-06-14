"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Download,
  Mic,
  Wand2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { ResumeData } from "@/lib/resume-types";
import { RESUME_TEMPLATES } from "@/lib/resume-types";
import {
  createEmptyResume,
  generateAIProjectBullets,
  generateAISummary,
  saveResumeAsync,
} from "@/lib/resume-store";
import { ROUTES } from "@/lib/routes";

const STEPS = ["Personal", "Education", "Experience", "Projects", "Skills", "AI Enhance", "Review"];

export function AIResumeBuilder() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    setResume(createEmptyResume());
  }, []);

  if (!resume) return null;

  const update = (patch: Partial<ResumeData>) =>
    setResume((r) => (r ? { ...r, ...patch } : r));

  const runAIEnhance = () => {
    const summary = generateAISummary(resume);
    const projects =
      resume.projects.length === 0
        ? [
            {
              name: `${resume.targetRole} Portfolio Project`,
              description: generateAIProjectBullets(resume.targetRole),
              technologies: resume.skills.slice(0, 4).join(", "),
              link: resume.github || "",
            },
          ]
        : resume.projects;

    const enhanced = {
      ...resume,
      summary,
      projects,
      aiEnhanced: true,
    };
    setResume(enhanced);
    toast({ title: "AI enhanced your resume", description: "Save to compute ATS score", variant: "success" });
  };

  const finalizeResume = async () => {
    const saved = await saveResumeAsync(resume);
    toast({
      title: "Resume saved successfully!",
      description: `ATS Score: ${saved.atsScore}/100 — Ready for AI Interview`,
      variant: "success",
    });
    router.push(`${ROUTES.interviewStart}&resume=${saved.id}`);
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    update({ skills: [...new Set([...resume.skills, skillInput.trim()])] });
    setSkillInput("");
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={resume.name} onChange={(e) => update({ name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={resume.email} onChange={(e) => update({ email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={resume.phone} onChange={(e) => update({ phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={resume.location} onChange={(e) => update({ location: e.target.value })} placeholder="City, Country" /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Target Role</Label>
              <select
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                value={resume.targetRole}
                onChange={(e) => update({ targetRole: e.target.value, title: e.target.value })}
              >
                {RESUME_TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>LinkedIn</Label><Input value={resume.linkedin} onChange={(e) => update({ linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
            <div className="space-y-2"><Label>GitHub</Label><Input value={resume.github} onChange={(e) => update({ github: e.target.value })} placeholder="https://github.com/..." /></div>
          </div>
        );
      case 1:
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["institution", "degree", "field", "startYear", "endYear", "cgpa"] as const).map((field) => (
              <div key={field} className="space-y-2">
                <Label className="capitalize">{field.replace(/([A-Z])/g, " $1")}</Label>
                <Input
                  value={resume.education[0]?.[field] || ""}
                  onChange={(e) => {
                    const edu = [...resume.education];
                    edu[0] = { ...edu[0], [field]: e.target.value };
                    update({ education: edu });
                  }}
                />
              </div>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Company</Label><Input value={resume.experience[0]?.company || ""} onChange={(e) => update({ experience: [{ ...resume.experience[0], company: e.target.value, role: resume.experience[0]?.role || "", startDate: resume.experience[0]?.startDate || "", endDate: resume.experience[0]?.endDate || "", description: resume.experience[0]?.description || "" }] })} placeholder="Company name (optional)" /></div>
              <div className="space-y-2"><Label>Role</Label><Input value={resume.experience[0]?.role || ""} onChange={(e) => update({ experience: [{ ...resume.experience[0], role: e.target.value, company: resume.experience[0]?.company || "", startDate: resume.experience[0]?.startDate || "", endDate: resume.experience[0]?.endDate || "", description: resume.experience[0]?.description || "" }] })} placeholder="Intern / Developer" /></div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={resume.experience[0]?.description || ""}
                onChange={(e) => update({ experience: [{ ...resume.experience[0], description: e.target.value, company: resume.experience[0]?.company || "", role: resume.experience[0]?.role || "", startDate: resume.experience[0]?.startDate || "", endDate: resume.experience[0]?.endDate || "" }] })}
                placeholder="Describe your responsibilities and achievements..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Project Name</Label><Input value={resume.projects[0]?.name || ""} onChange={(e) => update({ projects: [{ ...resume.projects[0], name: e.target.value, description: resume.projects[0]?.description || "", technologies: resume.projects[0]?.technologies || "", link: resume.projects[0]?.link || "" }] })} /></div>
              <div className="space-y-2"><Label>Technologies</Label><Input value={resume.projects[0]?.technologies || ""} onChange={(e) => update({ projects: [{ ...resume.projects[0], technologies: e.target.value, name: resume.projects[0]?.name || "", description: resume.projects[0]?.description || "", link: resume.projects[0]?.link || "" }] })} placeholder="React, Node.js, PostgreSQL" /></div>
            </div>
            <div className="space-y-2">
              <Label>Project Description</Label>
              <Textarea
                value={resume.projects[0]?.description || ""}
                onChange={(e) => update({ projects: [{ ...resume.projects[0], description: e.target.value, name: resume.projects[0]?.name || "", technologies: resume.projects[0]?.technologies || "", link: resume.projects[0]?.link || "" }] })}
                placeholder="What did you build? What was the impact?"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2"><Label>Project Link</Label><Input value={resume.projects[0]?.link || ""} onChange={(e) => update({ projects: [{ ...resume.projects[0], link: e.target.value, name: resume.projects[0]?.name || "", description: resume.projects[0]?.description || "", technologies: resume.projects[0]?.technologies || "" }] })} placeholder="GitHub or live demo URL" /></div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add a skill..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
              <Button type="button" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((s) => (
                <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => update({ skills: resume.skills.filter((x) => x !== s) })}>
                  {s} ×
                </Badge>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Professional Summary</Label>
              <Textarea value={resume.summary} onChange={(e) => update({ summary: e.target.value })} placeholder="Brief professional summary..." className="min-h-[120px]" />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500">
              <Wand2 className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">AI Resume Enhancement</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Our AI will optimize your summary, suggest project descriptions, and calculate your ATS compatibility score for {resume.targetRole}.
              </p>
            </div>
            <Button variant="gradient" size="lg" onClick={runAIEnhance}>
              <Sparkles className="mr-2 h-5 w-5" /> Enhance with AI
            </Button>
            {resume.aiEnhanced && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 max-w-sm mx-auto">
                <p className="text-2xl font-bold text-emerald-500">{resume.atsScore}/100</p>
                <p className="text-sm text-muted-foreground">ATS Compatibility Score</p>
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="glass-card text-center p-4">
                <p className="text-3xl font-bold text-primary">{resume.atsScore || "—"}</p>
                <p className="text-xs text-muted-foreground">ATS Score (computed on save)</p>
              </Card>
              <Card className="glass-card text-center p-4">
                <p className="text-3xl font-bold">{resume.skills.length}</p>
                <p className="text-xs text-muted-foreground">Skills</p>
              </Card>
              <Card className="glass-card text-center p-4">
                <p className="text-3xl font-bold">{resume.projects.length}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </Card>
            </div>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Resume Preview</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><strong>{resume.name}</strong> — {resume.title}</div>
                <div className="text-muted-foreground">{resume.email} · {resume.phone}</div>
                <p>{resume.summary || "No summary yet"}</p>
                <div><strong>Skills:</strong> {resume.skills.join(", ")}</div>
                {resume.projects[0] && <div><strong>Project:</strong> {resume.projects[0].name} — {resume.projects[0].description}</div>}
              </CardContent>
            </Card>
            {resume.atsFeedback.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Improvement Tips:</p>
                {resume.atsFeedback.map((f) => <p key={f} className="text-xs text-muted-foreground">• {f}</p>)}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
          </div>
        ))}
      </div>
      <Progress value={((step + 1) / STEPS.length) * 100} />
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast({ title: "PDF exported", variant: "success" })}>
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
            <Button variant="gradient" onClick={finalizeResume}>
              <Mic className="mr-2 h-4 w-4" /> Save & Start AI Interview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
