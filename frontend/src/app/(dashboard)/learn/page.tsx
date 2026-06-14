"use client";

import { Suspense } from "react";
import { GraduationCap } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { CoursesPanel, LearningPathsPanel } from "@/components/feature/tab-panels";
import { LEARNING_PATHS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";

function LearnContent() {
  return (
    <InteractiveModulePage
      title="Learning Management System"
      subtitle="Video courses, coding labs, interactive learning paths, skill trees, and AI-powered tutoring."
      icon={GraduationCap}
      gradient="from-violet-600 via-indigo-600 to-purple-600"
      defaultTab="courses"
      actions={[
        { label: "Browse Courses", href: ROUTES.learnCourses },
        { label: "My Learning Path", href: ROUTES.learnPaths },
      ]}
      tabs={[
        { id: "courses", label: "Courses", content: <CoursesPanel /> },
        { id: "paths", label: "Learning Paths", content: <LearningPathsPanel /> },
      ]}
      sections={[
        { title: "Learning Paths", description: "Structured career paths.", items: LEARNING_PATHS, badge: "9 Paths" },
        { title: "Content Types", description: "Rich multimedia learning.", items: ["Video Courses", "PDFs", "Coding Labs", "Quizzes", "Assignments"] },
        { title: "AI Assistant", description: "24/7 AI tutor.", items: ["Explain Concepts", "Generate Notes", "Create Quizzes", "Debug Code"], badge: "AI" },
      ]}
    />
  );
}

export default function LearnPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><LearnContent /></Suspense>;
}
