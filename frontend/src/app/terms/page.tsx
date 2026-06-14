import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-muted-foreground mb-6">
        By using NexusEdge AI, you agree to use the platform for educational and career development purposes.
        Institutions are responsible for managing user access. All content and assessments must comply with applicable laws.
      </p>
      <Button asChild variant="outline"><Link href="/">Back to Home</Link></Button>
    </div>
  );
}
