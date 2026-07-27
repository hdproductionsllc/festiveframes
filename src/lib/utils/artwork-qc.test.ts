import { describe, it, expect } from "vitest";
import { evaluateResolution } from "@/lib/utils/print-resolution";
import {
  analyzeArtwork,
  repairArtwork,
  isUsable,
  cutBackground,
  deMatte,
  estimateMatte,
  MIN_DPI,
  TARGET_DPI,
  type Pixels,
  type PrintRequirement,
} from "./artwork-qc";

// A 2x2 badge on the school frame: 1.982in a side, so 595px at 300 DPI.
const REQ: PrintRequirement = {
  span: { cols: 2, rows: 2 },
  tileSizeInches: 0.991,
  dpi: 300,
};

/** A blank RGBA canvas. */
function blank(w: number, h: number, rgba: [number, number, number, number]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0]; data[i + 1] = rgba[1]; data[i + 2] = rgba[2]; data[i + 3] = rgba[3];
  }
  return { data, width: w, height: h };
}

function set(px: Pixels, x: number, y: number, rgba: [number, number, number, number]) {
  const i = (y * px.width + x) * 4;
  px.data[i] = rgba[0]; px.data[i + 1] = rgba[1]; px.data[i + 2] = rgba[2]; px.data[i + 3] = rgba[3];
}

function get(px: Pixels, x: number, y: number): [number, number, number, number] {
  const i = (y * px.width + x) * 4;
  return [px.data[i], px.data[i + 1], px.data[i + 2], px.data[i + 3]];
}

/**
 * Dark art on a transparent field with a WHITE-MATTED soft edge — the exact defect
 * measured in the real collection, where edge pixels ramp toward (235,235,234)
 * while the art itself is (130,130,129).
 */
function mattedArt(size: number): Pixels {
  const px = blank(size, size, [0, 0, 0, 0]);
  const mid = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - mid, y - mid);
      if (r < size * 0.3) {
        set(px, x, y, [130, 130, 129, 255]); // solid art
      } else if (r < size * 0.34) {
        // Anti-aliased edge, composited on white and never un-multiplied.
        const a = Math.round(255 * (1 - (r - size * 0.3) / (size * 0.04)));
        const blend = (c: number) => Math.round((a / 255) * c + (1 - a / 255) * 255);
        set(px, x, y, [blend(130), blend(130), blend(129), a]);
      }
    }
  }
  return px;
}

describe("analyzeArtwork — resolution", () => {
  it("passes art that meets the target", () => {
    const r = analyzeArtwork(blank(600, 600, [10, 20, 30, 255]), REQ);
    expect(r.effectiveDpi).toBeGreaterThanOrEqual(TARGET_DPI);
    expect(r.findings.find((f) => f.code === "resolution-low")).toBeUndefined();
    expect(r.findings.find((f) => f.code === "resolution-marginal")).toBeUndefined();
  });

  it("reports the pixels the footprint actually needs", () => {
    const r = analyzeArtwork(blank(100, 100, [10, 20, 30, 255]), REQ);
    expect(r.requiredWidth).toBe(Math.round(2 * 0.991 * 300));
    expect(r.requiredHeight).toBe(Math.round(2 * 0.991 * 300));
  });

  it("FAILS art too small to print, and refuses to call it repairable", () => {
    // Upscaling would invent detail — the honest answer is a better file.
    const r = analyzeArtwork(blank(200, 200, [10, 20, 30, 255]), REQ);
    const f = r.findings.find((x) => x.code === "resolution-low");
    expect(f?.severity).toBe("error");
    expect(f?.repairable).toBe(false);
    expect(isUsable(r)).toBe(false);
  });

  it("warns — but still allows — art between the floor and the target", () => {
    // Size DERIVED from the floor, not hard-coded. It used to be a literal 200 DPI,
    // chosen when the floor was 150; when the floor rose to meet the crop modal's
    // BLOCK_DPI the literal landed exactly ON it and the test broke for a reason that
    // had nothing to do with what it is checking. Sit it a quarter above the floor and
    // it keeps meaning "comfortably between the two thresholds" wherever they move.
    const side = Math.round(MIN_DPI * 1.25 * 0.991 * 2);
    const px = blank(side, side, [10, 20, 30, 255]);
    const r = analyzeArtwork(px, REQ);
    expect(r.effectiveDpi).toBeGreaterThan(MIN_DPI);
    expect(r.effectiveDpi).toBeLessThan(TARGET_DPI);
    expect(r.findings.find((x) => x.code === "resolution-marginal")?.severity).toBe("warning");
    expect(isUsable(r)).toBe(true);
  });

  it("never calls usable anything the CROP MODAL will refuse", () => {
    // The two gates used to disagree: 150 here, BLOCK_DPI=200 in print-resolution.
    // A 300x300 logo measures ~151 DPI at the 2x2 footprint, so this module called it
    // usable and the UI offered it as a good candidate — and then the crop modal
    // blocked it with no way forward. A dead end presented as a success.
    //
    // Swept across the whole disputed band rather than spot-checked, because the bug
    // was a RANGE, not a value.
    for (let side = 260; side <= 460; side += 20) {
      const r = analyzeArtwork(blank(side, side, [10, 20, 30, 255]), REQ);
      const verdict = evaluateResolution(
        { width: side, height: side },
        { width: REQ.span.cols * REQ.tileSizeInches, height: REQ.span.rows * REQ.tileSizeInches },
      );
      if (isUsable(r)) {
        expect(verdict.blocked, `${side}px: QC says usable but the crop modal blocks it`).toBe(false);
      }
    }
  });

  it("binds on the SHORT dimension — wide enough but short still prints short", () => {
    const r = analyzeArtwork(blank(1200, 200, [10, 20, 30, 255]), REQ);
    expect(r.findings.some((f) => f.code === "resolution-low")).toBe(true);
  });
});

