import { afterEach, describe, expect, it, vi } from "vitest";
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import { SCHOOL_FLUSH_FRAME_CONFIG } from "@/lib/constants/frame";
import { composeSchoolFrame, composeSchoolPanels, finishSchoolPanelExport, rotateSchoolExportClockwise, type SchoolDesign } from "./compose-school-frame";

const html = (c: Canvas) => c as unknown as HTMLCanvasElement;
const rgba = (c: Canvas) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
function stubCanvasDocument() {
  vi.stubGlobal("document", { createElement: () => createCanvas(1, 1) });
}
afterEach(() => vi.unstubAllGlobals());

function markedCanvas(w: number, h: number): Canvas {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  const data = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    data.data.set([x * 31, y * 29, (x + y) * 13, (x + y) % 3 === 0 ? 0 : 255], i);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}
function assertClockwise(src: Canvas, out: Canvas) {
  expect([out.width, out.height]).toEqual([src.height, src.width]);
  const a = rgba(src), b = rgba(out);
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    const ai = (y * src.width + x) * 4;
    const bi = (x * out.width + src.height - 1 - y) * 4;
    expect([...b.slice(bi, bi + 4)]).toEqual([...a.slice(ai, ai + 4)]);
  }
}

describe("school print export orientation", () => {
  it.each([[7, 4], [4, 7], [4, 4]])("turns %s x %s clockwise without losing any pixels or transparency", (w, h) => {
    stubCanvasDocument();
    const src = markedCanvas(w, h);
    assertClockwise(src, rotateSchoolExportClockwise(html(src)) as unknown as Canvas);
  });
  it("turns side panels clockwise relative to their PREVIOUS landscape-normalized output", () => {
    stubCanvasDocument();
    const src = markedCanvas(4, 7);
    const old = rotateSchoolExportClockwise(html(src)) as unknown as Canvas;
    assertClockwise(old, finishSchoolPanelExport(html(src), "wing-left") as unknown as Canvas);
  });
  it("stretches only top height by 10% before rotation, keeping its original width", () => {
    stubCanvasDocument();
    const src = createCanvas(220, 100);
    const ctx = src.getContext("2d");
    ctx.fillStyle = "red"; ctx.fillRect(0, 0, 110, 100);
    ctx.fillStyle = "blue"; ctx.fillRect(110, 0, 110, 100);
    const out = finishSchoolPanelExport(html(src), "top") as unknown as Canvas;
    expect([out.width, out.height]).toEqual([110, 220]);
    expect([...out.getContext("2d").getImageData(50, 10, 1, 1).data]).toEqual([255, 0, 0, 255]);
    expect([...out.getContext("2d").getImageData(50, 210, 1, 1).data]).toEqual([0, 0, 255, 255]);
    const other = finishSchoolPanelExport(html(src), "bottom") as unknown as Canvas;
    expect([other.width, other.height]).toEqual([100, 220]);
  });
  it("exports real assembled and all four panel PNGs with matching final metadata and DPI", async () => {
    stubCanvasDocument();
    const design = {
      frameConfig: SCHOOL_FLUSH_FRAME_CONFIG, slots: {}, textBars: [],
      qrCode: { enabled: false, url: "", size: 0 }, plateState: "MO", sections: {}, frameColor: "#1f2a5c",
    } as unknown as SchoolDesign;
    const preview = await loadImage(await composeSchoolFrame(design, { dpi: 300, orientation: "preview" }));
    expect([preview.width, preview.height]).toEqual([4650, 2025]);
    const assembled = await loadImage(await composeSchoolFrame(design, { dpi: 300 }));
    expect([assembled.width, assembled.height]).toEqual([2025, 4650]);
    const panels = await composeSchoolPanels(design, { dpi: 300 });
    expect(panels).toHaveLength(4);
    const expected = { top: [248, 3300], bottom: [540, 3300], "wing-left": [675, 2025], "wing-right": [675, 2025] };
    for (const panel of panels) {
      const png = await loadImage(panel.dataUrl);
      expect([png.width, png.height]).toEqual(expected[panel.id]);
      expect(panel.widthInches).toBe(png.width / 300);
      expect(panel.heightInches).toBe(png.height / 300);
      const bytes = Buffer.from(panel.dataUrl.split(",")[1], "base64");
      const phys = bytes.indexOf(Buffer.from("pHYs"));
      expect(phys).toBeGreaterThan(0);
      expect(bytes.readUInt32BE(phys + 4)).toBe(Math.round(300 / 0.0254));
      if (panel.id === "bottom") {
        const canvas = createCanvas(png.width, png.height);
        canvas.getContext("2d").drawImage(png, 0, 0);
        expect(canvas.getContext("2d").getImageData(png.width - 10, 10, 1, 1).data[3]).toBe(0);
        expect(canvas.getContext("2d").getImageData(10, 10, 1, 1).data[3]).toBe(255);
      }
    }
  });
});
