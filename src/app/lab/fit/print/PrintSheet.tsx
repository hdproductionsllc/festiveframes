"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";

import { computeFit, outlineParts, partBox, unionBoxes, type FitBox } from "@/lib/fit/geometry";
import { useUrlSpec } from "../use-url-spec";
import {
  BED,
  MO_DATE_LINE_INCHES,
  PILOT_HEIGHT_CEILING_INCHES,
  PLATE,
  QUARTER_INCHES,
  STICKER_ZONE_INCHES,
  specToQuery,
  type FitPart,
} from "@/lib/fit/spec";

// ─── TRUE SCALE, and how it is held ──────────────────────────────────────────
//
// Every template dimension below is a CSS physical inch: `width: 3.5in`, not a
// pixel count, not a viewBox unit, not a transform. A CSS inch is defined as
// exactly 96px and printers honour it, so at 100 percent scale the paper matches
// the number. There is deliberately NO responsive behaviour on the template
// pages: a template that shrinks to fit a phone screen is a template that lies.
//
// Placement follows the spec's coordinate convention: INCHES, origin at the
// plate's top-left corner, x rightward, y downward. Each page picks a rectangle
// of that plate space and renders it into a relatively positioned container of
// exactly that size in inches; every part inside is an absolutely positioned box
// at (part.x - originX)in, (part.y - originY)in. The container clips, so a page
// that wants half the frame just asks for half the rectangle.
//
// Outlines are BORDERS, never background fills or shadows: browsers drop
// backgrounds from print by default, and a cut line that does not print is worse
// than no cut line at all.

/** The tallest side column letter landscape can hold once the headings have
 *  taken their share. A column taller than this is clipped at the TOP. */
const SIDE_MAX_HEIGHT_INCHES = 6.2;

/** CSS physical inches. Rounded only to keep the attribute readable. */
function inch(value: number): string {
  return `${Math.round(value * 10000) / 10000}in`;
}

/** Engineering display: three decimals, the tolerance Bill texts in. */
function num(value: number | undefined, dp = 3): string {
  return Number.isFinite(value) ? (value as number).toFixed(dp) : "n/a";
}

function boxStyle(box: FitBox, ox: number, oy: number): CSSProperties {
  return {
    left: inch(box.x - ox),
    top: inch(box.y - oy),
    width: inch(box.w),
    height: inch(box.h),
  };
}

/** One outlined part, drawn at true scale. Rects are bordered divs; the keystone
 *  is a polygon, so it gets an inline SVG whose viewport is sized in inches and
 *  whose viewBox units ARE those inches. One scale, both cases. */