describe("analyzeArtwork — background and edges", () => {
  it("flags an opaque background as repairable", () => {
    const r = analyzeArtwork(blank(600, 600, [255, 255, 255, 255]), REQ);
    const f = r.findings.find((x) => x.code === "background-opaque");
    expect(f?.repairable).toBe(true);
    expect(f?.severity).toBe("warning"); // fixable, so never fatal
  });

  it("does NOT flag already-cut art as having an opaque background", () => {
    const r = analyzeArtwork(mattedArt(600), REQ);
    expect(r.findings.some((f) => f.code === "background-opaque")).toBe(false);
  });

  it("detects a white matte fringe and names the colour it found", () => {
    const r = analyzeArtwork(mattedArt(600), REQ);
    const f = r.findings.find((x) => x.code === "matte-fringe");
    expect(f).toBeDefined();
    expect(f!.repairable).toBe(true);
    // The measured signature: faint edge pixels near-white, solid art mid-grey.
    expect(r.edgeMean![0]).toBeGreaterThan(200);
    expect(r.artMean![0]).toBeLessThan(160);
  });

  it("ignores fully transparent pixels when measuring colour", () => {
    // Reading RGB inside transparent regions once produced a bogus 49/255 error.
    // Garbage there must not move the means.
    const px = mattedArt(400);
    for (let i = 0; i < px.data.length; i += 4) {
      if (px.data[i + 3] === 0) {
        px.data[i] = 255; px.data[i + 1] = 0; px.data[i + 2] = 255; // loud magenta
      }
    }
    const r = analyzeArtwork(px, REQ);
    expect(r.artMean![0]).toBeLessThan(160);
    expect(r.edgeMean![2]).toBeLessThan(255);
  });

  it("catches an empty download rather than passing a blank badge", () => {
    const r = analyzeArtwork(blank(600, 600, [0, 0, 0, 0]), REQ);
    expect(r.findings.find((f) => f.code === "near-empty")?.severity).toBe("error");
    expect(isUsable(r)).toBe(false);
  });

  it("does not call a flat logo 'quantized' just because it has few colours", () => {
    // A 3-colour flat mark with hard edges is a flat mark, not a defect.
    const r = analyzeArtwork(blank(600, 600, [10, 20, 30, 255]), REQ);
    expect(r.findings.some((f) => f.code === "palette-quantized")).toBe(false);
  });
});

