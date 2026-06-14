"use client";

import { type LucideIcon } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

interface FeatureSection {
  title: string;
  description: string;
  items?: string[];
  badge?: string;
}

interface FeaturePageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  sections: FeatureSection[];
  actions?: { label: string; variant?: "default" | "gradient" | "outline" }[];
}

export function FeaturePage({
  title,
  subtitle,
  icon: Icon,
  gradient,
  sections,
  actions = [],
}: FeaturePageProps) {
  const { user } = useCurrentUser();

  return (
    <>
      <DashboardHeader user={user} title={title} />
      <main className="p-6 space-y-6">
        <div
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white`}
        >
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
            <div className="flex gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant === "gradient" ? "glass" : "glass"}
                  className="bg-white/20 text-white border-0 hover:bg-white/30"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title}>
              <Card className="glass-card h-full transition-all hover:shadow-glass-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.badge && (
                      <Badge variant="gradient">{section.badge}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                  {section.items && (
                    <ul className="mt-4 space-y-2">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
