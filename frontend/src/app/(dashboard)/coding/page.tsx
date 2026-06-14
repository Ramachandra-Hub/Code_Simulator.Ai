"use client";

import { Suspense } from "react";
import { Code2 } from "lucide-react";
import { InteractiveModulePage } from "@/components/feature/interactive-module-page";
import { CodeEditorPanel, SubmissionsPanel } from "@/components/feature/tab-panels";
import { CODING_LANGUAGES } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";

function CodingContent() {
  return (
    <InteractiveModulePage
      title="Coding Ecosystem"
      subtitle="Integrated online compiler with code execution, test cases, and analytics."
      icon={Code2}
      gradient="from-cyan-600 via-blue-600 to-indigo-600"
      defaultTab="editor"
      actions={[
        { label: "Open Compiler", href: ROUTES.codingEditor },
        { label: "My Submissions", href: ROUTES.codingSubmissions },
      ]}
      tabs={[
        { id: "editor", label: "Compiler", content: <CodeEditorPanel /> },
        { id: "submissions", label: "Submissions", content: <SubmissionsPanel /> },
      ]}
      sections={[
        { title: "Languages", description: "Supported languages.", items: CODING_LANGUAGES },
        { title: "Features", description: "Compiler capabilities.", items: ["Custom Test Cases", "Hidden Tests", "Real-time Execution", "Complexity Analysis"] },
      ]}
    />
  );
}

export default function CodingPage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><CodingContent /></Suspense>;
}