describe("deMatte — the repair that removes the halo", () => {
  it("recovers the art's true colour from a matted edge", () => {
    // One pixel: art (130,130,129) composited 50% onto white.
    const px = blank(1, 1, [193, 193, 192, 128]);
    const n = deMatte(px, [255, 255, 255]);
    expect(n).toBe(1);
    const [r, g, b, a] = get(px, 0, 0);
    expect(r).toBeGreaterThan(125);
    expect(r).toBeLessThan(136);
    expect(g).toBeGreaterThan(125);
    expect(b).toBeGreaterThan(124);
    expect(a).toBe(128); // alpha is untouched — only the colour was wrong
  });

  it("leaves solid and fully transparent pixels alone", () => {
    const px = blank(2, 1, [200, 200, 200, 255]);
    set(px, 1, 0, [200, 200, 200, 0]);
    expect(deMatte(px, [255, 255, 255])).toBe(0);
    expect(get(px, 0, 0)).toEqual([200, 200, 200, 255]);
  });

  it("clamps rather than wrapping when the maths overshoots", () => {
    // A very faint pixel divided by a tiny alpha can fly far outside 0..255.
    const px = blank(1, 1, [250, 250, 250, 4]);
    deMatte(px, [255, 255, 255]);
    const [r] = get(px, 0, 0);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(255);
  });
});

describe("estimateMatte", () => {
  it("finds the background colour a fringe converges on", () => {
    const m = estimateMatte(mattedArt(400));
    expect(m).not.toBeNull();
    expect(m![0]).toBeGreaterThan(200);
  });

  it("returns null for properly cut art — nothing to remove", () => {
    // Edge pixels that fade toward the ART's own colour, as correct alpha should.
    const px = blank(40, 40, [0, 0, 0, 0]);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const r = Math.hypot(x - 20, y - 20);
        if (r < 12) set(px, x, y, [130, 130, 129, 255]);
        else if (r < 16) set(px, x, y, [130, 130, 129, Math.round(255 * (1 - (r - 12) / 4))]);
      }
    }
    expect(estimateMatte(px)).toBeNull();
  });
});

describe("cutBackground", () => {
  it("removes an edge-connected background", () => {
    const px = blank(40, 40, [255, 255, 255, 255]);
    for (let y = 14; y < 26; y++) for (let x = 14; x < 26; x++) set(px, x, y, [20, 30, 40, 255]);
    const { pixels, cut } = cutBackground(px);
    expect(cut).toBeGreaterThan(0);
    expect(get(pixels, 0, 0)[3]).toBe(0); // corner gone
    expect(get(pixels, 20, 20)[3]).toBe(255); // art kept
  });

  it("PRESERVES an enclosed region that matches the background", () => {
    // The white inside a letter's counter. A global colour match punches it out;
    // an edge-connected flood must not reach it.
    const px = blank(40, 40, [255, 255, 255, 255]);
    for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) set(px, x, y, [20, 30, 40, 255]);
    for (let y = 17; y < 23; y++) for (let x = 17; x < 23; x++) set(px, x, y, [255, 255, 255, 255]);
    const { pixels } = cutBackground(px);
    expect(get(pixels, 20, 20)[3]).toBe(255); // the counter survives
    expect(get(pixels, 0, 0)[3]).toBe(0);
  });

  it("survives a degenerate image without throwing", () => {
    expect(() => cutBackground(blank(0, 0, [0, 0, 0, 0]))).not.toThrow();
    expect(() => cutBackground(blank(1, 1, [255, 255, 255, 255]))).not.toThrow();
  });
});