function PartShape({ part, ox, oy }: { part: FitPart; ox: number; oy: number }) {
  const box = partBox(part);
  if (box.w <= 0 || box.h <= 0) return null;
  const style = boxStyle(box, ox, oy);

  if (part.polygon) {
    const points = part.polygon.map((p) => `${p.x - box.x},${p.y - box.y}`).join(" ");
    return (
      <svg
        className="fp-part fp-part-poly"
        style={style}
        viewBox={`0 0 ${box.w} ${box.h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* non-scaling-stroke so the line stays 1px however the box is shaped;
            the GEOMETRY is still in inches because the viewBox is. */}
        <polygon
          points={points}
          fill="none"
          stroke="#000"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return <div className="fp-part fp-part-rect" style={style} aria-hidden="true" />;
}

/** A label pinned inside a region, in that region's inch coordinates. Labels are
 *  placed per page rather than at each part's own top-left corner: most parts run
 *  off the edge of the rectangle a page is showing, so a corner-anchored label
 *  either lands outside the paper or on top of another one. */
function Mark({
  left,
  top,
  vertical = false,
  children,
}: {
  left: number;
  top: number;
  vertical?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`fp-part-label${vertical ? " fp-part-label-v" : ""}`}
      style={{ left: inch(left), top: inch(top) }}
    >
      {children}
    </span>
  );
}

/** A window onto plate space, at true scale, clipping whatever falls outside. */
function Region({
  x0,
  y0,
  x1,
  y1,
  parts,
  showPlate = true,
  children,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  parts: FitPart[];
  showPlate?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="fp-region" style={{ width: inch(x1 - x0), height: inch(y1 - y0) }}>
      {showPlate && (
        <div
          className="fp-plate"
          style={boxStyle(
            { x: 0, y: 0, w: PLATE.widthInches, h: PLATE.heightInches },
            x0,
            y0,
          )}
          aria-hidden="true"
        />
      )}
      {parts.map((part) => (
        <PartShape key={`shape-${part.id}`} part={part} ox={x0} oy={y0} />
      ))}
      {children}
    </div>
  );
}

export default function PrintSheet() {
  // Server render and first client render must agree, so the query is adopted
  // after mount. Shared with the bench: see useUrlSpec.
  const [spec] = useUrlSpec();

  // The printed configuration line is the spec RE-ENCODED, not the query string
  // that arrived. Those differ whenever a link omits a key or carries a stale
  // one, and the sheet must quote the geometry it actually drew.
  const query = useMemo(() => specToQuery(spec), [spec]);

  // `computeFit` and `outlineParts` are total over every FitSpec the codec can
  // produce, so there is no failure branch to hedge against here. There used to
  // be one, and its fallbacks quietly printed DIFFERENT numbers from the engine
  // (total height came out 6.991 where the engine says 6.938) — a calibration
  // sheet whose backup path lies is worse than one that does not print.
  const readout = useMemo(() => computeFit(spec), [spec]);
  const parts: FitPart[] = useMemo(() => outlineParts(spec), [spec]);

  const windowW = spec.windowCols * spec.pitchInches;
  const windowH = spec.windowRows * spec.pitchInches;
  const badgeColW = spec.sideBadgeCells * spec.pitchInches;
  const sideOutboard = badgeColW - spec.sideInwardInches;
  const totalH = readout.totalHeightInches;
  const belowPlate = readout.belowPlateInches;

  // ─── Page 2 rectangle: the bottom band, centreline rightward ───────────────
  const centerX = PLATE.widthInches / 2;
  const extent = unionBoxes(parts.map(partBox));
  const frameRight = extent.x + extent.w;
  const frameBottom = extent.y + extent.h;
  const runnerBox = parts.find((p) => p.id === "runner-bottom");
  const bannerTop = runnerBox
    ? partBox(runnerBox).y
    : PLATE.heightInches + spec.bottomDropInches - spec.runnerHeightInches;
  const bottomY0 = bannerTop - 1;
  const badgesRight = parts.find((p) => p.id === "badges-right");
  const badgeLeftEdge = badgesRight
    ? partBox(badgesRight).x
    : PLATE.widthInches - spec.sideInwardInches;

  // ─── Page 3 rectangle: the right side column, full height ──────────────────
  //
  // By id, which is now safe to do: `FitPart["id"]` is exactly the five ids
  // `outlineParts` emits, so a renamed part is a type error here rather than a
  // silently empty box on paper.
  const sideParts = parts.filter((part) => part.id === "badges-right");
  const side = sideParts.length
    ? unionBoxes(sideParts.map(partBox))
    : {
        x: PLATE.widthInches - spec.sideInwardInches,
        y: 0,
        w: spec.sideInwardInches + sideOutboard,
        h: PLATE.heightInches,
      };
  const sideX0 = side.x;
  const sideX1 = side.x + side.w;
  const sideY1 = side.y + side.h;
  const sideNaturalY0 = side.y;
  // If the column is taller than the paper allows, clip the TOP and keep the
  // bottom edge true: the bottom is the edge that fails on a car, so it is the
  // edge that must be real.
  const sideClipped = sideY1 - sideNaturalY0 > SIDE_MAX_HEIGHT_INCHES;
  const sideY0 = sideClipped ? sideY1 - SIDE_MAX_HEIGHT_INCHES : sideNaturalY0;
  const plateEdgeX = PLATE.widthInches;

  return (
    <div className="fitprint">
      <div className="fp-bar no-print">
        <strong>Print at 100 percent. Landscape letter.</strong>
        <span>
          Three pages: scale check, bottom profile half template, side profile
          template. Cut on the solid lines.
        </span>
        <button type="button" className="fp-print-btn" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {/* ── PAGE 1 ─────────────────────────────────────────────────────────── */}
      <section className="fp-page">
        <h1 className="fp-h1">Fit bench, page 1 of 3. Verify scale.</h1>

        <p className="fp-instruction">
          Measure this bar. It must be exactly 6 inches. If it is not, set your print
          dialog to 100 percent scale, not fit to page.
        </p>

        <div className="fp-ruler" aria-label="Six inch calibration bar">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="fp-tick" style={{ left: `calc(${i}in - 1px)` }} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className={`fp-tick-num${i === 0 ? " fp-tick-num-first" : ""}${
                i === 6 ? " fp-tick-num-last" : ""
              }`}
              style={{ left: `calc(${i}in - 1px)` }}
            >
              {i}
            </span>
          ))}
        </div>
        <p className="fp-ruler-foot">
          0 to 6 inches, edge of border to edge of border. Tick marks every 1 inch.
        </p>

        <div className="fp-square-row">
          <div className="fp-square" aria-label="Two inch verification square">
            <span>2 in by 2 in</span>
          </div>
          <p className="fp-square-note">
            Second check, both axes. This square must measure 2 inches across and 2
            inches down, outside edge to outside edge. If the bar is right and the
            square is not, the printer is scaling one axis and this sheet cannot be
            used.
          </p>
        </div>

        <h2 className="fp-h2">This sheet is printing this geometry</h2>
        <table className="fp-table">
          <tbody>
            <tr>
              <th scope="row">Tile pitch</th>
              <td>{num(spec.pitchInches)} in</td>
              <td>
                Bill&rsquo;s system reads 1.000. July files were 0.991. Pitch error is
                invisible per tile and fatal per panel.
              </td>
            </tr>
            <tr>
              <th scope="row">Window</th>
              <td>
                {spec.windowCols} by {spec.windowRows} cells, {num(windowW)} by{" "}
                {num(windowH)} in
              </td>
              <td>
                Plate is {num(PLATE.widthInches, 1)} by {num(PLATE.heightInches, 1)} in,
                so the frame covers the face by the difference.
              </td>
            </tr>
            <tr>
              <th scope="row">Below plate drop</th>
              <td>{num(belowPlate)} in</td>
              <td>
                The binding car fit number. July was 0.469 and is the most ever shown to
                fit.
              </td>
            </tr>
            <tr>
              <th scope="row">Bottom runner height</th>
              <td>{num(spec.runnerHeightInches)} in</td>
              <td>Anything past the drop is bought inward, over the plate face.</td>
            </tr>
            <tr>
              <th scope="row">Keystone</th>
              <td>
                {spec.keystone
                  ? `rise ${num(spec.keystone.riseInches)} in, base ${num(
                      spec.keystone.baseInches,
                    )} in, top ${num(spec.keystone.topInches)} in`
                  : "none"}
              </td>
              <td>
                Centre section reaching up into the plate opening. Costs height inward,
                not downward.
              </td>
            </tr>
            <tr>
              <th scope="row">Side reach</th>
              <td>
                {num(spec.sideInwardInches)} in inward, {num(sideOutboard)} in outboard,
                column {num(badgeColW)} in
              </td>
              <td>Outboard is air the car must have. Inward is plate face covered.</td>
            </tr>
            <tr>
              <th scope="row">Total size</th>
              <td>
                {num(readout.totalWidthInches)} by {num(totalH)} in
              </td>
              <td>
                Honda Pilot ceiling is {num(PILOT_HEIGHT_CEILING_INCHES, 0)} in tall.
                eufyMake E1 bed is {num(BED.longInches, 1)} by {num(BED.shortInches, 0)}{" "}
                in.
              </td>
            </tr>
          </tbody>
        </table>

        {readout.flags.length > 0 ? (
          <div className="fp-flags">
            <strong>Flags on this geometry</strong>
            <ul>
              {readout.flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="fp-clean">
            No rule flags on this geometry. Bed fit rotated:{" "}
            {readout.fitsBedRotated ? "yes" : "no"}. Under the Pilot ceiling:{" "}
            {readout.underPilotCeiling ? "yes" : "no"}.
          </p>
        )}

        <p className="fp-query">
          Configuration: /lab/fit/print?{query}
        </p>
      </section>

      {/* ── PAGE 2 ─────────────────────────────────────────────────────────── */}
      <section className="fp-page">
        <h1 className="fp-h1">
          Page 2 of 3. Bottom profile, half template. Cut out and hold under the plate.
        </h1>
        <p className="fp-instruction fp-instruction-quiet">
          The bottom edge is the constraint that fails on a car. This is the right half
          of the frame&rsquo;s bottom region, at true scale. Line the heavy edge up with
          the centre of the plate, hold the template flat against the car, and look at
          what sits below the plate&rsquo;s bottom edge.
        </p>

        <div className="fp-sheet-row">
          <div className="fp-drawing">
            <Region
              x0={centerX}
              y0={bottomY0}
              x1={frameRight}
              y1={frameBottom}
              parts={parts}
            >
              <span className="fp-centerline" aria-hidden="true" />
              <span
                className="fp-rule-h"
                style={{
                  left: 0,
                  top: inch(PLATE.heightInches - bottomY0),
                  width: inch(frameRight - centerX),
                }}
                aria-hidden="true"
              />
              <Mark left={0.14} top={PLATE.heightInches - bottomY0 + 0.04}>
                Plate bottom edge, dashed
              </Mark>
              <Mark left={0.14} top={bannerTop - bottomY0 + 0.06}>
                Bottom banner
              </Mark>
              {spec.keystone && (
                <Mark left={0.14} top={bannerTop - spec.keystone.riseInches - bottomY0 + 0.09}>
                  Keystone, half
                </Mark>
              )}
              {badgeLeftEdge + 1.4 < frameRight && (
                <Mark left={badgeLeftEdge - centerX + 0.08} top={0.08}>
                  Side badge column
                </Mark>
              )}
            </Region>
            {/* Pinned to the drawing's own width. The drawing column is sized by
                its widest content, so an unconstrained caption under a narrow
                template silently widens the column and squeezes the callouts. */}
            <p className="fp-centerline-note" style={{ width: inch(frameRight - centerX) }}>
              CENTERLINE. Align with plate center, template covers the right half; flip
              for the left.
            </p>
          </div>

          <div className="fp-callouts">
            <h2 className="fp-h2">Bottom callouts</h2>
            <dl>
              <dt>Below plate drop</dt>
              <dd>
                {num(belowPlate)} in. Material under the plate&rsquo;s bottom edge. This
                is what fails the Pilot. July&rsquo;s ring was 0.469 in.
              </dd>
              <dt>Banner height</dt>
              <dd>{num(spec.runnerHeightInches)} in total for the bottom part.</dd>
              <dt>Face intrusion, full width</dt>
              <dd>
                {num(readout.faceCoverage.bottomFullWidth)} in of plate face covered
                across the whole bottom.
              </dd>
              <dt>Face intrusion at centre</dt>
              <dd>
                {num(readout.faceCoverage.bottomCenter)} in, keystone included. Missouri
                prints its date line {num(MO_DATE_LINE_INCHES, 2)} in up from the plate
                bottom, so this is the number that hides registration text.
              </dd>
              <dt>Keystone rise</dt>
              <dd>
                {spec.keystone ? `${num(spec.keystone.riseInches)} in above the banner top edge.` : "No keystone in this spec."}
              </dd>
              <dt>Corner clear</dt>
              <dd>
                {num(readout.cornerClearInches)} in at the tightest plate corner.
                Registration stickers want about {num(STICKER_ZONE_INCHES, 2)} in clear.
              </dd>
            </dl>
            <p className="fp-check">
              Paper check: hold it on the car with the plate bottom edge line at the
              real plate&rsquo;s bottom edge. If the template touches bumper, valance or
              step before it is flat, the drop is too big and comes back to the code.
              Nothing gets stretched to fit.
            </p>
          </div>
        </div>
      </section>

      {/* ── PAGE 3 ─────────────────────────────────────────────────────────── */}
      <section className="fp-page fp-page-last">
        <h1 className="fp-h1">
          Page 3 of 3. Side profile. One side column at true scale.
        </h1>
        <p className="fp-instruction fp-instruction-quiet">
          Cut this out and hold it against the plate&rsquo;s right edge with the dashed
          line on the plate edge. Everything left of the dashed line covers the plate
          face. Everything right of it hangs off the plate onto the car.
        </p>

        <div className="fp-sheet-row">
          <div className="fp-drawing">
            <Region
              x0={sideX0}
              y0={sideY0}
              x1={sideX1}
              y1={sideY1}
              parts={sideParts}
              showPlate={false}
            >
              <span
                className="fp-rule-v"
                style={{ left: inch(plateEdgeX - sideX0), top: 0, height: inch(sideY1 - sideY0) }}
                aria-hidden="true"
              />
              <Mark left={0.06} top={0.06}>
                Side column
              </Mark>
              <Mark left={plateEdgeX - sideX0 - 0.2} top={0.6} vertical>
                Flat surface. Plate face.
              </Mark>
              <Mark left={plateEdgeX - sideX0 + 0.07} top={0.6} vertical>
                Air. Nothing behind this.
              </Mark>
              <Mark left={plateEdgeX - sideX0 + 0.07} top={sideY1 - sideY0 - 0.22}>
                Plate edge
              </Mark>
            </Region>
          </div>

          <div className="fp-callouts">
            <h2 className="fp-h2">Side callouts</h2>
            {sideClipped && (
              <p className="fp-centerline-note">
                The column is {num(sideY1 - sideNaturalY0, 2)} in tall and is cut off at
                the TOP to fit the paper. The bottom edge and both side edges are true.
              </p>
            )}
            <dl>
              <dt>Cell pitch</dt>
              <dd>
                {num(spec.pitchInches)} in. One cell of the rail grid. Bill&rsquo;s
                system is on a 1.000 in grid.
              </dd>
              <dt>Badge column</dt>
              <dd>
                {spec.sideBadgeCells} cells, {num(badgeColW)} in wide overall. Drawn
                width {num(sideX1 - sideX0, 2)} in.
              </dd>
              <dt>Inward, over the plate face</dt>
              <dd>
                {num(spec.sideInwardInches)} in. MUST BE FLAT SURFACE. The quarter test:
                a US quarter is {num(QUARTER_INCHES)} in, so if the covered strip is
                narrower than the disc below it, the piece is riding on less than a
                quarter of plate.
              </dd>
              <dt>Outboard, past the plate edge</dt>
              <dd>
                {num(sideOutboard)} in. MUST BE AIR ON THE CAR. Nothing may be behind
                this strip: no trim, no lamp housing, no recess wall.
              </dd>
              <dt>Window height</dt>
              <dd>
                {num(windowH)} in, {spec.windowRows} rows. Frame total height{" "}
                {num(totalH)} in.
              </dd>
            </dl>

            <div className="fp-quarter-row">
              {/* Sized from QUARTER_INCHES, not a second copy of 0.955 in the
                  stylesheet: this circle is a scale CHECK, so the one number it
                  is checked against has to be the one the engine uses. */}
              <div
                className="fp-quarter"
                style={{ width: inch(QUARTER_INCHES), height: inch(QUARTER_INCHES) }}
                aria-label={`US quarter, ${QUARTER_INCHES} inch diameter`}
              />
              <p>
                US quarter at true scale, {num(QUARTER_INCHES)} in. Lay a real quarter on
                this circle as a third scale check, then lay it on the inward strip.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
