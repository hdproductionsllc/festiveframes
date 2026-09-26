import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The staff sign-in and the one staff action, end to end in memory. Cookies are
// supplied through a mocked next/headers so the routes run as they do for real.

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name)! } : undefined) }),
}));

import { ADMIN_COOKIE, createLoginToken, exchangeLoginToken, sessionEmail } from "./auth";
import { POST as login } from "@/app/api/admin/login/route";
import { GET as verify } from "@/app/api/admin/verify/route";
import { POST as relink } from "@/app/api/admin/designs/[id]/relink/route";
import { GET as artifact } from "@/app/api/admin/artifact/[sha]/route";
import { openSchoolDesign, saveSchoolDesign } from "@/lib/school-designs/store";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const env = { ...process.env };

beforeEach(() => {
  jar.clear();
  process.env.ADMIN_EMAILS = "henry@example.com, Bill@Example.com";
  delete process.env.RESEND_API_KEY;
});
afterEach(() => {
  process.env = { ...env };
});

const post = (fn: (r: Request) => Promise<Response>, body: unknown) =>
  fn(new Request("http://localhost/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

describe("staff sign-in", () => {
  it("only an address on ADMIN_EMAILS gets a link (case-insensitive)", async () => {
    expect(await createLoginToken("stranger@example.com")).toBeNull();
    expect(await createLoginToken("BILL@example.com")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("the form answers the same for staff and strangers — it cannot be used to find out who is staff", async () => {
    const a = await (await post(login, { email: "stranger@example.com" })).json();
    const b = await (await post(login, { email: "henry@example.com" })).json();
    expect(a.message).toBe("If that address is on the staff list, a sign-in link is on its way.");
    expect(a.devLink).toBeUndefined();
    // In development with no email key the staff link is shown for testing — never in production.
    expect(b.devLink).toMatch(/\/api\/admin\/verify\?t=/);
  });

  it("a link works ONCE", async () => {
    const t = await createLoginToken("henry@example.com");
    expect(await exchangeLoginToken(t)).not.toBeNull();
    expect(await exchangeLoginToken(t)).toBeNull();
  });

  it("the verify link sets an httpOnly session cookie and lands on /admin; a spent link goes back to sign-in", async () => {
    const t = await createLoginToken("henry@example.com");
    const res = await verify(new Request(`http://localhost/api/admin/verify?t=${t}`));
    expect(res.headers.get("location")).toMatch(/\/admin$/);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${ADMIN_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    const again = await verify(new Request(`http://localhost/api/admin/verify?t=${t}`));
    expect(again.headers.get("location")).toMatch(/\/admin\/login\?e=link$/);
  });

  it("taking someone off ADMIN_EMAILS signs them out everywhere", async () => {
    const session = await exchangeLoginToken(await createLoginToken("bill@example.com"));
    expect(await sessionEmail(session)).toBe("bill@example.com");
    process.env.ADMIN_EMAILS = "henry@example.com";
    expect(await sessionEmail(session)).toBeNull();
  });
});

describe("the one staff action: a fresh link for a parent who lost theirs", () => {
  async function design() {
    return (await saveSchoolDesign({
      school: "ladue-rams",
      contact: { email: "pat@example.org" },
      revision: { design: { designName: `x${Math.random()}` }, parts: null, proof: { name: "o", dataUrl: PNG }, panels: [], artworkRights: null, variant: "flush", createdBy: "parent" },
    }))!;
  }
  const relinkReq = (id: string) =>
    relink(new Request(`http://localhost/api/admin/designs/${id}/relink`, { method: "POST" }), { params: Promise.resolve({ id }) });

  it("refuses without a staff session", async () => {
    const d = await design();
    expect((await relinkReq(d.id)).status).toBe(401);
    expect(await openSchoolDesign(d.token)).not.toBeNull(); // untouched
  });

  it("issues a new link and the OLD one stops working", async () => {
    const d = await design();
    jar.set(ADMIN_COOKIE, (await exchangeLoginToken(await createLoginToken("henry@example.com")))!);
    const res = await relinkReq(d.id);
    expect(res.status).toBe(200);
    const { url } = await res.json();
    const fresh = /#d=([A-Za-z0-9_-]{43})$/.exec(url)![1];
    expect(url).toContain("/s/ladue-rams#d=");
    expect(await openSchoolDesign(d.token)).toBeNull();
    expect((await openSchoolDesign(fresh))?.id).toBe(d.id);
  });

  it("stored images are staff-only", async () => {
    const res = await artifact(new Request("http://localhost/api/admin/artifact/x"), { params: Promise.resolve({ sha: "a".repeat(64) }) });
    expect(res.status).toBe(401);
  });
});
