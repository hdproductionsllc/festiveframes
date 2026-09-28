import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── We keep a copy of EVERY email a customer receives (Henry, 2026-09-28) ─────
//
// Two MySchoolFrame emails reach a customer: the paid-order receipt and the link to
// a saved design. Each must carry a BLIND copy to the team inbox, so Bill sees every
// word a parent was sent — and the parent never sees the team's addresses. The
// design-link email shipped without one; this is the guard.

const sent: Array<Record<string, unknown>> = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>) => {
        sent.push(msg);
        return { data: { id: "test" }, error: null };
      },
    };
  },
}));

import { sendDesignLinkEmail, sendProductionEmails } from "./email-production";

const TEAM = "bill@myschoolframe.com";
const PARENT = "parent@example.com";
const asList = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[];

describe("every email to a customer copies the team, blind", () => {
  const env = { ...process.env };
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    process.env.MSF_ORDER_EMAIL = TEAM;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  function expectBlindCopy() {
    const toParent = sent.filter((m) => asList(m.to).includes(PARENT));
    expect(toParent.length).toBeGreaterThan(0);
    for (const m of toParent) {
      expect(asList(m.bcc), String(m.subject)).toContain(TEAM);
      // Blind: the team is never a visible recipient on a parent's email.
      expect(asList(m.to)).not.toContain(TEAM);
      expect(asList(m.cc)).not.toContain(TEAM);
    }
  }

  it("the paid-order receipt", async () => {
    await sendProductionEmails({
      orderId: "ord_1",
      sessionId: "cs_1",
      customerEmail: PARENT,
      customerName: "Pat Parent",
      amountTotalCents: 2495,
      shippingLines: ["Pat Parent", "1 Main St"],
      parts: { designName: "Rams", plateState: "MO", tileSizeInches: 1, qr: { enabled: false, url: "" }, rows: [], totalTiles: 0, totalCells: 0, bars: [] },
      proof: { name: "proof", dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
      printSheets: [],
      banners: [],
      brand: "myschoolframe",
    });
    expectBlindCopy();
  });

  it("the link to a saved design", async () => {
    expect(await sendDesignLinkEmail({ to: PARENT, code: "MSF-7K3Q-X2PA", url: "https://www.myschoolframe.com/s/ladue-rams#d=x", schoolName: "Ladue" })).toBe(true);
    expectBlindCopy();
  });
});
