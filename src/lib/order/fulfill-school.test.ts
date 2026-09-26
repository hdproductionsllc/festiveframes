import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// fulfillSchoolOrder end to end against the in-memory stores, with Resend replaced
// by a fake that returns the REAL v6 shape (`{ data, error }`, never a throw) and
// honours idempotency keys the way Resend does: a repeated key sends nothing new.

const sent: Array<Record<string, unknown>> = [];
const keys: string[] = [];
let failWith: { name: string; message: string } | null = null;
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>, opts?: { idempotencyKey?: string }) => {
        if (failWith && String(msg.subject).startsWith("PRODUCTION")) return { data: null, error: failWith };
        if (opts?.idempotencyKey) {
          if (keys.includes(opts.idempotencyKey)) return { data: { id: "repeat" }, error: null };
          keys.push(opts.idempotencyKey);
        }
        sent.push(msg);
        return { data: { id: "test" }, error: null };
      },
    };
  },
}));

import { fulfillSchoolOrder } from "./fulfill-school";
import {
  __memSchoolArtifactsForTest,
  approveRevision,
  getRevision,
  saveSchoolDesign,
} from "@/lib/school-designs/store";
import {
  __memSchoolOrdersForTest,
  CLAIM_LEASE_MS,
  claimSchoolOrder,
  createSchoolOrder,
  markSchoolOrderRefunded,
  recordSchoolOrderPayment,
  schoolTotals,
} from "@/lib/school-designs/orders";

const PNG_A = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const PNG_B = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const parts = { designName: "Rams", plateState: "MO", tileSizeInches: 1, qr: { enabled: false, url: "" }, rows: [], totalTiles: 0, totalCells: 0, bars: [] };

let seq = 0;
/** A saved revision (approved unless told otherwise) with an order awaiting payment. */
async function paidOrder(o: { approve?: boolean; metadata?: Record<string, string>; session?: Record<string, unknown> } = {}) {
  const saved = await saveSchoolDesign({
    school: "ladue-rams",
    contact: null,
    revision: {
      design: { designName: `Rams ${++seq}` },
      parts,
      proof: { name: "OVERVIEW", dataUrl: PNG_A },
      panels: [{ name: "left", dataUrl: PNG_B }],
      artworkRights: null,
      variant: "flush",
      createdBy: "parent",
    },
  });
  if (o.approve !== false) {
    await approveRevision(saved!.token, saved!.revision, { wordingVersion: "test", ip: null, userAgent: null });
  }
  const rev = (await getRevision(saved!.id, saved!.revision))!;
  const order = await createSchoolOrder({ designId: saved!.id, revision: rev.n, proofSha256: rev.proof.sha256, school: "ladue-rams", donationCents: 500 });
  const session = {
    id: `cs_${seq}`,
    payment_status: "paid",
    amount_total: 2995,
    total_details: { amount_discount: 0, amount_shipping: 500, amount_tax: 0 },
    customer_details: { email: "parent@example.com", name: "Pat Parent" },
    metadata: {
      kind: "school-frame",
      orderId: order.orderId,
      proofSha256: rev.proof.sha256,
      school: "ladue-rams",
      donationCents: "500",
      artUploaded: "no",
      artRights: "n/a",
      ...o.metadata,
    },
    ...o.session,
  } as unknown as Stripe.Checkout.Session;
  return { order, rev, session };
}

const production = () => sent.filter((m) => String(m.subject).startsWith("PRODUCTION"));
const alerts = () => sent.filter((m) => String(m.subject).includes("fulfillment FAILED"));

