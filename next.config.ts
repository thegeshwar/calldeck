import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["test.dev.thegeshwar.com", "calldeck.thegeshwar.com"],
};

export default nextConfig;
