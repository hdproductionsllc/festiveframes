import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture what the email stack is asked to send WITHOUT hitting Resend. The route
// instantiates `new Resend(key)` at call time, so this mock intercepts every send.
// The REAL Resend v6 result shape: `{ data, error }`. `sendOrThrow` reads it.
const sendMock = vi.fn().mockResolvedValue({ data: { id: "mock-id" }, error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

import { POST } from "./route";
import { __memSchoolDesignsForTest } from "@/lib/school-designs/store";

// A tiny but VALID png data URL (matches the route's data:image/(png|jpeg) rule).
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

/** A parent's contact, required on every send. Added to any body that does not
 *  say otherwise, so each test below exercises the rule it is about. */
const CONTACT = { email: "pat.parent@example.org", phone: "314-555-0199", forWhom: "My student" };

function req(body: unknown): Request {
  const b = body && typeof body === "object" && !("contact" in body) ? { ...body, contact: CONTACT } : body;
  return new Request("http://localhost:3000/api/school/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
}

const ENV_KEYS = ["RESEND_API_KEY", "MSF_ORDER_EMAIL", "MSF_EMAIL_FROM", "EMAIL_FROM"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  sendMock.mockClear();
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("POST /api/school/submit — graceful no-key path", () => {
  it("returns { ok:false, reason:'email-not-configured' } (200) when RESEND_API_KEY is unset, without sending", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(req({ printPng: TINY_PNG, designName: "Lincoln HS" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: false, reason: "email-not-configured", saved: null, linkEmailed: false });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/school/submit — validation", () => {
  it("rejects a non-image / non-data-URL printPng (400)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: "https://evil.example/x.png", designName: "X" }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a non-png/jpeg data URL (400)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: "data:image/svg+xml;base64,AAAA", designName: "X" }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized print image (413)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    // Base64 carries 3 bytes per 4 chars, so this is ~30MB decoded — over the
    // 28MB ceiling. (The ceiling was raised from 18MB when a real school design
    // came back too big to send; keep this comfortably above whatever it is.)
    const huge = `data:image/png;base64,${"A".repeat(40 * 1024 * 1024)}`;
    const res = await POST(req({ printPng: huge, designName: "X" }));
    expect(res.status).toBe(413);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a missing printPng (400)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ designName: "X" }));
    expect(res.status).toBe(400);
  });

  it("rejects an over-long design name (400)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: TINY_PNG, designName: "z".repeat(201) }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/school/submit — panels", () => {
  it("attaches every valid panel PLUS the overview (panels first, overview last)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(
      req({
        printPng: TINY_PNG,
        designName: "Lincoln HS",
        panels: [
          { name: "wing-left", dataUrl: TINY_PNG },
          { name: "wing-right", dataUrl: TINY_PNG },
          { name: "top", dataUrl: TINY_PNG },
          { name: "bottom", dataUrl: TINY_PNG },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, saved: null, linkEmailed: false });
    const arg = sendMock.mock.calls[0][0];
    // 4 panels + 1 overview.
    expect(arg.attachments).toHaveLength(5);
    // Overview is LAST and named as such; panels precede it.
    expect(arg.attachments[4].filename).toMatch(/OVERVIEW/i);
    expect(arg.attachments[0].filename).toMatch(/wing-left/);
  });

  it("drops a malformed panel but still sends the rest + overview", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(
      req({
        printPng: TINY_PNG,
        designName: "X",
        panels: [
          { name: "top", dataUrl: TINY_PNG },
          { name: "bad", dataUrl: "https://evil.example/x.png" }, // not a data URL → dropped
        ],
      }),
    );
    expect(res.status).toBe(200);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.attachments).toHaveLength(2); // 1 valid panel + overview
  });

  it("still works with NO panels (assembled-only path)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: TINY_PNG, designName: "X" }));
    expect(res.status).toBe(200);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.attachments).toHaveLength(1);
  });
});

