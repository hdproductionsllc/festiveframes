import { describe, expect, it } from "vitest";
import { crc32 } from "node:zlib";
import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import { setPngDpi } from "./eufy-print-core";

// The pHYs chunk is what eufyMake reads to size a print. Get it wrong by one
// byte and the file opens fine, looks fine, and prints at the wrong size —
// the eufyMake stretch, in a chunk header. Nothing tested this.

function pngDataUrl(): string {
  return "data:image/png;base64," + createCanvas(4, 3).toBuffer("image/png").toString("base64");
}
function bytesOf(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

describe("setPngDpi", () => {
  it("inserts a well-formed pHYs chunk right after IHDR", () => {
    const src = pngDataUrl();
    const out = bytesOf(setPngDpi(src, 300));
    // Signature and IHDR untouched.
    expect(out.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(out.subarray(12, 16).toString("latin1")).toBe("IHDR");
    const at = 8 + 25;
    expect(out.readUInt32BE(at)).toBe(9); // data length
    expect(out.subarray(at + 4, at + 8).toString("latin1")).toBe("pHYs");
    const ppm = Math.round(300 / 0.0254); // 11811 px per metre
    expect(out.readUInt32BE(at + 8)).toBe(ppm);
    expect(out.readUInt32BE(at + 12)).toBe(ppm);
    expect(out[at + 16]).toBe(1); // unit: metre
    // CRC over type + data, as the spec says — a decoder that checks it
    // rejects the file otherwise.
    expect(out.readUInt32BE(at + 17)).toBe(crc32(out.subarray(at + 4, at + 17)) >>> 0);
    // And the rest of the file follows intact: everything after IHDR is the
    // original, byte for byte, shifted by the 21-byte chunk.
    const original = bytesOf(src);
    expect(out.length).toBe(original.length + 21);
    expect(out.subarray(at + 21).equals(original.subarray(at))).toBe(true);
  });

  it("is read back as 300 DPI by a real decoder", async () => {
    const meta = await sharp(bytesOf(setPngDpi(pngDataUrl(), 300))).metadata();
    expect(meta.density).toBe(300);
    expect(meta.width).toBe(4);
    expect(meta.height).toBe(3);
  });

  it("returns the input untouched when it is not a data URL", () => {
    expect(setPngDpi("not-a-data-url", 300)).toBe("not-a-data-url");
  });
});
