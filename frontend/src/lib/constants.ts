import type { NavItem, UserRole } from "./types";
import { STUDENT_PRIMARY_NAV } from "./student-nav";

export const APP_NAME = "NexusEdge AI";
export const APP_TAGLINE = "The Ultimate AI-Powered Career Ecosystem";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  college_admin: "College Admin",
  placement_officer: "Placement Officer",
  training_coordinator: "Training Coordinator",
  faculty: "Faculty",
  recruiter: "Recruiter",
  student: "Student",
};

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  super_admin: "/dashboard/super-admin",
  college_admin: "/dashboard/college-admin",
  placement_officer: "/dashboard/placement-officer",
  training_coordinator: "/dashboard/training-coordinator",
  faculty: "/dashboard/faculty",
  recruiter: "/recruiter",
  student: "/dashboard/student",
};

const studentNav: NavItem[] = STUDENT_PRIMARY_NAV;

const facultyNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard/faculty", icon: "LayoutDashboard" },
  { title: "Courses", href: "/learn", icon: "BookOpen" },
  { title: "Assignments", href: "/assessments", icon: "ClipboardList" },
  { title: "Coding Challenges", href: "/coding", icon: "Code2" },
  { title: "Students", href: "/analytics", icon: "Users" },
  { title: "AI Assistant", href: "/ai-coach", icon: "Sparkles", badge: "AI" },
  { title: "Profile", href: "/profile", icon: "UserCog" },
];

const collegeAdminNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard/college-admin", icon: "LayoutDashboard" },
  { title: "Beta Dashboard", href: "/dashboard/beta", icon: "BarChart3", badge: "Beta" },
  { title: "Beta Insights", href: "/dashboard/beta/insights", icon: "Sparkles", badge: "AI" },
  { title: "AI Quality", href: "/dashboard/beta/ai-quality", icon: "Activity", badge: "PR-6" },
  { title: "Stability", href: "/dashboard/beta/stability", icon: "Activity", badge: "Ops" },
  { title: "Students", href: "/analytics", icon: "Users" },
  { title: "Faculty", href: "/learn", icon: "UserCog" },
  { title: "Departments", href: "/placements", icon: "Building" },
  { title: "Batches", href: "/leaderboard", icon: "Layers" },
  { title: "Placements", href: "/placements", icon: "Building2" },
  { title: "Assessments", href: "/assessments", icon: "ClipboardCheck" },
  { title: "Analytics", href: "/analytics", icon: "BarChart3" },
  { title: "Profile", href: "/profile", icon: "UserCog" },
];

const superAdminNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard/super-admin", icon: "LayoutDashboard" },
  { title: "Beta Dashboard", href: "/dashboard/beta", icon: "BarChart3", badge: "Beta" },
  { title: "Beta Insights", href: "/dashboard/beta/insights", icon: "Sparkles", badge: "AI" },
  { title: "AI Quality", href: "/dashboard/beta/ai-quality", icon: "Activity", badge: "PR-6" },
  { title: "Stability", href: "/dashboard/beta/stability", icon: "Activity", badge: "Ops" },
  { title: "Institutions", href: "/analytics?tab=institutions", icon: "Building2" },
  { title: "Subscriptions", href: "/placements", icon: "CreditCard" },
  { title: "Revenue", href: "/analytics?tab=revenue", icon: "TrendingUp" },
  { title: "Users", href: "/leaderboard", icon: "Users" },
  { title: "AI Usage", href: "/ai-coach", icon: "Sparkles" },
  { title: "System Health", href: "/coding", icon: "Activity" },
  { title: "Profile", href: "/profile", icon: "UserCog" },
];

const placementOfficerNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard/placement-officer", icon: "LayoutDashboard" },
  { title: "Beta Dashboard", href: "/dashboard/beta", icon: "BarChart3", badge: "Beta" },
  { title: "Beta Insights", href: "/dashboard/beta/insights", icon: "Sparkles", badge: "AI" },
  { title: "AI Quality", href: "/dashboard/beta/ai-quality", icon: "Activity", badge: "PR-6" },
  { title: "Stability", href: "/dashboard/beta/stability", icon: "Activity", badge: "Ops" },
  { title: "Company Drives", href: "/placements", icon: "Building2" },
  { title: "Applications", href: "/assessments", icon: "FileCheck" },
  { title: "Interviews", href: "/interview", icon: "Calendar" },
  { title: "Reports", href: "/analytics", icon: "BarChart3" },
  { title: "Students", href: "/portfolio", icon: "Users" },
  { title: "Profile", href: "/profile", icon: "UserCog" },
];

const trainingCoordinatorNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard/training-coordinator", icon: "LayoutDashboard" },
  { title: "Programs", href: "/learn", icon: "GraduationCap" },
  { title: "Batches", href: "/leaderboard", icon: "Layers" },
  { title: "Assessments", href: "/assessments", icon: "ClipboardCheck" },
  { title: "Progress", href: "/analytics", icon: "BarChart3" },
  { title: "Profile", href: "/profile", icon: "UserCog" },
];

const recruiterNav: NavItem[] = [
  { title: "Talent OS", href: "/recruiter", icon: "LayoutDashboard", badge: "PR-10" },
  { title: "Candidates", href: "/recruiter/candidates", icon: "Users" },
  { title: "Talent Radar", href: "/recruiter/radar", icon: "Activity" },
  { title: "AI Copilot", href: "/recruiter/copilot", icon: "Sparkles", badge: "AI" },
  { title: "Jobs", href: "/recruiter/jobs", icon: "Briefcase" },
  { title: "Shortlists", href: "/recruiter/shortlists", icon: "Target" },
  { title: "Analytics", href: "/recruiter/analytics", icon: "BarChart3" },
  { title: "Profile", href: "/profile", icon: "UserCog" },
];

export const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
  super_admin: superAdminNav,
  college_admin: collegeAdminNav,
  placement_officer: placementOfficerNav,
  training_coordinator: trainingCoordinatorNav,
  faculty: facultyNav,
  recruiter: recruiterNav,
  student: studentNav,
};

export const LEARNING_PATHS = [
  "Python Developer",
  "Java Developer",
  "Full Stack Developer",
  "Data Scientist",
  "AI Engineer",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "Cybersecurity Engineer",
  "DevOps Engineer",
];

export const DSA_TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Stacks",
  "Queues",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Backtracking",
];

export const CODING_LANGUAGES = [
  "Python",
  "Java",
  "C",
  "C++",
  "JavaScript",
  "TypeScript",
  "Go",
  "Rust",
];
