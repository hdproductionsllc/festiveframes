import { describe, expect, it, vi } from "vitest";

// Festive Frames is closed (config/holiday-shop). Nothing may take money for a
// holiday frame, and its pages send visitors to MySchoolFrame. School checkout
// keeps its own switch and is untouched by this one.

const create = vi.fn();
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { create } } }) }));

import { HOLIDAY_SHOP_OPEN, isHolidayOnlyPath } from "@/config/holiday-shop";
import sitemap from "../sitemap";
import { POST as checkout } from "./checkout/route";
import { POST as draft } from "./order/draft/route";
import nextConfig from "../../../next.config";

const post = (fn: (r: Request) => Promise<Response>, body: unknown) =>
  fn(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

describe("the holiday shop is closed", () => {
  it("is switched off", () => {
    expect(HOLIDAY_SHOP_OPEN).toBe(false);
  });

  it.each(["custom-frame", "cart", undefined])("refuses a %s checkout with 410 and never reaches Stripe", async (kind) => {
    const res = await post(checkout, { kind, orderId: "o1", lines: [{ orderId: "o1", quantity: 1 }] });
    expect(res.status).toBe(410);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses to store a holiday order draft", async () => {
    expect((await post(draft, { orderId: "o1", parts: {}, artifacts: {} })).status).toBe(410);
  });

  it("leaves school checkout to its OWN switch (still parked: 409, not 410)", async () => {
    const res = await post(checkout, { kind: "school-frame", token: "x", revision: 1 });
    expect(res.status).toBe(409);
  });

  it("sends the holiday pages to /school, temporarily (the switch can flip back)", async () => {
    const rules = await nextConfig.redirects!();
    for (const source of ["/build", "/cart", "/checkout", "/buy"]) {
      expect(rules).toContainEqual({ source, destination: "/school", permanent: false });
    }
  });

  // Found 2026-09-28: the first closing redirected the checkout path only, and six
  // patriotic landing pages kept serving on myschoolframe.com at $39, submitted to
  // Google by the sitemap. One list now drives both.
  it("redirects the landing pages, gift guides, blog and holiday legal pages too", async () => {
    const rules = await nextConfig.redirects!();
    const to = (source: string) => rules.find((r) => r.source === source)?.destination;
    for (const page of ["/patriotic-license-plate-frame", "/america-250-license-plate-frame", "/veteran-license-plate-frame", "/4th-of-july-license-plate-frame", "/made-in-usa-license-plate-frame", "/red-white-and-blue-license-plate-frame", "/classic", "/gifts/:path*", "/blog/:path*"])
      expect(to(page), page).toBe("/school");
    expect(to("/returns")).toBe("/school/warranty");
    expect(to("/privacy")).toBe("/school/privacy");
    expect(to("/terms")).toBe("/school/terms");
    expect(to("/thanks")).toBe("/school/thanks");
  });

  // The holiday forms (found 2026-09-28): their pages redirect, but the addresses
  // behind them still took submissions — and save-design emailed a Festive Frames
  // restore link to whatever address was typed.
  it("shuts the holiday forms, so nothing mails on behalf of a closed brand", async () => {
    const post = (body: unknown) => new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });
    for (const [name, load] of [
      ["save-design", () => import("../api/save-design/route")],
      ["contact", () => import("../api/contact/route")],
      ["review", () => import("../api/review/route")],
      ["subscribe", () => import("../api/subscribe/route")],
    ] as const) {
      const { POST } = await load();
      const res = await POST(post({ email: "someone@example.com", name: "x", message: "hi", rating: 5, body: "b" }));
      expect(res.status, name).toBe(410);
    }
  });

  it("submits none of them to Google", () => {
    const urls = sitemap().map((e) => new URL(e.url).pathname);
    const holiday = urls.filter((p) => isHolidayOnlyPath(p));
    expect(holiday).toEqual([]);
    expect(urls).toContain("/school/warranty");
  });
});
