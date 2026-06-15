import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/learn", destination: "/dashboard/student", permanent: false },
      { source: "/learn/:path*", destination: "/dashboard/student", permanent: false },
      { source: "/dsa", destination: "/coding-os?tab=dsa", permanent: false },
      { source: "/dsa/:path*", destination: "/coding-os?tab=dsa", permanent: false },
      { source: "/assessments", destination: "/dashboard/student", permanent: false },
      { source: "/assessments/:path*", destination: "/dashboard/student", permanent: false },
      { source: "/coding", destination: "/coding-os?tab=practice", permanent: false },
      { source: "/coding/:path*", destination: "/coding-os?tab=practice", permanent: false },
      { source: "/portfolio", destination: "/career-os?tab=resume", permanent: false },
      { source: "/placements", destination: "/career-os?tab=reports", permanent: false },
      { source: "/resume", destination: "/career-os?tab=resume", permanent: false },
      { source: "/ats", destination: "/career-os?tab=ats", permanent: false },
      { source: "/twin", destination: "/career-os?tab=twin", permanent: false },
      { source: "/office/work", destination: "/office", permanent: false },
      { source: "/office/standups", destination: "/office", permanent: false },
      { source: "/office/tasks", destination: "/office", permanent: false },
      { source: "/office/performance", destination: "/office", permanent: false },
      { source: "/office/promotion", destination: "/office", permanent: false },
      { source: "/office/code-reviews", destination: "/office", permanent: false },
      { source: "/career-os/missions", destination: "/career-os?tab=coach", permanent: false },
      { source: "/career-os/goals", destination: "/career-os?tab=coach", permanent: false },
      { source: "/career-os/habits", destination: "/career-os?tab=coach", permanent: false },
      { source: "/career-os/progress", destination: "/career-os?tab=reports", permanent: false },
      { source: "/career-os/forecast", destination: "/career-os?tab=coach", permanent: false },
      { source: "/career-os/potential", destination: "/career-os?tab=twin", permanent: false },
      { source: "/career-os/achievements", destination: "/career-os?tab=reports", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
