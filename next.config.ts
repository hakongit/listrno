import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize lucide-react imports to reduce bundle size
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },
  experimental: {
    // Inline critical CSS to eliminate render-blocking
    optimizeCss: true,
    // Optimize imports for large libraries
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default nextConfig;
