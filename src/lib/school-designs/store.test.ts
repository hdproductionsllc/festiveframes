import { beforeEach, describe, expect, it } from "vitest";
import {
  __memSchoolArtifactsForTest,
  __memSchoolDesignsForTest,
  designCode,
  isWellFormedToken,
  openSchoolDesign,
  saveSchoolDesign,
  type RevisionInput,
} from "./store";

// Two different, VALID 1x1 PNGs (so their hashes differ).
const PNG_A = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const PNG_B = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const CONTACT = { email: "pat.parent@example.org", phone: "314-555-0199", forWhom: "My student" };

function rev(over: Partial<RevisionInput> = {}): RevisionInput {
  return {
    design: { designName: "Emma's frame", slots: {} },
    parts: null,
    proof: { name: "OVERVIEW", dataUrl: PNG_A },
    panels: [{ name: "left", dataUrl: PNG_B }],
    artworkRights: null,
    variant: "flush",
    createdBy: "parent",
    ...over,
  };
}

beforeEach(() => {
  __memSchoolDesignsForTest.clear();
  __memSchoolArtifactsForTest.clear();
});

describe("designCode — the human name for a design", () => {
  it("is MSF- plus two groups of four Crockford characters", () => {
    expect(designCode("7f3a9c2e-1b4d-4e8f-9a0b-1c2d3e4f5a6b")).toMatch(/^MSF-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });
  it("is derived: the same id always gives the same code, different ids differ", () => {
    const id = "7f3a9c2e-1b4d-4e8f-9a0b-1c2d3e4f5a6b";
    expect(designCode(id)).toBe(designCode(id));
    expect(designCode(id)).not.toBe(designCode("00000000-1b4d-4e8f-9a0b-1c2d3e4f5a6b"));
  });
  it("never uses the letters people misread aloud (I, L, O, U)", () => {
    for (let i = 0; i < 200; i++) {
      expect(designCode(crypto.randomUUID()).slice(4)).not.toMatch(/[ILOU]/);
    }
  });
});

describe("saveSchoolDesign / openSchoolDesign", () => {
  it("starts a new design at revision 1 and hands back a well-formed token", async () => {
    const saved = await saveSchoolDesign({ school: "ladue-rams", contact: CONTACT, revision: rev() });
    expect(saved).not.toBeNull();
    expect(saved!.revision).toBe(1);
    expect(saved!.created).toBe(true);
    expect(saved!.code).toBe(designCode(saved!.id));
    expect(isWellFormedToken(saved!.token)).toBe(true);
  });

  it("never stores the raw token — only its hash", async () => {
    const saved = await saveSchoolDesign({ school: "ladue-rams", contact: CONTACT, revision: rev() });
    const stored = JSON.stringify([...__memSchoolDesignsForTest.values()]);
    expect(stored).not.toContain(saved!.token);
  });

  it("a Send with the design's link is its NEXT revision; the old one is untouched", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: CONTACT, revision: rev() });
    const second = await saveSchoolDesign({
      link: { id: first!.id, token: first!.token },
      school: "ladue-rams",
      contact: CONTACT,
      revision: rev({ design: { designName: "Emma's frame, fixed" } }),
    });
    expect(second!.id).toBe(first!.id);
    expect(second!.revision).toBe(2);
    expect(second!.created).toBe(false);
    const d = __memSchoolDesignsForTest.get(first!.id)!;
    expect(d.revisions.map((r) => (r.design as { designName: string }).designName)).toEqual([
      "Emma's frame",
      "Emma's frame, fixed",
    ]);
  });

  it("a link with the WRONG token never adds to that design — it starts a new one", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: CONTACT, revision: rev() });
    const forged = "A".repeat(43);
    const other = await saveSchoolDesign({
      link: { id: first!.id, token: forged },
      school: "ladue-rams",
      contact: CONTACT,
      revision: rev(),
    });
    expect(other!.id).not.toBe(first!.id);
    expect(other!.created).toBe(true);
    expect(__memSchoolDesignsForTest.get(first!.id)!.revisions).toHaveLength(1);
  });

  it("opens the LATEST revision by token, and nothing for an unknown one", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: CONTACT, revision: rev() });
    await saveSchoolDesign({
      link: { id: first!.id, token: first!.token },
      school: "ladue-rams",
      contact: CONTACT,
      revision: rev({ design: { designName: "v2" } }),
    });
    const opened = await openSchoolDesign(first!.token);
    expect(opened).toMatchObject({ id: first!.id, code: first!.code, revision: 2, school: "ladue-rams" });
    expect(opened!.design).toEqual({ designName: "v2" });
    expect(await openSchoolDesign("B".repeat(43))).toBeNull();
    expect(await openSchoolDesign("not-a-token")).toBeNull();
  });

  it("stores each image once by content hash, however many revisions carry it", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: CONTACT, revision: rev() });
    await saveSchoolDesign({ link: { id: first!.id, token: first!.token }, school: "ladue-rams", contact: CONTACT, revision: rev() });
    expect(__memSchoolArtifactsForTest.size).toBe(2); // PNG_A + PNG_B, not four
  });

  it("stores nothing when the proof is not an image", async () => {
    const saved = await saveSchoolDesign({
      school: "ladue-rams",
      contact: CONTACT,
      revision: rev({ proof: { name: "OVERVIEW", dataUrl: "https://evil.example/x.png" } }),
    });
    expect(saved).toBeNull();
    expect(__memSchoolDesignsForTest.size).toBe(0);
  });
});
