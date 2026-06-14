class HackerRankClient {
  async fetchProfile(username: string): Promise<Record<string, unknown>> {
    try {
      const [profileRes, badgesRes, certsRes] = await Promise.all([
        fetch(`https://www.hackerrank.com/rest/contests/master/hackers/${username}/profile`),
        fetch(`https://www.hackerrank.com/rest/hackers/${username}/badges`),
        fetch(`https://www.hackerrank.com/rest/hackers/${username}/certificates`),
      ]);

      if (!profileRes.ok) return this.mockProfile(username);

      const profile = await profileRes.json();
      const badges = badgesRes.ok ? await badgesRes.json() : { models: [] };
      const certs = certsRes.ok ? await certsRes.json() : { models: [] };

      const badgeList = (badges.models || badges.data || []).map(
        (b: { badge_name?: string; stars?: number; name?: string }) => ({
          name: b.badge_name || b.name || "Badge",
          stars: b.stars || 1,
        })
      );

      const certList = (certs.models || certs.data || []).map(
        (c: { certificate?: { label?: string }; name?: string }) => ({
          name: c.certificate?.label || c.name || "Certificate",
        })
      );

      const skillLevels: Record<string, number> = {};
      const skills = profile.models?.[0]?.skills || profile.skills || [];
      for (const s of skills) {
        const name = s.name || s.skill_name;
        const level = s.score || s.level || 0;
        if (name) skillLevels[name] = level;
      }

      return {
        username,
        badges: badgeList,
        certificates: certList,
        skillLevels,
        hackerRankScore: profile.models?.[0]?.contest_ranking || profile.contest_ranking,
      };
    } catch {
      return this.mockProfile(username);
    }
  }

  private mockProfile(username: string) {
    return {
      username,
      badges: [
        { name: "Problem Solving", stars: 3 },
        { name: "Python", stars: 2 },
      ],
      certificates: [{ name: "Python (Basic)" }, { name: "JavaScript (Intermediate)" }],
      skillLevels: { Python: 85, "Problem Solving": 78, JavaScript: 72 },
      _mock: true,
    };
  }
}

export const hackerrankClient = new HackerRankClient();
