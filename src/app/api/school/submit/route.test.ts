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

function req(body: unknown): Request {
  return new Request("http://localhost:3000/api/school/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ENV_KEYS = ["RESEND_API_KEY", "SCHOOL_ORDERS_EMAIL", "EMAIL_FROM"] as const;
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
    // ~25MB of base64 → ~18.75MB decoded, over the 18MB ceiling.
    const huge = `data:image/png;base64,${"A".repeat(25 * 1024 * 1024)}`;
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
    delete process.env.SCHOOL_ORDERS_EMAIL; // default recipient
    const res = await POST(
      req({
        printPng: TINY_PNG,
        designName: "Lincoln HS",
        // Adversarial fields — none may influence the recipient.
        to: "attacker@evil.example",
        recipient: "attacker@evil.example",
        SCHOOL_ORDERS_EMAIL: "attacker@evil.example",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toBe("orders@festiveframes.co");
  });

  it("honors SCHOOL_ORDERS_EMAIL from the SERVER env (not the body)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.SCHOOL_ORDERS_EMAIL = "prod-inbox@festiveframes.co";
    const res = await POST(req({ printPng: TINY_PNG, designName: "X", to: "attacker@evil.example" }));
    expect(res.status).toBe(200);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toBe("prod-inbox@festiveframes.co");
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
    expect(arg.html).not.toContain("<img");
    expect(arg.html).toContain("&lt;img");
    // A non-numeric qty string is coerced to a number (0), never interpolated raw.
    expect(arg.html).not.toContain("5<script>");
  });
});
