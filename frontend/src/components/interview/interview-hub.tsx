"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterviewTypeSelect } from "@/components/interview/interview-type-select";
import { InterviewHistoryPanel } from "@/components/feature/tab-panels";
import { PlacementDrivePanel } from "@/components/interview/placement-drive-panel";

const TABS = [
  { id: "mock", label: "Mock" },
  { id: "placement", label: "Placement Drive" },
  { id: "coding", label: "Coding" },
  { id: "voice", label: "Voice" },
  { id: "panel", label: "Panel" },
  { id: "history", label: "History" },
] as const;

function InterviewHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "mock";
  const active = TABS.some((t) => t.id === tab) ? tab : "mock";

  const setTab = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`/interview?${params.toString()}`);
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

      <TabsContent value="mock" className="mt-0">
        <InterviewTypeSelect mode="mock" />
      </TabsContent>
      <TabsContent value="placement" className="mt-0">
        <PlacementDrivePanel />
      </TabsContent>
      <TabsContent value="coding" className="mt-0">
        <InterviewTypeSelect mode="coding" />
      </TabsContent>
      <TabsContent value="voice" className="mt-0">
        <InterviewTypeSelect mode="voice" />
      </TabsContent>
      <TabsContent value="panel" className="mt-0">
        <InterviewTypeSelect mode="panel" />
      </TabsContent>
      <TabsContent value="history" className="mt-0">
        <InterviewHistoryPanel />
      </TabsContent>
    </Tabs>
  );
}

export function InterviewHub() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading interviews…</div>}>
      <InterviewHubInner />
    </Suspense>
  );
}
