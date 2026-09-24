import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// fulfillOrder end to end against the in-memory store, with Resend replaced by a
// switchable fake that returns the REAL v6 shape: `{ data, error }`, never a throw.

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
    metadata: { kind: "school-frame", orderId: "o-1", school: "ladue-rams", donationCents: "500", artUploaded: "no", artRights: "n/a" },
    ...over,
  } as unknown as Stripe.Checkout.Session;
}

let n = 0;
async function draft(): Promise<string> {
  const orderId = `fulfill-test-${++n}`;
  await saveDraft({ orderId, parts: parts as never, artifacts: { proof: PNG, printSheets: [PNG], banners: [] } });
  return orderId;
}

const production = () => sent.find((m) => String(m.subject).includes("PRODUCTION"))!;

describe("fulfillOrder", () => {
  const env = { ...process.env };
  beforeEach(() => {
    sent.length = 0;
    failWith = null;
    process.env.RESEND_API_KEY = "re_test";
    process.env.MSF_ORDER_EMAIL = "bill@example.com";
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

  it("a paid school order names the school, the donation and the artwork record", async () => {
    const orderId = await draft();
    expect(await fulfillOrder(orderId, session())).toBe("sent");
    const p = production();
    expect(p.subject).toMatch(/^PRODUCTION — /);
    expect(p.html).toContain("New paid order · $29.95 · $5.00 to ladue-rams");
    expect(p.text).toContain("School: ladue-rams");
    expect(p.text).toContain("Artwork: No customer-uploaded artwork");
  });

  it("a 100%-off coupon order says no money was collected and the school is NOT credited", async () => {
    const orderId = await draft();
    const s = session({
      payment_status: "no_payment_required",
      amount_total: 0,
      total_details: { amount_discount: 2995, amount_shipping: 500, amount_tax: 0 },
    });
    expect(await fulfillOrder(orderId, s)).toBe("sent");
    const p = production();
    expect(p.subject).toMatch(/^PRODUCTION \(\$0 COUPON\) — /);
    expect(p.html).toContain("$0 COUPON ORDER · no money collected · school NOT credited");
    expect(p.html).not.toContain("New paid order");
    expect(p.text).toContain("Discount: $29.95 (promotion code)");
  });

  it("shouts when uploaded art arrives with no attestation", async () => {
    const orderId = await draft();
    await fulfillOrder(
      orderId,
      session({ metadata: { kind: "school-frame", orderId, school: "ladue-rams", donationCents: "500", artUploaded: "yes", artRights: "none" } }),
    );
    expect(production().text).toContain("*** Artwork: Customer-uploaded artwork — NO RIGHTS ATTESTATION ON RECORD");
  });

  it("a school order is made from the SERVER draft, never from print files in the request", async () => {
    const orderId = await draft();
    const forged = { name: "forged", dataUrl: "data:image/png;base64,Zm9yZ2Vk" };
    await fulfillOrder(orderId, session(), { parts: parts as never, artifacts: { proof: forged, printSheets: [forged], banners: [] } });
    const files = (production().attachments as Array<{ filename: string }>).map((a) => a.filename);
    expect(files).toContain("panel.png");
    expect(files).not.toContain("forged.png");
  });
});
