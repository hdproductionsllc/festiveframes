import { describe, it, vi, beforeAll } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type Stripe from "stripe";

// ─── Every email MySchoolFrame sends, rendered to files, sent to nobody ───────
//
//   EMAIL_PREVIEW_OUT=<dir> [EMAIL_PREVIEW_SCHOOL=<slug>] [EMAIL_PREVIEW_PROOF=<frame.png>] \
//     npx vitest run src/lib/email-previews.preview.test.ts
//
// This is the REAL path, not hand-built samples: a design is sent through the
// submit route, approved, bought through the checkout route (Stripe stubbed), and
// paid through fulfillSchoolOrder — and every message is caught at Resend, so what
// lands in <dir> is byte for byte what a parent and the team would receive. Each
// email becomes one page (envelope on top: from / to / bcc / reply-to / subject /
// attachments), with index.html listing them all. Skipped unless the dir is set.
//
// EMAIL_PREVIEW_PROOF: a frame render to stand in for the proof (e.g. from
// kit-sample.test.ts); without it the pictures are a 1-pixel placeholder.

const OUT = process.env.EMAIL_PREVIEW_OUT;

const sent: Array<Record<string, unknown>> = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: Record<string, unknown>) => {
        sent.push(msg);
        return { data: { id: `preview-${sent.length}` }, error: null };
      },
    };
  },
}));
const stripeCreate = vi.fn(async () => ({ url: "https://checkout.stripe.com/preview" }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { create: stripeCreate } } }) }));
vi.mock("@/lib/school-checkout-access", () => ({ schoolCheckoutAccess: async () => "staff" }));

const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const SCHOOL = process.env.EMAIL_PREVIEW_SCHOOL || "ladue-rams";
const PARENT = { email: "pat.parent@example.org", phone: "314-555-0199", forWhom: "My student" };
const PARTS = {
  designName: "Emma — Class of 2027",
  plateState: "MO",
  tileSizeInches: 1,
  qr: { enabled: false, url: "" },
  rows: [
    { sku: "HS-SOCCER", name: "Soccer", pieceId: "hs:soccer", color: "", qty: 1, span: { cols: 2, rows: 1 }, size: "2.25 x 2.25", dieCut: false },
    { sku: "HS-TRACK", name: "Track & Field", pieceId: "hs:track", color: "", qty: 1, span: { cols: 2, rows: 1 }, size: "2.25 x 2.25", dieCut: false },
    { sku: "MARK", name: "School mark", pieceId: "kit:mark", color: "", qty: 2, span: { cols: 2, rows: 1 }, size: "2.25 x 2.25", dieCut: false },
  ],
  totalTiles: 4,
  totalCells: 8,
  bars: [
    { text: "CLASS OF 2027", fontFamily: "Graduate", row: "top", widthUnits: 11, widthIn: "11.00", heightIn: "0.75", qr: false },
    { text: "EMMA", fontFamily: "Graduate", row: "bottom", widthUnits: 11, widthIn: "11.00", heightIn: "1.00", qr: false },
  ],
};

const asList = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []).map(String);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Take what was sent since `from` and label it with the scenario that sent it. */
const pages: Array<{ file: string; scenario: string; msg: Record<string, unknown> }> = [];
function collect(from: number, scenario: string) {
  for (const msg of sent.slice(from)) {
    pages.push({ file: `${String(pages.length + 1).padStart(2, "0")}.html`, scenario, msg });
  }
}

