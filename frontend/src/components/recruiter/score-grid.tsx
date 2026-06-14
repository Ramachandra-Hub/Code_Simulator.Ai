"use client";

import { Progress } from "@/components/ui/progress";
import type { CandidateIntel } from "@/lib/talent-client";

const SCORES: Array<{ key: keyof CandidateIntel; label: string }> = [
  { key: "resumeScore", label: "Resume Score" },
  { key: "atsScore", label: "ATS Score" },
  { key: "technicalScore", label: "Technical Score" },
  { key: "codingScore", label: "Coding Score" },
  { key: "communicationScore", label: "Communication Score" },
  { key: "confidenceScore", label: "Confidence Score" },
  { key: "panelReadiness", label: "Panel Readiness" },
  { key: "placementReadiness", label: "Placement Readiness" },
  { key: "githubScore", label: "GitHub Score" },
  { key: "linkedinScore", label: "LinkedIn Score" },
  { key: "leetcodeScore", label: "LeetCode Score" },
  { key: "hackerrankScore", label: "HackerRank Score" },
  { key: "professionalReadiness", label: "Professional Readiness" },
  { key: "growthPotentialScore", label: "Growth Potential" },
  { key: "careerVelocityScore", label: "Career Velocity" },
  { key: "learningVelocity", label: "Learning Velocity" },
];

export function ScoreGrid({ candidate }: { candidate: CandidateIntel }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {SCORES.map(({ key, label }) => {
        const value = Number(candidate[key]) || 0;
        return (
          <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">{label}</span>
              <span className="font-semibold text-white">{Math.round(value)}</span>
            </div>
            <Progress value={value} className="h-1.5 bg-white/10" />
          </div>
        );
      })}
    </div>
  );
}
