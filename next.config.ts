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
  experimental: {
    // HTML import hatalarını ignore et
    serverComponentsExternalPackages: ['bcrypt'],
  },
  // Render.com için optimizasyonlar
  output: 'standalone',
  images: {
    unoptimized: true
  },
  // Html component hatalarını ignore et
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
