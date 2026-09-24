import { describe, it, expect } from "vitest";
import { coerceOrderContact, orderContactLine } from "./order-contact";

describe("coerceOrderContact", () => {
  it("requires an email", () => {
    expect(coerceOrderContact(undefined)).toEqual({ ok: false, problem: "email-missing" });
    expect(coerceOrderContact({ email: "   " })).toEqual({ ok: false, problem: "email-missing" });
  });

  it("refuses an email that is a typo or header-shaped", () => {
    for (const email of ["parent@", "parent@home", "a b@x.com", "x@y.com\nBcc: z@q.com", "<a@b.com>", "a@b.c"]) {
      const r = coerceOrderContact({ email });
      expect(r.ok, email).toBe(false);
    }
  });

  it("accepts a plain address and trims it", () => {
    expect(coerceOrderContact({ email: "  pat.parent+frames@example.org " })).toEqual({
      ok: true,
      contact: { email: "pat.parent+frames@example.org" },
    });
  });

  it("takes an optional phone only when it looks like one", () => {
    const ok = coerceOrderContact({ email: "p@example.com", phone: "(314) 555-0199" });
    expect(ok).toEqual({ ok: true, contact: { email: "p@example.com", phone: "(314) 555-0199" } });
    expect(coerceOrderContact({ email: "p@example.com", phone: "call me" })).toEqual({
      ok: false,
      problem: "phone-invalid",
    });
    expect(coerceOrderContact({ email: "p@example.com", phone: "12345" }).ok).toBe(false);
    expect(coerceOrderContact({ email: "p@example.com", phone: "" })).toEqual({
      ok: true,
      contact: { email: "p@example.com" },
    });
  });

  it("bounds and cleans who it is for", () => {
    const r = coerceOrderContact({ email: "p@example.com", forWhom: "My\u0007 student" + "x".repeat(200) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contact.forWhom!.length).toBeLessThanOrEqual(60);
    expect(r.contact.forWhom).not.toMatch(/\u0007/);
  });
});

describe("orderContactLine", () => {
  it("is one line naming the address as a reply-to, not a recipient", () => {
    const line = orderContactLine({ email: "p@example.com", phone: "314 555 0199", forWhom: "My student" });
    expect(line).not.toMatch(/\n/);
    expect(line).toContain("p@example.com");
    expect(line).toContain("314 555 0199");
    expect(line).toContain("My student");
    expect(line).toMatch(/has not emailed them/);
  });
});
