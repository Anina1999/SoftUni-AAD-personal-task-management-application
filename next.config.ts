import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: keep it out of the server bundle and
  // load it with Node's regular `require` at runtime.
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
};

export default nextConfig;
