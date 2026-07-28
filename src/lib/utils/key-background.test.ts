import { describe, it, expect } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
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
