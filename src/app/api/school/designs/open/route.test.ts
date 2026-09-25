import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { saveSchoolDesign } from "@/lib/school-designs/store";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

const open = (body: unknown) =>
  POST(new Request("http://localhost/api/school/designs/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));

describe("POST /api/school/designs/open", () => {
  it("opens the saved design its token names, uncached", async () => {
    const saved = await saveSchoolDesign({
      school: "ladue-rams",
      contact: { email: "pat.parent@example.org" },
      revision: {
        design: { designName: "Emma's frame" },
        parts: null,
        proof: { name: "OVERVIEW", dataUrl: PNG },
        panels: [],
        artworkRights: null,
        variant: "flush",
        createdBy: "parent",
      },
    });
    const res = await open({ token: saved!.token });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toMatchObject({
      ok: true,
      code: saved!.code,
      revision: 1,
      school: "ladue-rams",
      design: { designName: "Emma's frame" },
    });
  });

  it("answers a plain 404 for an unknown or malformed token", async () => {
    expect((await open({ token: "C".repeat(43) })).status).toBe(404);
    expect((await open({ token: "short" })).status).toBe(404);
    expect((await open({})).status).toBe(404);
  });

  it("never echoes the token back", async () => {
    const res = await open({ token: "C".repeat(43) });
    expect(JSON.stringify(await res.json())).not.toContain("C".repeat(43));
  });
});
