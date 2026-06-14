export interface GitHubRepoAnalysis {
  name: string;
  description?: string | null;
  stars: number;
  forks: number;
  language?: string | null;
  hasReadme: boolean;
  readmeQuality: number;
  hasTests: boolean;
  complexity: number;
  architectureSignals: string[];
}

export interface GitHubIntelligence {
  username: string;
  repos: GitHubRepoAnalysis[];
  languages: Record<string, number>;
  totalStars: number;
  totalForks: number;
  totalCommits: number;
  publicRepos: number;
  followers: number;
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface LinkedInIntelligence {
  headline?: string;
  experience: Array<{ title?: string; company?: string; duration?: string }>;
  skills: string[];
  projects: Array<{ name?: string; description?: string }>;
  certifications: Array<{ name?: string; issuer?: string }>;
  recommendations: Array<{ text?: string; author?: string }>;
  connections?: number;
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface LeetCodeIntelligence {
  username: string;
  solved: number;
  easy: number;
  medium: number;
  hard: number;
  ranking?: number;
  contestRating?: number;
  topics: Record<string, number>;
  score: number;
  codingReadiness: number;
  algorithmSkills: number;
  problemSolving: number;
}

export interface HackerRankIntelligence {
  username: string;
  badges: Array<{ name: string; stars?: number }>;
  certificates: Array<{ name: string }>;
  skillLevels: Record<string, number>;
  score: number;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function scoreReadme(text: string): number {
  if (!text.trim()) return 0;
  let score = 30;
  if (text.length > 200) score += 15;
  if (text.length > 800) score += 10;
  if (/##\s/m.test(text)) score += 15;
  if (/install|usage|getting started/i.test(text)) score += 15;
  if (/```/.test(text)) score += 10;
  if (/architecture|design|api/i.test(text)) score += 5;
  return clamp(score);
}

export function detectArchitectureSignals(repoName: string, description: string, topics: string[]): string[] {
  const blob = `${repoName} ${description} ${topics.join(" ")}`.toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/microservice|micro-service/, "microservices"],
    [/monorepo|mono-repo/, "monorepo"],
    [/rest|graphql|grpc/, "api-design"],
    [/docker|kubernetes|k8s/, "containerization"],
    [/ci\/cd|github.actions/, "ci-cd"],
    [/react|next|vue|angular/, "frontend"],
    [/node|express|fastapi|django|spring/, "backend"],
    [/postgres|mongodb|redis|prisma/, "data-layer"],
    [/ml|tensorflow|pytorch|llm/, "ml-stack"],
  ];
  return patterns.filter(([re]) => re.test(blob)).map(([, label]) => label);
}

export function scoreRepoComplexity(stars: number, forks: number, languageCount: number): number {
  return clamp(20 + stars * 2 + forks * 3 + languageCount * 5, 0, 100);
}

export function analyzeGitHubProfile(raw: Record<string, unknown>): GitHubIntelligence {
  const repos = (raw.repos as Array<Record<string, unknown>>) || [];
  const languages = (raw.languages as Record<string, number>) || {};
  const analyzedRepos: GitHubRepoAnalysis[] = repos.map((r) => {
    const readme = (r.readme as string) || "";
    const topics = (r.topics as string[]) || [];
    const desc = (r.description as string) || "";
    return {
      name: (r.name as string) || "unknown",
      description: desc,
      stars: (r.stars as number) || 0,
      forks: (r.forks as number) || 0,
      language: (r.language as string) || null,
      hasReadme: Boolean(readme),
      readmeQuality: scoreReadme(readme),
      hasTests: Boolean(r.hasTests),
      complexity: scoreRepoComplexity((r.stars as number) || 0, (r.forks as number) || 0, Object.keys(languages).length),
      architectureSignals: detectArchitectureSignals((r.name as string) || "", desc, topics),
    };
  });

  const totalStars = analyzedRepos.reduce((s, r) => s + r.stars, 0);
  const totalForks = analyzedRepos.reduce((s, r) => s + r.forks, 0);
  const avgReadme = analyzedRepos.length
    ? analyzedRepos.reduce((s, r) => s + r.readmeQuality, 0) / analyzedRepos.length
    : 0;
  const testCoverage = analyzedRepos.length
    ? (analyzedRepos.filter((r) => r.hasTests).length / analyzedRepos.length) * 100
    : 0;
  const archDiversity = new Set(analyzedRepos.flatMap((r) => r.architectureSignals)).size;

  const publicRepos = (raw.publicRepos as number) || repos.length;
  const followers = (raw.followers as number) || 0;
  const totalCommits = (raw.totalCommits as number) || 0;

  const score = clamp(
    publicRepos * 3 +
      totalStars * 0.8 +
      totalForks * 1.2 +
      avgReadme * 0.25 +
      testCoverage * 0.2 +
      archDiversity * 5 +
      Math.min(followers, 50) * 0.3 +
      Math.min(totalCommits / 50, 20)
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (publicRepos >= 5) strengths.push("Active GitHub portfolio");
  if (totalStars >= 10) strengths.push("Community-validated projects");
  if (avgReadme >= 70) strengths.push("Strong README documentation");
  if (testCoverage >= 40) strengths.push("Testing practices in repos");
  if (archDiversity >= 3) strengths.push("Diverse architecture exposure");

  if (publicRepos < 3) weaknesses.push("Limited public repositories");
  if (avgReadme < 50) weaknesses.push("README quality needs improvement");
  if (testCoverage < 20) weaknesses.push("Few repos include tests");
  if (Object.keys(languages).length < 2) weaknesses.push("Narrow language diversity");

  return {
    username: (raw.username as string) || "unknown",
    repos: analyzedRepos,
    languages,
    totalStars,
    totalForks,
    totalCommits,
    publicRepos,
    followers,
    score,
    strengths,
    weaknesses,
  };
}

export function analyzeLinkedInProfile(raw: Record<string, unknown>): LinkedInIntelligence {
  const skills = (raw.skills as string[]) || [];
  const experience = (raw.experience as LinkedInIntelligence["experience"]) || [];
  const projects = (raw.projects as LinkedInIntelligence["projects"]) || [];
  const certifications = (raw.certifications as LinkedInIntelligence["certifications"]) || [];
  const recommendations = (raw.recommendations as LinkedInIntelligence["recommendations"]) || [];
  const headline = raw.headline as string | undefined;
  const connections = raw.connections as number | undefined;

  let score = 20;
  if (headline && headline.length > 10) score += 15;
  score += Math.min(experience.length * 12, 36);
  score += Math.min(skills.length * 2, 20);
  score += Math.min(projects.length * 8, 16);
  score += Math.min(certifications.length * 10, 20);
  score += Math.min(recommendations.length * 8, 16);
  if (connections && connections >= 100) score += 5;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (headline) strengths.push("Professional headline present");
  if (experience.length >= 2) strengths.push("Solid work experience");
  if (skills.length >= 8) strengths.push("Broad skill endorsements");
  if (certifications.length) strengths.push("Industry certifications");
  if (recommendations.length) strengths.push("Peer recommendations");

  if (!headline) weaknesses.push("Missing LinkedIn headline");
  if (skills.length < 5) weaknesses.push("Expand skills section");
  if (!projects.length) weaknesses.push("Add project highlights");
  if (!certifications.length) weaknesses.push("Consider certifications");

  return {
    headline,
    experience,
    skills,
    projects,
    certifications,
    recommendations,
    connections,
    score: clamp(score),
    strengths,
    weaknesses,
  };
}

export function analyzeLeetCodeStats(raw: Record<string, unknown>): LeetCodeIntelligence {
  const easy = (raw.easy as number) || 0;
  const medium = (raw.medium as number) || 0;
  const hard = (raw.hard as number) || 0;
  const solved = (raw.solved as number) || easy + medium + hard;
  const topics = (raw.topics as Record<string, number>) || {};
  const ranking = raw.ranking as number | undefined;
  const contestRating = raw.contestRating as number | undefined;

  const algorithmSkills = clamp(easy * 0.5 + medium * 2 + hard * 5 + Object.keys(topics).length * 3);
  const problemSolving = clamp(solved * 1.2 + medium * 1.5 + hard * 3);
  const codingReadiness = clamp(algorithmSkills * 0.45 + problemSolving * 0.55);
  const score = clamp(codingReadiness * 0.6 + (contestRating ? Math.min(contestRating / 25, 40) : 0) + Math.min(solved, 50) * 0.5);

  return {
    username: (raw.username as string) || "unknown",
    solved,
    easy,
    medium,
    hard,
    ranking,
    contestRating,
    topics,
    score,
    codingReadiness,
    algorithmSkills,
    problemSolving,
  };
}

export function analyzeHackerRankProfile(raw: Record<string, unknown>): HackerRankIntelligence {
  const badges = (raw.badges as HackerRankIntelligence["badges"]) || [];
  const certificates = (raw.certificates as HackerRankIntelligence["certificates"]) || [];
  const skillLevels = (raw.skillLevels as Record<string, number>) || {};
  const badgeStars = badges.reduce((s, b) => s + (b.stars || 1), 0);
  const avgSkill = Object.values(skillLevels).length
    ? Object.values(skillLevels).reduce((a, b) => a + b, 0) / Object.values(skillLevels).length
    : 0;

  const score = clamp(badgeStars * 8 + certificates.length * 12 + avgSkill * 10);

  return {
    username: (raw.username as string) || "unknown",
    badges,
    certificates,
    skillLevels,
    score,
  };
}

export function computeProfessionalReadiness(scores: {
  github?: number;
  linkedin?: number;
  leetcode?: number;
  hackerrank?: number;
}): { professionalReadiness: number; portfolioStrength: number } {
  const gh = scores.github ?? 0;
  const li = scores.linkedin ?? 0;
  const lc = scores.leetcode ?? 0;
  const hr = scores.hackerrank ?? 0;
  const connected = [gh, li, lc, hr].filter((s) => s > 0).length;
  const weightSum = (gh ? 0.3 : 0) + (li ? 0.25 : 0) + (lc ? 0.3 : 0) + (hr ? 0.15 : 0) || 1;
  const professionalReadiness = clamp(
    (gh * 0.3 + li * 0.25 + lc * 0.3 + hr * 0.15) / weightSum + connected * 3
  );
  const portfolioStrength = clamp(gh * 0.55 + li * 0.45);
  return { professionalReadiness, portfolioStrength };
}
