import { describe, it, expect } from "vitest";
import {
  checkFullResHandoff,
  isDecodableImage,
  MAX_DECODE_PIXELS,
  planDecode,
  planPreview,
  PREVIEW_MAX_PX,
  sniffImageFormat,
} from "./raster-safety";

const bytes = (...v: number[]): Uint8Array => Uint8Array.from(v);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0);
const WEBP = bytes(0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
const TIFF_LE = bytes(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0);
const TIFF_BE = bytes(0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8);
const ICO = bytes(0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20);
const BMP = bytes(0x42, 0x4d, 0x36, 0, 0, 0);
const SVG = new TextEncoder().encode(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg">`);

describe("sniffImageFormat — the shield against the decoder segfault", () => {
  it("allows exactly the four formats on the allowlist", () => {
    expect(sniffImageFormat(PNG)).toEqual({ format: "png", decodable: true });
    expect(sniffImageFormat(JPEG)).toEqual({ format: "jpeg", decodable: true });
    expect(sniffImageFormat(GIF)).toEqual({ format: "gif", decodable: true });
    expect(sniffImageFormat(WEBP)).toEqual({ format: "webp", decodable: true });
  });

  it("refuses TIFF and ICO, which exit the process with SIGSEGV", () => {
    // Not an exception — a signal. There is nothing to catch: the node process is
    // gone and the request never answers. The only defence is not handing the bytes
    // over, which is what this asserts.
    for (const b of [TIFF_LE, TIFF_BE, ICO]) {
      const r = sniffImageFormat(b);
      expect(r.decodable).toBe(false);
      expect(r.reason).toMatch(/SIGSEGV/);
    }
    expect(sniffImageFormat(TIFF_LE).format).toBe("tiff");
    expect(sniffImageFormat(ICO).format).toBe("ico");
  });

  it("refuses anything else it does not recognise, rather than trying", () => {
    expect(isDecodableImage(BMP)).toBe(false);
    expect(isDecodableImage(bytes(1, 2, 3, 4, 5, 6, 7, 8))).toBe(false);
    expect(isDecodableImage(new Uint8Array(0))).toBe(false);
    expect(sniffImageFormat(SVG).format).toBe("svg");
    expect(sniffImageFormat(SVG).decodable).toBe(false); // must go through svgRenderRisks
  });

  it("shows why a container-completeness check guards the WRONG failure", () => {
    // A truncated PNG/JPEG is still allowed through here — and that is correct,
    // because truncation does NOT crash the decoder; it errors or yields a short
    // image, which the existing code handles. The crash comes from COMPLETE, VALID
    // TIFF and ICO files, which a completeness check would wave straight through.
    const truncatedPng = PNG.slice(0, 10);
    const truncatedJpeg = JPEG.slice(0, 4);
    expect(isDecodableImage(truncatedPng)).toBe(true);
    expect(isDecodableImage(truncatedJpeg)).toBe(true);
    // Meanwhile the complete, perfectly valid TIFF is the one that is refused.
    expect(isDecodableImage(TIFF_LE)).toBe(false);
  });

  it("reads the bytes, not the file extension, because school CMSes lie", () => {
    // `/favicon.ico` served as `logo.png` is an everyday occurrence; the extension
    // would have called this safe.
    expect(sniffImageFormat(ICO).format).toBe("ico");
  });
});

describe("planDecode — the 4 MP cap", () => {
  it("leaves anything already under the cap alone", () => {
    const plan = planDecode(1600, 1200);
    expect(plan.mustDownscale).toBe(false);
    expect([plan.width, plan.height]).toEqual([1600, 1200]);
    expect(plan.scale).toBe(1);
  });

  it("brings the measured 10 MP case down under the cap", () => {
    // 10 MP through analyzeArtwork + repairArtwork measured heapUsed +480 MB: the
    // pipeline holds roughly a dozen live copies of the RGBA at once.
    const plan = planDecode(3872, 2592); // 10.0 MP
    expect(plan.mustDownscale).toBe(true);
    expect(plan.width * plan.height).toBeLessThanOrEqual(MAX_DECODE_PIXELS);
    // Aspect ratio survives, so nothing is squashed on the way in.
    expect(plan.width / plan.height).toBeCloseTo(3872 / 2592, 2);
    // And the saving is the whole point: 40 MB of RGBA becomes 16 MB.
    expect(plan.fullResBytes).toBeGreaterThan(39_000_000);
    expect(plan.estimatedBytes).toBeLessThanOrEqual(16_000_000);
  });

  it("never plans a zero-side decode for an extreme aspect ratio", () => {
    const plan = planDecode(12000, 3); // a banner scan
    expect(plan.height).toBeGreaterThanOrEqual(1);
    expect(plan.width).toBeGreaterThanOrEqual(1);
  });

  it("is a plan, not a resize — it can be applied before any RGBA exists", () => {
    // The ordering is the constraint: header dimensions in, decode size out. If this
    // needed pixels, we would already have paid the allocation we are avoiding.
    const plan = planDecode(5000, 5000);
    expect(plan.sourceWidth).toBe(5000);
    expect(plan.estimatedBytes).toBeLessThan(plan.fullResBytes);
  });

  it("handles a zero-dimension header without dividing by zero", () => {
    expect(planDecode(0, 0).width).toBe(0);
    expect(planDecode(0, 0).mustDownscale).toBe(false);
  });
});

describe("planPreview / checkFullResHandoff — carrying the full-res image", () => {
  it("caps the CARD image only", () => {
    const preview = planPreview(3000, 2000);
    expect(Math.max(preview.width, preview.height)).toBe(PREVIEW_MAX_PX);
    expect(preview.height).toBe(800);
  });

  it("catches the preview being handed to the print path", () => {
    // The invisible bug: card looks right, crop modal looks right, DPI meter looks
    // right, and the printed badge quietly throws away 60% of the pixels.
    const prepared = { fullRes: { width: 3000, height: 2000 }, preview: { width: 1200, height: 800 } };
    expect(checkFullResHandoff(prepared, { width: 3000, height: 2000 }).ok).toBe(true);

    const bad = checkFullResHandoff(prepared, { width: 1200, height: 800 });
    expect(bad.ok).toBe(false);
    expect(bad.reason).toBe("preview-handed-to-print");
    expect(bad.message).toContain("3000x2000");
  });

  it("flags a third image that is neither, rather than assuming", () => {
    const prepared = { fullRes: { width: 3000, height: 2000 }, preview: { width: 1200, height: 800 } };
    const odd = checkFullResHandoff(prepared, { width: 900, height: 600 });
    expect(odd.ok).toBe(false);
    expect(odd.reason).toBe("unknown-image");
  });

  it("is satisfied when a downscaled decode IS the full-res image", () => {
    // A 10 MP source decoded at the 4 MP cap: the capped image is now the real
    // artwork, and the preview is still smaller than it.
    const plan = planDecode(3872, 2592);
    const preview = planPreview(plan.width, plan.height);
    const prepared = {
      fullRes: { width: plan.width, height: plan.height },
      preview: { width: preview.width, height: preview.height },
    };
    expect(preview.width).toBeLessThan(plan.width);
    expect(checkFullResHandoff(prepared, prepared.fullRes).ok).toBe(true);
  });
});
