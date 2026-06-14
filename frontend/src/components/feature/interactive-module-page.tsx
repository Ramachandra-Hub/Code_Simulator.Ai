"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/profile";

export interface ModuleAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ModuleTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface ModuleSection {
  title: string;
  description: string;
  items?: string[];
  badge?: string;
  onItemClick?: (item: string) => void;
}

interface InteractiveModulePageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  actions?: ModuleAction[];
  tabs: ModuleTab[];
  sections?: ModuleSection[];
  defaultTab?: string;
  footer?: React.ReactNode;
}

export function InteractiveModulePage({
  title,
  subtitle,
  icon: Icon,
  gradient,
  actions = [],
  tabs,
  sections = [],
  defaultTab,
  footer,
}: InteractiveModulePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState(getCurrentUser());

  const tabParam = searchParams.get("tab");
  const activeTab = tabs.find((t) => t.id === tabParam)?.id ?? defaultTab ?? tabs[0]?.id;

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const setTab = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    router.push(url.pathname + url.search);
  };

  const runAction = (action: ModuleAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  return (
    <>
      <DashboardHeader user={user} title={title} />
      <main className="p-6 space-y-6">
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white`}>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="mt-1 text-white/80 max-w-xl">{subtitle}</p>
              </div>
            </div>
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) =>
                  action.href && !action.onClick ? (
                    <Button
                      key={action.label}
                      asChild
                      className="bg-white/20 text-white border-0 hover:bg-white/30"
                    >
                      <Link href={action.href}>{action.label}</Link>
                    </Button>
                  ) : (
                    <Button
                      key={action.label}
                      className="bg-white/20 text-white border-0 hover:bg-white/30"
                      onClick={() => runAction(action)}
                    >
                      {action.label}
                    </Button>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>

        {sections.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <Card key={section.title} className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.badge && <Badge variant="gradient">{section.badge}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                  {section.items && (
                    <ul className="mt-4 space-y-2">
                      {section.items.map((item) => (
                        <li key={item}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left hover:bg-accent/10 transition-colors"
                            onClick={() => {
                              section.onItemClick?.(item);
                              toast({ title: `Selected: ${item}`, variant: "success" });
                            }}
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {item}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {footer}
      </main>
    </>
  );
}
