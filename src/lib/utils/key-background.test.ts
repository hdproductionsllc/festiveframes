import { describe, it, expect } from "vitest";
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import { analyzeBackdrop, keyBackground, type RGBA } from "./key-background";

// Fixtures are DRAWN rather than checked in, so each case says in code exactly what
// makes it that case — a white card, a magenta backdrop, a photo, a mark whose own
// colour is the backdrop's. @napi-rs/canvas gives real antialiased edges, so the
// partial-alpha handling is exercised on the pixels it was written for rather than
// on hard-edged synthetic squares.

interface Scene {
  bg: string;
  /** Draw the "logo". Receives a 2D context sized `size` x `size`. */
  draw: (g: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, size: number) => void;
}

function render(scene: Scene, size = 240): RGBA {
  const c = createCanvas(size, size);
  const g = c.getContext("2d");
  g.fillStyle = scene.bg;
  g.fillRect(0, 0, size, size);
  scene.draw(g, size);
  const img = g.getImageData(0, 0, size, size);
  return { data: img.data as unknown as Uint8ClampedArray, width: size, height: size };
}

/** A filled circle, the shape most crests reduce to for keying purposes. */
const disc = (fill: string): Scene["draw"] => (g, s) => {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2);
  g.fill();
};

/** Alpha at a point, for asserting what survived. */
const alphaAt = (img: RGBA, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];
const rgbAt = (img: RGBA, x: number, y: number) => {
  const k = (y * img.width + x) * 4;
  return [img.data[k], img.data[k + 1], img.data[k + 2]];
};

describe("analyzeBackdrop", () => {
  it("reads a flat white card as flat", () => {
    const img = render({ bg: "#ffffff", draw: disc("#C8102E") });
    const { rgb, flatness } = analyzeBackdrop(img);
    expect(rgb).toEqual([255, 255, 255]);
    expect(flatness).toBe(1);
  });

  it("ignores one stray corner mark instead of chasing it", () => {
    // The median is the whole point: a mean would move off the backdrop and every
    // threshold downstream would then be measured from the wrong colour.
    const img = render({
      bg: "#ffffff",
      draw: (g, s) => {
        disc("#C8102E")(g, s);
        g.fillStyle = "#000000";
        g.fillRect(0, 0, 12, 12);
      },
    });
    expect(analyzeBackdrop(img).rgb).toEqual([255, 255, 255]);
  });

  it("reports a busy background as NOT flat", () => {
    const img = render({
      bg: "#ffffff",
      draw: (g, s) => {
        for (let i = 0; i < 60; i++) {
          g.fillStyle = `hsl(${(i * 37) % 360} 70% ${30 + (i % 5) * 12}%)`;
          g.fillRect((i * 53) % s, (i * 31) % s, 40, 40);
        }
      },
    });
    expect(analyzeBackdrop(img).flatness).toBeLessThan(0.72);
  });
});

