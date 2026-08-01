import { describe, it, expect } from "vitest";
import {
  NO_CORNERS,
  radiusCss,
  insetRadii,
  cornerRadii,
  TILE_BG,
  BRASS,
  luminance,
  tileBackground,
  bevelMetrics,
  bevelGradient,
  bevelBand,
  chromeInset,
  rimMetrics,
  ringCss,
  solidFill,
  tileEdgeCss,
  artShadow,
  artShadowCss,
  artInset,
  rimRamp,
  tileField,
  textChenille,
  merrowThread,
  textEmboss,
  textChenilleCss,
  fieldForArtPixels,
} from "./tile-theme";

describe("luminance", () => {
  it("orders black < mid < white", () => {
    expect(luminance("#000000")).toBeCloseTo(0, 5);
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(luminance(TILE_BG.navy)).toBeLessThan(0.5);
  });

  it("survives a malformed colour rather than throwing", () => {
    expect(luminance("nope")).toBe(0.5);
    expect(luminance("#abc")).toBe(0.5);
  });
});

describe("tileBackground — the ONE field colour both renderers ask for", () => {
  it("keeps a colour that is already in the standard palette", () => {
    for (const c of Object.values(TILE_BG)) {
      expect(tileBackground({ backgroundColor: c })).toBe(c.toUpperCase());
    }
  });

  it("snaps an off-palette colour into the scheme, preserving light vs dark", () => {
    // A one-off pale colour still wants a LIGHT field; a one-off dark one a dark field.
    expect(tileBackground({ backgroundColor: "#FEFDF8" })).toBe(TILE_BG.white);
    expect(tileBackground({ backgroundColor: "#2D1B4A" })).toBe(TILE_BG.navy);
  });

  it("is case-insensitive about the piece's own colour", () => {
    expect(tileBackground({ backgroundColor: "#ffffff" })).toBe(TILE_BG.white);
  });
});

describe("bevelMetrics", () => {
  it("scales with the tile so a big badge has the same moulding, not a flat edge", () => {
    const small = bevelMetrics(100, 100);
    const big = bevelMetrics(300, 300);
    expect(big.thickness).toBeGreaterThan(small.thickness);
    // Proportional within rounding: both are integers, so a small tile's ratio can
    // sit a little off a big one's without the moulding actually looking different.
    const drift = Math.abs(big.thickness / big.radius - small.thickness / small.radius);
    expect(drift).toBeLessThan(0.1);
  });

  it("uses the SHORT side, so a wide badge isn't given a huge edge", () => {
    expect(bevelMetrics(400, 100).thickness).toBe(bevelMetrics(100, 100).thickness);
  });

  it("never degenerates to a zero-width edge", () => {
    const tiny = bevelMetrics(1, 1);
    expect(tiny.thickness).toBeGreaterThanOrEqual(1);
    expect(tiny.radius).toBeGreaterThanOrEqual(2);
  });

  it("lights a DARK field from the upper-left with a white highlight", () => {
    const m = bevelMetrics(100, 100, TILE_BG.navy);
    expect(m.highlight).toContain("255,255,255");
    expect(m.shade).toContain("0,0,0");
  });

  it("shades a LIGHT field instead — a white highlight on white is invisible", () => {
    // Physically right too: a raised white face cannot get brighter than white, so
    // depth reads as the lit side being shaded LESS than the falling-away side.
    const m = bevelMetrics(100, 100, TILE_BG.white);
    expect(m.highlight).not.toContain("255,255,255");
    const alpha = (c: string) => Number(c.match(/([\d.]+)\)$/)![1]);
    expect(alpha(m.highlight)).toBeLessThan(alpha(m.shade));
  });
});

