import { describe, it, expect, beforeEach } from "vitest";
import { recordSchoolOrder, schoolTotals, __memOrdersForTest } from "./school-ledger";

/**
 * This is the money record a school is owed against, so the properties that
 * matter are not "does it add up" but "can it double-count" and "does a failure
 * anywhere take the number with it".
 *
 * Exercises the in-memory path, which is what runs without DATABASE_URL. The
 * Postgres path shares the same `fold`.
 */

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => __memOrdersForTest.clear());

describe("the fundraiser ledger", () => {
  it("totals frames and dollars for one school", async () => {
    await recordSchoolOrder({ orderId: "a", school: "sluh-jr-bills", donationCents: 1000 });
    await recordSchoolOrder({ orderId: "b", school: "sluh-jr-bills", donationCents: 1000 });
    const t = await schoolTotals("sluh-jr-bills");
    expect(t.frames).toBe(2);
    expect(t.raisedCents).toBe(2000);
  });

  it("NEVER double-counts a redelivered webhook", async () => {
    // Stripe redelivers freely, and both the webhook and the /thanks relay call
    // this for the same order. A fundraiser total that counts a retry is worse
    // than no total at all, because it is wrong in the club's favour and gets
    // discovered at payout.
    for (let i = 0; i < 5; i++) {
      await recordSchoolOrder({ orderId: "same", school: "kirkwood-pioneers", donationCents: 1000 });
    }
    const t = await schoolTotals("kirkwood-pioneers");
    expect(t.frames).toBe(1);
    expect(t.raisedCents).toBe(1000);
  });

  it("keeps schools apart", async () => {
    await recordSchoolOrder({ orderId: "a", school: "sluh-jr-bills", donationCents: 1000 });
    await recordSchoolOrder({ orderId: "b", school: "micds-rams", donationCents: 1000 });
    expect((await schoolTotals("sluh-jr-bills")).frames).toBe(1);
    expect((await schoolTotals("micds-rams")).frames).toBe(1);
    expect((await schoolTotals("nobody")).frames).toBe(0);
  });

  it("splits out the last 30 days", async () => {
    await recordSchoolOrder({ orderId: "recent", school: "s", donationCents: 1000 });
    __memOrdersForTest.set("old", {
      orderId: "old", school: "s", donationCents: 1000, paidAt: Date.now() - 40 * DAY,
    });
    const t = await schoolTotals("s");
    expect(t.frames).toBe(2);
    expect(t.raisedCents).toBe(2000);
    expect(t.frames30d).toBe(1);
    expect(t.raised30dCents).toBe(1000);
  });

  it("reports first and last order dates", async () => {
    const now = Date.now();
    __memOrdersForTest.set("x", { orderId: "x", school: "s", donationCents: 1000, paidAt: now - 10 * DAY });
    __memOrdersForTest.set("y", { orderId: "y", school: "s", donationCents: 1000, paidAt: now - 2 * DAY });
    const t = await schoolTotals("s");
    expect(t.firstAt).toBe(now - 10 * DAY);
    expect(t.lastAt).toBe(now - 2 * DAY);
  });

  it("returns zeroes for a school with nothing, rather than throwing", async () => {
    const t = await schoolTotals("brand-new-school");
    expect(t).toMatchObject({ frames: 0, raisedCents: 0, firstAt: null, lastAt: null });
  });

  it("ignores an order with no school or no id rather than banking it somewhere odd", async () => {
    await recordSchoolOrder({ orderId: "", school: "s", donationCents: 1000 });
    await recordSchoolOrder({ orderId: "z", school: "", donationCents: 1000 });
    expect(__memOrdersForTest.size).toBe(0);
  });

  it("treats a missing or junk donation as zero, never as NaN", async () => {
    // metadata.donationCents arrives as a string from Stripe and is Number()'d at
    // the call site. A NaN here would poison the school's entire total.
    await recordSchoolOrder({ orderId: "n", school: "s", donationCents: Number("nonsense") });
    const t = await schoolTotals("s");
    expect(t.frames).toBe(1);
    expect(t.raisedCents).toBe(0);
    expect(Number.isNaN(t.raisedCents)).toBe(false);
  });
});
