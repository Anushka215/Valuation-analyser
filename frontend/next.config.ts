import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The parent project (../) has its own package-lock.json, which confuses
  // Next.js's automatic workspace-root detection - pin it explicitly.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
