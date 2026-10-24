import { describe, it, expect, vi, beforeEach } from "vitest";
import jsQR from "jsqr";

const currentAdmin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ currentAdmin: () => currentAdmin() }));

const call = async (school: string, placement: string, format = "svg") => {
  const { GET } = await import("./route");
  return GET(new Request(`http://localhost/api/admin/qr/${school}/${placement}?format=${format}`), {
    params: Promise.resolve({ school, placement }),
  });
};

beforeEach(() => currentAdmin.mockReset());

describe("GET /api/admin/qr/<school>/<placement>", () => {
  it("is staff only", async () => {
    currentAdmin.mockResolvedValue(null);
    expect((await call("sluh-jr-bills", "card")).status).toBe(401);
  });

  it("refuses an unknown school and a malformed placement", async () => {
    currentAdmin.mockResolvedValue("bill@myschoolframe.com");
    expect((await call("no-such-school-anywhere", "card")).status).toBe(404);
    expect((await call("sluh-jr-bills", "Bleachers!")).status).toBe(400);
  });

  it("downloads an SVG named for the school and placement", async () => {
    currentAdmin.mockResolvedValue("bill@myschoolframe.com");
    const res = await call("sluh-jr-bills", "bleachers");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    expect(res.headers.get("content-disposition")).toContain("sluh-jr-bills-bleachers.svg");
    expect(await res.text()).toMatch(/^<svg/);
  });

  it("the PNG SCANS to the production trackable link — never localhost", async () => {
    currentAdmin.mockResolvedValue("bill@myschoolframe.com");
    process.env.MSF_SITE_URL = "http://localhost:3000";
    try {
      const res = await call("sluh-jr-bills", "card", "png");
      expect(res.headers.get("content-type")).toBe("image/png");
      const sharp = (await import("sharp")).default;
      const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      expect(decoded?.data).toBe("https://www.myschoolframe.com/q/sluh-jr-bills/card");
    } finally {
      delete process.env.MSF_SITE_URL;
    }
  });
});
