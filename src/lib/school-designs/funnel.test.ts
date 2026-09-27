import { beforeEach, describe, expect, it } from "vitest";
import { __memEventsForTest, coerceTrack, funnel, recordEvent } from "./funnel";
import { GET as qr } from "@/app/q/[school]/[placement]/route";
import { POST as beacon } from "@/app/api/t/route";

beforeEach(() => {
  __memEventsForTest.length = 0;
});

const A = "anonAAAAAAAAAAAA";
const B = "anonBBBBBBBBBBBB";

describe("the funnel", () => {
  it("counts scans as scans and every later step as DISTINCT browsers", async () => {
    for (let i = 0; i < 4; i++) await recordEvent({ kind: "scan", school: "ladue-rams", placement: "card" });
    await recordEvent({ kind: "open", school: "ladue-rams", placement: "card", anonId: A });
    await recordEvent({ kind: "open", school: "ladue-rams", placement: "card", anonId: A }); // same person, twice
    await recordEvent({ kind: "open", school: "ladue-rams", placement: "card", anonId: B });
    await recordEvent({ kind: "send", school: "ladue-rams", placement: "card", anonId: A });
    await recordEvent({ kind: "paid", school: "ladue-rams", placement: "card", anonId: A });
    await recordEvent({ kind: "open", school: "ladue-rams", anonId: "anonCCCCCCCCCCCC" }); // no QR: direct
    const rows = await funnel(30);
    const card = rows.find((r) => r.placement === "card")!;
    expect(card.steps).toMatchObject({ scan: 4, open: 2, send: 1, paid: 1 });
    expect(rows.find((r) => r.placement === "direct")!.steps.open).toBe(1);
  });

  it("leaves out events older than the window", async () => {
    __memEventsForTest.push({ at: Date.now() - 40 * 86400000, kind: "scan", anonId: null, school: "ladue-rams", placement: "card", designId: null, orderId: null });
    expect(await funnel(30)).toEqual([]);
  });

  it("accepts only a well-formed anonymous id and placement from a browser", () => {
    expect(coerceTrack({ anonId: A, placement: "bleachers" })).toEqual({ anonId: A, placement: "bleachers" });
    expect(coerceTrack({ anonId: "<script>", placement: "x" })).toBeNull();
    expect(coerceTrack({ anonId: A, placement: "Bad Placement!" })).toEqual({ anonId: A, placement: null });
  });
});

describe("the trackable QR link /q/<school>/<placement>", () => {
  const scan = (school: string, placement: string) =>
    qr(new Request(`http://localhost:8080/q/${school}/${placement}`), { params: Promise.resolve({ school, placement }) });

  it("counts the scan and forwards to the school's builder on the REAL site, never localhost", async () => {
    const res = await scan("ladue-rams", "card");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://www.myschoolframe.com/s/ladue-rams?via=card");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(__memEventsForTest).toHaveLength(1);
    expect(__memEventsForTest[0]).toMatchObject({ kind: "scan", school: "ladue-rams", placement: "card", anonId: null });
  });

  it("an unknown school goes to the school finder and counts nothing", async () => {
    const res = await scan("not-a-school", "card");
    expect(res.headers.get("location")).toBe("https://www.myschoolframe.com/school#find-my-school");
    expect(__memEventsForTest).toHaveLength(0);
  });
});

describe("the browser beacon /api/t", () => {
  const post = (body: unknown) =>
    beacon(new Request("http://localhost/api/t", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

  it("records only 'open' and 'engage' — a browser cannot claim a send or a purchase", async () => {
    expect((await post({ k: "open", s: "ladue-rams", p: "card", a: A })).status).toBe(204);
    await post({ k: "paid", s: "ladue-rams", a: A });
    await post({ k: "send", s: "ladue-rams", a: A });
    expect(__memEventsForTest.map((e) => e.kind)).toEqual(["open"]);
  });

  it("answers 204 even to garbage, so a beacon never errors", async () => {
    const res = await beacon(new Request("http://localhost/api/t", { method: "POST", body: "{nope" }));
    expect(res.status).toBe(204);
  });
});
