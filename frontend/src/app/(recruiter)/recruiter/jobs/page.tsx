"use client";

import { useEffect, useState } from "react";
import { talentApi } from "@/lib/talent-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const { toast } = useToast();

  const load = () => talentApi.jobs().then((r) => setJobs(r.jobs));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title || !description) return;
    await talentApi.createJob({
      title,
      description,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setTitle("");
    setDescription("");
    setSkills("");
    toast({ title: "Job created", description: "Run matching to rank candidates." });
    load();
  };

  const match = async (jobId: string) => {
    toast({ title: "Matching…", description: "Computing twin-based job fit." });
    await talentApi.matchJob(jobId);
    toast({ title: "Done", description: "Candidate rankings updated." });
    load();
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Jobs</h1>
        <p className="mt-2 text-slate-400">Upload job descriptions and run AI job-fit matching</p>
      </header>

      <Card className="mb-8 border-white/10 bg-white/5">
        <CardHeader><CardTitle className="text-white">New Job Description</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Title (e.g. SDE II — Backend)" value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-black/30 text-white" />
          <Textarea placeholder="Paste full job description…" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="border-white/10 bg-black/30 text-white" />
          <Input placeholder="Skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} className="border-white/10 bg-black/30 text-white" />
          <Button onClick={create} className="bg-cyan-600 hover:bg-cyan-700">Create & Match Later</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {jobs.map((job) => (
          <Card key={String(job.id)} className="border-white/10 bg-white/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-white">{String(job.title)}</p>
                <p className="text-sm text-slate-400">{String(job.status)} · {(job._count as { matches?: number })?.matches || 0} matches</p>
              </div>
              <Button onClick={() => match(String(job.id))} variant="outline" className="border-cyan-500/30 text-cyan-300">
                Run Job Fit Matching
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
