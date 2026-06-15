"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Mic,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ProductTourHint, SetupChecklist } from "@/components/beta/onboarding-panel";
import { careerOsApi } from "@/lib/career-os-client";
import { officeApi } from "@/lib/office-client";
import { ROUTES } from "@/lib/routes";

export default function StudentDashboard() {
  const { user } = useCurrentUser();
  const [career, setCareer] = useState<Record<string, unknown> | null>(null);
  const [office, setOffice] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([careerOsApi.overview(), officeApi.overview()])
      .then(([c, o]) => {
        setCareer(c);
        setOffice(o);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const daily = career?.dailyMission as { title?: string; tasks?: Array<{ title: string }> } | null;
  const forecast = (career?.placementForecast as Array<{ horizonDays?: number; probability?: number }>) || [];
  const todayWork = (office?.todayWork as Array<{ title?: string }>) || [];
  const session = office?.session as { company?: { name?: string }; role?: string } | undefined;

  return (
    <>
      <DashboardHeader user={user} title="Career OS Home" />
      <main className="p-6 space-y-6">
        <WelcomeBanner name={user.name} />
        <ProductTourHint />
        <SetupChecklist />

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Placement Readiness", value: career?.placementReadiness, href: "/career-os?tab=reports" },
            { label: "Current Potential", value: career?.currentPotential, href: "/career-os?tab=twin" },
            { label: "Future Potential", value: career?.futurePotential, href: "/career-os?tab=coach" },
            {
              label: "Office Sprint",
              value: (office?.sprint as { progress?: number })?.progress,
              suffix: "%",
              href: ROUTES.office,
            },
          ].map((s) => (
            <Link key={s.label} href={s.href}>
              <Card className="glass-card hover:border-primary/30 transition-colors h-full">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-primary">
                    {loading ? "…" : s.value != null ? `${s.value}${s.suffix || ""}` : "—"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Today&apos;s Career Actions
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/career-os?tab=coach">
                  Open Career <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!daily && !loading && (
                <Button onClick={() => careerOsApi.generateMissions().then(load)}>Generate missions</Button>
              )}
              <p className="text-sm font-medium">{daily?.title || "No mission yet"}</p>
              {(daily?.tasks || []).slice(0, 4).map((t, i) => (
                <div key={i} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                  {t.title}
                </div>
              ))}
              {forecast[0] && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">{forecast[0].horizonDays}-day placement forecast</p>
                  <Progress value={forecast[0].probability || 0} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/interview?tab=mock">
                  <Mic className="mr-2 h-4 w-4" /> Mock Interview
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/career-os?tab=resume">
                  <Rocket className="mr-2 h-4 w-4" /> Update Resume
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={ROUTES.office}>
                  <Building2 className="mr-2 h-4 w-4" /> Workplace AI
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Virtual Company — {session?.company?.name || "Your sprint"}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.office}>
                Dashboard <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayWork.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">No pending tasks — open Workplace AI to generate work.</p>
            )}
            {todayWork.slice(0, 5).map((t, i) => (
              <p key={i} className="text-sm">
                • {t.title}
              </p>
            ))}
            {session?.role && (
              <Badge variant="outline" className="capitalize mt-2">
                {session.role.replace(/_/g, " ")}
              </Badge>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
