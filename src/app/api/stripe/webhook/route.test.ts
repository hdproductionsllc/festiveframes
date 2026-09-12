import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { schoolTotals, __memOrdersForTest } from "@/lib/order/school-ledger";

// The ledger is recorded here (and in /api/order/fulfill). It is the number a
// school is told it earned. Two properties: a PAID school order reaches it with
// the school and the donation intact, and a $0 order — a 100%-off promo completes
// as `no_payment_required` — fulfils but records NOTHING, because nothing was
// collected that could be sent to the club.

let event: unknown;
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: () => event },
    // The route re-fetches the session (expanded shipping) before fulfilling.
    checkout: {
      sessions: {
        retrieve: async () => (event as { data: { object: unknown } }).data.object,
      },
    },
  }),
}));
const fulfillOrder = vi.fn().mockResolvedValue("sent");
vi.mock("@/lib/order/fulfill", () => ({ fulfillOrder: (...a: unknown[]) => fulfillOrder(...a), fulfillCart: vi.fn() }));

import { POST } from "./route";

function completed(session: Record<string, unknown>) {
  return { type: "checkout.session.completed", data: { object: session } };
}
function req(): Request {
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "{}",
  });
}

const schoolSession = (payment_status: string) => ({
  id: "cs_1",
  payment_status,
  metadata: { kind: "school-frame", orderId: "o-1", school: "sluh-jr-bills", donationCents: "1000" },
});

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  __memOrdersForTest.clear();
  fulfillOrder.mockClear();
});
afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe("POST /api/stripe/webhook — the fundraiser ledger", () => {
  it("records a PAID school order with its school and donation", async () => {
    event = completed(schoolSession("paid"));
    const res = await POST(req());
    expect(res.status).toBe(200);
    const t = await schoolTotals("sluh-jr-bills");
    expect(t.frames).toBe(1);
    expect(t.raisedCents).toBe(1000);
    expect(fulfillOrder).toHaveBeenCalledWith("o-1", expect.anything());
  });

  it("fulfils a $0 (no_payment_required) order but records NO donation", async () => {
    event = completed(schoolSession("no_payment_required"));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(fulfillOrder).toHaveBeenCalledTimes(1); // the free frame still ships
    const t = await schoolTotals("sluh-jr-bills");
    expect(t.frames).toBe(0); // ...but the club is not told it earned money nobody paid
    expect(t.raisedCents).toBe(0);
  });

  it("neither fulfils nor records an UNPAID session", async () => {
    event = completed(schoolSession("unpaid"));
    await POST(req());
    expect(fulfillOrder).not.toHaveBeenCalled();
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(0);
  });
});
