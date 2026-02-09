import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/wrks-gov-dashboard',
  assetPrefix: '/wrks-gov-dashboard/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
