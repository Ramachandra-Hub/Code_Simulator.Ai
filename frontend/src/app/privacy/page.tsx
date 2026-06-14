import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-muted-foreground mb-6">
        NexusEdge AI respects your privacy. We collect only data necessary to provide our educational and placement services.
        Your profile, academic records, and coding activity are stored securely and never sold to third parties.
      </p>
      <Button asChild variant="outline"><Link href="/">Back to Home</Link></Button>
    </div>
  );
}
