// ─────────────────────────────────────────────────────────────
// POST /api/school/designs/open — reopen a saved school design from its link.
//
// The parent's link is `/s/<slug>#d=<token>`. The token rides in the URL
// FRAGMENT, which browsers never send to a server, so it cannot land in an access
// log, a proxy log or a Referer header. The builder reads it off the fragment and
// POSTs it here in the body — POST, not GET, for the same reason.
//
// Answers the LATEST revision's editable design. The token is the only key; the
// store keeps just its hash (lib/school-designs/store). A wrong or unknown token
// is a plain 404 — no hint about which part was wrong. Rate limited in proxy.ts.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { isWellFormedToken, openSchoolDesign } from "@/lib/school-designs/store";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const token = (body as { token?: unknown } | null)?.token;
  if (!isWellFormedToken(token)) {
    return NextResponse.json({ ok: false, error: "That link isn't one of ours." }, { status: 404 });
  }
  const opened = await openSchoolDesign(token);
  if (!opened) {
    return NextResponse.json({ ok: false, error: "We couldn't find that design." }, { status: 404 });
  }
  return NextResponse.json(
    {
      ok: true,
      id: opened.id,
      code: opened.code,
      revision: opened.revision,
      school: opened.school,
      design: opened.design,
      // Uploaded photos' originals, fetched one by one from /original and put
      // back in this device's IndexedDB under the same ids.
      originals: opened.originals,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
