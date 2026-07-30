import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    TZ: "America/Sao_Paulo",
  },
  ...(process.env.TAURI_BUILD === "1" && {
    output: "export",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
