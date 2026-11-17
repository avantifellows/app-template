import type { NextConfig } from "next";

// Every response except Next's hashed static files: never cached by Amplify's CDN or the browser, never indexed,
// never framed by another site.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/((?!_next/static/).*)",
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    },
  ],
};

export default nextConfig;
