"use client";

import { useEffect, useState } from "react";
import { talentApi } from "@/lib/talent-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecruiterAnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    talentApi.analytics().then(setData).catch(() => setData(null));
  }, []);

  const topColleges = (data?.topColleges as Array<{ name: string; count: number }>) || [];
  const topSkills = (data?.topSkills as Array<{ skill: string; count: number }>) || [];
  const availability = (data?.talentAvailability as Record<string, number>) || {};

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Recruiter Analytics</h1>
        <p className="mt-2 text-slate-400">Colleges, skills, placement trends, and talent availability</p>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Talent", value: data?.totalTalent as number | undefined },
          { label: "Avg Placement", value: data?.avgPlacement as number | undefined },
          { label: "High Growth", value: data?.highGrowth as number | undefined },
          { label: "Interview Ready", value: data?.interviewReady as number | undefined },
        ].map((s) => (
          <Card key={s.label} className="border-white/10 bg-white/5">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value != null ? String(s.value) : "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">Top Colleges</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topColleges.map((c) => (
              <div key={c.name} className="flex justify-between text-sm">
                <span className="text-slate-300">{c.name}</span>
                <span className="text-cyan-400">{c.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">Top Skills</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topSkills.map((s) => (
              <span key={s.skill} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                {s.skill} ({s.count})
              </span>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 lg:col-span-2">
          <CardHeader><CardTitle className="text-white">Talent Availability</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(availability).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-black/20 p-4 text-center">
                <p className="text-2xl font-bold text-white">{v}</p>
                <p className="text-xs capitalize text-slate-400">{k.replace(/([A-Z])/g, " $1")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
