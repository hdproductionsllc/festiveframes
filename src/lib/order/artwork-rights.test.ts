import { describe, it, expect } from "vitest";
import type { PlacedTile } from "@/lib/types";
import { UPLOAD_RIGHTS_VERSION } from "@/content/upload-rights";
import {
  artworkOrderMetadata,
  artworkRightsLine,
  coerceArtworkRights,
  designHasUploadedArt,
  isCurrentAttestation,
} from "./artwork-rights";

// The rules an ORDER carries about customer-uploaded artwork. These are the guards
// behind a legal promise, so each one is tested for the direction it fails in:
// anything unclear must read as "not attested", never as "fine".

const setPiece: PlacedTile = { pieceId: "hs:football-patch", setId: "hs" };
const uploaded: PlacedTile = {
  pieceId: "upload",
  setId: "upload",
  image: { url: "data:image/png;base64,AA", fullResId: "abc" },
};

describe("designHasUploadedArt", () => {
  it("is false for a frame built only from the library", () => {
    expect(designHasUploadedArt({ slots: { a: setPiece, b: setPiece } })).toBe(false);
  });

  it("is true as soon as ONE tile carries the customer's own art", () => {
    expect(designHasUploadedArt({ slots: { a: setPiece, b: uploaded } })).toBe(true);
  });

  it("is false for an empty frame", () => {
    expect(designHasUploadedArt({ slots: {} })).toBe(false);
  });

  // The banner crest upload prints too (compose-school-frame loads its fullResId).
  // A frame whose ONLY upload was a crest once went to production as "our library only".
  it("counts a crest the customer uploaded onto a banner", () => {
    const text = { content: "RAMS", logo: { url: "data:image/png;base64,AA", fullResId: "fr1", placement: "both" as const } };
    const sections = { bottom: { text } } as unknown as Parameters<typeof designHasUploadedArt>[0]["sections"];
    expect(designHasUploadedArt({ slots: { a: setPiece }, sections })).toBe(true);
  });

  it("does not count the school's own kit crest", () => {
    const text = { content: "RAMS", logo: { url: "/kits/ladue-rams/crest.png", placement: "both" as const } };
    const sections = { bottom: { text } } as unknown as Parameters<typeof designHasUploadedArt>[0]["sections"];
    expect(designHasUploadedArt({ slots: { a: setPiece }, sections })).toBe(false);
  });
});

describe("isCurrentAttestation", () => {
  it("accepts a record made under the current wording", () => {
    expect(isCurrentAttestation({ version: UPLOAD_RIGHTS_VERSION, acceptedAt: 1 })).toBe(true);
  });

  it("REJECTS a record made under older wording", () => {
    // The point of storing a version rather than a boolean: agreeing to the old
    // words is not agreeing to the new ones, so the gate has to ask again.
    expect(isCurrentAttestation({ version: "1999-01-01", acceptedAt: 1 })).toBe(false);
  });

  it("rejects nothing-on-record", () => {
    expect(isCurrentAttestation(null)).toBe(false);
    expect(isCurrentAttestation(undefined)).toBe(false);
  });
});

describe("coerceArtworkRights", () => {
  it("reads a well-formed record off an untrusted body", () => {
    expect(coerceArtworkRights({ version: "2026-09-13", acceptedAt: 1757700000000 })).toEqual({
      version: "2026-09-13",
      acceptedAt: 1757700000000,
    });
  });

  it("keeps a record of OLDER wording — it is still real evidence", () => {
    // Deliberately not the same question as `isCurrentAttestation`. Discarding an
    // old record here would throw away the only proof the order ever had.
    expect(coerceArtworkRights({ version: "2020-01-01", acceptedAt: 5 })).not.toBeNull();
  });

  it.each([
    ["null", null],
    ["a string", "yes"],
    ["a bare true", true],
    ["no version", { acceptedAt: 5 }],
    ["an empty version", { version: "", acceptedAt: 5 }],
    ["an absurd version", { version: "x".repeat(41), acceptedAt: 5 }],
    ["no timestamp", { version: "2026-09-13" }],
    ["a string timestamp", { version: "2026-09-13", acceptedAt: "5" }],
    ["a zero timestamp", { version: "2026-09-13", acceptedAt: 0 }],
    ["NaN", { version: "2026-09-13", acceptedAt: Number.NaN }],
  ])("returns null for %s", (_label, input) => {
    expect(coerceArtworkRights(input)).toBeNull();
  });
});

describe("artworkRightsLine — what the production inbox is told", () => {
  it("says plainly when no customer art is involved", () => {
    expect(artworkRightsLine(false, null)).toMatch(/No customer-uploaded artwork/);
  });

  it("names the terms version and the date when art was attested", () => {
    const line = artworkRightsLine(true, { version: "2026-09-13", acceptedAt: Date.UTC(2026, 8, 13, 14, 30) });
    expect(line).toContain("2026-09-13");
    expect(line).toContain("2026-09-13 14:30 UTC");
  });

  it("SHOUTS when uploaded art arrives with nothing on record", () => {
    // Only reachable by a direct POST — the builder asks first. An operator must
    // be able to see it without reading carefully, so the email styles on this
    // exact string (see email-production.ts).
    expect(artworkRightsLine(true, null)).toContain("NO RIGHTS ATTESTATION");
  });
});

describe("artworkOrderMetadata — the Stripe record", () => {
  it("marks a library-only order so silence is never the answer", () => {
    expect(artworkOrderMetadata(false, null)).toEqual({ artUploaded: "no", artRights: "n/a" });
  });

  it("carries the version and an ISO timestamp when art was attested", () => {
    const at = Date.UTC(2026, 8, 13, 14, 30);
    expect(artworkOrderMetadata(true, { version: "2026-09-13", acceptedAt: at })).toEqual({
      artUploaded: "yes",
      artRights: `2026-09-13@${new Date(at).toISOString()}`,
    });
  });

  it("records the absence as 'none', not as an empty string", () => {
    expect(artworkOrderMetadata(true, null)).toEqual({ artUploaded: "yes", artRights: "none" });
  });

  it("stays inside Stripe's 500-character metadata value cap", () => {
    const m = artworkOrderMetadata(true, { version: "x".repeat(40), acceptedAt: Date.now() });
    expect(m.artRights.length).toBeLessThan(500);
  });
});
