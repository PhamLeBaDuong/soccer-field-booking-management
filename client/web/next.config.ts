import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
