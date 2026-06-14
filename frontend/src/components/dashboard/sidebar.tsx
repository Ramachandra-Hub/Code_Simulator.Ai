"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  Building,
  Building2,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Code2,
  CreditCard,
  FileCheck,
  FileText,
  FolderKanban,
  GitBranch,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Mic,
  Rocket,
  ScanSearch,
  Search,
  Sparkles,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import { matchStudentNavSection } from "@/lib/student-nav";
import type { NavItem, UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  Code2,
  GitBranch,
  ClipboardCheck,
  FileText,
  ScanSearch,
  Mic,
  Rocket,
  Briefcase,
  FolderKanban,
  Building2,
  Sparkles,
  BarChart3,
  Trophy,
  BookOpen,
  ClipboardList,
  Users,
  UserCog,
  Building,
  Layers,
  CreditCard,
  TrendingUp: Activity,
  Activity,
  FileCheck,
  Calendar,
  Search,
};

function isChildActive(pathname: string, searchParams: URLSearchParams, child: NavItem): boolean {
  const [base, query] = child.href.split("?");
  if (query) {
    const params = new URLSearchParams(query);
    const tab = params.get("tab");
    if (tab) return pathname === base && searchParams.get("tab") === tab;
  }
  return pathname === child.href || pathname.startsWith(`${child.href}/`);
}

interface SidebarProps {
  navigation: NavItem[];
  role: UserRole;
  collapsed?: boolean;
}

export function Sidebar({ navigation, role, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = role === "student" ? matchStudentNavSection(pathname) : null;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-background/80 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <Link
        href={ROLE_DASHBOARD_PATHS[role]}
        className="flex h-16 items-center gap-3 border-b border-border/50 px-4 hover:bg-accent/5 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-glow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold">{APP_NAME}</p>
            <p className="truncate text-[10px] text-muted-foreground capitalize">
              {role.replace(/_/g, " ")}
            </p>
          </div>
        )}
      </Link>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isParentActive =
              pathname === item.href ||
              (item.href !== "/dashboard/student" && activeSection === item.href) ||
              (item.href !== "/dashboard/student" && pathname.startsWith(item.href));

            const showChildren = !collapsed && item.children?.length && isParentActive;

            return (
              <li key={`${item.href}::${item.title}`}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isParentActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                  )}
                >
                  {isParentActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="relative h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="relative flex-1 truncate">{item.title}</span>
                      {item.badge && (
                        <Badge variant="gradient" className="relative text-[10px] px-1.5">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>

                <AnimatePresence>
                  {showChildren && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-4 mt-1 space-y-0.5 overflow-hidden border-l border-border/50 pl-3"
                    >
                      {item.children!.map((child) => {
                        const ChildIcon = iconMap[child.icon] || LayoutDashboard;
                        const childActive = isChildActive(pathname, searchParams, child);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                                childActive
                                  ? "text-primary bg-primary/5"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
                              )}
                            >
                              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{child.title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
