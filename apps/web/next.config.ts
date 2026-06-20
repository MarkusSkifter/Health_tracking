import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Consume the shared TS package directly from source.
  transpilePackages: ["@health/shared"],
};

export default nextConfig;