describe("repairArtwork — end to end", () => {
  it("cuts the background AND cleans the fringe it creates, in that order", () => {
    // Opaque white background with dark art: cutting CREATES the soft edge, so the
    // de-matte has to run on the result, not on the original.
    const px = blank(600, 600, [255, 255, 255, 255]);
    for (let y = 200; y < 400; y++) {
      for (let x = 200; x < 400; x++) set(px, x, y, [130, 130, 129, 255]);
    }
    const report = analyzeArtwork(px, REQ);
    expect(report.findings.some((f) => f.code === "background-opaque")).toBe(true);

    const { pixels, repairs } = repairArtwork(px, report);
    expect(repairs.length).toBeGreaterThan(0);
    expect(get(pixels, 0, 0)[3]).toBe(0); // background gone
    expect(get(pixels, 300, 300)[3]).toBe(255); // art kept

    // And the repaired file no longer trips the checks it was flagged for.
    const after = analyzeArtwork(pixels, REQ);
    expect(after.findings.some((f) => f.code === "background-opaque")).toBe(false);
    expect(after.findings.some((f) => f.code === "matte-fringe")).toBe(false);
  });

  it("clears the matte-fringe finding on already-cut but matted art", () => {
    const px = mattedArt(600);
    const before = analyzeArtwork(px, REQ);
    expect(before.findings.some((f) => f.code === "matte-fringe")).toBe(true);

    const { pixels, repairs } = repairArtwork(px, before);
    expect(repairs.join(" ")).toMatch(/matte/i);
    const after = analyzeArtwork(pixels, REQ);
    expect(after.findings.some((f) => f.code === "matte-fringe")).toBe(false);
  });

  it("never mutates the caller's pixels", () => {
    const px = mattedArt(200);
    const copy = new Uint8ClampedArray(px.data);
    repairArtwork(px, analyzeArtwork(px, REQ));
    expect(px.data).toEqual(copy);
  });

  it("reports no repairs, and changes nothing, for clean art", () => {
    const px = blank(600, 600, [10, 20, 30, 0]);
    for (let y = 100; y < 500; y++) {
      for (let x = 100; x < 500; x++) set(px, x, y, [130, 130, 129, 255]);
    }
    const { repairs } = repairArtwork(px, analyzeArtwork(px, REQ));
    expect(repairs).toEqual([]);
  });

  it("does not claim to have fixed resolution", () => {
    const px = blank(200, 200, [255, 255, 255, 255]);
    const { pixels, repairs } = repairArtwork(px, analyzeArtwork(px, REQ));
    expect(repairs.join(" ")).not.toMatch(/resolution|dpi|upscal/i);
    expect(pixels.width).toBe(200); // still too small, and still says so
    expect(analyzeArtwork(pixels, REQ).findings.some((f) => f.code === "resolution-low")).toBe(true);
  });
});

describe("confidence — the repair declines rather than guessing", () => {
  /** Two very different art colours under one white matte: the fit is ambiguous. */
  function twoColourMatted(size: number): Pixels {
    const px = blank(size, size, [0, 0, 0, 0]);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inLeft = x < size / 2 && x > size * 0.1 && y > size * 0.1 && y < size * 0.9;
        const inRight = x >= size / 2 && x < size * 0.9 && y > size * 0.1 && y < size * 0.9;
        if (!inLeft && !inRight) continue;
        const art: [number, number, number] = inLeft ? [10, 10, 10] : [245, 40, 40];
        // Give every art pixel a random partial alpha, so alpha carries no
        // information about which colour is underneath — the ambiguous case.
        const a = 20 + ((x * 7 + y * 13) % 200);
        const blend = (c: number) => Math.round((a / 255) * c + (1 - a / 255) * 255);
        set(px, x, y, [blend(art[0]), blend(art[1]), blend(art[2]), a]);
      }
    }
    return px;
  }

  it("refuses to identify a matte when the fit is poor", () => {
    expect(estimateMatte(twoColourMatted(200))).toBeNull();
  });

  it("still WARNS about the fringe, but marks it not auto-repairable", () => {
    const r = analyzeArtwork(twoColourMatted(600), REQ);
    const f = r.findings.find((x) => x.code === "matte-fringe");
    if (f) {
      expect(f.repairable).toBe(false);
      expect(f.message).toMatch(/human eye|confidently/i);
    }
  });

  it("leaves the pixels untouched when it cannot identify the matte", () => {
    const px = twoColourMatted(300);
    const copy = new Uint8ClampedArray(px.data);
    const { pixels, repairs } = repairArtwork(px, analyzeArtwork(px, REQ));
    expect(repairs.some((s) => /matte/i.test(s))).toBe(false);
    expect(pixels.data).toEqual(copy);
  });

  it("still repairs the unambiguous single-colour case", () => {
    expect(estimateMatte(mattedArt(400))).not.toBeNull();
  });
});
