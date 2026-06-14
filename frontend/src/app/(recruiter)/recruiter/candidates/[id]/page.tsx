"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { talentApi, type CandidateIntel } from "@/lib/talent-client";
import { ScoreGrid } from "@/components/recruiter/score-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<CandidateIntel | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (id) talentApi.candidate(id).then(setCandidate).catch(() => setCandidate(null));
  }, [id]);

  const shortlist = async (status: string) => {
    if (!id) return;
    try {
      await talentApi.shortlist({ candidateId: id, status, generatePlan: status === "shortlisted" });
      toast({ title: status === "shortlisted" ? "Shortlisted" : "Updated", description: "Shortlist saved with twin-based interview plan." });
    } catch {
      toast({ title: "Error", description: "Could not update shortlist", variant: "error" });
    }
  };

  if (!candidate) {
    return <div className="p-8 text-slate-400">Loading candidate intelligence…</div>;
  }

  const hiring = candidate.hiring;

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{candidate.name}</h1>
          <p className="mt-1 text-slate-400">{candidate.email} · {candidate.college}</p>
          <p className="text-sm text-cyan-400/80">Target: {candidate.targetRole || "—"}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => shortlist("shortlisted")} className="bg-emerald-600 hover:bg-emerald-700">Shortlist</Button>
          <Button onClick={() => shortlist("rejected")} variant="outline" className="border-red-500/30 text-red-300">Reject</Button>
        </div>
      </header>

      {hiring && (
        <Card className="mb-8 border-white/10 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              Hiring Recommendation
              <Badge className="bg-white/10 capitalize">{hiring.decision.replace(/_/g, " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>{hiring.reasoning}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 font-medium text-emerald-400">Highlights</p>
                <ul className="list-inside list-disc space-y-1">{hiring.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
              </div>
              <div>
                <p className="mb-1 font-medium text-amber-400">Risks</p>
                <ul className="list-inside list-disc space-y-1">{hiring.risks.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-4 text-xl font-semibold text-white">Intelligence Scores</h2>
      <ScoreGrid candidate={candidate} />

      <Card className="mt-8 border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Digital Twin Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 text-sm text-slate-300">
          <div>
            <p className="mb-2 font-medium text-emerald-400">Strengths</p>
            <div className="flex flex-wrap gap-2">
              {candidate.digitalTwinSummary.strengths.map((s) => (
                <Badge key={s} variant="outline" className="border-emerald-500/30">{s}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-medium text-amber-400">Development Areas</p>
            <div className="flex flex-wrap gap-2">
              {candidate.digitalTwinSummary.weaknesses.map((w) => (
                <Badge key={w} variant="outline" className="border-amber-500/30">{w}</Badge>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            <div><span className="text-slate-500">Executive Comm.</span><p className="text-lg font-semibold text-white">{candidate.digitalTwinSummary.executiveCommunication}</p></div>
            <div><span className="text-slate-500">Stakeholder Mgmt</span><p className="text-lg font-semibold text-white">{candidate.digitalTwinSummary.stakeholderManagement}</p></div>
            <div><span className="text-slate-500">Pressure Handling</span><p className="text-lg font-semibold text-white">{candidate.digitalTwinSummary.pressureHandling}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
