import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Chỉ định root directory là thư mục frontend để tránh cảnh báo về multiple lockfiles
  experimental: {
    turbo: {
      root: path.resolve(__dirname),
    },
  },
};

export default nextConfig;