describe("POST /api/school/submit — security", () => {
  it("sends to the SERVER-FIXED recipient, ignoring any recipient in the body", async () => {
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.MSF_ORDER_EMAIL; // default recipient
    const res = await POST(
      req({
        printPng: TINY_PNG,
        designName: "Lincoln HS",
        // Adversarial fields — none may influence the recipient.
        to: "attacker@evil.example",
        recipient: "attacker@evil.example",
        MSF_ORDER_EMAIL: "attacker@evil.example",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, saved: null, linkEmailed: false });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toEqual(["bill@myschoolframe.com"]);
  });

  it("honors MSF_ORDER_EMAIL from the SERVER env (not the body)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.MSF_ORDER_EMAIL = "prod-inbox@myschoolframe.com";
    const res = await POST(req({ printPng: TINY_PNG, designName: "X", to: "attacker@evil.example" }));
    expect(res.status).toBe(200);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toEqual(["prod-inbox@myschoolframe.com"]);
  });

  it("escapes the design name in the email HTML (no HTML injection)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(
      req({ printPng: TINY_PNG, designName: "<script>alert(1)</script> & <b>hi</b>" }),
    );
    expect(res.status).toBe(200);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).not.toContain("<script>");
    expect(arg.html).toContain("&lt;script&gt;");
    // The subject strips control chars but is not HTML — assert it carries no newline.
    expect(arg.subject).not.toMatch(/[\r\n]/);
  });

  it("neutralizes a malicious parts list (numeric fields coerced, strings escaped)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(
      req({
        printPng: TINY_PNG,
        designName: "X",
        partsList: {
          designName: "X",
          plateState: "assembled",
          tileSizeInches: 0.99,
          qr: { enabled: false, url: "" },
          // qty is a string carrying an injection — must be coerced to a number.
          rows: [
            {
              sku: "<img src=x onerror=alert(1)>",
              name: "<b>evil</b>",
              color: "#fff",
              qty: "5<script>alert(1)</script>",
              span: { cols: 1, rows: 1 },
              size: "1 x 1",
              dieCut: false,
            },
          ],
          totalTiles: "9<script>",
          totalCells: "9<script>",
          bars: [],
        },
      }),
    );
    expect(res.status).toBe(200);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).not.toContain("<script>");
    // No live tag forms — the payload survives only as inert, escaped text.
    // (The branded header carries our own logo <img>; the PAYLOAD's tag must not
    // survive live anywhere.)
    expect(arg.html).not.toContain("<img src=x");
    expect(arg.html).toContain("&lt;img");
    // A non-numeric qty string is coerced to a number (0), never interpolated raw.
    expect(arg.html).not.toContain("5<script>");
  });
});

// ─── What the production inbox is told about the artwork ─────────────────────
//
// The builder asks for the rights attestation before it submits. This route is
// where that answer becomes part of the order, so the email says where the art
// came from — including, loudly, when it came with nothing on record.

describe("POST /api/school/submit — uploaded artwork provenance", () => {
  const send = async (extra: Record<string, unknown>) => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "Shared <orders@example.com>";
    const res = await POST(req({ printPng: TINY_PNG, designName: "Lincoln HS", ...extra }));
    expect(res.status).toBe(200);
    return sendMock.mock.calls[0]?.[0] as { html: string; text: string };
  };

  it("says plainly when the frame uses only our own library", async () => {
    const mail = await send({});
    expect(mail.html).toMatch(/No customer-uploaded artwork/);
    expect(mail.text).toMatch(/No customer-uploaded artwork/);
  });

  it("names the terms version when the customer attested", async () => {
    const mail = await send({
      artUploaded: true,
      artworkRights: { version: "2026-09-13", acceptedAt: Date.UTC(2026, 8, 13, 14, 30) },
    });
    expect(mail.html).toContain("rights attested");
    expect(mail.html).toContain("2026-09-13");
    expect(mail.html).not.toContain("NO RIGHTS ATTESTATION");
  });

  it("FLAGS uploaded art that arrives with no attestation", async () => {
    // Unreachable through the builder, which is exactly why it must be visible
    // when it happens: a direct POST is the only way to get here.
    const mail = await send({ artUploaded: true });
    expect(mail.html).toContain("NO RIGHTS ATTESTATION");
    expect(mail.text).toContain("NO RIGHTS ATTESTATION");
  });

  it("treats a malformed attestation as no attestation at all", async () => {
    const mail = await send({ artUploaded: true, artworkRights: { version: "2026-09-13" } });
    expect(mail.html).toContain("NO RIGHTS ATTESTATION");
  });
});

// ─── THE SQUARE RULE at the order boundary ────────────────────────────────────
//
// The builder cannot seat a non-square badge, so a parts list carrying one came
// from a builder older than the rule or from a hand-made POST. The route refuses
// it before anything reaches the production inbox.

