import { SITE_URL } from "@/config/season";
import { MSF_WARRANTY_PATH } from "@/content/msf-pages";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture every send instead of mailing anyone.
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

import {
  sendFulfillmentFailureAlert,
  sendProductionEmails,
  sendSchoolOrderEmail,
  sendSchoolRequestAlert,
  type ProductionOrderInput,
} from "./email-production";
import { msfFrom, msfOrderRecipients } from "./email-msf";

const PNG = { name: "proof", dataUrl: "data:image/png;base64,iVBORw0KGgo=" };

function order(brand?: ProductionOrderInput["brand"]): ProductionOrderInput {
  return {
    orderId: "ord_1",
    sessionId: "cs_1",
    customerEmail: "parent@example.com",
    customerName: "Pat Parent",
    amountTotalCents: 2495,
    shippingLines: ["Pat Parent", "1 Main St"],
    parts: { designName: "Rams", plateState: "MO", tileSizeInches: 1, qr: { enabled: false, url: "" }, rows: [], totalTiles: 0, totalCells: 0, bars: [] },
    proof: PNG,
    printSheets: [],
    banners: [],
    brand,
  };
}

describe("order emails speak for the brand that made the sale", () => {
  const env = { ...process.env };
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Festive Frames <orders@festiveframes.co>";
    process.env.PRODUCTION_EMAILS = "founders@example.com";
    delete process.env.MSF_ORDER_EMAIL;
    delete process.env.MSF_EMAIL_FROM;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("a school-frame order confirms as MySchoolFrame, with its logo, from the verified mailbox until MSF_EMAIL_FROM is set", async () => {
    await sendProductionEmails(order("myschoolframe"));
    const customer = sent.find((m) => m.to === "parent@example.com")!;
    expect(customer.subject).toBe("Your MySchoolFrame order is confirmed");
    expect(customer.from).toBe("MySchoolFrame <orders@festiveframes.co>");
    expect(customer.html).toContain("/brand/msf-logo-reverse.png");
    expect(customer.html).not.toMatch(/>Festive Frames</);
    expect(customer.html).not.toContain("🎆");
    // The production copy Bill reads carries the same header, so a school order is
    // recognisable at a glance in the founders' inbox.
    const production = sent.find((m) => m !== customer)!;
    expect(production.html).toContain("/brand/msf-logo-reverse.png");
    // EMAIL_SAMPLE_OUT=<file.html> writes the parent's email out to be LOOKED at.
    if (process.env.EMAIL_SAMPLE_OUT) {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(process.env.EMAIL_SAMPLE_OUT, String(customer.html));
    }
  });

  it("a school-frame confirmation is signed by the school team and names the warranty", async () => {
    // It borrowed the Festive Frames founders' note: signed by an illustrator no
    // longer on the project, and silent about the one-year warranty /school promises.
    await sendProductionEmails(order("myschoolframe"));
    const customer = sent.find((m) => m.to === "parent@example.com")!;
    for (const body of [String(customer.html), String(customer.text)]) {
      expect(body).toContain("The MySchoolFrame team");
      expect(body).not.toContain("Becky");
      expect(body).not.toContain("flying your colors");
      expect(body).toContain("one-year warranty");
      // MySchoolFrame's own warranty page, built from SITE_URL + the one path.
      expect(body).toContain(`${SITE_URL}${MSF_WARRANTY_PATH}`);
    }
  });

  it("an order with no brand is still a Festive Frames order, unchanged", async () => {
    await sendProductionEmails(order());
    const customer = sent.find((m) => m.to === "parent@example.com")!;
    expect(customer.subject).toBe("Your Festive Frames order is confirmed");
    expect(customer.from).toBe("Festive Frames <orders@festiveframes.co>");
    expect(customer.html).toMatch(/>Festive Frames</);
    expect(customer.html).not.toContain("msf-logo");
  });

  it("the school production-inbox email wears the MySchoolFrame header", async () => {
    const r = await sendSchoolOrderEmail({ designName: "Rams", printPng: PNG });
    expect(r).toEqual({ ok: true });
    expect(sent[0].html).toContain("/brand/msf-logo-reverse.png");
  });
});

