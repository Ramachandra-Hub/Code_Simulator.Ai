import type { NavItem } from "./types";

/** Career OS — 4-pillar student navigation (no mock learning tabs). */
export const STUDENT_PRIMARY_NAV: NavItem[] = [
  {
    title: "Home",
    href: "/dashboard/student",
    icon: "LayoutDashboard",
  },
  {
    title: "Career",
    href: "/career-os",
    icon: "Rocket",
    children: [
      { title: "Career Coach", href: "/career-os?tab=coach", icon: "Sparkles" },
      { title: "Resume", href: "/career-os?tab=resume", icon: "FileText" },
      { title: "ATS", href: "/career-os?tab=ats", icon: "ScanSearch" },
      { title: "Digital Twin", href: "/career-os?tab=twin", icon: "Activity" },
      { title: "Reports", href: "/career-os?tab=reports", icon: "BarChart3" },
    ],
  },
  {
    title: "Interviews",
    href: "/interview",
    icon: "Mic",
    children: [
      { title: "Mock", href: "/interview?tab=mock", icon: "Mic" },
      { title: "Coding", href: "/interview?tab=coding", icon: "Code2" },
      { title: "Voice", href: "/interview?tab=voice", icon: "Volume2" },
      { title: "Panel", href: "/interview?tab=panel", icon: "Users" },
      { title: "Placement Drive", href: "/interview?tab=placement", icon: "Building2" },
      { title: "History", href: "/interview?tab=history", icon: "Calendar" },
    ],
  },
  {
    title: "Coding OS",
    href: "/coding-os",
    icon: "Code2",
    children: [
      { title: "Practice", href: "/coding-os?tab=practice", icon: "Code2" },
      { title: "DSA Roadmap", href: "/coding-os?tab=dsa", icon: "GitBranch" },
      { title: "SQL Lab", href: "/coding-os?tab=sql", icon: "Database" },
      { title: "Contests", href: "/coding-os?tab=contests", icon: "Trophy" },
      { title: "AI Mentor", href: "/coding-os?tab=mentor", icon: "Bot" },
    ],
  },
  {
    title: "Workplace AI",
    href: "/office",
    icon: "Building2",
    badge: "Sim",
  },
];

/** Deep links only — hidden from primary nav. */
export const STUDENT_SECONDARY_ROUTES = [
  "/learn",
  "/assessments",
  "/portfolio",
  "/placements",
  "/projects",
  "/ai-coach",
  "/analytics",
  "/leaderboard",
  "/profile",
  "/dashboard/professional-intelligence",
  "/resume-analysis",
] as const;

export function matchStudentNavSection(pathname: string): string | null {
  if (pathname.startsWith("/dashboard/student")) return "/dashboard/student";
  if (
    pathname.startsWith("/career-os") ||
    pathname.startsWith("/resume") ||
    pathname.startsWith("/ats") ||
    pathname.startsWith("/twin")
  ) {
    return "/career-os";
  }
  if (pathname.startsWith("/interview")) return "/interview";
  if (pathname.startsWith("/coding-os")) return "/coding-os";
  if (pathname.startsWith("/office")) return "/office";
  return null;
}
