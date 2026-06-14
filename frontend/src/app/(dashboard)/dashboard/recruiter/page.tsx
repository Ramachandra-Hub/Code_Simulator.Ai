"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Briefcase, Star } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";

const recruiterStats = [
  { title: "Active Drives", value: "5", change: 2, changeLabel: "open positions", icon: "Building2", gradient: "from-violet-500 to-indigo-600" },
  { title: "Candidates", value: "2,450", change: 35, changeLabel: "in pipeline", icon: "Users", gradient: "from-cyan-500 to-blue-600" },
  { title: "Shortlisted", value: "186", change: 12, changeLabel: "this week", icon: "Briefcase", gradient: "from-emerald-500 to-teal-600" },
  { title: "Offers Made", value: "24", change: 8, changeLabel: "pending", icon: "Target", gradient: "from-amber-500 to-orange-600" },
];

const allCandidates = [
  { name: "Arjun Mehta", skills: ["React", "Node.js", "DSA"], ats: 94, coding: 2450, branch: "CSE" },
  { name: "Priya Reddy", skills: ["Python", "ML", "TensorFlow"], ats: 91, coding: 2180, branch: "CSE" },
  { name: "Rahul Verma", skills: ["Java", "Spring", "AWS"], ats: 88, coding: 1920, branch: "IT" },
  { name: "Sneha Iyer", skills: ["Go", "Kubernetes", "DevOps"], ats: 92, coding: 2100, branch: "CSE" },
];

const FILTERS = ["ATS 90+", "Coding 2000+", "CSE", "Available"];

export default function RecruiterDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [candidates, setCandidates] = useState(allCandidates);

  const toggleFilter = (f: string) => {
    setActiveFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const runSearch = () => {
    let results = allCandidates;
    if (query) {
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.branch.toLowerCase().includes(query.toLowerCase()) ||
          c.skills.some((s) => s.toLowerCase().includes(query.toLowerCase()))
      );
    }
    if (activeFilters.includes("ATS 90+")) results = results.filter((c) => c.ats >= 90);
    if (activeFilters.includes("Coding 2000+")) results = results.filter((c) => c.coding >= 2000);
    if (activeFilters.includes("CSE")) results = results.filter((c) => c.branch === "CSE");
    setCandidates(results);
    toast({ title: `Found ${results.length} candidates`, variant: "success" });
  };

  return (
    <>
      <DashboardHeader user={user} title="Recruiter Portal" />
      <main className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recruiterStats.map((stat, i) => (
            <button key={stat.title} type="button" className="text-left" onClick={() => router.push(ROUTES.analytics)}>
              <StatCard stat={stat} index={i} />
            </button>
          ))}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Talent Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4 md:flex-row"
              onSubmit={(e) => { e.preventDefault(); runSearch(); }}
            >
              <Input
                placeholder="Search by name, skill, or branch..."
                className="flex-1"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap">
                {FILTERS.map((f) => (
                  <Badge
                    key={f}
                    variant={activeFilters.includes(f) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter(f)}
                  >
                    {f}
                  </Badge>
                ))}
                <Button variant="gradient" size="sm" type="submit">Search</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Candidates
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { setCandidates(allCandidates); setQuery(""); setActiveFilters([]); }}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate.name}
                  className="flex flex-col gap-4 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {candidate.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground">{candidate.branch}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {candidate.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-500">{candidate.ats}</p>
                      <p className="text-[10px] text-muted-foreground">ATS Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-violet-500">{candidate.coding}</p>
                      <p className="text-[10px] text-muted-foreground">Coding</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.portfolioBuilder)}>
                      <Star className="mr-1 h-3 w-3" />
                      View Portfolio
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Active Job Drives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { role: "Software Engineer", applicants: 342, shortlisted: 45 },
                { role: "ML Engineer", applicants: 128, shortlisted: 22 },
                { role: "SDE Intern", applicants: 520, shortlisted: 80 },
              ].map((job) => (
                <button
                  key={job.role}
                  type="button"
                  className="flex w-full justify-between rounded-xl border border-border/50 p-3 hover:border-primary/30 transition-colors"
                  onClick={() => router.push(ROUTES.placementsDrives)}
                >
                  <div className="text-left">
                    <p className="font-medium">{job.role}</p>
                    <p className="text-xs text-muted-foreground">{job.applicants} applicants</p>
                  </div>
                  <Badge variant="success">{job.shortlisted} shortlisted</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Hiring Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { metric: "Time to Hire", value: "18 days" },
                { metric: "Offer Acceptance", value: "82%" },
                { metric: "Quality of Hire", value: "4.2/5" },
                { metric: "Pipeline Conversion", value: "12%" },
              ].map((m) => (
                <button
                  key={m.metric}
                  type="button"
                  className="flex w-full justify-between items-center hover:bg-accent/5 rounded-lg p-1 -m-1 transition-colors"
                  onClick={() => router.push(ROUTES.analytics)}
                >
                  <span className="text-sm text-muted-foreground">{m.metric}</span>
                  <span className="font-semibold">{m.value}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
