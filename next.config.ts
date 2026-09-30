import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project lives at ".../opencode proejcts/mission proejct", and there is a
  // stray package-lock.json further up the tree. Without an explicit root,
  // Turbopack walks up, finds it, and warns that it ignored it — which also
  // means file watching can span directories this app does not own.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