describe("MySchoolFrame mail goes to MySchoolFrame, and a holiday order does not", () => {
  const env = { ...process.env };
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Festive Frames <orders@festiveframes.co>";
    process.env.PRODUCTION_EMAILS = "founders@example.com";
    delete process.env.MSF_ORDER_EMAIL;
    delete process.env.MSF_EMAIL_FROM;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("a paid school order goes TO bill@myschoolframe.com, not the Festive Frames founders", async () => {
    await sendProductionEmails(order("myschoolframe"));
    const customer = sent.find((m) => m.to === "parent@example.com")!;
    const production = sent.find((m) => m !== customer)!;
    expect(production.to).toEqual(["bill@myschoolframe.com"]);
    expect(customer.bcc).toEqual(["bill@myschoolframe.com"]);
    expect(production.from).toBe("MySchoolFrame <orders@festiveframes.co>");
  });

  it("a holiday order still goes to PRODUCTION_EMAILS from EMAIL_FROM, untouched", async () => {
    process.env.MSF_ORDER_EMAIL = "bill@myschoolframe.com";
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    await sendProductionEmails(order());
    const customer = sent.find((m) => m.to === "parent@example.com")!;
    const production = sent.find((m) => m !== customer)!;
    expect(production.to).toEqual(["founders@example.com"]);
    expect(production.from).toBe("Festive Frames <orders@festiveframes.co>");
    expect(customer.bcc).toEqual(["founders@example.com"]);
  });

  it("once MSF_EMAIL_FROM is set, every school email is sent from it", async () => {
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    await sendProductionEmails(order("myschoolframe"));
    await sendSchoolOrderEmail({ designName: "Rams", printPng: PNG });
    await sendSchoolRequestAlert({ id: "r1", schoolName: "X High", city: "Y", state: "MO", email: null, note: null });
    await sendFulfillmentFailureAlert("ord_1", "cs_1", null, "test", "myschoolframe");
    expect(sent).toHaveLength(5);
    for (const m of sent) expect(m.from).toBe("MySchoolFrame <orders@myschoolframe.com>");
  });

  it("the send-sheet order, the school request and a school failure alert all reach MSF_ORDER_EMAIL", async () => {
    process.env.MSF_ORDER_EMAIL = "bill@myschoolframe.com, henry@example.com";
    await sendSchoolOrderEmail({ designName: "Rams", printPng: PNG });
    await sendSchoolRequestAlert({ id: "r1", schoolName: "X High", city: "Y", state: "MO", email: "parent@example.com", note: null });
    await sendFulfillmentFailureAlert("ord_1", "cs_1", "parent@example.com", "test", "myschoolframe");
    expect(sent).toHaveLength(3);
    // EMAIL_SAMPLE_OUT_ORDER=<file.html> writes the send-sheet order email (what
    // Bill's inbox receives) out to be LOOKED at.
    if (process.env.EMAIL_SAMPLE_OUT_ORDER) {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(process.env.EMAIL_SAMPLE_OUT_ORDER, `<!-- from: ${String(sent[0].from)} | to: ${JSON.stringify(sent[0].to)} | subject: ${String(sent[0].subject)} -->\n${String(sent[0].html)}`);
    }
    for (const m of sent) {
      expect(m.to).toEqual(["bill@myschoolframe.com", "henry@example.com"]);
      // A parent's address is printed for a human to reply to, never a recipient.
      for (const field of ["to", "cc", "bcc", "replyTo"]) {
        expect(JSON.stringify(m[field] ?? "")).not.toContain("parent@example.com");
      }
    }
  });

  it("no school email carries a festiveframes.co address, body or From, once MSF_EMAIL_FROM is set", async () => {
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    await sendProductionEmails(order("myschoolframe"));
    await sendSchoolOrderEmail({ designName: "Rams", printPng: PNG });
    for (const m of sent) {
      const whole = JSON.stringify({ ...m, attachments: undefined });
      expect(whole).not.toMatch(/festive/i);
    }
  });
});

describe("msfFrom / msfOrderRecipients", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("falls back to the verified EMAIL_FROM mailbox under the MySchoolFrame name", () => {
    delete process.env.MSF_EMAIL_FROM;
    process.env.EMAIL_FROM = "Festive Frames <orders@festiveframes.co>";
    expect(msfFrom()).toBe("MySchoolFrame <orders@festiveframes.co>");
    process.env.EMAIL_FROM = "orders@festiveframes.co";
    expect(msfFrom()).toBe("MySchoolFrame <orders@festiveframes.co>");
    delete process.env.EMAIL_FROM;
    expect(msfFrom()).toBe("MySchoolFrame <onboarding@resend.dev>");
  });

  it("uses MSF_EMAIL_FROM as given, naming a bare address MySchoolFrame", () => {
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    expect(msfFrom()).toBe("MySchoolFrame <orders@myschoolframe.com>");
    process.env.MSF_EMAIL_FROM = "orders@myschoolframe.com";
    expect(msfFrom()).toBe("MySchoolFrame <orders@myschoolframe.com>");
  });

  it("defaults to bill@myschoolframe.com and never returns an empty list", () => {
    delete process.env.MSF_ORDER_EMAIL;
    expect(msfOrderRecipients()).toEqual(["bill@myschoolframe.com"]);
    process.env.MSF_ORDER_EMAIL = " , ";
    expect(msfOrderRecipients()).toEqual(["bill@myschoolframe.com"]);
  });
});
