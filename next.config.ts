import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    TZ: "America/Sao_Paulo",
  },
  images: { unoptimized: true },
};

export default nextConfig;
