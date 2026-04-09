import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'model-region';

const nextConfig: NextConfig = {
  output: 'export',
  
  // GitHub Pages serves from /repo-name/ in production
  // PR previews use /repo-name/pr-123/
  basePath: isProd 
    ? `/${repoName}${process.env.PR_PATH || ''}`
    : '',
  
  images: {
    unoptimized: true, // Required for static export
  },
  
  // Optimize build
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
