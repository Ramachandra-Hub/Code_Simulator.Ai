import type {
  Assessment,
  Badge,
  CodingProblem,
  LearningPath,
  Notification,
  PlacementDrive,
  StatCard,
  User,
} from "./types";

export const demoUsers: Record<string, User> = {
  student: {
    id: "1",
    name: "Arjun Mehta",
    email: "arjun@nexusedge.edu",
    role: "student",
    institution: "IIT Delhi",
    department: "Computer Science",
    avatar: "AM",
  },
  faculty: {
    id: "2",
    name: "Dr. Priya Sharma",
    email: "priya@nexusedge.edu",
    role: "faculty",
    institution: "IIT Delhi",
    department: "Computer Science",
    avatar: "PS",
  },
  college_admin: {
    id: "3",
    name: "Prof. Rajesh Kumar",
    email: "rajesh@nexusedge.edu",
    role: "college_admin",
    institution: "IIT Delhi",
    avatar: "RK",
  },
  super_admin: {
    id: "4",
    name: "Alex Chen",
    email: "alex@nexusedge.ai",
    role: "super_admin",
    avatar: "AC",
  },
  placement_officer: {
    id: "5",
    name: "Sneha Patel",
    email: "sneha@nexusedge.edu",
    role: "placement_officer",
    institution: "IIT Delhi",
    avatar: "SP",
  },
  training_coordinator: {
    id: "6",
    name: "Vikram Singh",
    email: "vikram@nexusedge.edu",
    role: "training_coordinator",
    institution: "IIT Delhi",
    avatar: "VS",
  },
  recruiter: {
    id: "7",
    name: "Sarah Johnson",
    email: "sarah@google.com",
    role: "recruiter",
    avatar: "SJ",
  },
};

export const studentStats: StatCard[] = [
  {
    title: "Career Readiness",
    value: "87%",
    change: 12,
    changeLabel: "vs last month",
    icon: "Target",
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    title: "Coding Score",
    value: "2,450",
    change: 8,
    changeLabel: "problems solved",
    icon: "Code2",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    title: "Learning Progress",
    value: "68%",
    change: 5,
    changeLabel: "courses completed",
    icon: "GraduationCap",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Placement Readiness",
    value: "92%",
    change: 15,
    changeLabel: "index score",
    icon: "Building2",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "Resume Score",
    value: "94/100",
    change: 6,
    changeLabel: "ATS optimized",
    icon: "FileText",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    title: "Interview Ready",
    value: "78%",
    change: -2,
    changeLabel: "mock score avg",
    icon: "Mic",
    gradient: "from-purple-500 to-violet-600",
  },
];

export const superAdminStats: StatCard[] = [
  {
    title: "Active Institutions",
    value: "248",
    change: 18,
    changeLabel: "this quarter",
    icon: "Building2",
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    title: "Active Students",
    value: "1.2M",
    change: 24,
    changeLabel: "YoY growth",
    icon: "Users",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    title: "Active Recruiters",
    value: "3,450",
    change: 32,
    changeLabel: "partners",
    icon: "Briefcase",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Monthly Revenue",
    value: "₹4.2Cr",
    change: 28,
    changeLabel: "MRR",
    icon: "IndianRupee",
    gradient: "from-amber-500 to-orange-600",
  },
];

export const learningPaths: LearningPath[] = [
  {
    id: "1",
    title: "Full Stack Developer",
    description: "Master React, Node.js, and cloud deployment",
    progress: 72,
    modules: 24,
    duration: "16 weeks",
    level: "Intermediate",
    skills: ["React", "Node.js", "PostgreSQL", "AWS"],
  },
  {
    id: "2",
    title: "AI Engineer",
    description: "Build production AI systems with LLMs",
    progress: 45,
    modules: 18,
    duration: "12 weeks",
    level: "Advanced",
    skills: ["Python", "PyTorch", "OpenAI", "MLOps"],
  },
  {
    id: "3",
    title: "Data Scientist",
    description: "Analytics, ML, and data visualization",
    progress: 88,
    modules: 20,
    duration: "14 weeks",
    level: "Intermediate",
    skills: ["Python", "Pandas", "Scikit-learn", "Tableau"],
  },
];

export const codingProblems: CodingProblem[] = [
  {
    id: "1",
    title: "Two Sum",
    difficulty: "Beginner",
    topic: "Arrays",
    acceptance: 49.2,
    solved: true,
  },
  {
    id: "2",
    title: "Merge K Sorted Lists",
    difficulty: "Advanced",
    topic: "Linked Lists",
    acceptance: 42.1,
    solved: false,
  },
  {
    id: "3",
    title: "Longest Palindromic Substring",
    difficulty: "Intermediate",
    topic: "Dynamic Programming",
    acceptance: 33.8,
    solved: true,
  },
  {
    id: "4",
    title: "Binary Tree Maximum Path Sum",
    difficulty: "Interview Level",
    topic: "Trees",
    acceptance: 38.5,
    solved: false,
  },
];

