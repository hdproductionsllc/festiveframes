import { describe, it, expect, vi, beforeEach } from "vitest";
import { schoolTotals, __memOrdersForTest } from "@/lib/order/school-ledger";

// The /thanks relay. The server is the trust boundary: it retrieves the Stripe
// session itself and fulfils only when the session is paid AND names the order
// the client claims. A forged body with no real paid session must never reach
// fulfillOrder — that is an email to the printer and a donation on the ledger.

let session: Record<string, unknown> | null = null;
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: async () => {
          if (!session) throw new Error("No such session");
          return session;
        },
      },
    },
  }),
}));
const fulfillOrder = vi.fn().mockResolvedValue("sent");
const fulfillCart = vi.fn().mockResolvedValue("sent");
vi.mock("@/lib/order/fulfill", () => ({
  fulfillOrder: (...a: unknown[]) => fulfillOrder(...a),
  fulfillCart: (...a: unknown[]) => fulfillCart(...a),
}));
const fulfillSchoolOrder = vi.fn().mockResolvedValue("sent");
vi.mock("@/lib/order/fulfill-school", () => ({ fulfillSchoolOrder: (...a: unknown[]) => fulfillSchoolOrder(...a) }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost:3000/api/order/fulfill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const school = (payment_status: string) => ({
  id: "cs_1",
  payment_status,
  metadata: { kind: "school-frame", orderId: "o-1", school: "sluh-jr-bills", donationCents: "1000" },
});

beforeEach(() => {
  session = null;
  __memOrdersForTest.clear();
  fulfillOrder.mockClear();
  fulfillCart.mockClear();
  fulfillSchoolOrder.mockClear();
});

describe("POST /api/order/fulfill", () => {
  it("rejects a malformed or incomplete body", async () => {
    expect((await POST(req("{not json"))).status).toBe(400);
    expect((await POST(req({ sessionId: "cs_1" }))).status).toBe(400);
    expect((await POST(req({ orderId: "o-1" }))).status).toBe(400);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it("refuses a session Stripe does not know", async () => {
    const res = await POST(req({ sessionId: "cs_forged", orderId: "o-1" }));
    expect(res.status).toBe(400);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it("refuses an UNPAID session with 402", async () => {
    session = school("unpaid");
    expect((await POST(req({ sessionId: "cs_1", orderId: "o-1" }))).status).toBe(402);
    expect(fulfillOrder).not.toHaveBeenCalled();
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(0);
  });

  it("refuses a paid session that names a DIFFERENT order", async () => {
    session = school("paid");
    const res = await POST(req({ sessionId: "cs_1", orderId: "o-someone-else" }));
    expect(res.status).toBe(400);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });

  it("fulfils a paid school order from its saved revision — the body's files are never read", async () => {
    session = school("paid");
    const parts = { items: [] };
    const artifacts = { overview: "data:forged" };
    const res = await POST(req({ sessionId: "cs_1", orderId: "o-1", parts, artifacts }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: "sent" });
    expect(fulfillSchoolOrder).toHaveBeenCalledWith(session);
    expect(fulfillOrder).not.toHaveBeenCalled();
    const t = await schoolTotals("sluh-jr-bills");
    expect(t.frames).toBe(1);
    expect(t.raisedCents).toBe(1000);
  });

  it("fulfils a $0 (no_payment_required) order but records NO donation", async () => {
    session = school("no_payment_required");
    expect((await POST(req({ sessionId: "cs_1", orderId: "o-1" }))).status).toBe(200);
    expect(fulfillSchoolOrder).toHaveBeenCalledTimes(1); // the free frame still ships
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(0);
  });

  it("routes a cart order to fulfillCart and refuses a cart mismatch", async () => {
    session = { id: "cs_1", payment_status: "paid", metadata: { cartId: "c-1" } };
    expect((await POST(req({ sessionId: "cs_1", cartId: "c-other" }))).status).toBe(400);
    expect(fulfillCart).not.toHaveBeenCalled();
    expect((await POST(req({ sessionId: "cs_1", cartId: "c-1" }))).status).toBe(200);
    expect(fulfillCart).toHaveBeenCalledWith("c-1", session);
    expect(fulfillOrder).not.toHaveBeenCalled();
  });
});
