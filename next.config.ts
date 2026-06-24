import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve modern formats first; Next falls back to the original for older
    // browsers. AVIF then WebP gives the smallest payloads for our photos.
    // (This is Next's default ordering, set explicitly for clarity.)
    formats: ["image/avif", "image/webp"],
  },
  // The business is now custom-first: the interactive builder at /build is the
  // single purchase path. The old kit-purchase page /buy is retired. Permanently
  // redirect /buy (and any legacy ?kit=... links) straight into the builder. The
  // kit query is intentionally dropped — the builder owns its own state.
  async redirects() {
    return [
      {
        source: "/buy",
        destination: "/build",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
