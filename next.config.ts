import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    TZ: "America/Sao_Paulo",
  },
  output: process.env.TAURI_BUILD === "1" ? "export" : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
