"use client";

import { Suspense, useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { FeedbackWidget } from "@/components/beta/feedback-widget";
import { OnboardingWelcome } from "@/components/beta/onboarding-panel";
import { SystemStatusBanner } from "@/components/system/system-status-banner";
import { PageLoadTracker } from "@/components/beta/page-load-tracker";
import { ROLE_NAVIGATION } from "@/lib/constants";
import { fetchSession, getStoredSession } from "@/lib/auth-client";
import type { UserRole } from "@/lib/types";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [role, setRole] = useState<UserRole>(() => getStoredSession()?.role || "student");

  useEffect(() => {
    fetchSession().then((session) => {
      if (session?.role && ROLE_NAVIGATION[session.role]) {
        setRole(session.role);
      }
    });
  }, []);

  const navigation = ROLE_NAVIGATION[role];

  return (
    <div className="min-h-screen mesh-bg">
      <PageLoadTracker />
      <Suspense fallback={<aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border/50 bg-background/80" />}>
        <Sidebar navigation={navigation} role={role} />
      </Suspense>
      <div className="pl-64 transition-all duration-300">
        <SystemStatusBanner />
        {children}
      </div>
      <OnboardingWelcome />
      <FeedbackWidget />
    </div>
  );
}
