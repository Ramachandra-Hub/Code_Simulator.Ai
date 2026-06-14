import { RecruiterShell } from "@/components/recruiter/recruiter-shell";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return <RecruiterShell>{children}</RecruiterShell>;
}
