import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        hostname: "putsce219ivgc1td.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
