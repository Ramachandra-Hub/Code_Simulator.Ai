"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { talentApi } from "@/lib/talent-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RecruiterShortlistsPage() {
  const [shortlists, setShortlists] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    talentApi.shortlists().then((r) => setShortlists(r.shortlists));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Shortlists</h1>
          <p className="mt-2 text-slate-400">Shortlist, reject, add notes, export, and interview plans</p>
        </div>
        <Button asChild variant="outline" className="border-white/20 text-white">
          <a href="/api/recruiter/shortlists/export"><Download className="mr-2 h-4 w-4" /> Export CSV</a>
        </Button>
      </header>

      <div className="space-y-3">
        {shortlists.length === 0 && <p className="text-slate-400">No shortlists yet. Shortlist from a candidate profile.</p>}
        {shortlists.map((s) => {
          const candidate = s.candidate as { id: string; name: string; email: string };
          const job = s.job as { title?: string } | null;
          return (
            <Card key={String(s.id)} className="border-white/10 bg-white/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <Link href={`/recruiter/candidates/${candidate.id}`} className="font-semibold text-white hover:text-cyan-400">
                    {candidate.name}
                  </Link>
                  <p className="text-sm text-slate-400">{candidate.email} {job?.title ? `· ${job.title}` : ""}</p>
                  {Boolean(s.notes) && <p className="mt-1 text-sm text-slate-300">{String(s.notes)}</p>}
                </div>
                <Badge className={s.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}>
                  {String(s.status)}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
