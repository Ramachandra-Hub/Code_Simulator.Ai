interface GitHubRepoRaw {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  default_branch?: string;
}

class GitHubClient {
  private headers(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "NexusEdge-PR8",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async fetchProfile(username: string, token?: string): Promise<Record<string, unknown>> {
    try {
      const headers = this.headers(token);
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`, { headers }),
        fetch(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated`, { headers }),
      ]);

      if (!userRes.ok) return this.mockProfile(username);
      const user = await userRes.json();
      const repos: GitHubRepoRaw[] = reposRes.ok ? await reposRes.json() : [];

      const languages: Record<string, number> = {};
      let totalCommits = 0;

      const enriched = await Promise.all(
        repos.slice(0, 15).map(async (repo) => {
          if (repo.language) languages[repo.language] = (languages[repo.language] || 0) + 1;

          let readme = "";
          let hasTests = false;
          try {
            const readmeRes = await fetch(
              `https://api.github.com/repos/${username}/${repo.name}/readme`,
              { headers }
            );
            if (readmeRes.ok) {
              const readmeJson = await readmeRes.json();
              readme = Buffer.from(readmeJson.content || "", "base64").toString("utf8");
            }
            const treeRes = await fetch(
              `https://api.github.com/repos/${username}/${repo.name}/contents`,
              { headers }
            );
            if (treeRes.ok) {
              const entries = (await treeRes.json()) as Array<{ name: string; type: string }>;
              hasTests = entries.some(
                (e) =>
                  /test|spec|__tests__|jest.config|pytest/i.test(e.name) ||
                  (e.type === "dir" && /test/i.test(e.name))
              );
            }
            const commitRes = await fetch(
              `https://api.github.com/repos/${username}/${repo.name}/commits?per_page=1`,
              { headers }
            );
            if (commitRes.ok) {
              const link = commitRes.headers.get("link");
              if (link) {
                const match = link.match(/page=(\d+)>; rel="last"/);
                if (match) totalCommits += parseInt(match[1], 10);
              } else {
                totalCommits += 1;
              }
            }
          } catch {
            // optional enrichment
          }

          return {
            name: repo.name,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            topics: repo.topics || [],
            readme,
            hasTests,
          };
        })
      );

      return {
        username,
        repos: enriched,
        languages,
        publicRepos: user.public_repos,
        followers: user.followers,
        totalCommits,
        totalStars: enriched.reduce((s, r) => s + r.stars, 0),
        totalForks: enriched.reduce((s, r) => s + r.forks, 0),
      };
    } catch {
      return this.mockProfile(username);
    }
  }

  async exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; username?: string }> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("GitHub OAuth not configured");

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || "GitHub token exchange failed");

    const userRes = await fetch("https://api.github.com/user", {
      headers: this.headers(tokenData.access_token),
    });
    const user = userRes.ok ? await userRes.json() : {};

    return { accessToken: tokenData.access_token, username: user.login };
  }

  private mockProfile(username: string) {
    return {
      username,
      repos: [
        {
          name: "portfolio",
          description: "Personal projects showcase",
          stars: 5,
          forks: 2,
          language: "TypeScript",
          topics: ["react", "nextjs"],
          readme: "# Portfolio\n\n## Installation\n\n```bash\nnpm install\n```\n\n## Architecture\n\nMonorepo with API layer.",
          hasTests: true,
        },
      ],
      languages: { TypeScript: 3, Python: 2 },
      publicRepos: 8,
      followers: 12,
      totalCommits: 120,
      totalStars: 5,
      totalForks: 2,
      _mock: true,
    };
  }
}

export const githubClient = new GitHubClient();
