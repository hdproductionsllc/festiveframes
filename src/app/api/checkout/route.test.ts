import { describe, it, expect, vi, beforeEach } from "vitest";

// The school-frame branch is the one that carries the DONATION ATTRIBUTION —
// `metadata.school` is what makes "your club earned $X" a provable number, and
// until now nothing asserted it was ever written. This file also pins the
// parked-checkout lock on the SERVER: a hidden Buy button is not a lock.

const create = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create } } }),
}));
// A school draft as the builder stashes it: square side badges and the runners'
// direct-print panel parts.
const SQUARE_DRAFT = {
  parts: {
    rows: [
      { pieceId: "hs:orchestra", size: "2.25 x 2.25" },
      { pieceId: "panel:top", size: "11.00 x 0.75" },
    ],
  },
  artifacts: {},
};
const getDraft = vi.fn();
vi.mock("@/lib/order/store", () => ({
  getDraft: (...a: unknown[]) => getDraft(...a),
  saveCartDraft: vi.fn(),
}));

function req(body: unknown): Request {
  return new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ url: "https://checkout.stripe.test/s" });
  getDraft.mockReset();
  getDraft.mockResolvedValue(SQUARE_DRAFT);
  vi.resetModules();
});

describe("POST /api/checkout — school-frame", () => {
  it("refuses a school order on the server while checkout is parked (the client hides the button; this is the lock)", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: false,
    }));
    const { POST } = await import("./route");
    const res = await POST(req({ kind: "school-frame", orderId: "o1", school: "sluh-jr-bills" }));
    expect(res.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("writes the school slug and the per-frame donation into Stripe metadata when open", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: true,
    }));
    const { POST } = await import("./route");
    const { schoolOffer } = await import("@/config/offers");
    const res = await POST(req({ kind: "school-frame", orderId: "o1", school: "sluh-jr-bills", designName: "Miller" }));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    const args = create.mock.calls[0][0];
    expect(args.metadata).toMatchObject({
      kind: "school-frame",
      orderId: "o1",
      school: "sluh-jr-bills",
      donationCents: String(schoolOffer.schoolDonationCents),
    });
    // A paying parent comes back to MySchoolFrame's own confirmation page, never
    // the holiday product's /thanks.
    const { MSF_THANKS_PATH } = await import("@/content/msf-pages");
    expect(new URL(args.success_url).pathname).toBe(MSF_THANKS_PATH);
  });

  it("records the artwork attestation on the payment, so the order carries its own evidence", async () => {
    // The payment record is the artifact most certain to still exist when a school
    // asks who authorised its mascot, so the attestation rides on it rather than
    // only in a database we might migrate.
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: true,
    }));
    const { POST } = await import("./route");
    const acceptedAt = Date.UTC(2026, 8, 13, 14, 30);
    await POST(
      req({
        kind: "school-frame",
        orderId: "o1",
        school: "sluh-jr-bills",
        artUploaded: true,
        artworkRights: { version: "2026-09-13", acceptedAt },
      }),
    );
    expect(create.mock.calls[0][0].metadata).toMatchObject({
      artUploaded: "yes",
      artRights: `2026-09-13@${new Date(acceptedAt).toISOString()}`,
    });
  });

  it("marks a library-only order rather than saying nothing about its artwork", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: true,
    }));
    const { POST } = await import("./route");
    await POST(req({ kind: "school-frame", orderId: "o1", school: "sluh-jr-bills" }));
    expect(create.mock.calls[0][0].metadata).toMatchObject({ artUploaded: "no", artRights: "n/a" });
  });

  it("does not accept a hand-made attestation that is missing its timestamp", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: true,
    }));
    const { POST } = await import("./route");
    await POST(
      req({
        kind: "school-frame",
        orderId: "o1",
        school: "sluh-jr-bills",
        artUploaded: true,
        artworkRights: { version: "2026-09-13" },
      }),
    );
    expect(create.mock.calls[0][0].metadata.artRights).toBe("none");
  });

  it("drops a school slug that is not a plain slug rather than trusting the client", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: true,
    }));
    const { POST } = await import("./route");
    await POST(req({ kind: "school-frame", orderId: "o1", school: "<script>alert(1)</script>" }));
    expect(create.mock.calls[0][0].metadata.school).toBe("");
  });

  it("refuses a draft carrying a non-square badge — the same rule /api/school/submit enforces", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: true,
    }));
    getDraft.mockResolvedValue({ parts: { rows: [{ pieceId: "hs:crest", size: "2.25 x 4.50" }] }, artifacts: {} });
    const { POST } = await import("./route");
    const res = await POST(req({ kind: "school-frame", orderId: "o1", school: "sluh-jr-bills" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/square/i);
    expect(json.nonSquare).toEqual(["hs:crest (2.25 x 4.50)"]);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a draft with no parts list: a paid order must be producible", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: true,
    }));
    getDraft.mockResolvedValue({ parts: {}, artifacts: {} });
    const { POST } = await import("./route");
    const res = await POST(req({ kind: "school-frame", orderId: "o1", school: "sluh-jr-bills" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
