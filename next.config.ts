import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve modern formats first; Next falls back to the original for older
    // browsers. AVIF then WebP gives the smallest payloads for our photos.
    // (This is Next's default ordering, set explicitly for clarity.)
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
