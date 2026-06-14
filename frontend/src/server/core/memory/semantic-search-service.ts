import { qdrantClient, COLLECTIONS } from "../../career-intelligence/integrations/qdrant-client";
import { gatherCandidateIntelligence } from "../../talent/services/talent-intelligence-service";

/** Index candidate profile for recruiter talent search */
export async function indexCandidateForSearch(userId: string): Promise<void> {
  const intel = await gatherCandidateIntelligence(userId);
  if (!intel) return;
  const blob = [
    intel.name,
    intel.college,
    intel.targetRole,
    ...intel.digitalTwinSummary.strengths,
    `placement:${intel.placementReadiness}`,
    `growth:${intel.growthTier}`,
    `technical:${intel.technicalScore}`,
  ]
    .filter(Boolean)
    .join(" | ");

  await qdrantClient.upsert(COLLECTIONS.talentSearch, blob, {
    userId,
    name: intel.name,
    placementReadiness: intel.placementReadiness,
    growthTier: intel.growthTier,
  });
}

export async function semanticTalentSearch(query: string, limit = 10) {
  return qdrantClient.searchTalent(query, limit);
}

export async function semanticQuestionRetrieval(topic: string, limit = 5) {
  return qdrantClient.searchQuestions(topic, limit);
}

export async function semanticMemorySearch(userId: string, query: string, limit = 5) {
  const results = await qdrantClient.search(COLLECTIONS.semanticMemory(userId), query, limit);
  return results.map((r) => r.content);
}
