import { CodingIDEWorkspace } from "@/components/coding-os/coding-ide-workspace";

export default async function CodingProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CodingIDEWorkspace problemId={id} />;
}
