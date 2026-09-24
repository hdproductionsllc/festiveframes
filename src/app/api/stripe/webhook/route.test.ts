import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { schoolTotals, __memOrdersForTest } from "@/lib/order/school-ledger";

// The ledger is recorded here (and in /api/order/fulfill). It is the number a
// school is told it earned. Two properties: a PAID school order reaches it with
// the school and the donation intact, and a $0 order — a 100%-off promo completes
// as `no_payment_required` — fulfils but records NOTHING, because nothing was
// collected that could be sent to the club.

let event: unknown;
let sessionsByIntent: Record<string, unknown> = {};
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: () => event },
    // The route re-fetches the session (expanded shipping) before fulfilling.
    checkout: {
      sessions: {
        retrieve: async () => (event as { data: { object: unknown } }).data.object,
        // A refund names only the payment intent; the route finds our session by it.
        list: async ({ payment_intent }: { payment_intent: string }) => ({
          data: sessionsByIntent[payment_intent] ? [sessionsByIntent[payment_intent]] : [],
        }),
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
  sessionsByIntent = {};
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

describe("POST /api/stripe/webhook — an order that did not reach the printer is redelivered", () => {
  it.each(["failed", "no-payload"])("answers 500 when fulfilment returns %s, so Stripe retries", async (result) => {
    fulfillOrder.mockResolvedValueOnce(result);
    event = completed(schoolSession("paid"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    // The ledger write is idempotent, so the redelivery cannot double-count.
    await POST(req());
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(1);
  });

  it.each(["sent", "already"])("answers 200 when fulfilment returns %s", async (result) => {
    fulfillOrder.mockResolvedValueOnce(result);
    event = completed(schoolSession("paid"));
    expect((await POST(req())).status).toBe(200);
  });

  it("answers 500 when fulfilment throws", async () => {
    fulfillOrder.mockRejectedValueOnce(new Error("db down"));
    event = completed(schoolSession("paid"));
    expect((await POST(req())).status).toBe(500);
  });
});

describe("POST /api/stripe/webhook — a refund comes out of the school's total", () => {
  const refunded = (refunded: boolean) => ({
    type: "charge.refunded",
    data: { object: { id: "ch_1", payment_intent: "pi_1", refunded } },
  });

  async function paidOrder() {
    event = completed(schoolSession("paid"));
    await POST(req());
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(1);
  }

  it("removes a FULLY refunded school order, and a redelivered paid event does not bring it back", async () => {
    await paidOrder();
    sessionsByIntent = { pi_1: schoolSession("paid") };
    event = refunded(true);
    expect((await POST(req())).status).toBe(200);
    expect((await schoolTotals("sluh-jr-bills")).raisedCents).toBe(0);

    event = completed(schoolSession("paid"));
    await POST(req());
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(0);
  });

  it("keeps a PARTLY refunded order: the frame still sold", async () => {
    await paidOrder();
    sessionsByIntent = { pi_1: schoolSession("paid") };
    event = refunded(false);
    await POST(req());
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(1);
  });

  it("ignores a refund on another site's sale (the Stripe account is shared)", async () => {
    await paidOrder();
    sessionsByIntent = { pi_1: { id: "cs_other", metadata: { orderId: "o-1" } } };
    event = refunded(true);
    expect((await POST(req())).status).toBe(200);
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(1);
  });
});
