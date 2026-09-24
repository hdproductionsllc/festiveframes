import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture what the email stack is asked to send WITHOUT hitting Resend. The route
// instantiates `new Resend(key)` at call time, so this mock intercepts every send.
const sendMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

import { POST } from "./route";

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
    expect(json).toEqual({ ok: false, reason: "email-not-configured" });
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
    expect(await res.json()).toEqual({ ok: true });
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
    expect(await res.json()).toEqual({ ok: true });
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
