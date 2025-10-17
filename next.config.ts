// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // App Router is standaard, maar we laten dit hier expliciet voor Next 15
    reactCompiler: false,
  },
  images: {
    remotePatterns: [
      // Voeg hier later domeinen toe als je externe avatars/kaarten laadt
    ],
  },
};

export default nextConfig;
