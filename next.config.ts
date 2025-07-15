import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Production build sırasında ESLint hatalarını ignore et
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript type check'lerini de ignore et (isteğe bağlı)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
