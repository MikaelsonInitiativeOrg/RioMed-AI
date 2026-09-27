import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The backend workspace ships TypeScript source; Next compiles it.
  transpilePackages: ["@riomed/backend"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