async function writePages(dir: string) {
  await mkdir(dir, { recursive: true });
  for (const p of pages) {
    const atts = (p.msg.attachments as Array<{ filename: string; content: string; contentId?: string }> | undefined) ?? [];
    let html = String(p.msg.html ?? `<pre>${esc(String(p.msg.text ?? ""))}</pre>`);
    const rows: string[] = [];
    for (const [i, a] of atts.entries()) {
      const name = `${p.file.replace(".html", "")}-${i}-${a.filename}`;
      await writeFile(join(dir, name), Buffer.from(a.content, "base64"));
      if (a.contentId) html = html.split(`cid:${a.contentId}`).join(name);
      rows.push(`<a href="${name}">${esc(a.filename)}</a> (${Math.round((a.content.length * 0.75) / 1024)} KB${a.contentId ? ", shown inline" : ""})`);
    }
    const env = [
      ["Scenario", p.scenario],
      ["From", asList(p.msg.from).join(", ")],
      ["To", asList(p.msg.to).join(", ")],
      ["Cc", asList(p.msg.cc).join(", ")],
      ["Bcc", asList(p.msg.bcc).join(", ")],
      ["Reply-To", asList(p.msg.replyTo ?? p.msg.reply_to).join(", ")],
      ["Subject", String(p.msg.subject ?? "")],
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><th style="text-align:left;padding:2px 10px 2px 0;color:#555">${k}</th><td>${esc(v)}</td></tr>`)
      .join("");
    const envelope = `<div style="font:13px system-ui;background:#fffbe6;border-bottom:2px solid #e5c100;padding:12px 16px">
      <a href="index.html">← all emails</a><table style="margin-top:6px">${env}</table>
      ${rows.length ? `<div style="margin-top:6px"><b>Attachments:</b> ${rows.join(" · ")}</div>` : ""}</div>`;
    await writeFile(join(dir, p.file), `<!doctype html><meta charset="utf-8"><title>${esc(String(p.msg.subject))}</title>${envelope}${html}`);
  }
  const list = pages
    .map((p) => {
      const isCustomer = asList(p.msg.to).includes(PARENT.email);
      return `<tr><td>${esc(p.scenario)}</td><td>${isCustomer ? "<b>CUSTOMER</b>" : "team"}</td><td><a href="${p.file}">${esc(String(p.msg.subject))}</a></td><td>${esc(asList(p.msg.to).join(", "))}</td></tr>`;
    })
    .join("");
  await writeFile(
    join(dir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>MySchoolFrame emails</title><body style="font:14px system-ui;margin:24px">
     <h1>Every email MySchoolFrame sends</h1><p>Rendered from the real code path; nothing was sent. Generated ${new Date().toISOString()}.</p>
     <table cellpadding="6" border="1" style="border-collapse:collapse"><tr><th>Scenario</th><th>Who gets it</th><th>Subject</th><th>To</th></tr>${list}</table>`,
  );
}

describe.skipIf(!OUT)("email previews", () => {
  let proof = TINY_PNG;
  beforeAll(async () => {
    process.env.RESEND_API_KEY = "re_preview";
    process.env.EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    process.env.MSF_EMAIL_FROM = "MySchoolFrame <orders@myschoolframe.com>";
    process.env.MSF_ORDER_EMAIL = "bill@myschoolframe.com";
    delete process.env.DATABASE_URL;
    if (process.env.EMAIL_PREVIEW_PROOF) {
      const sharp = (await import("sharp")).default;
      const png = await sharp(await readFile(process.env.EMAIL_PREVIEW_PROOF)).resize({ width: 1600 }).png().toBuffer();
      proof = `data:image/png;base64,${png.toString("base64")}`;
    }
  });

  /** A parent's Send: saves the design and (box ticked) emails them its link. */
  async function send(over: Record<string, unknown> = {}) {
    const { POST } = await import("@/app/api/school/submit/route");
    const res = await POST(
      new Request("http://localhost/api/school/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printPng: proof,
          panels: [{ name: "left", dataUrl: proof }],
          designName: PARTS.designName,
          school: SCHOOL,
          variant: "flush",
          design: { designName: PARTS.designName, slots: {}, textBars: [] },
          partsList: PARTS,
          contact: { ...PARENT, futureProducts: true },
          student: { name: "Emma", classYear: 2027 },
          emailLink: true,
          ...over,
        }),
      }),
    );
    const json = (await res.json()) as { saved: { token: string; revision: number } | null };
    if (!json.saved) throw new Error(`send did not save: ${JSON.stringify(json)}`);
    return json as { saved: { token: string; revision: number } };
  }

  /** Approve, check out, and pay: the order exactly as a parent completes it. */
  async function buy(session: Partial<Stripe.Checkout.Session>, giftCents = 0) {
    const { saved } = await send({ emailLink: false });
    const { approveRevision } = await import("@/lib/school-designs/store");
    await approveRevision(saved.token, saved.revision, { wordingVersion: "preview", ip: null, userAgent: null });
    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ kind: "school-frame", token: saved.token, revision: saved.revision, giftCents }),
      }),
    );
    if (res.status !== 200) throw new Error(`checkout refused (${res.status}): ${await res.text()}`);
    const args = (stripeCreate.mock.calls.at(-1) as unknown as [Stripe.Checkout.SessionCreateParams])[0];
    const from = sent.length;
    const { fulfillSchoolOrder } = await import("@/lib/order/fulfill-school");
    await fulfillSchoolOrder({
      id: `cs_preview_${from}`,
      customer_details: { email: PARENT.email, name: "Pat Parent", address: null, phone: null, tax_exempt: "none", tax_ids: [] },
      collected_information: {
        shipping_details: { name: "Pat Parent", address: { line1: "9 Warson Rd", line2: null, city: "St. Louis", state: "MO", postal_code: "63124", country: "US" } },
      },
      metadata: args.metadata as Stripe.Metadata,
      ...session,
    } as unknown as Stripe.Checkout.Session);
    return from;
  }

  it("renders every email to files", async () => {
    let from = sent.length;
    await send();
    collect(from, "Parent taps Send (link box ticked)");

    from = await buy({ payment_status: "paid", amount_total: 2995 + 1000, total_details: { amount_discount: 0, amount_shipping: 500, amount_tax: 0 } }, 1000);
    collect(from, "Paid order ($24.95 + $5 shipping + $10 gift)");

    from = await buy({ payment_status: "no_payment_required", amount_total: 0, total_details: { amount_discount: 2995, amount_shipping: 500, amount_tax: 0 } });
    collect(from, "Staff $0 coupon test order");

    // An order whose proof was never approved can only arrive by a forged POST:
    // production HOLDS it and alerts the team.
    {
      const { saveSchoolDesign, getRevision } = await import("@/lib/school-designs/store");
      const { createSchoolOrder } = await import("@/lib/school-designs/orders");
      const s = (await saveSchoolDesign({
        school: SCHOOL,
        contact: null,
        revision: { design: { designName: "Unapproved" }, parts: PARTS, proof: { name: "OVERVIEW", dataUrl: proof }, panels: [], artworkRights: null, variant: "flush", createdBy: "parent" },
      }))!;
      const rev = (await getRevision(s.id, s.revision))!;
      const order = await createSchoolOrder({ designId: s.id, revision: rev.n, proofSha256: rev.proof.sha256, school: SCHOOL, donationCents: 500 });
      from = sent.length;
      const { fulfillSchoolOrder } = await import("@/lib/order/fulfill-school");
      await fulfillSchoolOrder({
        id: "cs_preview_held",
        payment_status: "paid",
        amount_total: 2995,
        total_details: { amount_discount: 0, amount_shipping: 500, amount_tax: 0 },
        customer_details: { email: PARENT.email, name: "Pat Parent" },
        metadata: { kind: "school-frame", orderId: order.orderId, proofSha256: rev.proof.sha256, school: SCHOOL, donationCents: "500", giftCents: "0" },
      } as unknown as Stripe.Checkout.Session);
      collect(from, "Order HELD (unapproved proof) — team alert");
    }

    {
      const { POST } = await import("@/app/api/school/request/route");
      from = sent.length;
      await POST(
        new Request("http://localhost/api/school/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schoolName: "Webster Groves High School", city: "Webster Groves", state: "MO", email: PARENT.email, note: "Please add us!" }),
        }),
      );
      collect(from, "Parent asks for a school we don't have");
    }

    {
      const { sendAdminSignInEmail } = await import("@/lib/email-production");
      from = sent.length;
      await sendAdminSignInEmail({ to: "bill@myschoolframe.com", url: "https://www.myschoolframe.com/admin/verify?t=preview" });
      collect(from, "Staff sign-in link");
    }

    await writePages(OUT!);
    console.log(`[email-previews] ${pages.length} emails → ${join(OUT!, "index.html")}`);
  }, 120_000);
});