describe("the edge is one width EVERYWHERE, measured against a grid cell", () => {
  const CELL = 150;

  it("gives the two-row bottom panel the same bevel as the one-row top bar", () => {
    // The bug: thickness came off the element's short side, so a panel twice as tall
    // got a band exactly twice as thick.
    const top = bevelMetrics(1800, CELL, TILE_BG.navy, CELL);
    const bottom = bevelMetrics(1800, CELL * 2, TILE_BG.navy, CELL);
    expect(bottom.thickness).toBe(top.thickness);
  });

  it("gives a 3x3 badge the same bevel as a 1x1", () => {
    const one = bevelMetrics(CELL, CELL, TILE_BG.navy, CELL);
    const three = bevelMetrics(CELL * 3, CELL * 3, TILE_BG.navy, CELL);
    expect(three.thickness).toBe(one.thickness);
  });

  it("holds the brass rim to one width and one inset too", () => {
    const one = rimMetrics(CELL, CELL, CELL);
    const big = rimMetrics(CELL * 3, CELL * 2, CELL);
    expect(big.width).toBe(one.width);
    expect(big.inset).toBe(one.inset);
  });

  it("keeps text clearance constant, so both bars pad the same", () => {
    expect(chromeInset(1800, CELL * 2, TILE_BG.navy, CELL)).toBe(
      chromeInset(1800, CELL, TILE_BG.navy, CELL),
    );
  });

  it("still scales when the CELL scales — print is 2x the preview, not a fixed px", () => {
    const preview = bevelMetrics(CELL, CELL, TILE_BG.navy, CELL);
    const print = bevelMetrics(CELL * 2, CELL * 2, TILE_BG.navy, CELL * 2);
    expect(print.thickness).toBeGreaterThan(preview.thickness);
  });

  it("reaches the screen: tileEdgeCss forwards the cell to both metrics", () => {
    const badge3x3 = tileEdgeCss(CELL * 3, TILE_BG.navy, CELL * 3, CELL * 3, CELL);
    const badge1x1 = tileEdgeCss(CELL, TILE_BG.navy, CELL, CELL, CELL);
    expect(badge3x3.bevelWidth).toBe(badge1x1.bevelWidth);
    expect(badge3x3.rimWidth).toBe(badge1x1.rimWidth);
  });
});

describe("bevelGradient — the run that replaced the mitred trapezoids", () => {
  const alpha = (c: string) => Number(c.match(/[\d.]+\)$/)?.[0].slice(0, -1) ?? 0);

  it("runs lit to shaded along the light axis", () => {
    const stops = bevelGradient(TILE_BG.navy);
    expect(stops[0][0]).toBe(0);
    expect(stops[stops.length - 1][0]).toBe(1);
    expect(stops[0][1]).toContain("255,255,255"); // lit corner
    expect(stops[stops.length - 1][1]).toContain("0,0,0"); // shaded corner
  });

  it("keeps the roll at the EDGES and leaves the face alone", () => {
    // This used to assert the opposite — that the roll happened over a short run in
    // the MIDDLE — and that is exactly what made a banner a different shade of blue
    // from the tile beside it. A mid-run roll covers the small corner triangles of a
    // square but a broad full-width band of a 6:1 bar, so the same stops paint far
    // more of the bar. The roll now sits at each edge and the face is untouched.
    const stops = bevelGradient(TILE_BG.navy, 120, 120);
    const mid = stops.filter(([at]) => at > 0 && at < 1);
    expect(mid.length).toBe(2);
    expect(mid[0][0]).toBeLessThan(0.25); // lit band ends near the top edge
    expect(mid[1][0]).toBeGreaterThan(0.75); // shaded band starts near the bottom
    for (const [, colour] of mid) expect(alpha(colour)).toBe(0); // the face is bare
  });

  it("paints a bar's face and a badge's face the SAME — the banner-shade bug", () => {
    // The defect the owner reported four or five times: banners a different shade of
    // blue from the side panels, while both were handed the identical colour. The
    // guarantee is that the face carries no bevel ink at all, whatever the box shape.
    const badge = bevelGradient(TILE_BG.navy, 120, 120);
    const banner = bevelGradient(TILE_BG.navy, 631, 56);
    for (const stops of [badge, banner]) {
      const face = stops.filter(([at]) => at > 0 && at < 1);
      expect(face.every(([, c]) => alpha(c) === 0)).toBe(true);
    }
    // ...and the band is a constant PHYSICAL width, so it is a bigger fraction of a
    // short bar's run than of a tall tile's.
    expect(bevelBand(631, 56)).toBeGreaterThan(bevelBand(120, 248));
    expect(bevelBand(120, 120)).toBeCloseTo(0.16, 5);
  });

  it("shows depth entirely in shadow on a light field — a white face cannot brighten", () => {
    for (const [, colour] of bevelGradient(TILE_BG.white)) {
      expect(colour).not.toContain("255,255,255");
    }
  });

  it("shades the bottom edge harder than the top on a light field", () => {
    // Was "darkens monotonically", which the flat face now breaks by design: the run
    // is 0.10 at the lit edge, nothing across the face, 0.28 at the shaded one. What
    // has to hold is the relationship — a raised white face shows its depth in
    // shadow, so the bottom edge is the darker of the two.
    const a = bevelGradient(TILE_BG.white, 120, 120);
    expect(alpha(a[a.length - 1][1])).toBeGreaterThan(alpha(a[0][1]));
    expect(alpha(a[0][1])).toBeGreaterThan(0);
  });
});

