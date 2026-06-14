export interface JobFitInput {
  jobSkills: string[];
  jobTitle: string;
  jobDescription: string;
  candidate: {
    technicalScore: number;
    codingReadiness: number;
    communicationScore: number;
    confidenceScore: number;
    panelReadiness: number;
    professionalReadiness: number;
    githubScore: number;
    linkedinScore: number;
    leetcodeScore: number;
    skills: string[];
    strengths: string[];
  };
}

export interface JobFitResult {
  technicalFit: number;
  codingFit: number;
  communicationFit: number;
  leadershipFit: number;
  professionalFit: number;
  overallMatch: number;
  matchedSkills: string[];
  missingSkills: string[];
}

function skillOverlap(jobSkills: string[], candidateSkills: string[]): { matched: string[]; missing: string[] } {
  const lowerCand = candidateSkills.map((s) => s.toLowerCase());
  const matched = jobSkills.filter((js) =>
    lowerCand.some((cs) => cs.includes(js.toLowerCase()) || js.toLowerCase().includes(cs))
  );
  const missing = jobSkills.filter((js) => !matched.includes(js));
  return { matched, missing };
}

export function computeJobFit(input: JobFitInput): JobFitResult {
  const blob = `${input.jobTitle} ${input.jobDescription}`.toLowerCase();
  const wantsJava = /java\b/.test(blob);
  const wantsPython = /python/.test(blob);
  const wantsAi = /\bai\b|machine learning|ml\b|llm/.test(blob);
  const wantsFrontend = /frontend|react|vue|angular/.test(blob);
  const wantsBackend = /backend|node|spring|api/.test(blob);

  const { matched, missing } = skillOverlap(input.jobSkills, input.candidate.skills);
  const skillBonus = input.jobSkills.length ? (matched.length / input.jobSkills.length) * 20 : 10;

  let technicalFit = Math.min(100, input.candidate.technicalScore * 0.7 + skillBonus);
  if (wantsAi && input.candidate.strengths.some((s) => /ml|ai|data/i.test(s))) technicalFit += 5;
  if (wantsJava && matched.some((m) => /java/i.test(m))) technicalFit += 8;
  if (wantsPython && matched.some((m) => /python/i.test(m))) technicalFit += 8;

  const codingFit = Math.min(100, input.candidate.codingReadiness * 0.5 + input.candidate.leetcodeScore * 0.35 + 10);
  const communicationFit = Math.min(100, input.candidate.communicationScore * 0.6 + input.candidate.confidenceScore * 0.3);
  const leadershipFit = Math.min(100, input.candidate.panelReadiness * 0.5 + input.candidate.communicationScore * 0.3 + 15);
  const professionalFit = Math.min(
    100,
    input.candidate.professionalReadiness * 0.4 +
      input.candidate.githubScore * 0.25 +
      input.candidate.linkedinScore * 0.2 +
      input.candidate.leetcodeScore * 0.15
  );

  if (wantsFrontend) technicalFit = Math.min(100, technicalFit + (matched.some((m) => /react|vue|angular|frontend/i.test(m)) ? 10 : 0));
  if (wantsBackend) technicalFit = Math.min(100, technicalFit + (matched.some((m) => /node|spring|backend|api/i.test(m)) ? 10 : 0));

  const overallMatch = Math.round(
    technicalFit * 0.28 + codingFit * 0.22 + communicationFit * 0.18 + leadershipFit * 0.12 + professionalFit * 0.2
  );

  return {
    technicalFit: Math.round(technicalFit),
    codingFit: Math.round(codingFit),
    communicationFit: Math.round(communicationFit),
    leadershipFit: Math.round(leadershipFit),
    professionalFit: Math.round(professionalFit),
    overallMatch,
    matchedSkills: matched,
    missingSkills: missing,
  };
}
