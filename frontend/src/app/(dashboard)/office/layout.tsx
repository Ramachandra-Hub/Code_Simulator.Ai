import { OfficeShell } from "@/components/virtual-office/office-shell";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return <OfficeShell>{children}</OfficeShell>;
}
