"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { COMPANY_INTERVIEW_PACKS } from "@/lib/company-interview-packs";

type DriveStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  score?: number | null;
};

type DriveStatus = {
  company: { id: string; name: string; tagline: string } | null;
  steps: DriveStep[];
  driveReadiness: number;
  companyFit: number | null;
  placementReadiness: number;
  completedCount: number;
  totalSteps: number;
};

async function fetchDrive(company?: string): Promise<DriveStatus> {
  const q = company ? `?company=${company}` : "";
  const res = await fetch(`/api/placement/drive${q}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load placement drive");
  return res.json();
}

export function PlacementDrivePanel() {
  const [company, setCompany] = useState("tcs");
  const [data, setData] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDrive(company)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [company]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Full placement-day simulation — resume, aptitude, technical, coding, HR, and panel. Progress is tracked from your real activity.
        </p>
        <div className="flex flex-wrap gap-2">
          {COMPANY_INTERVIEW_PACKS.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={company === c.id ? "default" : "outline"}
              onClick={() => setCompany(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading drive status…
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Drive progress</p>
                <p className="text-2xl font-bold text-primary">{data.driveReadiness}%</p>
                <Progress value={data.driveReadiness} className="mt-2 h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {data.completedCount}/{data.totalSteps} rounds complete
                </p>
              </CardContent>
            </Card>
            {data.companyFit != null && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{data.company?.name} fit</p>
                  <p className="text-2xl font-bold">{data.companyFit}%</p>
                </CardContent>
              </Card>
            )}
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Twin readiness</p>
                <p className="text-2xl font-bold text-emerald-600">{data.placementReadiness}%</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {data.company?.name || "Company"} placement track
              </CardTitle>
              {data.company && (
                <p className="text-xs text-muted-foreground">{data.company.tagline}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {data.steps.map((step, i) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className="flex items-start gap-3 rounded-lg border border-border/60 p-3 hover:border-primary/40 transition-colors"
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {i + 1}. {step.title}
                      </p>
                      {step.score != null && (
                        <Badge variant="outline" className="text-[10px]">
                          {step.score}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Could not load placement drive.</p>
      )}
    </div>
  );
}
