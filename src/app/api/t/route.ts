// POST /api/t — the builder's two browser-side funnel steps: "open" (the school's
// builder was opened) and "engage" (the parent did something in it). Sent with
// navigator.sendBeacon; always answers 204 so a beacon never retries or errors.
// Only these two steps may come from a browser — send, checkout and paid are
// recorded on the server where they happen. Rate limited in proxy.ts.

import { recordEvent } from "@/lib/school-designs/funnel";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const b = (await request.json()) as { k?: unknown; s?: unknown; p?: unknown; a?: unknown };
    if (b.k === "open" || b.k === "engage") {
      await recordEvent({
        kind: b.k,
        school: typeof b.s === "string" ? b.s : null,
        placement: typeof b.p === "string" ? b.p : null,
        anonId: typeof b.a === "string" ? b.a : null,
      });
    }
  } catch {
    // A malformed beacon is simply not counted.
  }
  return new Response(null, { status: 204 });
}
