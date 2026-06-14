"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { talentApi, type CandidateIntel } from "@/lib/talent-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RadarSegment = { category: string; title: string; candidates: CandidateIntel[] };

export default function TalentRadarPage() {
  const [radar, setRadar] = useState<RadarSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    talentApi
      .radar()
      .then((r) => setRadar(r.radar))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Talent Radar</h1>
        <p className="mt-2 text-slate-400">Segment-level talent intelligence across the ecosystem</p>
      </header>

      {loading && <p className="text-slate-400">Scanning talent segments…</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {radar.map((segment) => (
          <Card key={segment.category} className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">{segment.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(segment.candidates || []).slice(0, 6).map((c, i) => (
                <Link
                  key={c.userId}
                  href={`/recruiter/candidates/${c.userId}`}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm hover:border-cyan-500/30"
                >
                  <span className="text-slate-300">
                    <span className="mr-2 text-slate-500">#{i + 1}</span>
                    {c.name}
                  </span>
                  <span className="font-medium text-cyan-400">{c.placementReadiness}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
