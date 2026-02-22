import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mybudget/shared', '@mybudget/ui'],
};

export default nextConfig;
