import { describe, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { drawSchoolFrame, schoolCanvasSize, type SchoolDesign, type SchoolImageBundle } from "./compose-school-frame";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import type { BottomBarConfig, SectionState } from "@/lib/types";

// A LOOK at the crest, not an assertion about it. Set BANNER_LOGO_OUT to a directory
// and this writes the print-path renders that CLAUDE.md requires before a visual
// change is reported: the two banner shapes the crest actually takes (a 1-row top bar
// and the 2-row bottom panel) on a light and a dark field. Skipped without the env
// var so it costs the normal suite nothing.

const OUT = process.env.BANNER_LOGO_OUT;

/** A synthetic crest: a shield with a letter in it, transparent outside. Deliberately
 *  NOT square (3:4) so the "contain" letterboxing is visible in the render. */
function crest(): unknown {
  const c = createCanvas(300, 400);
  const g = c.getContext("2d");
  g.fillStyle = "#C8102E";
  g.beginPath();
  g.moveTo(20, 20);
  g.lineTo(280, 20);
  g.lineTo(280, 250);
  g.quadraticCurveTo(280, 380, 150, 385);
  g.quadraticCurveTo(20, 380, 20, 250);
  g.closePath();
  g.fill();
  g.lineWidth = 14;
  g.strokeStyle = "#ffffff";
  g.stroke();
  g.fillStyle = "#ffffff";
  g.font = "bold 190px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("W", 150, 190);
  return c;
}

const bar = (over: Partial<BottomBarConfig> = {}): BottomBarConfig => ({
  text: "GO WILDCATS",
  fontFamily: "sans-serif",
  fontSize: 1,
  textColor: "#ffffff",
  backgroundColor: "#1B2A4A",
  textAlign: "center",
  letterSpacing: 0,
  ...over,
});

describe.skipIf(!OUT)("banner crest — print render", () => {
  it("writes the top bar and bottom panel, light and dark field", () => {
    mkdirSync(OUT!, { recursive: true });
    const logo = crest();

    const cases: { name: string; sections: Partial<Record<"top" | "bottom", SectionState>> }[] = [
      {
        name: "dark",
        sections: {
          top: { mode: "text", text: bar({ text: "LINCOLN HIGH", logo: { url: "x", placement: "left" } }) },
          bottom: {
            mode: "text",
            text: bar({ text: "GO WILDCATS", tagline: "EST. 1962", logo: { url: "x", placement: "both" } }),
          },
        },
      },
      {
        name: "light",
        sections: {
          top: {
            mode: "text",
            text: bar({
              text: "LINCOLN HIGH",
              backgroundColor: "#F2F2F0",
              textColor: "#1B2A4A",
              logo: { url: "x", placement: "right" },
            }),
          },
          bottom: {
            mode: "text",
            text: bar({
              text: "GO WILDCATS",
              backgroundColor: "#F2F2F0",
              textColor: "#1B2A4A",
              logo: { url: "x", placement: "left" },
            }),
          },
        },
      },
    ];

    for (const c of cases) {
      const design: SchoolDesign = {
        frameConfig: SCHOOL_FRAME_CONFIG,
        slots: {},
        textBars: [],
        qrCode: { enabled: false, url: "", size: 0 },
        plateState: "MO",
        sections: c.sections,
      };
      const bundle: SchoolImageBundle = {
        plate: null,
        pieces: new Map(),
        snappets: new Map(),
        sections: new Map(),
        qr: null,
        logos: new Map([
          ["top" as const, logo as never],
          ["bottom" as const, logo as never],
        ]),
      };
      const { width: W, height: H } = schoolCanvasSize(SCHOOL_FRAME_CONFIG, 150);
      const canvas = createCanvas(W, H);
      drawSchoolFrame(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, design, bundle, W);
      writeFileSync(path.join(OUT!, `crest-${c.name}.png`), canvas.toBuffer("image/png"));
    }
  });
});