describe("tileEdgeCss — the builder's chrome, which used to be invisible", () => {
  it("SCALES with the tile instead of the old fixed 1px/1.5px/3px", () => {
    const small = tileEdgeCss(60, TILE_BG.navy);
    const big = tileEdgeCss(600, TILE_BG.navy);
    expect(big.radius).toBeGreaterThan(small.radius);
    expect(big.rimWidth).toBeGreaterThan(small.rimWidth);
    expect(big.bevelWidth).toBeGreaterThan(small.bevelWidth);
    expect(big.rimInset).toBeGreaterThan(small.rimInset);
  });

  it("carries the SAME numbers the canvas draws, so preview and print agree", () => {
    const size = 600;
    const edge = tileEdgeCss(size, TILE_BG.navy);
    expect(edge.radius).toBe(bevelMetrics(size, size, TILE_BG.navy).radius);
    expect(edge.rimWidth).toBe(rimMetrics(size, size).width);
    expect(edge.rimInset).toBe(rimMetrics(size, size).inset);
    expect(edge.bevelWidth).toBe(bevelMetrics(size, size, TILE_BG.navy).thickness);
  });

  it("nests the radii inward so each ring stays concentric", () => {
    const edge = tileEdgeCss(600, TILE_BG.navy);
    expect(edge.rimRadius).toBeLessThan(edge.radius);
    expect(edge.bevelRadius).toBeLessThan(edge.rimRadius);
    expect(edge.bevelRadius).toBeGreaterThan(0);
  });

  it("never degenerates to a negative or zero ring on a tiny tile", () => {
    const edge = tileEdgeCss(8, TILE_BG.navy);
    expect(edge.rimWidth).toBeGreaterThanOrEqual(1);
    expect(edge.bevelWidth).toBeGreaterThanOrEqual(1);
    expect(edge.bevelRadius).toBeGreaterThanOrEqual(1);
  });
});

describe("ringCss", () => {
  it("paints the fill on the padding box and the gradient on the border box", () => {
    const css = ringCss(solidFill("#1B2A4A"), "linear-gradient(135deg, #F0D488, #7C5E15)");
    expect(css).toContain("padding-box");
    expect(css).toContain("border-box");
    // The fill must come FIRST, or the gradient is painted over by it.
    expect(css.indexOf("padding-box")).toBeLessThan(css.indexOf("border-box"));
  });

  it("solidFill produces an opaque image — the thing that masks the ring inward", () => {
    // A transparent fill does not thin the ring, it floods the element: the brass
    // gradient covers the whole border box and both banners render solid gold. This
    // only showed up in a browser, so it is pinned here.
    expect(solidFill("#1B2A4A")).toBe("linear-gradient(#1B2A4A, #1B2A4A)");
    expect(solidFill("#1B2A4A")).not.toContain("transparent");
  });
});

