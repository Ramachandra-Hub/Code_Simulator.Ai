import { CodingOSShell } from "@/components/coding-os/coding-os-hub";

export default function CodingOSLayout({ children }: { children: React.ReactNode }) {
  return <CodingOSShell>{children}</CodingOSShell>;
}
