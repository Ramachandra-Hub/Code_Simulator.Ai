"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Sparkles, TrendingUp, Users } from "lucide-react";
import { talentApi, type CandidateIntel } from "@/lib/talent-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecruiterOverviewPage() {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    talentApi
      .overview()
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, []);

  const topCandidates = (overview?.topCandidates as CandidateIntel[]) || [];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Talent Intelligence Overview</h1>
        <p className="mt-2 text-slate-400">What can candidates become — powered by Digital Twin signals</p>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Talent Pool", value: overview?.totalCandidates ?? "—", icon: Users, color: "from-cyan-500 to-blue-600" },
          { label: "Avg Placement Ready", value: overview?.avgPlacementReadiness ?? "—", icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
          { label: "High Growth", value: overview?.highGrowthCount ?? "—", icon: Sparkles, color: "from-violet-500 to-purple-600" },
          { label: "Open Jobs", value: overview?.openJobs ?? "—", icon: Briefcase, color: "from-amber-500 to-orange-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/10 bg-white/5 text-white">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl bg-gradient-to-br ${stat.color} p-3`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold">{loading ? "…" : String(stat.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Candidates</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-cyan-400">
              <Link href="/recruiter/candidates">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCandidates.length === 0 && !loading && (
              <p className="text-sm text-slate-400">No twin-enriched candidates yet. Students need Digital Twin activity.</p>
            )}
            {topCandidates.map((c) => (
              <Link
                key={c.userId}
                href={`/recruiter/candidates/${c.userId}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4 transition hover:border-cyan-500/40"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.college || c.targetRole || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">{c.growthTier}</Badge>
                  <span className="text-lg font-semibold text-emerald-400">{c.placementReadiness}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start bg-gradient-to-r from-cyan-600 to-violet-600">
              <Link href="/recruiter/copilot"><Sparkles className="mr-2 h-4 w-4" /> Ask AI Copilot</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-white/20 text-white">
              <Link href="/recruiter/radar">Open Talent Radar</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-white/20 text-white">
              <Link href="/recruiter/jobs">Upload Job Description</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start border-white/20 text-white">
              <Link href="/recruiter/shortlists">Manage Shortlists</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
