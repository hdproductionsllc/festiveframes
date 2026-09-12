import { describe, it, expect, vi, beforeEach } from "vitest";

// The school-frame branch is the one that carries the DONATION ATTRIBUTION —
// `metadata.school` is what makes "your club earned $X" a provable number, and
// until now nothing asserted it was ever written. This file also pins the
// parked-checkout lock on the SERVER: a hidden Buy button is not a lock.

const create = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create } } }),
}));
vi.mock("@/lib/order/store", () => ({
  getDraft: vi.fn().mockResolvedValue({ parts: {}, artifacts: {} }),
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
});
