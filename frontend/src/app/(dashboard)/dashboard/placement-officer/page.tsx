"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Calendar, FileCheck, TrendingUp } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionDialog } from "@/components/dashboard/action-dialog";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { chartData, placementDrives } from "@/lib/mock-data";

const placementStats = [
  { title: "Active Drives", value: "12", change: 4, changeLabel: "this month", icon: "Building2", gradient: "from-violet-500 to-indigo-600" },
  { title: "Applications", value: "1,840", change: 28, changeLabel: "submitted", icon: "FileText", gradient: "from-cyan-500 to-blue-600" },
  { title: "Interviews", value: "156", change: 15, changeLabel: "scheduled", icon: "Mic", gradient: "from-emerald-500 to-teal-600" },
  { title: "Offers", value: "89", change: 22, changeLabel: "extended", icon: "Briefcase", gradient: "from-amber-500 to-orange-600" },
];

export default function PlacementOfficerDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [addDriveOpen, setAddDriveOpen] = useState(false);

  return (
    <>
      <DashboardHeader user={user} title="Placement Officer Dashboard" />
      <ActionDialog
        open={addDriveOpen}
        onOpenChange={setAddDriveOpen}
        title="Add Company Drive"
        fields={[
          { id: "company", label: "Company Name" },
          { id: "role", label: "Job Role" },
          { id: "package", label: "Package (LPA)" },
          { id: "deadline", label: "Deadline", type: "date" },
        ]}
        submitLabel="Create Drive"
      />
      <main className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {placementStats.map((stat, i) => (
            <button key={stat.title} type="button" className="text-left" onClick={() => router.push(ROUTES.analytics)}>
              <StatCard stat={stat} index={i} />
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Drives
              </CardTitle>
              <Button size="sm" onClick={() => setAddDriveOpen(true)}>Add Drive</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {placementDrives.map((drive) => (
                <button
                  key={drive.id}
                  type="button"
                  className="w-full rounded-xl border border-border/50 p-4 text-left hover:border-primary/30 transition-colors"
                  onClick={() => router.push(ROUTES.placementsDrives)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{drive.company}</p>
                      <p className="text-sm text-muted-foreground">{drive.role}</p>
                    </div>
                    <Badge variant="success">{drive.package}</Badge>
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                    <span>{drive.applicants} applicants</span>
                    <span>Deadline: {drive.deadline}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Placement Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityChart data={chartData.placementFunnel} type="bar" dataKeys={["count"]} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { company: "Google", date: "Jun 15", students: 24, round: "Technical" },
                { company: "Microsoft", date: "Jun 18", students: 18, round: "HR" },
                { company: "Amazon", date: "Jun 20", students: 32, round: "Coding" },
              ].map((interview) => (
                <button
                  key={interview.company}
                  type="button"
                  className="flex w-full justify-between items-center rounded-xl border border-border/50 p-3 hover:border-primary/30 transition-colors"
                  onClick={() => { router.push(ROUTES.interviewHistory); toast({ title: `Scheduled: ${interview.company}`, variant: "success" }); }}
                >
                  <div className="text-left">
                    <p className="font-medium">{interview.company}</p>
                    <p className="text-xs text-muted-foreground">{interview.round} · {interview.students} students</p>
                  </div>
                  <Badge variant="info">{interview.date}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Salary Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { range: "₹30L+", count: 45, percent: 18 },
                { range: "₹20-30L", count: 128, percent: 52 },
                { range: "₹15-20L", count: 52, percent: 21 },
                { range: "₹10-15L", count: 23, percent: 9 },
              ].map((s) => (
                <button
                  key={s.range}
                  type="button"
                  className="flex w-full justify-between items-center hover:bg-accent/5 rounded-lg p-1 transition-colors"
                  onClick={() => router.push(ROUTES.analytics)}
                >
                  <span className="text-sm">{s.range}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{s.count} students</span>
                    <Badge variant="secondary">{s.percent}%</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
