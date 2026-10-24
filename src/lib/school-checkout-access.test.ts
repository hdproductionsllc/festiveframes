import { describe, it, expect, vi, beforeEach } from "vitest";

const currentAdmin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ currentAdmin: () => currentAdmin() }));

const withSwitch = (open: boolean) =>
  vi.doMock("@/config/school-checkout", () => ({ SCHOOL_CHECKOUT_OPEN: open }));

beforeEach(() => {
  currentAdmin.mockReset();
  vi.resetModules();
});

describe("schoolCheckoutAccess", () => {
  it("is open to everyone once the switch is on, without asking who is signed in", async () => {
    withSwitch(true);
    const { schoolCheckoutAccess } = await import("./school-checkout-access");
    expect(await schoolCheckoutAccess()).toBe("open");
    expect(currentAdmin).not.toHaveBeenCalled();
  });

  it("is staff-only while parked, for a signed-in staff session", async () => {
    withSwitch(false);
    currentAdmin.mockResolvedValue("bill@myschoolframe.com");
    const { schoolCheckoutAccess } = await import("./school-checkout-access");
    expect(await schoolCheckoutAccess()).toBe("staff");
  });

  it("is closed while parked for anyone else", async () => {
    withSwitch(false);
    currentAdmin.mockResolvedValue(null);
    const { schoolCheckoutAccess } = await import("./school-checkout-access");
    expect(await schoolCheckoutAccess()).toBe("closed");
  });

  it("is closed when the session cannot be read (the safe direction)", async () => {
    withSwitch(false);
    currentAdmin.mockRejectedValue(new Error("db down"));
    const { schoolCheckoutAccess } = await import("./school-checkout-access");
    expect(await schoolCheckoutAccess()).toBe("closed");
  });
});
