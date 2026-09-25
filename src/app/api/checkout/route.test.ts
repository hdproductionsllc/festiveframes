import { describe, it, expect, vi, beforeEach } from "vitest";

// The school-frame branch is the one that carries the DONATION ATTRIBUTION —
// `metadata.school` is what makes "your club earned $X" a provable number, and
// until now nothing asserted it was ever written. This file also pins the
// parked-checkout lock on the SERVER: a hidden Buy button is not a lock.

const create = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create } } }),
}));
// A school parts list as the builder saves it: square side badges and the runners'
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

// A school order is ONE approved revision of a saved design, named by the token
// that proves the browser holds it. These tests save real revisions in the memory
// store (lib/school-designs) and approve them — or deliberately do not.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

async function savedRevision(o: {
  parts?: unknown;
  design?: unknown;
  artworkRights?: unknown;
  school?: string;
  approve?: boolean;
} = {}): Promise<{ token: string; revision: number; code: string; proofSha: string }> {
  const { saveSchoolDesign, approveRevision, getRevisionByToken } = await import("@/lib/school-designs/store");
  const saved = await saveSchoolDesign({
    school: o.school ?? "sluh-jr-bills",
    contact: null,
    revision: {
      design: o.design ?? { designName: "Miller", slots: {} },
      parts: o.parts === undefined ? SQUARE_DRAFT.parts : o.parts,
      proof: { name: "OVERVIEW", dataUrl: PNG },
      panels: [],
      artworkRights: o.artworkRights ?? null,
      variant: "flush",
      createdBy: "parent",
    },
  });
  if (o.approve !== false) {
    await approveRevision(saved!.token, saved!.revision, { wordingVersion: "test", ip: null, userAgent: null });
  }
  const rev = await getRevisionByToken(saved!.token, saved!.revision);
  return { token: saved!.token, revision: saved!.revision, code: saved!.code, proofSha: rev!.proof.sha256 };
}

const openCheckout = () =>
  vi.doMock("@/config/offers", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/config/offers")>()),
    SCHOOL_CHECKOUT_OPEN: true,
  }));

describe("POST /api/checkout — school-frame", () => {
  it("refuses a school order on the server while checkout is parked (the client hides the button; this is the lock)", async () => {
    vi.doMock("@/config/offers", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/config/offers")>()),
      SCHOOL_CHECKOUT_OPEN: false,
    }));
    const { POST } = await import("./route");
    const { token, revision } = await savedRevision();
    const res = await POST(req({ kind: "school-frame", token, revision }));
    expect(res.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a revision the parent has NOT approved", async () => {
    openCheckout();
    const { POST } = await import("./route");
    const { token, revision } = await savedRevision({ approve: false });
    const res = await POST(req({ kind: "school-frame", token, revision }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/approve/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a token that does not open the design, and ignores a browser-made order id", async () => {
    openCheckout();
    const { POST } = await import("./route");
    const { revision } = await savedRevision();
    const res = await POST(req({ kind: "school-frame", token: "Q".repeat(43), revision, orderId: "o1" }));
    expect(res.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the order on the SERVER for the approved revision, and names the exact proof in Stripe", async () => {
    openCheckout();
    const { POST } = await import("./route");
    const { schoolOffer } = await import("@/config/offers");
    const { __memSchoolOrdersForTest } = await import("@/lib/school-designs/orders");
    const { token, revision, code, proofSha } = await savedRevision();
    const res = await POST(req({ kind: "school-frame", token, revision, orderId: "o1" }));
    expect(res.status).toBe(200);
    const args = create.mock.calls[0][0];
    expect(args.metadata).toMatchObject({
      kind: "school-frame",
      design: code,
      revision: String(revision),
      proofSha256: proofSha,
      school: "sluh-jr-bills",
      donationCents: String(schoolOffer.schoolDonationCents),
    });
    expect(args.metadata.orderId).not.toBe("o1");
    const order = __memSchoolOrdersForTest.get(args.metadata.orderId)!;
    expect(order).toMatchObject({ status: "awaiting_payment", revision, proofSha256: proofSha });
    // A paying parent comes back to MySchoolFrame's own confirmation page.
    const { MSF_THANKS_PATH } = await import("@/content/msf-pages");
    expect(new URL(args.success_url).pathname).toBe(MSF_THANKS_PATH);
  });

  it("records the artwork attestation SAVED with the design on the payment", async () => {
    openCheckout();
    const { POST } = await import("./route");
    const acceptedAt = Date.UTC(2026, 8, 13, 14, 30);
    const { token, revision } = await savedRevision({
      design: { slots: { a: { image: { url: "data:x", fullResId: "p1" } } } },
      artworkRights: { version: "2026-09-13", acceptedAt },
    });
    await POST(req({ kind: "school-frame", token, revision, artUploaded: false }));
    expect(create.mock.calls[0][0].metadata).toMatchObject({
      artUploaded: "yes",
      artRights: `2026-09-13@${new Date(acceptedAt).toISOString()}`,
    });
  });

  it("marks a library-only order rather than saying nothing about its artwork", async () => {
    openCheckout();
    const { POST } = await import("./route");
    const { token, revision } = await savedRevision();
    await POST(req({ kind: "school-frame", token, revision }));
    expect(create.mock.calls[0][0].metadata).toMatchObject({ artUploaded: "no", artRights: "n/a" });
  });

  it("refuses a revision carrying a non-square badge", async () => {
    openCheckout();
    const { POST } = await import("./route");
    const { token, revision } = await savedRevision({ parts: { rows: [{ pieceId: "hs:crest", size: "2.25 x 4.50" }] } });
    const res = await POST(req({ kind: "school-frame", token, revision }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/square/i);
    expect(json.nonSquare).toEqual(["hs:crest (2.25 x 4.50)"]);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a revision with no parts list: a paid order must be producible", async () => {
    openCheckout();
    const { POST } = await import("./route");
    const { token, revision } = await savedRevision({ parts: null });
    const res = await POST(req({ kind: "school-frame", token, revision }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
