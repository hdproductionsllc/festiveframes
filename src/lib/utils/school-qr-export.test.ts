import { afterEach, expect, it, vi } from "vitest";
import { createCanvas, Image, loadImage } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import path from "node:path";
import jsQR from "jsqr";
import { SCHOOL_FLUSH_FRAME_CONFIG } from "@/lib/constants/frame";
import { sideColumn } from "@/data/school-presets";
import { getPiece } from "@/data/sets";
import { composeSchoolFrame, composeSchoolPanels, type SchoolDesign } from "./compose-school-frame";

afterEach(() => vi.unstubAllGlobals());
it("decodes MySchoolFrame QR from every corner's final 300-DPI print panel and upright preview", async () => {
  vi.stubGlobal("document", { createElement: () => createCanvas(1, 1) });
  function LocalImage() {
    const img = new Image();
    const descriptor = Object.getOwnPropertyDescriptor(Image.prototype, "src")!;
    Object.defineProperty(img, "src", {
      set(value: string) { descriptor.set!.call(img, value.startsWith("/") ? readFileSync(path.join(process.cwd(), "public", value)) : value); },
      get() { return descriptor.get!.call(img); },
    });
    return img;
  }
  vi.stubGlobal("Image", LocalImage);
  const piece = getPiece("school:qr-myschoolframe")!;
  expect(piece.artworkUrl).toBe("/tiles/school/myschoolframe-qr.png");
  for (const side of ["wing-left", "wing-right"] as const) {
    const column = sideColumn(SCHOOL_FLUSH_FRAME_CONFIG, side);
    for (const corner of [column[0], column[column.length - 1]]) {
      const design = { frameConfig: SCHOOL_FLUSH_FRAME_CONFIG,
        slots: { [corner.slot]: { pieceId: piece.id, setId: piece.setId, span: corner.span } },
        textBars: [], qrCode: { enabled: false, url: "", size: 0 }, plateState: "MO", sections: {}, frameColor: "#1f2a5c",
      } as unknown as SchoolDesign;
      const panels = await composeSchoolPanels(design, { dpi: 300 });
      const panel = panels.find(p => p.id === side)!;
      const sources = [panel.dataUrl, await composeSchoolFrame(design, { dpi: 300, orientation: "preview" })];
      for (const source of sources) {
        const png = await loadImage(source);
        const c = createCanvas(png.width, png.height), ctx = c.getContext("2d");
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(png, 0, 0);
        const pixels = ctx.getImageData(0, 0, c.width, c.height);
        expect(jsQR(pixels.data, c.width, c.height)?.data, `${side} ${corner.slot}`).toBe("https://myschoolframe.com");
      }
      expect([ (await loadImage(panel.dataUrl)).width, (await loadImage(panel.dataUrl)).height ]).toEqual([675, 2025]);
    }
  }
}, 60000);