describe("fulfillSchoolOrder", () => {
  const env = { ...process.env };
  beforeEach(() => {
    sent.length = 0;
    keys.length = 0;
    failWith = null;
    process.env.RESEND_API_KEY = "re_test";
    process.env.MSF_ORDER_EMAIL = "bill@example.com";
  });
  afterEach(() => {
    process.env = { ...env };
    vi.useRealTimers();
  });

  it("sends an approved, paid order from its stored revision and marks it sent", async () => {
    const { order, rev, session } = await paidOrder();
    expect(await fulfillSchoolOrder(session)).toBe("sent");
    const [p] = production();
    expect(p.html).toContain("New paid order · $29.95 · $5.00 to ladue-rams");
    expect(p.text).toContain("School: ladue-rams");
    expect(p.text).toContain("Artwork: No customer-uploaded artwork");
    expect(p.text).toContain(`Proof approved: ${rev.code} revision 1, approved`);
    const files = (p.attachments as Array<{ filename: string }>).map((a) => a.filename);
    expect(files).toEqual(expect.arrayContaining(["left.png", `${rev.code}-r1-OVERVIEW-do-not-print.png`]));
    expect(__memSchoolOrdersForTest.get(order.orderId)?.status).toBe("sent");
    expect(keys).toContain(`msf-order/${order.orderId}/production`);
  });

  it("a second trigger after it was sent sends nothing", async () => {
    const { session } = await paidOrder();
    await fulfillSchoolOrder(session);
    const before = sent.length;
    expect(await fulfillSchoolOrder(session)).toBe("already");
    expect(sent.length).toBe(before);
  });

  it("HOLDS an order whose revision has no approval — never printed, a human alerted", async () => {
    const { order, session } = await paidOrder({ approve: false });
    expect(await fulfillSchoolOrder(session)).toBe("held");
    expect(production()).toHaveLength(0);
    expect(String(alerts()[0]?.text)).toMatch(/HELD — DO NOT PRINT.*no proof approval/);
    expect(__memSchoolOrdersForTest.get(order.orderId)?.status).toBe("held");
    // Held is settled: a redelivery does not try again.
    expect(await fulfillSchoolOrder(session)).toBe("held");
    expect(production()).toHaveLength(0);
  });

  it("HOLDS an order whose checkout named a different proof", async () => {
    const { session } = await paidOrder({ metadata: { proofSha256: "0".repeat(64) } });
    expect(await fulfillSchoolOrder(session)).toBe("held");
    expect(production()).toHaveLength(0);
  });

  it("HOLDS an order whose stored print file no longer matches its fingerprint", async () => {
    const { rev, session } = await paidOrder();
    const panel = __memSchoolArtifactsForTest.get(rev.panels[0].sha256)!;
    __memSchoolArtifactsForTest.set(rev.panels[0].sha256, { ...panel, bytes: Buffer.from("tampered") });
    try {
      expect(await fulfillSchoolOrder(session)).toBe("held");
      expect(production()).toHaveLength(0);
    } finally {
      __memSchoolArtifactsForTest.set(rev.panels[0].sha256, panel);
    }
  });

  it("a REJECTED email releases the claim and alerts; the next trigger sends it", async () => {
    const { order, session } = await paidOrder();
    failWith = { name: "validation_error", message: "domain not verified" };
    expect(await fulfillSchoolOrder(session)).toBe("failed");
    expect(String(alerts()[0]?.text)).toContain("domain not verified");
    expect(__memSchoolOrdersForTest.get(order.orderId)?.status).toBe("paid");
    failWith = null;
    expect(await fulfillSchoolOrder(session)).toBe("sent");
    expect(production()).toHaveLength(1);
  });

  it("a process killed mid-send: its claim EXPIRES and the next trigger finishes the order", async () => {
    const { order, session } = await paidOrder();
    // Paid, then claimed by an attempt that dies before sending anything.
    await recordSchoolOrderPayment(order.orderId, { sessionId: session.id, paymentStatus: "paid", amountCents: 2995 });
    expect(await claimSchoolOrder(order.orderId)).toBe("claimed"); // the doomed attempt
    // While its claim is live, another trigger stands back and asks to be retried.
    expect(await fulfillSchoolOrder(session)).toBe("in-progress");
    expect(production()).toHaveLength(0);
    // After the lease, the order is taken over and sent.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + CLAIM_LEASE_MS + 1000);
    expect(await fulfillSchoolOrder(session)).toBe("sent");
    expect(production()).toHaveLength(1);
  });

  it("an email that DID go out before a crash is not sent twice on recovery (idempotency key)", async () => {
    const { order, session } = await paidOrder();
    expect(await fulfillSchoolOrder(session)).toBe("sent");
    // Model "sent, then the process died before recording it".
    Object.assign(__memSchoolOrdersForTest.get(order.orderId)!, { status: "paid", claimUntil: null });
    expect(await fulfillSchoolOrder(session)).toBe("sent");
    expect(production()).toHaveLength(1);
  });

  it("a 100%-off coupon order says no money was collected and the school is NOT credited", async () => {
    const { session } = await paidOrder({
      session: {
        payment_status: "no_payment_required",
        amount_total: 0,
        total_details: { amount_discount: 2995, amount_shipping: 500, amount_tax: 0 },
      },
    });
    expect(await fulfillSchoolOrder(session)).toBe("sent");
    const [p] = production();
    expect(p.subject).toMatch(/^PRODUCTION \(\$0 COUPON\) — /);
    expect(p.html).toContain("$0 COUPON ORDER · no money collected · school NOT credited");
  });

  it("shouts when uploaded art arrives with no attestation", async () => {
    const { session } = await paidOrder({ metadata: { artUploaded: "yes", artRights: "none" } });
    await fulfillSchoolOrder(session);
    expect(production()[0].text).toContain("*** Artwork: Customer-uploaded artwork — NO RIGHTS ATTESTATION ON RECORD");
  });

  it("a frame refunded BEFORE it was made is held, not sent", async () => {
    const { order, session } = await paidOrder();
    await markSchoolOrderRefunded(order.orderId);
    expect(await fulfillSchoolOrder(session)).toBe("held");
    expect(production()).toHaveLength(0);
    expect(__memSchoolOrdersForTest.get(order.orderId)?.status).toBe("held");
  });

  it("the school's total is summed from its orders: paid counts, $0 and refunded do not", async () => {
    const before = (await schoolTotals("ladue-rams")).raisedCents;
    const paid = await paidOrder();
    await fulfillSchoolOrder(paid.session);
    const free = await paidOrder({ session: { payment_status: "no_payment_required", amount_total: 0 } });
    await fulfillSchoolOrder(free.session);
    const back = await paidOrder();
    await fulfillSchoolOrder(back.session);
    await markSchoolOrderRefunded(back.order.orderId);
    expect((await schoolTotals("ladue-rams")).raisedCents - before).toBe(500);
  });

  it("a session naming an order that does not exist alerts a human and sends nothing", async () => {
    const { session } = await paidOrder({ metadata: { orderId: "00000000-0000-4000-8000-000000000000" } });
    expect(await fulfillSchoolOrder(session)).toBe("no-order");
    expect(production()).toHaveLength(0);
    expect(alerts()).toHaveLength(1);
  });
});

describe("the parent's receipt", () => {
  it("sends replies to the team inbox, not to the (possibly send-only) sender address", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.MSF_ORDER_EMAIL = "bill@example.com";
    sent.length = 0;
    keys.length = 0;
    const { session } = await paidOrder();
    expect(await fulfillSchoolOrder(session)).toBe("sent");
    const receipt = sent.find((m) => String(m.subject).includes("order is confirmed"))!;
    expect(receipt.to).toBe("parent@example.com");
    expect(receipt.replyTo).toEqual(["bill@example.com"]);
  });
});