describe("keyBackground", () => {
  it("keys a crest off a WHITE card — the case chroma-only keying cannot see", () => {
    // The reason this module exists rather than reusing key-batch.mjs: white, grey
    // and black all have zero chroma, so a chroma-plane distance cannot separate a
    // mark from the card it was scanned on.
    const img = render({ bg: "#ffffff", draw: disc("#C8102E") });
    const report = keyBackground(img);
    expect(report.keyed).toBe(true);
    expect(report.backdrop).toBe("#FFFFFF");
    expect(alphaAt(img, 4, 4)).toBe(0); // the card is gone
    expect(alphaAt(img, 120, 120)).toBe(255); // the mark is not
  });

  it("keys off a saturated backdrop too, and keeps the mark's own colour", () => {
    const img = render({ bg: "#FF00FF", draw: disc("#1B6EC2") });
    const report = keyBackground(img);
    expect(report.keyed).toBe(true);
    const [r, g, b] = rgbAt(img, 120, 120);
    expect(b).toBeGreaterThan(r); // still blue, not desaturated toward grey
    expect(g).toBeLessThan(b);
  });

  it("leaves NO backdrop-coloured fringe on an antialiased edge", () => {
    // The defect the de-matte exists for, measured the way CLAUDE.md asks: bucket the
    // partial-alpha pixels and look at where their colour sits. Without de-matte they
    // ramp toward the backdrop and print as a halo.
    const img = render({ bg: "#ffffff", draw: disc("#1B2A4A") });
    keyBackground(img);
    let n = 0, sum = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      const a = img.data[i + 3];
      if (a > 24 && a < 232) {
        n++;
        sum += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
      }
    }
    expect(n).toBeGreaterThan(20); // there really are partial pixels to judge
    // The art is a dark navy (mean ~43). A white fringe would drag this well above it.
    expect(sum / n).toBeLessThan(110);
  });

  it("refuses a busy background rather than mangling it", () => {
    const img = render({
      bg: "#ffffff",
      draw: (g, s) => {
        for (let i = 0; i < 60; i++) {
          g.fillStyle = `hsl(${(i * 37) % 360} 70% ${30 + (i % 5) * 12}%)`;
          g.fillRect((i * 53) % s, (i * 31) % s, 40, 40);
        }
      },
    });
    const before = Uint8ClampedArray.from(img.data);
    const report = keyBackground(img);
    expect(report.keyed).toBe(false);
    expect(report.reason).toBe("no-flat-backdrop");
    expect(img.data).toEqual(before); // untouched, byte for byte
  });

  it("refuses art already cut out instead of keying it twice", () => {
    const c = createCanvas(240, 240);
    const g = c.getContext("2d");
    disc("#C8102E")(g, 240);
    const raw = g.getImageData(0, 0, 240, 240);
    const img: RGBA = { data: raw.data as unknown as Uint8ClampedArray, width: 240, height: 240 };
    const report = keyBackground(img);
    expect(report.keyed).toBe(false);
    expect(report.reason).toBe("already-cut-out");
  });

  it("refuses when the mark is the same colour as its backdrop", () => {
    // A white wordmark on a white card. Keying it would return an empty rectangle,
    // and an empty rectangle is what someone would then send to print.
    const img = render({
      bg: "#ffffff",
      draw: (g, s) => {
        g.fillStyle = "#fdfdfd";
        g.fillRect(s * 0.2, s * 0.4, s * 0.6, s * 0.2);
      },
    });
    const before = Uint8ClampedArray.from(img.data);
    const report = keyBackground(img);
    expect(report.keyed).toBe(false);
    expect(report.reason).toBe("would-erase-art");
    expect(img.data).toEqual(before);
  });

  it("drops a soft drop shadow with the backdrop", () => {
    // A shadow is the backdrop at lower brightness. Left in, it prints as a grey
    // rectangle round the mark — the exact thing a cut-out is supposed to avoid.
    const img = render({
      bg: "#ffffff",
      draw: (g, s) => {
        g.shadowColor = "rgba(0,0,0,0.28)";
        g.shadowBlur = 26;
        g.shadowOffsetY = 10;
        disc("#C8102E")(g, s);
      },
    });
    keyBackground(img);
    // Well below the disc, inside the shadow's reach but outside the mark.
    expect(alphaAt(img, 120, 196)).toBe(0);
  });
});

// ─── SOURCED artwork, not artwork we made ────────────────────────────────────
//
// A crest is not drawn here, it is taken off a school's own site: a JPEG at a few
// hundred pixels, sometimes on an off-white or grey card, sometimes with a drop
// shadow baked in, occasionally an 8-bit GIF from a site that has not been touched
// since 2006. The clean PNG above is the case that never happens.
//
// A false alarm is recorded here on purpose. These cases first appeared to key
// badly — confetti along the shield, a chewed rim — and the cause was the harness:
// @napi-rs/canvas takes JPEG quality as 0-100, and being handed 0.7 it produced a
// 2.6 KB file no server would ever serve. Two filters were written against that
// phantom and then removed. Anything added here later needs evidence from a real
// sourced file, not from a synthetic one.

