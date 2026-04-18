import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/find_playground",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
