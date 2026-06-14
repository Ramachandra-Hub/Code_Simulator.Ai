"use client";

import { useEffect, useState } from "react";
import {
  Github,
  Globe,
  GraduationCap,
  Link2,
  Linkedin,
  LogOut,
  Save,
  User,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getProfile,
  getStoredRole,
  saveProfile,
  type UserProfile,
} from "@/lib/profile";
import { logout } from "@/lib/auth-client";
import { patchOnboarding } from "@/lib/beta-client";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  id: keyof UserProfile;
  value: string;
  onChange: (id: keyof UserProfile, value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(id, e.target.value)}
      />
    </div>
  );
}

export default function ProfilePage() {
  const [role, setRole] = useState<UserRole>("student");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const currentRole = getStoredRole();
    setRole(currentRole);
    setProfile(getProfile(currentRole));
  }, []);

  const update = (id: keyof UserProfile, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [id]: value } : prev));
    setSaved(false);
  };

  const handleSave = () => {
    if (!profile) return;
    saveProfile(role, profile);
    void patchOnboarding({ checklistKey: "profile", done: true });
    window.dispatchEvent(new Event("nexusedge-profile-updated"));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!profile) return null;

  const isStudent = role === "student";

  return (
    <>
      <DashboardHeader title="Edit Profile" />
      <main className="p-6 space-y-6 max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Your Profile</h2>
              <Badge variant="gradient">{ROLE_LABELS[role]}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Update your personal details, academic info, and professional links.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <Button variant="gradient" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name" id="name" value={profile.name} onChange={update} />
            <Field label="Email" id="email" type="email" value={profile.email} onChange={update} />
            <Field label="Phone" id="phone" type="tel" value={profile.phone} onChange={update} placeholder="+91 98765 43210" />
            <Field label="Date of Birth" id="dateOfBirth" type="date" value={profile.dateOfBirth} onChange={update} />
            <Field label="Gender" id="gender" value={profile.gender} onChange={update} placeholder="Male / Female / Other" />
            <Field label="Country" id="country" value={profile.country} onChange={update} />
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={profile.address} onChange={(e) => update("address", e.target.value)} placeholder="Street address" />
            </div>
            <Field label="City" id="city" value={profile.city} onChange={update} />
            <Field label="State" id="state" value={profile.state} onChange={update} />
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="Tell recruiters about yourself..."
              />
            </div>
          </CardContent>
        </Card>

        {(isStudent || role === "faculty" || role === "training_coordinator") && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Academic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Institution" id="institution" value={profile.institution} onChange={update} />
              <Field label="Department" id="department" value={profile.department} onChange={update} />
              {isStudent && (
                <>
                  <Field label="Branch" id="branch" value={profile.branch} onChange={update} placeholder="Computer Science" />
                  <Field label="Batch" id="batch" value={profile.batch} onChange={update} placeholder="2022-2026" />
                  <Field label="Roll Number" id="rollNumber" value={profile.rollNumber} onChange={update} />
                  <Field label="Graduation Year" id="graduationYear" value={profile.graduationYear} onChange={update} />
                  <Field label="CGPA" id="cgpa" value={profile.cgpa} onChange={update} placeholder="8.5" />
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Skills & Career
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input
                id="skills"
                value={profile.skills}
                onChange={(e) => update("skills", e.target.value)}
                placeholder="React, Python, DSA, System Design"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="careerGoal">Career Goal</Label>
              <Textarea
                id="careerGoal"
                value={profile.careerGoal}
                onChange={(e) => update("careerGoal", e.target.value)}
                placeholder="Software Engineer at a product-based company..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Professional Links
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" /> LinkedIn
              </Label>
              <Input
                id="linkedin"
                value={profile.linkedin}
                onChange={(e) => update("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github" className="flex items-center gap-2">
                <Github className="h-4 w-4" /> GitHub
              </Label>
              <Input
                id="github"
                value={profile.github}
                onChange={(e) => update("github", e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            <Field label="LeetCode" id="leetcode" value={profile.leetcode} onChange={update} placeholder="https://leetcode.com/username" />
            <Field label="CodeChef" id="codechef" value={profile.codechef} onChange={update} placeholder="https://codechef.com/users/username" />
            <Field label="GeeksforGeeks" id="geeksforgeeks" value={profile.geeksforgeeks} onChange={update} placeholder="https://auth.geeksforgeeks.org/user/username" />
            <Field label="HackerRank" id="hackerrank" value={profile.hackerrank} onChange={update} placeholder="https://hackerrank.com/username" />
            <Field label="Portfolio Website" id="portfolio" value={profile.portfolio} onChange={update} placeholder="https://yourportfolio.com" />
            <Field label="Twitter / X" id="twitter" value={profile.twitter} onChange={update} placeholder="https://x.com/username" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-6">
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
          <Button variant="gradient" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </main>
    </>
  );
}