describe("keyBackground on sourced artwork", () => {
  /** Round-trip through a REAL JPEG encode so the input carries genuine ringing.
   *  Quality is 0-100 for this encoder — passing 0.7 silently means "worst possible". */
  function jpegRoundTrip(c: Canvas, quality: number) {
    expect(quality).toBeGreaterThan(1); // the exact mistake that faked a defect
    const buf = c.toBuffer("image/jpeg", quality);
    return buf;
  }

  function scene(size: number, card: string, shadow: boolean): Canvas {
    const c = createCanvas(size, size) as Canvas;
    const g = c.getContext("2d");
    const k = size / 500;
    g.fillStyle = card;
    g.fillRect(0, 0, size, size);
    if (shadow) {
      g.shadowColor = "rgba(0,0,0,0.30)";
      g.shadowBlur = 24 * k;
      g.shadowOffsetY = 9 * k;
    }
    g.fillStyle = "#1B2A4A";
    g.beginPath();
    g.moveTo(150 * k, 70 * k);
    g.lineTo(350 * k, 70 * k);
    g.lineTo(350 * k, 290 * k);
    g.quadraticCurveTo(350 * k, 410 * k, 250 * k, 430 * k);
    g.quadraticCurveTo(150 * k, 410 * k, 150 * k, 290 * k);
    g.closePath();
    g.fill();
    g.shadowColor = "transparent";
    g.strokeStyle = "#C8102E";
    g.lineWidth = 11 * k;
    g.stroke();
    g.fillStyle = "#ffffff";
    g.font = `bold ${130 * k}px sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("W", 250 * k, 230 * k);
    return c;
  }

  /** Mean brightness of the partial-alpha pixels. The artwork is navy and red, so a
   *  surviving card shows up here as a number far lighter than either. */
  function edgeMean(img: RGBA): number {
    let n = 0, sum = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      const a = img.data[i + 3];
      if (a > 24 && a < 232) {
        n++;
        sum += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
      }
    }
    return n ? sum / n : 0;
  }

  const CASES: [string, number, string, boolean, number][] = [
    // 400px is the floor the print gate already enforces: it blocks below 200 DPI and
    // the smallest badge is 1.982in, so nothing smaller can reach print anyway.
    ["a 400px q60 JPEG", 400, "#ffffff", false, 60],
    ["a 500px q70 JPEG", 500, "#ffffff", false, 70],
    ["an off-white card", 500, "#f4f2ed", false, 70],
    ["a grey card", 500, "#e9e9e9", false, 70],
    ["a baked-in drop shadow", 500, "#ffffff", true, 80],
    ["a rough q45 JPEG", 500, "#ffffff", false, 45],
  ];

  it.each(CASES)("keys %s without leaving the card behind", async (_label, size, card, shadow, q) => {
    const buf = jpegRoundTrip(scene(size, card, shadow), q);
    const decoded = await loadImage(buf);
    const c = createCanvas(decoded.width, decoded.height);
    const g = c.getContext("2d");
    g.drawImage(decoded, 0, 0);
    const raw = g.getImageData(0, 0, c.width, c.height);
    const img: RGBA = {
      data: raw.data as unknown as Uint8ClampedArray,
      width: c.width,
      height: c.height,
    };

    const report = keyBackground(img);
    expect(report.keyed).toBe(true);
    // The card is roughly 70% of the frame in this composition. Well under means the
    // card survived; well over means the crest went with it.
    expect(report.removed).toBeGreaterThan(0.6);
    expect(report.removed).toBeLessThan(0.8);
    // The white W inside the shield is the detail a colour-only keyer destroys.
    expect(img.data[(Math.round(img.height * 0.46) * img.width + Math.round(img.width * 0.5)) * 4 + 3]).toBe(255);
    // No pale ring: the edge sits with the artwork, not with the card it came off.
    expect(edgeMean(img)).toBeLessThan(115);
  });

  it("keys an 8-bit dithered GIF, where the card is not one colour at the pixel level", async () => {
    const c = scene(500, "#ffffff", false);
    const g = c.getContext("2d");
    const raw = g.getImageData(0, 0, 500, 500);
    const M = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    for (let y = 0; y < 500; y++) {
      for (let x = 0; x < 500; x++) {
        const k = (y * 500 + x) * 4;
        const t = (M[y & 3][x & 3] / 16 - 0.5) * 24;
        for (let j = 0; j < 3; j++) {
          raw.data[k + j] = Math.max(0, Math.min(255, Math.round((raw.data[k + j] + t) / 24) * 24));
        }
      }
    }
    const img: RGBA = { data: raw.data as unknown as Uint8ClampedArray, width: 500, height: 500 };
    // The dither is real spread on the card, and the split floor is measured from it
    // rather than assumed — this is the one case where that floor does anything.
    expect(analyzeBackdrop(img).noise).toBeGreaterThan(4);
    const report = keyBackground(img);
    expect(report.keyed).toBe(true);
    expect(edgeMean(img)).toBeLessThan(115);
  });
});
