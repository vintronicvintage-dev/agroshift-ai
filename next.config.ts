import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/api/parcel-engine": ["./data/turkiye_agro_master.json"],
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /[\\/]globals\.css$/,
      enforce: "pre",
      use: "@tailwindcss/turbopack",
    });
    return config;
  },
};

export default nextConfig;
