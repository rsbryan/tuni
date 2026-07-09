import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is opened via 127.0.0.1 in dev because Spotify no longer accepts
  // localhost redirect URIs; Next blocks non-localhost dev origins by default.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
