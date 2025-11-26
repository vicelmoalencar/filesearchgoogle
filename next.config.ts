import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Increase body size limit for file uploads (default is 4MB)
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