describe("chromeInset — why the bevel stopped cutting into banner text", () => {
  it("clears the rim AND the bevel, with air to spare", () => {
    const [w, h] = [1200, 400];
    const rim = rimMetrics(w, h);
    const bevel = bevelMetrics(w, h);
    expect(chromeInset(w, h)).toBeGreaterThan(rim.inset + rim.width + bevel.thickness);
  });

  it("beats the old 6%-of-short-edge padding that left half a percent of clearance", () => {
    const [w, h] = [1200, 400];
    expect(chromeInset(w, h)).toBeGreaterThan(Math.min(w, h) * 0.06);
  });

  it("scales with the box, so a one-row top bar is not given a print-sized margin", () => {
    expect(chromeInset(1200, 300)).toBeLessThan(chromeInset(1200, 600));
  });
});

describe("brass rim", () => {
  it("runs bright to dark, so it reads as metal rather than a yellow line", () => {
    expect(luminance(BRASS.light)).toBeGreaterThan(luminance(BRASS.mid));
    expect(luminance(BRASS.mid)).toBeGreaterThan(luminance(BRASS.dark));
  });

  it("stays THIN and scales off the short side", () => {
    const m = rimMetrics(1000, 1000);
    expect(m.width / 1000).toBeLessThan(0.03); // a machined edge, not a gold frame
    expect(rimMetrics(1000, 200).width).toBe(rimMetrics(200, 200).width);
  });

  it("is heavy enough to READ on the printed part, not just on screen", () => {
    // The floor exists because of a verdict on a physical sample: at 1.8% of a cell
    // the rim registered as a hairline in the hand, however good it looked on a
    // monitor. Paired with the ceiling above, this brackets the rim into the band
    // that reads as a machined edge at arm's length.
    const m = rimMetrics(1000, 1000);
    expect(m.width / 1000).toBeGreaterThanOrEqual(0.025);
    // At true print scale — one 0.991in cell at 300 DPI — that is a rim you can
    // actually see rather than a one-pixel line.
    expect(rimMetrics(297, 297).width).toBeGreaterThanOrEqual(7);
  });

  it("insets the stroke so it is not half-clipped by the tile edge", () => {
    const m = rimMetrics(400, 400);
    expect(m.inset).toBeGreaterThanOrEqual(1);
  });

  it("never degenerates at a tiny size", () => {
    const m = rimMetrics(1, 1);
    expect(m.width).toBeGreaterThanOrEqual(1);
    expect(m.inset).toBeGreaterThanOrEqual(1);
  });
});

describe("artShadow — the art casting onto its field", () => {
  it("offsets down-right, matching the bevel's upper-left light source", () => {
    const s = artShadow(200, 200);
    expect(s.offsetX).toBeGreaterThan(0);
    expect(s.offsetY).toBeGreaterThan(0);
    // Slightly more vertical than horizontal, as a light above and to the left gives.
    expect(s.offsetY).toBeGreaterThan(s.offsetX);
  });

  it("scales with the badge so a big one isn't given a hard tiny shadow", () => {
    expect(artShadow(400, 400).blur).toBeGreaterThan(artShadow(100, 100).blur);
  });

  it("emits CSS carrying the same numbers as the canvas version", () => {
    const css = artShadowCss(200);
    const s = artShadow(200, 200);
    expect(css).toContain(s.offsetX.toFixed(1));
    expect(css).toContain(s.offsetY.toFixed(1));
    expect(css).toContain("drop-shadow(");
  });
});

