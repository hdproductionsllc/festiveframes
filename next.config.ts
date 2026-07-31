import type { NextConfig } from "next";

// The deployed build's identity, surfaced in the UI (see BuildStamp).
//
// "Is this live yet?" has been genuinely hard to answer: a change ships, the page
// is cached or the deploy is still running, and there is no way to tell a stale tab
// from a stale build. Railway sets RAILWAY_GIT_COMMIT_SHA on every deploy, so the
// running page can just say which commit it is.
const BUILD_ID = (
  process.env.RAILWAY_GIT_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  "dev"
).slice(0, 7);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
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
  // myschoolframe.com is the school product's own front door. When its DNS points
  // at this app (add the domain in Railway first), the bare domain serves the
  // /school landing page and every other path passes through unchanged — so
  // myschoolframe.com/lab/school is the builder, same app, no second deploy.
  async rewrites() {
    // beforeFiles is load-bearing: "/" is a real page (the Festive Frames
    // home), and plain-array rewrites run AFTER filesystem routes — so the
    // host rule silently never fired and myschoolframe.com served the
    // patriotic homepage. beforeFiles wins over the filesystem.
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "myschoolframe.com" }],
          destination: "/school",
        },
        {
          source: "/",
          has: [{ type: "host", value: "www.myschoolframe.com" }],
          destination: "/school",
        },
      ],
    };
  },
};

export default nextConfig;
