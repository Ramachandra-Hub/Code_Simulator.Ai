"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { talentApi, type CandidateIntel } from "@/lib/talent-client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function RecruiterCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateIntel[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    talentApi
      .candidates()
      .then((r) => setCandidates(r.candidates))
      .finally(() => setLoading(false));
  }, []);

  const filtered = candidates.filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.college || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Candidates</h1>
        <p className="mt-2 text-slate-400">Digital Twin intelligence — never resume-only ranking</p>
      </header>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by name or college…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-white/10 bg-white/5 pl-10 text-white"
        />
      </div>

      {loading && <p className="text-slate-400">Loading talent pool…</p>}

      <div className="grid gap-4">
        {filtered.map((c) => (
          <Link key={c.userId} href={`/recruiter/candidates/${c.userId}`}>
            <Card className="border-white/10 bg-white/5 transition hover:border-cyan-500/30">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-lg font-semibold text-white">{c.name}</p>
                  <p className="text-sm text-slate-400">{c.college} · {c.targetRole || "Open role"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300">Placement {c.placementReadiness}</Badge>
                  <Badge className="bg-violet-500/20 text-violet-300">Growth {c.growthPotentialScore}</Badge>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">{c.growthTier}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
