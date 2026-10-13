import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.INVITATION_DEMO_DIST_DIR ?? ".next",
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://gateway:80/api/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://gateway:80/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;