describe("frame-corner rounding — the whole frame as one part", () => {
  const CELL = 150;

  it("opens ONLY the corners that face the frame's outside", () => {
    const r = cornerRadii(CELL, { tl: true, tr: false, br: false, bl: false });
    expect(r.tl).toBeGreaterThan(r.tr);
    // The other three match an ordinary interior badge exactly — a corner tile is
    // the same component in a different place, not a different component.
    const plain = cornerRadii(CELL, NO_CORNERS);
    expect(r.tr).toBe(plain.tr);
    expect(r.br).toBe(plain.br);
    expect(r.bl).toBe(plain.bl);
  });

  it("leaves an interior badge completely uniform", () => {
    const r = cornerRadii(CELL, NO_CORNERS);
    expect(new Set([r.tl, r.tr, r.br, r.bl]).size).toBe(1);
  });

  it("is measured against the CELL, so a 3x3 corner badge curves like a 2x2", () => {
    expect(cornerRadii(CELL, { tl: true, tr: false, br: false, bl: false })).toEqual(
      cornerRadii(CELL, { tl: true, tr: false, br: false, bl: false }),
    );
    expect(cornerRadii(CELL * 2, NO_CORNERS).tl).toBeGreaterThan(cornerRadii(CELL, NO_CORNERS).tl);
  });

  it("handles a badge that owns two corners at once", () => {
    // A badge tall enough to span a whole side panel owns that side's top AND bottom.
    const r = cornerRadii(CELL, { tl: true, bl: true, tr: false, br: false });
    expect(r.tl).toBe(r.bl);
    expect(r.tl).toBeGreaterThan(r.tr);
  });

  it("insets every corner together, keeping the rings concentric", () => {
    const r = cornerRadii(CELL, { tl: true, tr: false, br: false, bl: false });
    const inner = insetRadii(r, 6);
    expect(inner.tl).toBe(r.tl - 6);
    expect(inner.tr).toBe(r.tr - 6);
    expect(inner.tl).toBeGreaterThan(inner.tr); // the wide corner stays wide
  });

  it("never insets a radius below 1", () => {
    const inner = insetRadii(cornerRadii(8, NO_CORNERS), 999);
    for (const v of [inner.tl, inner.tr, inner.br, inner.bl]) expect(v).toBeGreaterThanOrEqual(1);
  });

  it("emits border-radius in CSS's own order: tl tr br bl", () => {
    expect(radiusCss({ tl: 1, tr: 2, br: 3, bl: 4 })).toBe("1px 2px 3px 4px");
  });
});

// ─── The school-colour overrides ────────────────────────────────────────────
//
// Three surfaces were hard-coded to the product's own palette — the tile field, the
// brass rim, and the merrow thread round banner lettering. A school scan can now
// replace all three, and the thing these tests actually protect is that they move
// TOGETHER: a frame with a vegas-gold rim and brass-gold lettering reads as two
// products bolted together, which is exactly the bug that shipped once.

describe("rimRamp", () => {
  it("is the brass when nothing overrides it", () => {
    expect(rimRamp()).toBe(BRASS);
    expect(rimRamp(null)).toBe(BRASS);
  });

  it("runs bright-to-dark, which is the only reason a rim reads as metal", () => {
    const r = rimRamp("#8C1D40");
    expect(luminance(r.light)).toBeGreaterThan(luminance(r.mid));
    expect(luminance(r.mid)).toBeGreaterThan(luminance(r.dark));
  });

  it("keeps the chosen colour as the body, not just as an influence", () => {
    expect(rimRamp("#8C1D40").mid).toBe("#8C1D40");
  });
});

describe("tileField", () => {
  const dark = { backgroundColor: TILE_BG.navy };
  const light = { backgroundColor: TILE_BG.white };

  it("leaves the designed field alone when nothing overrides it", () => {
    expect(tileField(dark)).toBe(tileBackground(dark));
  });

  it("takes the override on a dark-field piece", () => {
    expect(tileField(dark, "#8C1D40")).toBe("#8C1D40");
  });

  it("takes the override on a LIGHT-field piece too, with no tint", () => {
    // One colour, every badge, no exceptions. This asserted the opposite until the
    // owner reported the same thing twice: a school colour that floods some tiles
    // and tints others reads as broken, whatever the reason. Art needing a light
    // backing now carries an opaque light card in the ARTWORK, which no field
    // colour can take away.
    expect(tileField(light, "#1B2A4A")).toBe("#1B2A4A");
  });
});

