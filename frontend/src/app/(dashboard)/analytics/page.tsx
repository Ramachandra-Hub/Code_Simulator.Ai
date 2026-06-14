"use client";

import { Suspense } from "react";
import { BarChart3, Download } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { AnalyticsDashboardPanel } from "@/components/feature/tab-panels";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ExportPanel() {
  const { toast } = useToast();
  const exportReport = (format: string) => {
    toast({ title: `Report exported as ${format}`, description: "Download started", variant: "success" });
  };
  return (
    <Card className="glass-card max-w-md">
      <CardContent className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Export your analytics report</p>
        <Button className="w-full" onClick={() => exportReport("PDF")}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
        <Button className="w-full" variant="outline" onClick={() => exportReport("CSV")}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
      </CardContent>
    </Card>
  );
}

function AnalyticsContent() {
  return (
    <InteractiveModulePage
      title="Analytics & Insights"
      subtitle="Deep analytics for learning, coding, resume, interviews, and placements."
      icon={BarChart3}
      gradient="from-slate-600 via-zinc-600 to-neutral-600"
      defaultTab="dashboard"
      actions={[
        { label: "View Dashboard", href: "/analytics?tab=dashboard" },
        { label: "Export Report", href: "/analytics?tab=export" },
      ]}
      tabs={[
        { id: "dashboard", label: "Dashboard", content: <AnalyticsDashboardPanel /> },
        { id: "export", label: "Export", content: <ExportPanel /> },
      ]}
      sections={[
        { title: "Student", description: "Personal insights.", items: ["Learning", "Coding", "Resume", "Interview"] },
        { title: "Admin", description: "Institution data.", items: ["Placement", "Batch", "Department", "Heatmaps"] },
      ]}
    />
  );
}

export default function AnalyticsPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><AnalyticsContent /></Suspense>;
}
