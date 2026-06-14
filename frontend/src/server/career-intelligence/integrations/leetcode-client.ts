const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const PROFILE_QUERY = `
query userPublicProfile($username: String!) {
  matchedUser(username: $username) {
    submitStats: submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    profile {
      ranking
      reputation
    }
    tagProblemCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
  }
}
`;

class LeetCodeClient {
  async fetchProfile(username: string): Promise<Record<string, unknown>> {
    try {
      const res = await fetch(LEETCODE_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: PROFILE_QUERY,
          variables: { username },
        }),
      });

      if (!res.ok) return this.mockProfile(username);
      const json = await res.json();
      const user = json?.data?.matchedUser;
      if (!user) return this.mockProfile(username);

      const counts = user.submitStats?.acSubmissionNum || [];
      const byDiff = Object.fromEntries(
        counts.map((c: { difficulty: string; count: number }) => [c.difficulty.toLowerCase(), c.count])
      );

      const topics: Record<string, number> = {};
      for (const tier of ["advanced", "intermediate", "fundamental"] as const) {
        for (const t of user.tagProblemCounts?.[tier] || []) {
          topics[t.tagName] = (topics[t.tagName] || 0) + (t.problemsSolved || 0);
        }
      }

      return {
        username,
        easy: byDiff.easy || 0,
        medium: byDiff.medium || 0,
        hard: byDiff.hard || 0,
        solved: (byDiff.easy || 0) + (byDiff.medium || 0) + (byDiff.hard || 0),
        ranking: user.profile?.ranking,
        contestRating: user.profile?.reputation,
        topics,
      };
    } catch {
      return this.mockProfile(username);
    }
  }

  private mockProfile(username: string) {
    return {
      username,
      easy: 45,
      medium: 62,
      hard: 18,
      solved: 125,
      ranking: 125000,
      contestRating: 1650,
      topics: { Array: 30, "Dynamic Programming": 22, Tree: 18, Graph: 12 },
      _mock: true,
    };
  }
}

export const leetcodeClient = new LeetCodeClient();
