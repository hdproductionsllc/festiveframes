import { describe, expect, it } from "vitest";
import { POST as save } from "./save/route";
import { POST as approve } from "./approve/route";
import { POST as original } from "./original/route";
import { PROOF_APPROVAL_VERSION } from "@/content/proof-approval";
import { getRevisionByToken } from "@/lib/school-designs/store";

// The Buy path's three small routes: save (no email), approve (the recorded
// "yes"), and original (a reopened device's print-quality photos).

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const post = (fn: (r: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }));

const design = { designName: "Emma", slots: { a: { image: { url: "data:preview", fullResId: "photo-1" } } } };
const buyBody = {
  printPng: PNG,
  designName: "Emma",
  school: "ladue-rams",
  variant: "flush",
  design,
  originals: [{ fullResId: "photo-1", dataUrl: PNG }],
};

describe("save → approve → original", () => {
  it("save stores a revision and returns what the proof sheet needs, with no contact", async () => {
    const res = await post(save, buyBody);
    expect(res.status).toBe(200);
    const { saved } = await res.json();
    expect(saved).toMatchObject({ revision: 1, code: expect.stringMatching(/^MSF-/) });
    expect(saved.url).toMatch(/\/s\/ladue-rams#d=/);
  });

  it("save refuses a body with no design — there would be nothing to approve", async () => {
    const { design: _d, ...noDesign } = buyBody;
    void _d;
    expect((await post(save, noDesign)).status).toBe(400);
  });

  it("approve records the versioned wording on that revision; a wrong token records nothing", async () => {
    const { saved } = await (await post(save, { ...buyBody, designName: "Emma 2", design: { ...design, designName: "Emma 2" } })).json();
    expect((await post(approve, { token: "X".repeat(43), revision: saved.revision })).status).toBe(404);
    const res = await post(approve, { token: saved.token, revision: saved.revision }, { "user-agent": "test-browser" });
    expect(res.status).toBe(200);
    const rev = await getRevisionByToken(saved.token, saved.revision);
    expect(rev!.approval).toMatchObject({ wordingVersion: PROOF_APPROVAL_VERSION });
  });

  it("original returns the uploaded photo's bytes to the token holder, and nothing without it", async () => {
    const { saved } = await (await post(save, { ...buyBody, design: { ...design, designName: "Emma 3" } })).json();
    const sha = (await (await import("@/lib/school-designs/store")).openSchoolDesign(saved.token))!.originals[0].sha256;
    const ok = await post(original, { token: saved.token, sha256: sha });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toBe("image/png");
    expect((await post(original, { token: "Y".repeat(43), sha256: sha })).status).toBe(404);
  });
});
