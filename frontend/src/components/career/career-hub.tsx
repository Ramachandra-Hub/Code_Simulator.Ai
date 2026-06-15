"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIResumeBuilder } from "@/components/resume/ai-resume-builder";
import { ResumeListPanel, ATSAnalyzePanel, ATSReportPanel, InterviewHistoryPanel } from "@/components/feature/tab-panels";
import { StudentIntelligenceDashboard } from "@/components/twin/student-intelligence-dashboard";
import { CareerCoachPanel } from "@/components/career/career-coach-panel";

const TABS = [
  { id: "coach", label: "Career Coach" },
  { id: "resume", label: "Resume" },
  { id: "ats", label: "ATS" },
  { id: "twin", label: "Digital Twin" },
  { id: "reports", label: "Reports" },
] as const;

type CareerTab = (typeof TABS)[number]["id"];

function CareerHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "coach") as CareerTab;
  const active = TABS.some((t) => t.id === tab) ? tab : "coach";

  const setTab = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`/career-os?${params.toString()}`);
  };

  return (
    <Tabs value={active} onValueChange={setTab} className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
        {TABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="text-sm">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="coach" className="mt-0">
        <CareerCoachPanel />
      </TabsContent>
      <TabsContent value="resume" className="mt-0 space-y-4">
        <AIResumeBuilder />
        <ResumeListPanel />
      </TabsContent>
      <TabsContent value="ats" className="mt-0 space-y-6">
        <ATSAnalyzePanel />
        <ATSReportPanel />
      </TabsContent>
      <TabsContent value="twin" className="mt-0">
        <StudentIntelligenceDashboard tab="overview" />
      </TabsContent>
      <TabsContent value="reports" className="mt-0">
        <InterviewHistoryPanel />
      </TabsContent>
    </Tabs>
  );
}

export function CareerHub() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading career workspace…</div>}>
      <CareerHubInner />
    </Suspense>
  );
}
