import { NextResponse, type NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────
// Abuse guard for the public POST endpoints: per-IP sliding-window rate limits
// + a body-size ceiling. This exists because the AI/email routes spend real money
// (Gemini / Anthropic / Resend) and write to Postgres — without a gate, a single
// script can burn credits, relay spam, or bloat the DB.
//
// (Next 16 "proxy" convention — formerly the "middleware" file.)
//
// Deliberately NOT covered: /api/stripe/webhook (Stripe must always reach it),
// /api/checkout and /api/order/fulfill (legit purchase flow — throttling them
// would break real orders). Only the abuse-prone routes are matched below.
//
// State is in-memory. Railway runs a single long-lived Node process, so one Map
// is shared across requests. It's best-effort (resets on redeploy, not shared
// across replicas) — enough to stop scripted abuse, not a billing control.
// ─────────────────────────────────────────────────────────────

interface Rule {
  /** window length in ms */
  windowMs: number;
  /** max requests per IP per window */
  max: number;
  /** reject POSTs whose Content-Length exceeds this many bytes */
  maxBytes: number;
}

const MB = 1024 * 1024;

// Keyed by exact pathname. Photo-carrying routes get a larger byte ceiling.
const RULES: Record<string, Rule> = {
  "/api/cartoonize": { windowMs: 5 * 60_000, max: 12, maxBytes: 12 * MB },
  "/api/pet-caption": { windowMs: 5 * 60_000, max: 20, maxBytes: 12 * MB },
  "/api/lab/pet-submit": { windowMs: 10 * 60_000, max: 6, maxBytes: 12 * MB },
  // A full-frame 300-DPI print PNG is a few MB and base64 inflates it ~1.33x; a
  // send also carries the panels and any uploaded photos' originals (so the design
  // survives on another device). Each image has its own decoded ceiling in
  // lib/school-designs/submission. Save is the same body, for the Buy path.
  "/api/school/submit": { windowMs: 10 * 60_000, max: 10, maxBytes: 64 * MB },
  "/api/school/designs/save": { windowMs: 10 * 60_000, max: 10, maxBytes: 64 * MB },
  // One approval per proof; a handful covers second thoughts and retries.
  "/api/school/designs/approve": { windowMs: 10 * 60_000, max: 20, maxBytes: 4 * 1024 },
  // A reopened design fetches each uploaded original once.
  "/api/school/designs/original": { windowMs: 10 * 60_000, max: 60, maxBytes: 4 * 1024 },
  // Reopens a saved design from the token in a parent's link. The token is 256
  // random bits, so guessing is hopeless anyway; the gate keeps it that way and
  // stops a script hammering the database. A real parent opens a link a few times.
  "/api/school/designs/open": { windowMs: 10 * 60_000, max: 30, maxBytes: 4 * 1024 },
  // Both fetch an ARBITRARY user-supplied URL server-side (a school site, then
  // its stylesheets and logos — dozens of outbound requests per call, 22s
  // budget). An SSRF relay with no per-IP gate is a free proxy; the payloads
  // themselves are a URL and a slug, so the byte ceiling is small.
  "/api/school/brand-scan": { windowMs: 10 * 60_000, max: 8, maxBytes: 16 * 1024 },
  "/api/school/brand-asset": { windowMs: 10 * 60_000, max: 12, maxBytes: 16 * 1024 },
  // The finder's miss capture: writes a Postgres row and can send an internal
  // alert, so it is the same abuse shape as /api/contact and takes the same gate.
  // Nobody legitimately reports six missing schools in ten minutes.
  "/api/school/request": { windowMs: 10 * 60_000, max: 6, maxBytes: 16 * 1024 },
  // Staff sign-in: sends an email to an allowlisted address. A person asks for a
  // link once or twice; a script guessing addresses gets nowhere and is slowed.
  "/api/admin/login": { windowMs: 10 * 60_000, max: 5, maxBytes: 4 * 1024 },
  "/api/save-design": { windowMs: 5 * 60_000, max: 15, maxBytes: 6 * MB },
  // 20MB, not 12: a school-frame draft carries the assembled overview PLUS four
  // 300-DPI panel PNGs (same payload class as /api/school/submit below).
  "/api/order/draft": { windowMs: 5 * 60_000, max: 40, maxBytes: 20 * MB },
  "/api/contact": { windowMs: 10 * 60_000, max: 6, maxBytes: 64 * 1024 },
  "/api/review": { windowMs: 10 * 60_000, max: 6, maxBytes: 64 * 1024 },
  "/api/subscribe": { windowMs: 10 * 60_000, max: 12, maxBytes: 16 * 1024 },
};

// hits[key] = ascending list of request timestamps still inside the window.
const hits = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Sliding-window check. Records the hit and returns false when over the limit. */
function overLimit(key: string, rule: Rule, now: number): boolean {
  const cutoff = now - rule.windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= rule.max) {
    hits.set(key, recent); // keep the pruned list so it can drain
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function proxy(req: NextRequest): NextResponse {
  const rule = RULES[req.nextUrl.pathname];
  if (!rule || req.method !== "POST") return NextResponse.next();

  // 1) Body-size ceiling (when the client declares a length — browsers do).
  const len = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(len) && len > rule.maxBytes) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  // 2) Per-IP rate limit.
  const now = Date.now();
  const key = `${clientIp(req)}:${req.nextUrl.pathname}`;
  if (overLimit(key, rule, now)) {
    const retry = Math.ceil(rule.windowMs / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/cartoonize",
    "/api/pet-caption",
    "/api/lab/pet-submit",
    "/api/school/submit",
    "/api/school/designs/save",
    "/api/school/designs/approve",
    "/api/school/designs/original",
    "/api/school/designs/open",
    "/api/school/brand-scan",
    "/api/school/brand-asset",
    "/api/school/request",
    "/api/admin/login",
    "/api/save-design",
    "/api/order/draft",
    "/api/contact",
    "/api/review",
    "/api/subscribe",
  ],
};
