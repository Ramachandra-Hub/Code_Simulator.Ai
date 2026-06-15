"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchResumesAsync,
  getActiveResumeAsync,
  setActiveResumeAsync,
} from "@/lib/resume-store";
import type { ResumeData } from "@/lib/resume-types";
import { INTERVIEW_TYPES, PANEL_INTERVIEW_TYPE, VOICE_PROFILES } from "@/lib/interview-types";
import { COMPANY_INTERVIEW_PACKS } from "@/lib/company-interview-packs";
import { ROUTES } from "@/lib/routes";

export type InterviewSelectMode = "all" | "mock" | "coding" | "voice" | "panel";

interface InterviewTypeSelectProps {
  mode?: InterviewSelectMode;
}

export function InterviewTypeSelect({ mode = "all" }: InterviewTypeSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeParam = searchParams.get("resume");

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (resumeParam) {
          const resumes = await fetchResumesAsync();
          const r = resumes.find((x) => x.id === resumeParam);
          if (r) {
            await setActiveResumeAsync(r.id);
            setResume(r);
            return;
          }
        }
        setResume(await getActiveResumeAsync());
      } finally {
        setLoading(false);
      }
    })();
  }, [resumeParam]);

  const [voiceProfile, setVoiceProfile] = useState("professional");

  const startInterview = (type: string) => {
    if (!resume) {
      router.push(ROUTES.resumeBuilder);
      return;
    }
    if (type === "coding") {
      router.push(`${ROUTES.interviewSession}?type=${type}&resume=${resume.id}`);
      return;
    }
    router.push(`${ROUTES.interviewVoice}?type=${type}&resume=${resume.id}&voice=${voiceProfile}`);
  };

  const startPanelInterview = () => {
    if (!resume) {
      router.push(ROUTES.resumeBuilder);
      return;
    }
    router.push(`${ROUTES.interviewPanel}?resume=${resume.id}`);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center">Loading resume...</p>;
  }

  if (!resume) {
    return (
      <Card className="glass-card max-w-lg mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="font-semibold text-lg">Resume Required</h3>
          <p className="text-sm text-muted-foreground">
            Create and save your resume first. The AI interviewer uses your resume to ask personalized questions.
          </p>
          <Button variant="gradient" onClick={() => router.push(ROUTES.resumeBuilder)}>
            <FileText className="mr-2 h-4 w-4" /> Build Resume
          </Button>
        </CardContent>
      </Card>
    );
  }

  const showVoicePicker = mode === "all" || mode === "mock" || mode === "voice";
  const types = INTERVIEW_TYPES.filter((t) => {
    if (mode === "coding") return t.id === "coding";
    if (mode === "mock" || mode === "voice") return t.id !== "coding";
    if (mode === "panel") return false;
    return true;
  });
  const startCompanyMock = (companyId: string) => {
    if (!resume) {
      router.push(ROUTES.resumeBuilder);
      return;
    }
    router.push(
      `${ROUTES.interviewVoice}?type=technical&resume=${resume.id}&voice=${voiceProfile}&company=${companyId}`
    );
  };

  const showCompanyPacks = mode === "all" || mode === "mock";
  const showPanel = mode === "all" || mode === "panel";
  const intro =
    mode === "coding"
      ? "Start a live coding round — problems are generated from your resume and target role."
      : mode === "panel"
        ? "Multi-interviewer panel with distinct voices. Questions adapt to your resume and prior answers."
        : "Select an interview type. Speak your answers in Chrome or Edge with your microphone enabled.";

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/20">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{resume.name}</p>
              <p className="text-xs text-muted-foreground">
                {resume.targetRole} · ATS {resume.atsScore}/100 · {resume.skills.length} skills
              </p>
            </div>
          </div>
          <Badge variant="success">Resume Loaded</Badge>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">{intro}</p>

      {showVoicePicker && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Interviewer voice:</span>
          {VOICE_PROFILES.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={voiceProfile === v.id ? "default" : "outline"}
              onClick={() => setVoiceProfile(v.id)}
            >
              {v.label}
            </Button>
          ))}
        </div>
      )}

      {types.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <Card
              key={t.id}
              className="glass-card hover:shadow-glass-lg transition-all cursor-pointer group"
              onClick={() => startInterview(t.id)}
            >
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="font-semibold group-hover:text-primary transition-colors">{t.label}</p>
                  <Badge variant="secondary" className="text-xs">
                    {t.id === "coding" ? "Code" : mode === "voice" ? "Voice" : "Mock"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground">{t.duration}</p>
                <Button size="sm" className="w-full mt-2" variant="outline">
                  <Play className="mr-2 h-4 w-4" /> {t.id === "coding" ? "Start Coding" : "Start Interview"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCompanyPacks && (
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-sm font-semibold">Company-specific mocks</p>
          <p className="text-xs text-muted-foreground">
            Questions adapt to company rubric, your resume, and twin weak areas.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANY_INTERVIEW_PACKS.map((c) => (
              <Card
                key={c.id}
                className="glass-card hover:border-primary/40 cursor-pointer transition-colors"
                onClick={() => startCompanyMock(c.id)}
              >
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.tagline}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {c.tier}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showPanel && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="text-sm font-semibold flex items-center gap-2">
            Panel Interview
            <Badge variant="secondary" className="text-xs">
              Multi-voice
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            MNC-style panel with 5 distinct voices — HR, Technical Lead, Engineering Manager, Director, and Recruiter.
          </p>
          <Card
            className="glass-card hover:shadow-glass-lg transition-all cursor-pointer border-violet-500/30 group max-w-xl"
            onClick={startPanelInterview}
          >
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between items-start">
                <p className="font-semibold group-hover:text-primary transition-colors">{PANEL_INTERVIEW_TYPE.label}</p>
                <Badge className="text-xs">Panel + Voice</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{PANEL_INTERVIEW_TYPE.description}</p>
              <p className="text-xs text-muted-foreground">
                {PANEL_INTERVIEW_TYPE.duration} · {PANEL_INTERVIEW_TYPE.questionCount} turns
              </p>
              <Button size="sm" className="w-full mt-2" variant="gradient">
                <Play className="mr-2 h-4 w-4" /> Start Panel Interview
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
