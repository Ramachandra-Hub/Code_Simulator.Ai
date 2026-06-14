export type UserRole =
  | "super_admin"
  | "college_admin"
  | "placement_officer"
  | "training_coordinator"
  | "faculty"
  | "recruiter"
  | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  institution?: string;
  department?: string;
}

export interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  gradient: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string | number;
  children?: NavItem[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  progress: number;
  modules: number;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  skills: string[];
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Interview Level";
  topic: string;
  acceptance: number;
  solved: boolean;
}

export interface Assessment {
  id: string;
  title: string;
  type: "MCQ" | "Aptitude" | "Technical" | "Coding" | "Subjective";
  date: string;
  duration: string;
  status: "upcoming" | "active" | "completed";
}

export interface PlacementDrive {
  id: string;
  company: string;
  role: string;
  package: string;
  deadline: string;
  eligible: boolean;
  applicants: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  time: string;
  read: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}
