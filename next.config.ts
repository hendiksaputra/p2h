import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma memakai binary engine; jangan di-bundle ke server action / RSC.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Paksa Webpack (bukan Turbopack): Prisma di server action + path __TURBOPACK__ memecah pesan error.
  webpack: (config) => config,
};

export default nextConfig;
