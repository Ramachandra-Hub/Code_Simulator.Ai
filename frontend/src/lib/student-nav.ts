import type { NavItem } from "./types";

/** Simplified 5-pillar student navigation (UX Sprint). */
export const STUDENT_PRIMARY_NAV: NavItem[] = [
  {
    title: "Home",
    href: "/dashboard/student",
    icon: "LayoutDashboard",
  },
  {
    title: "Learning",
    href: "/learn",
    icon: "GraduationCap",
    children: [
      { title: "Courses", href: "/learn?tab=courses", icon: "BookOpen" },
      { title: "Learning Paths", href: "/learn?tab=paths", icon: "GitBranch" },
      { title: "Coding Lab", href: "/coding", icon: "Code2" },
      { title: "DSA Practice", href: "/dsa", icon: "GitBranch" },
      { title: "Assessments", href: "/assessments", icon: "ClipboardCheck" },
    ],
  },
  {
    title: "Career",
    href: "/career-os",
    icon: "Rocket",
    children: [
      { title: "Career Coach", href: "/career-os", icon: "Sparkles" },
      { title: "Goals & Missions", href: "/career-os/goals", icon: "Trophy" },
      { title: "Resume Builder", href: "/resume", icon: "FileText" },
      { title: "ATS Analyzer", href: "/ats", icon: "ScanSearch" },
      { title: "Intelligence Profile", href: "/twin", icon: "Activity" },
      { title: "Portfolio", href: "/portfolio", icon: "Briefcase" },
      { title: "Placements", href: "/placements", icon: "Building2" },
    ],
  },
  {
    title: "Interviews",
    href: "/interview",
    icon: "Mic",
    children: [
      { title: "Start Interview", href: "/interview?tab=start", icon: "Mic" },
      { title: "Past Sessions", href: "/interview?tab=history", icon: "Calendar" },
    ],
  },
  {
    title: "Workplace AI",
    href: "/office",
    icon: "Building2",
    badge: "Sim",
    children: [
      { title: "Office Overview", href: "/office", icon: "Building2" },
      { title: "Today's Work", href: "/office/work", icon: "ClipboardCheck" },
      { title: "Meetings", href: "/office/meetings", icon: "Calendar" },
      { title: "Performance", href: "/office/performance", icon: "BarChart3" },
    ],
  },
];

/** Routes removed from primary nav — still accessible via search, journey, or deep links. */
export const STUDENT_SECONDARY_ROUTES = [
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
  if (pathname.startsWith("/learn") || pathname.startsWith("/coding") || pathname.startsWith("/dsa") || pathname.startsWith("/assessments")) {
    return "/learn";
  }
  if (
    pathname.startsWith("/career-os") ||
    pathname.startsWith("/resume") ||
    pathname.startsWith("/ats") ||
    pathname.startsWith("/twin") ||
    pathname.startsWith("/portfolio") ||
    pathname.startsWith("/placements")
  ) {
    return "/career-os";
  }
  if (pathname.startsWith("/interview")) return "/interview";
  if (pathname.startsWith("/office")) return "/office";
  return null;
}
