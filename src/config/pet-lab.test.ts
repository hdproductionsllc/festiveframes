import { describe, expect, it, vi } from "vitest";
import { PET_LAB_OPEN } from "./pet-lab";

// The pet lab spends money per call (Gemini image, Anthropic, email). Closed, every
// route must refuse BEFORE it reads a key — so a key being present changes nothing.
describe("the pet lab is switched off", () => {
  it("is closed", () => expect(PET_LAB_OPEN).toBe(false));

  for (const [name, load] of [
    ["cartoonize", () => import("@/app/api/cartoonize/route")],
    ["pet-caption", () => import("@/app/api/pet-caption/route")],
    ["lab/pet-submit", () => import("@/app/api/lab/pet-submit/route")],
  ] as const) {
    it(`/api/${name} answers 410 and calls nothing`, async () => {
      vi.stubEnv("GEMINI_API_KEY", "set");
      vi.stubEnv("ANTHROPIC_API_KEY", "set");
      vi.stubEnv("RESEND_API_KEY", "set");
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { POST } = await load();
      const res = await POST(new Request("http://x/api", { method: "POST", body: JSON.stringify({ image: "data:image/png;base64,AAAA" }) }));
      expect(res.status).toBe(410);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
      vi.unstubAllEnvs();
    });
  }
});