describe("the rim override reaches the lettering, not only the edge", () => {
  it("threads the merrow with the override instead of the brass", () => {
    const plain = textChenille(60, "#FFFFFF");
    const school = textChenille(60, "#FFFFFF", "#8C1D40");
    expect(plain.merrow.thread).toBe(BRASS.mid);
    expect(school.merrow.thread).toBe(rimRamp("#8C1D40").mid);
  });

  it("keeps the dark-type case on the LIGHT stop, so the thread still contrasts", () => {
    const school = textChenille(60, "#111111", "#8C1D40");
    expect(school.merrow.thread).toBe(rimRamp("#8C1D40").light);
    expect(luminance(school.merrow.thread)).toBeGreaterThan(luminance("#8C1D40"));
  });

  it("is a straight substitution — the school colour lands on the gold's own stop", () => {
    const silver = "#D9DCE1";
    expect(merrowThread("#FFFFFF", silver)).toBe(rimRamp(silver).mid);
    expect(merrowThread("#111111", silver)).toBe(rimRamp(silver).light);
  });

  it("leaves the BRASS thread exactly where every existing frame was designed", () => {
    expect(merrowThread("#FFFFFF")).toBe(BRASS.mid);
    expect(merrowThread("#111111")).toBe(BRASS.light);
  });

  it("carries into the CSS twin, or the builder and the print sheet drift", () => {
    const css = textChenilleCss(60, "#FFFFFF", "#8C1D40");
    expect(css.WebkitTextStroke).toContain(rimRamp("#8C1D40").mid);
    expect(textChenilleCss(60, "#FFFFFF").WebkitTextStroke).toContain(BRASS.mid);
  });
});

describe("artInset — the one answer both renderers ask for", () => {
  const CELL = 300;

  it("clears the whole chrome AND leaves air, so art never touches the bevel", () => {
    // The bug: art was inset to exactly `rim.inset + rim.width + bevel.thickness`, so
    // anything drawn out to its own bounding box met the shaded band with nothing in
    // between and read as cut into.
    const bg = TILE_BG.navy;
    const rim = rimMetrics(CELL, CELL, CELL);
    const bevel = bevelMetrics(CELL, CELL, bg, CELL);
    const chrome = rim.inset + rim.width + bevel.thickness;
    expect(artInset(CELL, CELL, bg, CELL)).toBeGreaterThan(chrome);
  });

  it("costs the art almost nothing — the point is a gap, not a margin", () => {
    // A 2x2 badge: both sides of air together stay under 4% of its width.
    const w = CELL * 2;
    const bg = TILE_BG.navy;
    const chrome =
      rimMetrics(w, w, CELL).inset + rimMetrics(w, w, CELL).width + bevelMetrics(w, w, bg, CELL).thickness;
    const air = artInset(w, w, bg, CELL) - chrome;
    expect((air * 2) / w).toBeLessThan(0.04);
  });

  it("is measured against the CELL, so a 3x3 badge keeps the same gap as a 1x1", () => {
    const bg = TILE_BG.navy;
    expect(artInset(CELL * 3, CELL * 3, bg, CELL)).toBe(artInset(CELL, CELL, bg, CELL));
  });

  it("never rounds the air away to nothing on a small tile", () => {
    const bg = TILE_BG.navy;
    const tiny = 24;
    const chrome =
      rimMetrics(tiny, tiny, tiny).inset +
      rimMetrics(tiny, tiny, tiny).width +
      bevelMetrics(tiny, tiny, bg, tiny).thickness;
    expect(artInset(tiny, tiny, bg, tiny)).toBeGreaterThanOrEqual(chrome + 1);
  });
});

