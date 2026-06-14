"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Users, ClipboardCheck, Sparkles } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActionDialog } from "@/components/dashboard/action-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";

const facultyStats = [
  { title: "Active Courses", value: "6", change: 2, changeLabel: "this semester", icon: "GraduationCap", gradient: "from-violet-500 to-indigo-600" },
  { title: "Students", value: "248", change: 12, changeLabel: "enrolled", icon: "Users", gradient: "from-cyan-500 to-blue-600" },
  { title: "Assignments", value: "18", change: 5, changeLabel: "pending review", icon: "FileText", gradient: "from-emerald-500 to-teal-600" },
  { title: "Avg Score", value: "76%", change: 4, changeLabel: "class average", icon: "Target", gradient: "from-amber-500 to-orange-600" },
];

const AI_ACTIONS = [
  { label: "Generate Questions", fields: [{ id: "topic", label: "Topic", placeholder: "e.g. Binary Trees" }, { id: "count", label: "Number of Questions", placeholder: "10" }] },
  { label: "Create Assignment", fields: [{ id: "title", label: "Assignment Title" }, { id: "due", label: "Due Date", type: "date" }] },
  { label: "Coding Challenge", fields: [{ id: "title", label: "Challenge Title" }, { id: "difficulty", label: "Difficulty", placeholder: "Intermediate" }] },
  { label: "MCQ Bank", fields: [{ id: "subject", label: "Subject" }, { id: "count", label: "Questions", placeholder: "20" }] },
  { label: "Rubric Builder", fields: [{ id: "assignment", label: "Assignment Name" }, { id: "criteria", label: "Criteria", multiline: true }] },
];

export default function FacultyDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [dialog, setDialog] = useState<{ open: boolean; title: string; fields: typeof AI_ACTIONS[0]["fields"] }>({
    open: false, title: "", fields: [],
  });

  const openAI = (action: typeof AI_ACTIONS[0]) => {
    setDialog({ open: true, title: action.label, fields: action.fields });
  };

  return (
    <>
      <DashboardHeader user={user} title="Faculty Dashboard" />
      <ActionDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        title={dialog.title}
        description="AI will generate content based on your inputs."
        fields={dialog.fields}
        submitLabel="Generate with AI"
      />
      <main className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facultyStats.map((stat, i) => (
            <button key={stat.title} type="button" className="text-left" onClick={() => router.push(ROUTES.analytics)}>
              <StatCard stat={stat} index={i} />
            </button>
          ))}
        </div>

        <Card className="glass-card border-primary/20 bg-gradient-to-r from-violet-600/5 to-cyan-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Faculty AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate questions, assignments, coding challenges, MCQs, and evaluation rubrics instantly.
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_ACTIONS.map((action) => (
                <Button key={action.label} variant="outline" size="sm" onClick={() => openAI(action)}>
                  <Sparkles className="mr-2 h-3 w-3" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Courses
              </CardTitle>
              <Button size="sm" onClick={() => setDialog({ open: true, title: "Create Course", fields: [{ id: "name", label: "Course Name" }, { id: "desc", label: "Description", multiline: true }] })}>
                Create Course
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Data Structures & Algorithms", students: 120, progress: 68 },
                { name: "Machine Learning", students: 85, progress: 45 },
                { name: "Database Systems", students: 95, progress: 82 },
              ].map((course) => (
                <button
                  key={course.name}
                  type="button"
                  className="w-full rounded-xl border border-border/50 p-4 text-left hover:border-primary/30 transition-colors"
                  onClick={() => router.push(ROUTES.learnCourses)}
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{course.name}</p>
                    <Badge variant="info">{course.students} students</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{course.progress}% syllabus covered</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "DSA Assignment #4", count: 45, due: "Today" },
                { title: "ML Project Submissions", count: 28, due: "Tomorrow" },
                { title: "Coding Challenge - Graphs", count: 62, due: "Jun 12" },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-border/50 p-3 hover:border-primary/30 transition-colors"
                  onClick={() => { router.push(ROUTES.assessmentsBank); toast({ title: `Opening reviews: ${item.title}`, variant: "success" }); }}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.count} submissions</p>
                  </div>
                  <Badge variant="warning">{item.due}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "On Track", value: 186, color: "text-emerald-500" },
                { label: "Needs Attention", value: 42, color: "text-amber-500" },
                { label: "At Risk", value: 12, color: "text-rose-500" },
                { label: "Top Performers", value: 28, color: "text-violet-500" },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="rounded-xl border border-border/50 p-4 text-center hover:border-primary/30 transition-colors"
                  onClick={() => router.push(ROUTES.analytics)}
                >
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
