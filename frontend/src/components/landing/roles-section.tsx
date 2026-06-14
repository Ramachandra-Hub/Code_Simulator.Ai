"use client";

import Link from "next/link";
import {
  Shield,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Briefcase,
  User,
} from "lucide-react";

const roles = [
  { icon: Shield, title: "Super Admin", desc: "Platform-wide control, revenue & usage analytics", href: "/login" },
  { icon: Building2, title: "College Admin", desc: "Institution management, departments & batches", href: "/login" },
  { icon: Briefcase, title: "Placement Officer", desc: "Drives, interviews, and placement reports", href: "/login" },
  { icon: Users, title: "Training Coordinator", desc: "Programs, batches, and progress tracking", href: "/login" },
  { icon: BookOpen, title: "Faculty", desc: "Courses, assessments, and AI teaching assistant", href: "/login" },
  { icon: User, title: "Student", desc: "Learning, coding, resume, interviews & placements", href: "/login?demo=true" },
  { icon: GraduationCap, title: "Recruiter", desc: "Talent search, portfolios, and hiring analytics", href: "/login" },
];

export function RolesSection() {
  return (
    <section id="roles" className="py-32 mesh-bg">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight">
            Built for <span className="gradient-text">Every Role</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Customized dashboards and workflows for every stakeholder in the
            education and placement ecosystem.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roles.map((role) => (
            <Link
              key={role.title}
              href={role.href}
              className="glass-card flex items-start gap-4 p-5 transition-all hover:shadow-glass-lg hover:-translate-y-0.5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <role.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{role.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{role.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
