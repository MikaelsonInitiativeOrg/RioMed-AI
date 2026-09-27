import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The backend workspace ships TypeScript source; Next compiles it.
  transpilePackages: ["@riomed/backend"],
  serverExternalPackages: ["@prisma/client"],
  // Monorepo: trace files from the repo root so the Prisma engine in ../node_modules is deployed.
  outputFileTracingRoot: path.join(__dirname, ".."),
  outputFileTracingIncludes: {
    "/**": ["../node_modules/.prisma/client/**/*", "../node_modules/@prisma/client/**/*"],
  },
};

export default nextConfig;
