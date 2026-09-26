import type { NextConfig } from "next";
import { HOLIDAY_SHOP_OPEN } from "./src/config/holiday-shop";

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
    // 192 is OURS; the rest is Next's default ladder (16/32/48/64/96/128/256/384).
    //
    // A badge renders at 56 CSS px. On the phone a parent actually arrives with —
    // a QR code in the bleachers, dpr 3 — that is 168 device px, and the default
    // ladder's next step up from 128 is 256. So every badge on the page was fetched
    // at w=256 (30 KB) to be drawn into 168 px. With 192 on the ladder the same
    // badge comes back at 15.5 KB, still oversampled against 168, and the frame is
    // full of badges: this is the cheapest measured byte on the route.
    //
    // NOT added: `qualities`. The default (75) is what every image on the site was
    // tuned by eye against, and re-tuning quality is a LOOKING change, not a config
    // change — it belongs with a render in front of it, not in a perf pass.
    imageSizes: [16, 32, 48, 64, 96, 128, 192, 256, 384],
    // One day. This number is BOTH the optimizer's disk-cache lifetime and the
    // browser's `max-age` on every /_next/image response, and badge art is
    // replaced under the same URL (orchestra.png, torch.png, the ivory twins that
    // scripts/light-enamel.mjs rewrites). At a year, a phone that had seen the old
    // violin kept it for a year after the deploy that replaced it. At a day, a
    // replacement reaches everyone within two (Next serves one stale copy while it
    // re-optimizes in the background), unchanged images revalidate as a 304 on
    // their ETag, and re-optimizing a few hundred variants once a day is noise on
    // the host. Static `import`s are content-hashed and stay immutable regardless.
    minimumCacheTTL: 86400,
  },
  // The holiday shop is CLOSED (src/config/holiday-shop.ts): its builder, cart and
  // checkout pages send visitors to MySchoolFrame instead. Temporary (307) on
  // purpose — the switch can be flipped back, and a permanent redirect would be
  // cached by browsers long after. While the shop was open, /buy (the retired kit
  // page) went permanently to the builder.
  async redirects() {
    if (!HOLIDAY_SHOP_OPEN) {
      return ["/build", "/cart", "/checkout", "/buy"].map((source) => ({
        source,
        destination: "/school",
        permanent: false,
      }));
    }
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
