import { describe, it, expect } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import {
  drawSchoolFrame,
  schoolCanvasSize,
  type SchoolDesign,
  type SchoolImageBundle,
} from "./compose-school-frame";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { kitSections, getSchoolKit } from "@/data/school-kits";
import { schoolTopLine } from "./school-banner";
import type { SectionState } from "@/lib/types";

/**
 * THE PRINT PATH, on the longest top line any kit produces.
 *
 * The top strip used to carry three words ("HOME OF THE"); it now carries a
 * school's full name, which for SLUH is twenty-five characters in a single 0.99"
 * row. The banner auto-fits, but the builder and the print sheet are two
 * different renderers, so a line that fits in CSS proves nothing about canvas.
 *
 * Run with SCHOOL_BANNER_OUT=/path/out.png to look at it.
 */

const kit = getSchoolKit("sluh-jr-bills")!;

function personalized(): SchoolDesign {
  const sections = kitSections(kit) as Record<string, SectionState>;
  const top = schoolTopLine({
    kit,
    currentTop: sections.top.text!.text,
    currentBottom: sections.bottom.text!.text,
    personName: "OKAFOR",
  })!;
  return {
    frameConfig: SCHOOL_FRAME_CONFIG,
    slots: {},
    textBars: [],
    qrCode: { enabled: false, url: "", size: 0 },
    plateState: "MO",
    sections: {
      top: { mode: "text", text: { ...sections.top.text!, text: top } },
      bottom: {
        mode: "text",
        // No logo: the crest is a remote image and this render preloads nothing.
        text: { ...sections.bottom.text!, logo: undefined, text: "OKAFOR", tagline: "#12 · CLASS OF 2027" },
      },
    } as SchoolDesign["sections"],
  };
}

describe("the promoted school name in the print render", () => {
  it("draws the full name inside the top strip without clipping it", () => {
    const design = personalized();
    const { width: W, height: H } = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 150);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    drawSchoolFrame(ctx, design, {
      plate: null, pieces: new Map(), snappets: new Map(), sections: new Map(), qr: null, logos: new Map(),
    } as SchoolImageBundle, W);

    const out = process.env.SCHOOL_BANNER_OUT;
    if (out) writeFileSync(out, canvas.toBuffer("image/png"));

    // The top strip is the first row of the frame. Count WHITE-ish pixels in it:
    // the banner is navy and the lettering is white, so ink present = the name was
    // actually drawn, and its spread tells us it was not squeezed into the middle
    // or run off the ends.
    const napi = ctx as unknown as SKRSContext2D;
    const rowH = Math.round(H / 8);
    const band = napi.getImageData(0, Math.round(rowH * 0.25), W, Math.round(rowH * 0.5)).data;
    let ink = 0;
    let minX = W;
    let maxX = 0;
    for (let i = 0; i < band.length; i += 4) {
      if (band[i] > 200 && band[i + 1] > 200 && band[i + 2] > 200) {
        ink++;
        const x = (i / 4) % W;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    expect(ink, "no lettering drawn in the top strip").toBeGreaterThan(200);
    // It should use most of the strip's width — a fitted long name does. If the
    // fitter ever gave up and drew at a fixed size, this collapses.
    expect((maxX - minX) / W).toBeGreaterThan(0.5);
    // ...and stay inside it. The frame's own margin means ink at the very edge
    // would mean the text overran the banner.
    expect(minX).toBeGreaterThan(2);
    expect(maxX).toBeLessThan(W - 2);
  });
});
