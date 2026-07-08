import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here - triggered announcements reload */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
