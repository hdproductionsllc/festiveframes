import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The SDK is mocked so these tests exercise OUR guards — the confidence floor, the
// "I don't know" path, hex validation — without a network call or an API key. The
// value here is the refusals: a lookup that invents a colour for an unrecognised
// school ships a stranger's scheme onto a physical product.
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const reply = (obj: unknown) => ({ content: [{ type: "text", text: JSON.stringify(obj) }] });

const GOOD = {
  known: true,
  name: "Northwestern University",
  mascot: "Wildcats",
  colors: ["#4E2A84", "#FFFFFF"],
  confidence: 0.95,
  reasoning: "Well-known university with published brand purple.",
};

let lookupKnownSchool: typeof import("./known-school.server").lookupKnownSchool;

beforeEach(async () => {
  vi.resetModules();
  create.mockReset();
  process.env.ANTHROPIC_API_KEY = "test-key";
  ({ lookupKnownSchool } = await import("./known-school.server"));
});
afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe("lookupKnownSchool", () => {
  it("returns the school when it is confidently recognised", async () => {
    create.mockResolvedValue(reply(GOOD));
    const r = await lookupKnownSchool("https://www.northwestern.edu");
    expect(r?.colors).toEqual(["#4E2A84", "#FFFFFF"]);
    expect(r?.mascot).toBe("Wildcats");
  });

  it("REFUSES when the model does not recognise the school", async () => {
    // The expected outcome for most of ~26,000 US high schools. An empty result
    // asks the user to pick a colour; an invented one silently ships the wrong
    // school's scheme on a physical product.
    create.mockResolvedValue(reply({ ...GOOD, known: false }));
    expect(await lookupKnownSchool("https://obscure-hs.example.org")).toBeNull();
  });

  it("REFUSES below the confidence floor even when marked known", async () => {
    create.mockResolvedValue(reply({ ...GOOD, confidence: 0.6 }));
    expect(await lookupKnownSchool("https://maybe-hs.example.org")).toBeNull();
  });

  it("REFUSES a 'known' answer carrying nothing usable", async () => {
    create.mockResolvedValue(
      reply({ known: true, name: null, mascot: null, colors: [], confidence: 0.9, reasoning: "" }),
    );
    expect(await lookupKnownSchool("https://empty.example.org")).toBeNull();
  });

  it("drops malformed and duplicate hex values", async () => {
    create.mockResolvedValue(
      reply({ ...GOOD, colors: ["#4E2A84", "purple", "#fff", "#4e2a84", "#C8A951"] }),
    );
    const r = await lookupKnownSchool("https://www.northwestern.edu");
    expect(r?.colors).toEqual(["#4E2A84", "#C8A951"]); // uppercased, deduped, 3-digit dropped
  });

  it("never throws — an API failure is a missing bonus, not a failed scan", async () => {
    create.mockRejectedValue(new Error("rate limited"));
    expect(await lookupKnownSchool("https://www.northwestern.edu")).toBeNull();
  });

  it("never throws on malformed JSON", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "not json" }] });
    expect(await lookupKnownSchool("https://www.northwestern.edu")).toBeNull();
  });

  it("makes NO call without an API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
    const mod = await import("./known-school.server");
    expect(await mod.lookupKnownSchool("https://www.northwestern.edu")).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("makes NO call for an unparseable URL", async () => {
    expect(await lookupKnownSchool("not a url")).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("passes the page's own findings as hints", async () => {
    // A name read off the site turns a recall problem into a verification one.
    create.mockResolvedValue(reply(GOOD));
    await lookupKnownSchool("https://www.northwestern.edu", {
      name: "Northwestern University",
      mascot: "Wildcats",
    });
    const sent = create.mock.calls[0][0].messages[0].content as string;
    expect(sent).toContain("Northwestern University");
    expect(sent).toContain("Wildcats");
  });
});
