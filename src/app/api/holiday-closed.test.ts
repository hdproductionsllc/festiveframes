import { describe, expect, it, vi } from "vitest";

// Festive Frames is closed (config/holiday-shop). Nothing may take money for a
// holiday frame, and its pages send visitors to MySchoolFrame. School checkout
// keeps its own switch and is untouched by this one.

const create = vi.fn();
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ checkout: { sessions: { create } } }) }));

import { HOLIDAY_SHOP_OPEN } from "@/config/holiday-shop";
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
});