describe("fieldForArtPixels — the upload's answer to tileBackground", () => {
  const px = (r: number, g: number, b: number, a: number, count: number) => {
    const d = new Uint8ClampedArray(count * 4);
    for (let i = 0; i < count; i++) d.set([r, g, b, a], i * 4);
    return d;
  };
  const mix = (...parts: Uint8ClampedArray[]) => {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const d = new Uint8ClampedArray(total);
    let o = 0;
    for (const p of parts) { d.set(p, o); o += p.length; }
    return d;
  };

  it("gives light art the navy field — the white-logo-vanishing case", () => {
    // A white-on-transparent header logo: mostly transparent, opaque pixels white.
    const d = mix(px(255, 255, 255, 255, 100), px(0, 0, 0, 0, 900));
    expect(fieldForArtPixels(d)).toBe(TILE_BG.navy);
  });

  it("gives dark art the white field", () => {
    const d = mix(px(27, 42, 74, 255, 100), px(0, 0, 0, 0, 900));
    expect(fieldForArtPixels(d)).toBe(TILE_BG.white);
  });

  it("ignores the transparent surround entirely", () => {
    // Same opaque pixels, wildly different amounts of transparency — same verdict.
    const small = mix(px(250, 250, 250, 255, 10), px(0, 0, 0, 0, 10));
    const large = mix(px(250, 250, 250, 255, 10), px(0, 0, 0, 0, 100000));
    expect(fieldForArtPixels(small)).toBe(fieldForArtPixels(large));
  });

  it("returns white for a fully transparent image (nothing to sit on a field)", () => {
    expect(fieldForArtPixels(px(0, 0, 0, 0, 500))).toBe(TILE_BG.white);
  });
});

// ─── Banner lettering stays proportional at PREVIEW sizes ────────────────────
//
// Every number in textEmboss is meant to be a fraction of the font, so a banner
// carries the same physical weight at any scale. Four of them were floored at
// 1px, which meant `depth` stopped scaling below 45px and the shadow's X offset
// below 50px — and EVERY on-screen banner renders under those sizes, while the
// print sheet renders at thousands of pixels and never reaches them. That is the
// exact shape of "it looks fat on mobile but the print file is fine", and it is
// the second time this file has produced it: the merrow floors were 2px and 1px
// for the same reason.

describe("textEmboss stays proportional at small font sizes", () => {
  const SMALL = 11; // a long school name on a phone
  const BIG = 800; // print scale

  it("keeps every edge number a FRACTION of the font, not a fixed pixel size", () => {
    const small = textEmboss(SMALL, "#FFFFFF");
    const big = textEmboss(BIG, "#FFFFFF");
    for (const [name, s, b] of [
      ["depth", small.depth, big.depth],
      ["blur", small.shadow.blur, big.shadow.blur],
      ["offsetX", small.shadow.offsetX, big.shadow.offsetX],
      ["offsetY", small.shadow.offsetY, big.shadow.offsetY],
      ["merrow width", small.merrow.width, big.merrow.width],
      ["merrow seat", small.merrow.seat, big.merrow.seat],
    ] as const) {
      // Same share of the em at both scales. The floors are still there as
      // anti-zero guards and one of them just grazes 11px, so this allows a few
      // percent — it is catching the 5x the old floors produced, not a rounding.
      expect(s / SMALL, `${name} is floored at preview size`).toBeLessThan((b / BIG) * 1.15);
      expect(s / SMALL, `${name} shrank at preview size`).toBeGreaterThan((b / BIG) * 0.85);
    }
  });

  it("never lets the emboss ghost reach a tenth of the glyph", () => {
    // A 1px depth on 8px type puts a white ghost up-left and a black one
    // down-right of every letter, which is most of what read as a fatter face.
    for (const px of [7, 11, 16, 24, 32]) {
      expect(textEmboss(px, "#FFFFFF").depth / px).toBeLessThan(0.1);
    }
  });

  it("still guards against zero", () => {
    const tiny = textEmboss(0.001, "#FFFFFF");
    expect(tiny.depth).toBeGreaterThan(0);
    expect(tiny.shadow.blur).toBeGreaterThan(0);
    expect(tiny.merrow.width).toBeGreaterThan(0);
  });
});
