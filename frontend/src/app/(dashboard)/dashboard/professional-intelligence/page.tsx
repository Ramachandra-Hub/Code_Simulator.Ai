"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Award,
  Code2,
  Github,
  Linkedin,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import {
  connectGitHubOAuth,
  connectLinkedInOAuth,
  getProfessionalIntelligence,
  syncGitHub,
  syncHackerRank,
  syncLeetCode,
  syncLinkedIn,
  type ProfessionalIntelligenceData,
} from "@/lib/professional-intelligence-client";

export default function ProfessionalIntelligencePage() {
  return (
    <Suspense fallback={<div className="p-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ProfessionalIntelligenceContent />
    </Suspense>
  );
}

function ProfessionalIntelligenceContent() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ProfessionalIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [leetcodeUser, setLeetcodeUser] = useState("");
  const [hackerrankUser, setHackerrankUser] = useState("");
  const [githubUser, setGithubUser] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await getProfessionalIntelligence();
      setData(d);
      const lc = d.integrations.find((i) => i.provider === "leetcode");
      const hr = d.integrations.find((i) => i.provider === "hackerrank");
      const gh = d.integrations.find((i) => i.provider === "github");
      if (lc?.username) setLeetcodeUser(lc.username);
      if (hr?.username) setHackerrankUser(hr.username);
      if (gh?.username) setGithubUser(gh.username);
    } catch (err) {
      toast({
        title: "Failed to load",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      toast({ title: `${connected} connected`, description: "Profile synced to Digital Twin" });
    }
    if (error) {
      toast({ title: "Connection failed", description: decodeURIComponent(error), variant: "error" });
    }
  }, [searchParams, toast]);

  async function handleSync(provider: string, fn: () => Promise<unknown>) {
    setSyncing(provider);
    try {
      await fn();
      await load();
      toast({ title: "Synced", description: `${provider} intelligence updated` });
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      });
    } finally {
      setSyncing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-center text-muted-foreground">Could not load professional intelligence</div>;
  }

  const { scores } = data;

  return (
    <>
      <DashboardHeader user={user} title="Professional Intelligence" />
      <main className="p-6 space-y-6">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="text-sm">
              Connect GitHub, LinkedIn, LeetCode, and HackerRank to enrich your Digital Twin and placement readiness.
            </p>
          </div>
          <Badge variant="secondary">PR-8</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { title: "GitHub Score", value: `${Math.round(scores.githubScore)}`, changeLabel: "/ 100", icon: "Github", gradient: "from-slate-600 to-slate-800" },
            { title: "LinkedIn Score", value: `${Math.round(scores.linkedinScore)}`, changeLabel: "/ 100", icon: "Linkedin", gradient: "from-blue-600 to-blue-800" },
            { title: "Coding Score", value: `${Math.round(scores.codingScore)}`, changeLabel: "LeetCode + HackerRank", icon: "Code2", gradient: "from-amber-500 to-orange-600" },
            { title: "Professional Readiness", value: `${Math.round(scores.professionalReadiness)}`, changeLabel: "composite", icon: "Shield", gradient: "from-violet-500 to-purple-600" },
            { title: "Portfolio Strength", value: `${Math.round(scores.portfolioStrength)}`, changeLabel: "GitHub + LinkedIn", icon: "Briefcase", gradient: "from-emerald-500 to-teal-600" },
            { title: "LeetCode Score", value: `${Math.round(scores.leetcodeScore)}`, changeLabel: `HR ${Math.round(scores.hackerrankScore)}`, icon: "Trophy", gradient: "from-rose-500 to-red-600" },
          ].map((stat) => (
            <StatCard key={stat.title} stat={stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlatformCard
            title="GitHub"
            icon={<Github className="h-5 w-5" />}
            connected={data.integrations.find((i) => i.provider === "github")?.connected}
            lastSynced={data.integrations.find((i) => i.provider === "github")?.lastSynced}
            summary={
              data.github
                ? `${data.github.totalStars ?? 0} stars · ${Object.keys((data.github.languages as object) || {}).length} languages`
                : "Not synced"
            }
            syncing={syncing === "github"}
            onOAuth={connectGitHubOAuth}
            onSync={() => handleSync("github", () => syncGitHub(githubUser || undefined))}
          >
            <Input placeholder="GitHub username (manual sync)" value={githubUser} onChange={(e) => setGithubUser(e.target.value)} />
          </PlatformCard>

          <PlatformCard
            title="LinkedIn"
            icon={<Linkedin className="h-5 w-5" />}
            connected={data.integrations.find((i) => i.provider === "linkedin")?.connected}
            lastSynced={data.integrations.find((i) => i.provider === "linkedin")?.lastSynced}
            summary={data.linkedin ? String(data.linkedin.headline || "Profile synced") : "OAuth required"}
            syncing={syncing === "linkedin"}
            onOAuth={connectLinkedInOAuth}
            onSync={() => handleSync("linkedin", syncLinkedIn)}
          />

          <PlatformCard
            title="LeetCode"
            icon={<Code2 className="h-5 w-5" />}
            connected={data.integrations.find((i) => i.provider === "leetcode")?.connected}
            lastSynced={data.integrations.find((i) => i.provider === "leetcode")?.lastSynced}
            summary={
              data.leetcode
                ? `${data.leetcode.solved} solved (E${data.leetcode.easy}/M${data.leetcode.medium}/H${data.leetcode.hard})`
                : "Username sync"
            }
            syncing={syncing === "leetcode"}
            onSync={() => handleSync("leetcode", () => syncLeetCode(leetcodeUser))}
          >
            <Input placeholder="LeetCode username" value={leetcodeUser} onChange={(e) => setLeetcodeUser(e.target.value)} />
          </PlatformCard>

          <PlatformCard
            title="HackerRank"
            icon={<Award className="h-5 w-5" />}
            connected={data.integrations.find((i) => i.provider === "hackerrank")?.connected}
            lastSynced={data.integrations.find((i) => i.provider === "hackerrank")?.lastSynced}
            summary={
              data.hackerrank
                ? `${data.hackerrank.badges} badges · ${data.hackerrank.certificates} certs`
                : "Username sync"
            }
            syncing={syncing === "hackerrank"}
            onSync={() => handleSync("hackerrank", () => syncHackerRank(hackerrankUser))}
          >
            <Input placeholder="HackerRank username" value={hackerrankUser} onChange={(e) => setHackerrankUser(e.target.value)} />
          </PlatformCard>
        </div>

        {(() => {
          const strengths = [
            ...((data.github?.strengths as string[] | undefined) || []),
            ...((data.linkedin?.strengths as string[] | undefined) || []),
          ];
          if (!strengths.length) return null;
          return (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Detected Strengths</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {strengths.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </CardContent>
            </Card>
          );
        })()}
      </main>
    </>
  );
}

function PlatformCard({
  title,
  icon,
  connected,
  lastSynced,
  summary,
  syncing,
  onOAuth,
  onSync,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  connected?: boolean;
  lastSynced?: string | null;
  summary: string;
  syncing: boolean;
  onOAuth?: () => void;
  onSync: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <Badge variant={connected ? "default" : "secondary"}>{connected ? "Connected" : "Not connected"}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{summary}</p>
        {lastSynced && (
          <p className="text-xs text-muted-foreground">Last synced: {new Date(lastSynced).toLocaleString()}</p>
        )}
        {children}
        <div className="flex gap-2 flex-wrap">
          {onOAuth && (
            <Button variant="outline" size="sm" onClick={onOAuth}>
              OAuth Connect
            </Button>
          )}
          <Button size="sm" onClick={onSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
