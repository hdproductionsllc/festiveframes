import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  __memSchoolOrdersForTest,
  createSchoolOrder,
  recordSchoolOrderPayment,
  schoolTotals,
} from "@/lib/school-designs/orders";

// The webhook hands a paid school session to the school order path (mocked here;
// its own tests are lib/order/fulfill-school.test.ts) and marks refunds on the
// ONE order record, which every school total is summed from.

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
// A school order has its own path (lib/order/fulfill-school).
const fulfillSchoolOrder = vi.fn().mockResolvedValue("sent");
vi.mock("@/lib/order/fulfill-school", () => ({ fulfillSchoolOrder: (...a: unknown[]) => fulfillSchoolOrder(...a) }));

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

const ORDER_ID = "0f0f0f0f-0000-4000-8000-000000000001";
const schoolSession = (payment_status: string, orderId = ORDER_ID) => ({
  id: "cs_1",
  payment_status,
  metadata: { kind: "school-frame", orderId, school: "sluh-jr-bills", donationCents: "1000" },
});

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  __memSchoolOrdersForTest.clear();
  fulfillOrder.mockClear();
  fulfillSchoolOrder.mockClear();
  sessionsByIntent = {};
});
afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe("POST /api/stripe/webhook — school orders", () => {
  it("hands a PAID school session to the school path, never the holiday one", async () => {
    event = completed(schoolSession("paid"));
    expect((await POST(req())).status).toBe(200);
    expect(fulfillSchoolOrder).toHaveBeenCalledTimes(1);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it("a $0 (no_payment_required) order still goes to production", async () => {
    event = completed(schoolSession("no_payment_required"));
    expect((await POST(req())).status).toBe(200);
    expect(fulfillSchoolOrder).toHaveBeenCalledTimes(1);
  });

  it("does nothing with an UNPAID session", async () => {
    event = completed(schoolSession("unpaid"));
    await POST(req());
    expect(fulfillSchoolOrder).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — an order that did not reach the printer is redelivered", () => {
  // "in-progress": another attempt holds the claim — possibly a crashed one whose
  // claim will expire — so Stripe must come back rather than be told "done".
  it.each(["failed", "in-progress"])("answers 500 when fulfilment returns %s, so Stripe retries", async (result) => {
    fulfillSchoolOrder.mockResolvedValueOnce(result);
    event = completed(schoolSession("paid"));
    const res = await POST(req());
    expect(res.status).toBe(500);
  });

  // "held" waits for a person and "no-order" cannot be fixed by retrying; both
  // have alerted a human already.
  it.each(["sent", "already", "held", "no-order"])("answers 200 when fulfilment returns %s", async (result) => {
    fulfillSchoolOrder.mockResolvedValueOnce(result);
    event = completed(schoolSession("paid"));
    expect((await POST(req())).status).toBe(200);
  });

  it("answers 500 when fulfilment throws", async () => {
    fulfillSchoolOrder.mockRejectedValueOnce(new Error("db down"));
    event = completed(schoolSession("paid"));
    expect((await POST(req())).status).toBe(500);
  });
});

describe("POST /api/stripe/webhook — a refund comes out of the school's total", () => {
  const refunded = (refunded: boolean) => ({
    type: "charge.refunded",
    data: { object: { id: "ch_1", payment_intent: "pi_1", refunded } },
  });

  /** An order as checkout creates it, optionally paid. */
  async function order(paid: boolean): Promise<string> {
    const o = await createSchoolOrder({
      designId: "0f0f0f0f-0000-4000-8000-00000000d351",
      revision: 1,
      proofSha256: "a".repeat(64),
      school: "sluh-jr-bills",
      donationCents: 1000,
    });
    if (paid) await recordSchoolOrderPayment(o.orderId, { sessionId: "cs_1", paymentStatus: "paid", amountCents: 2995 });
    sessionsByIntent = { pi_1: schoolSession("paid", o.orderId) };
    return o.orderId;
  }

  it("takes a FULLY refunded order out of the total, for good", async () => {
    await order(true);
    expect((await schoolTotals("sluh-jr-bills")).raisedCents).toBe(1000);
    event = refunded(true);
    expect((await POST(req())).status).toBe(200);
    expect((await schoolTotals("sluh-jr-bills")).raisedCents).toBe(0);
  });

  it("a refund that Stripe delivers BEFORE the purchase still counts (review #7)", async () => {
    const id = await order(false); // checkout started; Stripe's "paid" not seen yet
    event = refunded(true);
    await POST(req());
    await recordSchoolOrderPayment(id, { sessionId: "cs_1", paymentStatus: "paid", amountCents: 2995 });
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(0);
  });

  it("keeps a PARTLY refunded order: the frame still sold", async () => {
    await order(true);
    event = refunded(false);
    await POST(req());
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(1);
  });

  it("ignores a refund on another site's sale (the Stripe account is shared)", async () => {
    await order(true);
    sessionsByIntent = { pi_1: { id: "cs_other", metadata: { orderId: ORDER_ID } } };
    event = refunded(true);
    expect((await POST(req())).status).toBe(200);
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(1);
  });
});
