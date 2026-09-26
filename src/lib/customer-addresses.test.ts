import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// THE OWNER'S RULE (Henry, 2026-09-26): "the only thing they should ever see is
// communication from an address that ends in myschoolframe.com, not the festive".
// Every email a CUSTOMER receives is captured here and every address it shows —
// From, Reply-To, and any address written in the body — must be on
// myschoolframe.com (the customer's own address excepted). The internal inbox is
// deliberately set to a personal Gmail, the case this rule exists for.

const sent: Array<Record<string, unknown>> = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (m: Record<string, unknown>) => {
        sent.push(m);
        return { data: { id: "x" }, error: null };
      },
    };
  },
}));

import { sendDesignLinkEmail, sendProductionEmails } from "./email-production";

const CUSTOMER = "pat.parent@example.org";
const env = { ...process.env };
beforeEach(() => {
  sent.length = 0;
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
  process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
  process.env.MSF_ORDER_EMAIL = "someone.personal@gmail.com, bill@myschoolframe.com";
});
afterEach(() => {
  process.env = { ...env };
});

/** Every email address a message shows its reader. */
function visibleAddresses(m: Record<string, unknown>): string[] {
  const fields = [m.from, m.replyTo].flat().filter(Boolean).map(String);
  const body = `${m.html ?? ""} ${m.text ?? ""}`;
  const inBody = body.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...fields, ...inBody].map((a) => (/<([^>]+)>/.exec(a)?.[1] ?? a).toLowerCase().trim());
}

function assertOnlyMsf(m: Record<string, unknown>) {
  const shown = visibleAddresses(m).filter((a) => a !== CUSTOMER);
  expect(shown.length).toBeGreaterThan(0);
  for (const a of shown) expect(a, `customer-visible address ${a}`).toMatch(/@myschoolframe\.com$/);
}

describe("customers only ever see myschoolframe.com addresses", () => {
  it("the design-link email", async () => {
    expect(await sendDesignLinkEmail({ to: CUSTOMER, code: "MSF-AAAA-BBBB", url: "https://www.myschoolframe.com/s/ladue-rams#d=x", schoolName: "Ladue" })).toBe(true);
    const toCustomer = sent.filter((m) => [m.to].flat().includes(CUSTOMER));
    expect(toCustomer).toHaveLength(1);
    assertOnlyMsf(toCustomer[0]);
  });

  it("the order receipt (and the internal inbox is only ever a blind copy)", async () => {
    await sendProductionEmails({
      orderId: "o1",
      sessionId: "cs_1",
      customerEmail: CUSTOMER,
      customerName: "Pat",
      amountTotalCents: 2995,
      shippingLines: ["Pat", "1 Main St"],
      parts: { designName: "Rams", plateState: "MO", tileSizeInches: 1, qr: { enabled: false, url: "" }, rows: [], totalTiles: 0, totalCells: 0, bars: [] },
      proof: null,
      printSheets: [],
      banners: [],
      brand: "myschoolframe",
    });
    const receipt = sent.find((m) => [m.to].flat().includes(CUSTOMER))!;
    assertOnlyMsf(receipt);
    expect(visibleAddresses(receipt)).not.toContain("someone.personal@gmail.com");
  });
});