describe("POST /api/school/submit — every badge is square", () => {
  const parts = (rows: Array<{ pieceId: string; size: string }>) => ({
    designName: "X",
    plateState: "MO",
    tileSizeInches: 1,
    qr: { enabled: false, url: "" },
    rows: rows.map((r) => ({
      sku: "HS-X",
      name: r.pieceId,
      pieceId: r.pieceId,
      color: "#fff",
      qty: 1,
      span: { cols: 2, rows: 1 },
      size: r.size,
      dieCut: false,
    })),
    totalTiles: rows.length,
    totalCells: rows.length * 2,
    bars: [],
  });

  it("refuses a 2.25 x 4.50 side slab with a clear 400, and sends nothing", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(
      req({
        printPng: TINY_PNG,
        designName: "X",
        partsList: parts([
          { pieceId: "hs:soccer-patch", size: "2.25 x 2.25" },
          { pieceId: "hs:crest", size: "2.25 x 4.50" },
        ]),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/square/i);
    expect(json.nonSquare).toEqual(["hs:crest (2.25 x 4.50)"]);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("refuses a badge whose size it cannot read", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(
      req({ printPng: TINY_PNG, designName: "X", partsList: parts([{ pieceId: "upload", size: "" }]) }),
    );
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("accepts square badges alongside the runners' direct-print panel parts", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(
      req({
        printPng: TINY_PNG,
        designName: "X",
        partsList: parts([
          { pieceId: "hs:soccer-patch", size: "2.25 x 2.25" },
          { pieceId: "upload", size: "2.25 x 2.25" },
          // An 11 x 0.75 runner is the panel's own rectangle, not a badge.
          { pieceId: "panel:top", size: "11.00 x 0.75" },
          { pieceId: "panel:bottom", size: "11.00 x 1.80" },
        ]),
      }),
    );
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/school/submit — the sender's contact", () => {
  it("refuses a send with no email (400), and sends nothing", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: TINY_PNG, designName: "X", contact: { phone: "314 555 0199" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("email");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("refuses a malformed email (400), and sends nothing", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: TINY_PNG, designName: "X", contact: { email: "pat@home" } }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("refuses a malformed phone rather than dropping it silently (400)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: TINY_PNG, designName: "X", contact: { email: "p@example.com", phone: "ring me" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("phone");
  });

  it("never makes the sender a recipient of anything", async () => {
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.MSF_ORDER_EMAIL;
    const res = await POST(req({ printPng: TINY_PNG, designName: "X" }));
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0][0];
    for (const field of ["to", "cc", "bcc", "replyTo", "reply_to"]) {
      expect(JSON.stringify(sent[field] ?? "")).not.toContain(CONTACT.email);
    }
  });

  it("prints the contact in the production email, so a person can reply", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const res = await POST(req({ printPng: TINY_PNG, designName: "X" }));
    expect(res.status).toBe(200);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain(CONTACT.email);
    expect(sent.html).toContain("Reply to:");
    expect(sent.text).toContain(`Reply to: `);
    expect(sent.text).toContain(CONTACT.email);
  });
});

// ── THE SAVED DESIGN (2026-09-25) ────────────────────────────────────────────
// Every send stores a revision and answers with its code and the parent's link;
// the link email is the ONE mail that may go to an address a parent typed, and
// only when they asked, only once the team has the design.
describe("POST /api/school/submit — saves the design and hands back its link", () => {
  const DESIGN = { designName: "Emma's frame", slots: {}, textBars: [] };
  const body = (over: Record<string, unknown> = {}) => ({
    printPng: TINY_PNG,
    panels: [{ name: "left", dataUrl: TINY_PNG }],
    designName: "Emma's frame",
    school: "ladue-rams",
    variant: "flush",
    design: DESIGN,
    ...over,
  });
  const LINK_RE = /\/s\/ladue-rams#d=[A-Za-z0-9_-]{43}$/;

  it("saves revision 1 and returns its code and a /s/<slug>#d= link", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const json = await (await POST(req(body()))).json();
    expect(json.ok).toBe(true);
    expect(json.saved.code).toMatch(/^MSF-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(json.saved.revision).toBe(1);
    expect(json.saved.url).toMatch(LINK_RE);
    expect(json.linkEmailed).toBe(false);
  });

  it("names the saved code and revision in the team's email", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const json = await (await POST(req(body()))).json();
    const arg = sendMock.mock.calls[0][0];
    expect(arg.subject).toContain(`${json.saved.code} r1`);
    expect(arg.text).toContain(`Saved as: ${json.saved.code} · revision 1`);
  });

  it("a CHANGED design sent with its link is revision 2 of the same design", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const first = (await (await POST(req(body()))).json()).saved;
    const second = (
      await (await POST(req(body({ link: { id: first.id, token: first.token }, design: { ...DESIGN, designName: "Emma v2" } })))).json()
    ).saved;
    expect(second.id).toBe(first.id);
    expect(second.revision).toBe(2);
  });

  it("the SAME design sent again (Try again, a double tap) reuses its revision", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const first = (await (await POST(req(body()))).json()).saved;
    const again = (await (await POST(req(body({ link: { id: first.id, token: first.token } })))).json()).saved;
    expect(again).toMatchObject({ id: first.id, code: first.code, revision: 1 });
  });

  it("stores an uploaded photo's original, but only one the design references", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const design = { ...DESIGN, slots: { a: { image: { url: "data:x", fullResId: "photo-1" } } } };
    const json = await (
      await POST(req(body({
        design,
        originals: [
          { fullResId: "photo-1", dataUrl: TINY_PNG },
          { fullResId: "not-in-the-design", dataUrl: TINY_PNG },
        ],
      })))
    ).json();
    const stored = __memSchoolDesignsForTest.get(json.saved.id)!.revisions[0].originals;
    expect(stored.map((o) => o.fullResId)).toEqual(["photo-1"]);
  });

  it("emails the parent their link ONLY when asked — link and code, no files, replies to us", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    process.env.MSF_ORDER_EMAIL = "bill@myschoolframe.com";
    const json = await (await POST(req(body({ emailLink: true })))).json();
    expect(json.linkEmailed).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(2);
    const [team, link] = sendMock.mock.calls.map((c) => c[0]);
    // The production email's rule is untouched: the parent is never on it.
    expect(JSON.stringify([team.to, team.cc, team.bcc, team.replyTo])).not.toContain(CONTACT.email);
    // The link email: to the parent alone, from our own sender, no attachments.
    expect(link.to).toEqual([CONTACT.email]);
    expect(link.from).toBe("MySchoolFrame <orders@myschoolframe.com>");
    expect(link.replyTo).toBe("bill@myschoolframe.com");
    expect(link.attachments).toBeUndefined();
    expect(link.cc).toBeUndefined();
    expect(link.bcc).toBeUndefined();
    expect(link.text).toContain(json.saved.url);
    expect(link.text).toContain(json.saved.code);
  });

  it("sends no link email when the box was not ticked", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    const json = await (await POST(req(body({ emailLink: false })))).json();
    expect(json.linkEmailed).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("sends no link email without MySchoolFrame's own sender configured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.MSF_EMAIL_FROM;
    const json = await (await POST(req(body({ emailLink: true })))).json();
    expect(json.linkEmailed).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("when the TEAM email fails: the design is still saved, and no link email goes out", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    sendMock.mockResolvedValueOnce({ data: null, error: { name: "validation_error", message: "nope" } });
    const res = await POST(req(body({ emailLink: true })));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.saved.url).toMatch(LINK_RE);
    expect(json.linkEmailed).toBeUndefined();
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("a design drawn on a lab frame is saved but gets no parent link", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    const json = await (await POST(req(body({ variant: "slim", emailLink: true })))).json();
    expect(json.saved.code).toMatch(/^MSF-/);
    expect(json.saved.url).toBeNull();
    expect(json.linkEmailed).toBe(false);
  });

  it("builds the link on MySchoolFrame's address even though production's SITE_URL is the holiday domain", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const before = { site: process.env.SITE_URL, msf: process.env.MSF_SITE_URL };
    process.env.SITE_URL = "https://www.festiveframes.co";
    delete process.env.MSF_SITE_URL;
    try {
      const json = await (await POST(req(body()))).json();
      expect(json.saved.url.startsWith("https://www.myschoolframe.com/s/ladue-rams#d=")).toBe(true);
    } finally {
      if (before.site === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = before.site;
      if (before.msf !== undefined) process.env.MSF_SITE_URL = before.msf;
    }
  });

  it("builds the link on the SERVER's origin, never the request's", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const r = new Request("http://localhost:3000/api/school/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ ...body(), contact: CONTACT }),
    });
    const json = await (await POST(r)).json();
    expect(json.saved.url).not.toContain("evil.example");
  });
});
