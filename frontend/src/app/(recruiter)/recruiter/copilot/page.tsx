"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Sparkles } from "lucide-react";
import { talentApi, type CandidateIntel } from "@/lib/talent-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  "Find top Java developers",
  "Find AI students",
  "Who is improving fastest?",
  "Who fits Google SDE role?",
  "Which candidates need one month of coaching?",
];

export default function RecruiterCopilotPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<CandidateIntel[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    setLoading(true);
    setQuery(q);
    try {
      const res = await talentApi.copilot(q);
      setAnswer(res.answer);
      setResults(res.candidates || []);
    } catch {
      setAnswer("Unable to process query. Ensure you are logged in as a recruiter.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
          <Sparkles className="h-8 w-8 text-violet-400" />
          AI Recruiter Copilot
        </h1>
        <p className="mt-2 text-slate-400">Natural language talent queries grounded in Digital Twin data</p>
      </header>

      <Card className="mb-6 border-white/10 bg-white/5">
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) ask(query.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about talent…"
              className="border-white/10 bg-black/30 text-white"
            />
            <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:border-violet-500/40 hover:text-violet-300"
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {answer && (
        <Card className="mb-6 border-violet-500/20 bg-violet-500/10">
          <CardHeader>
            <CardTitle className="text-white">Copilot</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-200">{answer}</CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Results</h2>
          {results.map((c) => (
            <Link
              key={c.userId}
              href={`/recruiter/candidates/${c.userId}`}
              className="block rounded-lg border border-white/10 bg-white/5 p-4 hover:border-cyan-500/30"
            >
              <div className="flex justify-between">
                <span className="font-medium text-white">{c.name}</span>
                <span className="text-cyan-400">PR {c.placementReadiness} · GP {c.growthPotentialScore}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
