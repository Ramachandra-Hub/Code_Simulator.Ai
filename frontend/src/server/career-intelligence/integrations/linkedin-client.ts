class LinkedInClient {
  private headers(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async fetchProfile(accessToken?: string): Promise<Record<string, unknown>> {
    if (!accessToken) return this.mockProfile();

    try {
      const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: this.headers(accessToken),
      });
      if (!userinfoRes.ok) return this.mockProfile();

      const userinfo = await userinfoRes.json();
      const headline = userinfo.name ? `${userinfo.name}${userinfo.email ? "" : ""}` : undefined;

      return {
        headline: headline || "LinkedIn Professional",
        experience: [],
        skills: ["Communication", "Teamwork", "Problem Solving"],
        projects: [],
        certifications: [],
        recommendations: [],
        connections: 100,
        profileUrl: userinfo.sub,
        email: userinfo.email,
        _source: "linkedin-oauth",
      };
    } catch {
      return this.mockProfile();
    }
  }

  async exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("LinkedIn OAuth not configured");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || "LinkedIn token exchange failed");

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
  }

  getAuthorizeUrl(redirectUri: string, state: string): string {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) throw new Error("LinkedIn OAuth not configured");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: "openid profile email",
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  private mockProfile() {
    return {
      headline: "Software Engineer | Full Stack Developer",
      experience: [{ title: "Software Engineering Intern", company: "Tech Corp", duration: "3 months" }],
      skills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
      projects: [{ name: "Campus Placement Portal", description: "Built with React and Node" }],
      certifications: [{ name: "AWS Cloud Practitioner", issuer: "Amazon" }],
      recommendations: [{ text: "Strong problem solver", author: "Team Lead" }],
      connections: 500,
      _mock: true,
    };
  }
}

export const linkedinClient = new LinkedInClient();
