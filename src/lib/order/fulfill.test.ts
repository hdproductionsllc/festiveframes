import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// fulfillOrder (the defunct holiday builder's path, kept for orders in flight)
// against the in-memory store, with Resend replaced by a switchable fake that
// returns the REAL v6 shape: `{ data, error }`, never a throw. School orders have
// their own path and tests: fulfill-school.test.ts.

const sent: Array<Record<string, unknown>> = [];
let failWith: { name: string; message: string } | null = null;
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>) => {
        if (failWith && String(msg.subject).startsWith("PRODUCTION")) return { data: null, error: failWith };
        sent.push(msg);
        return { data: { id: "test" }, error: null };
      },
    };
  },
}));

import { fulfillOrder } from "./fulfill";
import { saveDraft, markFulfilled, unmarkFulfilled } from "./store";

const PNG = { name: "panel", dataUrl: "data:image/png;base64,iVBORw0KGgo=" };
const parts = { designName: "Rams", plateState: "MO", tileSizeInches: 1, qr: { enabled: false, url: "" }, rows: [], totalTiles: 0, totalCells: 0, bars: [] };

function session(over: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_1",
    payment_status: "paid",
    amount_total: 2995,
    total_details: { amount_discount: 0, amount_shipping: 500, amount_tax: 0 },
    customer_details: { email: "parent@example.com", name: "Pat Parent" },
    metadata: { kind: "custom-frame", orderId: "o-1" },
    ...over,
  } as unknown as Stripe.Checkout.Session;
}

let n = 0;
async function draft(): Promise<string> {
  const orderId = `fulfill-test-${++n}`;
  await saveDraft({ orderId, parts: parts as never, artifacts: { proof: PNG, printSheets: [PNG], banners: [] } });
  return orderId;
}


describe("fulfillOrder", () => {
  const env = { ...process.env };
  beforeEach(() => {
    sent.length = 0;
    failWith = null;
    process.env.RESEND_API_KEY = "re_test";
    process.env.PRODUCTION_EMAILS = "team@example.com";
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("a REJECTED production email is a failure: the claim is released and a human is alerted", async () => {
    failWith = { name: "validation_error", message: "domain not verified" };
    const orderId = await draft();
    expect(await fulfillOrder(orderId, session())).toBe("failed");
    // Released: the next trigger can claim it again.
    expect(await markFulfilled(orderId)).toBe(true);
    await unmarkFulfilled(orderId);
    const alert = sent.find((m) => String(m.subject).includes("fulfillment FAILED"));
    expect(String(alert?.text)).toContain("domain not verified");
  });

});
