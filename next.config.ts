import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas is a native module (.node binaries) used by the server-side
  // eufyMake print-sheet renderer at fulfillment. Keep it external so the bundler
  // never tries to inline the native binary.
  serverExternalPackages: ["@napi-rs/canvas"],
  images: {
    // WebP ONLY (no AVIF). AVIF gives slightly smaller files but its encoder is
    // MUCH slower/CPU-heavier; on our small host a fresh-deploy first load fires
    // every image at once and the AVIF encode queue backed up enough that some
    // optimizer requests (notably the hero) TIMED OUT — images failed to appear.
    // WebP encodes fast enough that the cold first-load burst clears cleanly.
    formats: ["image/webp"],
    // Once optimized, keep the result cached a long time so re-optimization is rare.
    minimumCacheTTL: 31536000,
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