export const upcomingAssessments: Assessment[] = [
  {
    id: "1",
    title: "DSA Mid-Term Assessment",
    type: "Coding",
    date: "2026-06-15",
    duration: "2 hours",
    status: "upcoming",
  },
  {
    id: "2",
    title: "Aptitude Round - TCS",
    type: "Aptitude",
    date: "2026-06-18",
    duration: "1 hour",
    status: "upcoming",
  },
  {
    id: "3",
    title: "System Design Quiz",
    type: "MCQ",
    date: "2026-06-20",
    duration: "45 min",
    status: "upcoming",
  },
];

export const placementDrives: PlacementDrive[] = [
  {
    id: "1",
    company: "Google",
    role: "Software Engineer",
    package: "₹45 LPA",
    deadline: "2026-06-25",
    eligible: true,
    applicants: 342,
  },
  {
    id: "2",
    company: "Microsoft",
    role: "SDE-II",
    package: "₹38 LPA",
    deadline: "2026-06-28",
    eligible: true,
    applicants: 289,
  },
  {
    id: "3",
    company: "Amazon",
    role: "SDE",
    package: "₹32 LPA",
    deadline: "2026-07-02",
    eligible: false,
    applicants: 456,
  },
];

export const notifications: Notification[] = [
  {
    id: "1",
    title: "New Placement Drive",
    message: "Google is hiring! Apply before June 25.",
    type: "success",
    time: "2 min ago",
    read: false,
  },
  {
    id: "2",
    title: "Assessment Reminder",
    message: "DSA Mid-Term starts in 5 days.",
    type: "warning",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    title: "Achievement Unlocked",
    message: "You earned the '100 Day Streak' badge!",
    type: "info",
    time: "3 hours ago",
    read: true,
  },
];

export const badges: Badge[] = [
  {
    id: "1",
    name: "Code Warrior",
    description: "Solved 100 coding problems",
    icon: "Sword",
    earned: true,
    earnedAt: "2026-05-15",
  },
  {
    id: "2",
    name: "Streak Master",
    description: "30-day learning streak",
    icon: "Flame",
    earned: true,
    earnedAt: "2026-06-01",
  },
  {
    id: "3",
    name: "Interview Pro",
    description: "Score 90+ in mock interview",
    icon: "Mic",
    earned: false,
  },
];

export const chartData = {
  weeklyActivity: [
    { day: "Mon", coding: 4, learning: 2, interview: 1 },
    { day: "Tue", coding: 3, learning: 3, interview: 0 },
    { day: "Wed", coding: 5, learning: 2, interview: 1 },
    { day: "Thu", coding: 2, learning: 4, interview: 0 },
    { day: "Fri", coding: 6, learning: 1, interview: 1 },
    { day: "Sat", coding: 4, learning: 3, interview: 2 },
    { day: "Sun", coding: 3, learning: 2, interview: 0 },
  ],
  skillDistribution: [
    { skill: "DSA", value: 85 },
    { skill: "System Design", value: 62 },
    { skill: "Frontend", value: 78 },
    { skill: "Backend", value: 71 },
    { skill: "DevOps", value: 45 },
    { skill: "AI/ML", value: 58 },
  ],
  placementFunnel: [
    { stage: "Registered", count: 1200 },
    { stage: "Eligible", count: 980 },
    { stage: "Applied", count: 720 },
    { stage: "Shortlisted", count: 340 },
    { stage: "Interviewed", count: 180 },
    { stage: "Selected", count: 95 },
  ],
  revenue: [
    { month: "Jan", revenue: 2800000 },
    { month: "Feb", revenue: 3100000 },
    { month: "Mar", revenue: 3400000 },
    { month: "Apr", revenue: 3600000 },
    { month: "May", revenue: 3900000 },
    { month: "Jun", revenue: 4200000 },
  ],
};

export const aiRecommendations = [
  {
    title: "Complete System Design Module",
    reason: "Gap identified for Google interview prep",
    priority: "high",
    type: "course",
  },
  {
    title: "Practice Graph Algorithms",
    reason: "Weak area in recent assessments",
    priority: "high",
    type: "coding",
  },
  {
    title: "Update Resume Keywords",
    reason: "Missing 'Kubernetes' and 'Microservices'",
    priority: "medium",
    type: "resume",
  },
  {
    title: "Schedule Mock Interview",
    reason: "Google drive in 10 days",
    priority: "high",
    type: "interview",
  },
];
