"use client";

import { useEffect, useState } from "react";
import { computeFit, outlineParts, partBox, unionBoxes, type FitBox } from "@/lib/fit/geometry";
import { shippabilityRefusals } from "@/lib/fit/config-bridge";
import { useUrlSpec } from "./use-url-spec";
import {
  CHARACTER_MARGIN_INCHES,
  DEFAULT_KEYSTONE,
  JULY_SPEC,
  MAX_SIDE_INWARD_INCHES,
  MO_DATE_LINE_INCHES,
  PILOT_HEIGHT_CEILING_INCHES,
  PLATE,
  PRESETS,
  STICKER_ZONE_INCHES,
  specToQuery,
  type FitPart,
  type FitSpec,
  type KeystoneSpec,
} from "@/lib/fit/spec";

// ─── The bench ───────────────────────────────────────────────────────────────
//
// Left column turns dials, right column shows what they did. The SVG is drawn in
// PLATE COORDINATES (inches, origin at the plate's top-left, y downward, exactly
// the convention spec.ts fixes) and scaled by SCALE user units per inch, so any
// number in the readout can be found on the picture by eye.

const SCALE = 40; // user units per inch
const PAD_INCHES = 1.1; // room around the frame for dimension labels

// Type sizes are in SVG user units, so they must scale with SCALE or a bigger
// drawing would come with proportionally smaller labels. These land on 10 and 12
// at SCALE 40. The STROKE widths live in fit-bench.css instead (.fb-part,
// .fb-ref, .fb-dim-line): they are shared by a dozen elements, and a stroke that
// varied with SCALE could not be expressed there. They are constant on purpose.
const LABEL_FONT = SCALE * 0.25;
const DIM_FONT = SCALE * 0.3;

/** How long a dial can be dragged before the URL is rewritten. A single slider
 *  drag fires a change per pixel; Safari throws after 100 replaceState calls in
 *  30 seconds and takes the page down with it. The URL is the document, but it
 *  does not have to be the document on every animation frame. */
const URL_WRITE_DEBOUNCE_MS = 200;

/** The presets' encoded queries. PRESETS is a module constant, so these are too;
 *  the preset strip compares the live query against them to decide which chip is
 *  lit, and re-encoding three specs on every keystroke to answer that is work the
 *  module can do once. */
const PRESET_QUERIES = PRESETS.map((p) => specToQuery(p.spec));

const inches = (n: number) => `${n.toFixed(3)}"`;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Snap to the dial's step so the URL never carries floating-point dust. */
function quantise(n: number, step: number): number {
  const snapped = Math.round(n / step) * step;
  return Number(snapped.toFixed(4));
}

/** One parse for both halves of a dial: the slider's value and the number box's
 *  typed string arrive here and leave on the dial's own grid, or as null when
 *  what was typed is not a number yet. Quantising HERE is what keeps a typed
 *  0.5300000000000001 out of the URL — the slider was already clean. */
function parseDialValue(raw: string, step: number): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? quantise(n, step) : null;
}

// ─── One dial: slider and number box, driving the same value ─────────────────

interface DialProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Dial({ label, hint, value, min, max, step, onChange }: DialProps) {
  // The number box keeps a draft string so half-typed values ("0." , "1.") are
  // not stomped mid-keystroke. It is reconciled DURING RENDER when the value
  // changes from outside (a preset, the slider), which is the pattern that
  // avoids an effect purely to mirror a prop.
  const [draft, setDraft] = useState(() => String(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(String(value));
  }

  const commit = (raw: string) => {
    setDraft(raw);
    const next = parseDialValue(raw, step);
    if (next === null) return;
    // Take credit for our own write. Without this the quantised number comes back
    // as an "outside" change and overwrites the string being typed: type 0.53 on
    // a 0.05 step and the box would rewrite itself to 0.55 under the cursor.
    setSeen(next);
    onChange(next);
  };

  return (
    <div className="fb-dial">
      <label className="fb-dial-head" htmlFor={`fb-${label}`}>
        <span className="fb-dial-label">{label}</span>
        {hint ? <span className="fb-dial-hint">{hint}</span> : null}
      </label>
      <div className="fb-dial-body">
        <input
          className="fb-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamp(value, min, max)}
          onChange={(e) => {
            const next = parseDialValue(e.target.value, step);
            if (next !== null) onChange(next);
          }}
          aria-label={`${label} slider`}
        />
        <input
          id={`fb-${label}`}
          className="fb-number"
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => {
            const parsed = parseDialValue(draft, step);
            const next = parsed === null ? value : clamp(parsed, min, max);
            setDraft(String(next));
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}

// ─── The drawing ─────────────────────────────────────────────────────────────

/** The drawn extent, never smaller than the plate itself: a frame that covers
 *  less than the plate must still be seen against the whole plate. */
function partBounds(parts: FitPart[]): FitBox {
  return unionBoxes(parts.map(partBox), {
    x: 0,
    y: 0,
    w: PLATE.widthInches,
    h: PLATE.heightInches,
  });
}

function FrontView({ parts, widthLabel, heightLabel, dropLabel }: {
  parts: FitPart[];
  widthLabel: string;
  heightLabel: string;
  dropLabel: string;
}) {
  const b = partBounds(parts);
  const viewX = (b.x - PAD_INCHES) * SCALE;
  const viewY = (b.y - PAD_INCHES) * SCALE;
  const viewW = (b.w + PAD_INCHES * 2) * SCALE;
  const viewH = (b.h + PAD_INCHES * 2) * SCALE;

  const plateW = PLATE.widthInches;
  const plateH = PLATE.heightInches;
  const dateY = plateH - MO_DATE_LINE_INCHES;
  const zone = STICKER_ZONE_INCHES;
  const corners = [
    { x: 0, y: 0 },
    { x: plateW - zone, y: 0 },
    { x: 0, y: plateH - zone },
    { x: plateW - zone, y: plateH - zone },
  ];

  const dimTop = (b.y - 0.42) * SCALE;
  const dimLeft = (b.x - 0.42) * SCALE;
  const dimBottom = (b.y + b.h + 0.5) * SCALE;

  return (
    <svg
      className="fb-svg"
      viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
      role="img"
      aria-label={`Front view of the frame over a ${plateW} by ${plateH} inch plate`}
    >
      {/* PLATE first, so everything the frame covers reads as covered. */}
      <rect
        x={0}
        y={0}
        width={plateW * SCALE}
        height={plateH * SCALE}
        fill="#f2f1ed"
        stroke="#8d8d86"
        strokeWidth={1.25}
      />
      {/* FRAME parts next, semi-opaque so the plate reads through them. */}
      {parts.map((part) =>
        part.rect ? (
          <rect
            key={part.id}
            className="fb-part"
            x={part.rect.x * SCALE}
            y={part.rect.y * SCALE}
            width={part.rect.w * SCALE}
            height={part.rect.h * SCALE}
          >
            <title>{part.label}</title>
          </rect>
        ) : part.polygon ? (
          <polygon
            key={part.id}
            className="fb-part"
            points={part.polygon.map((pt) => `${pt.x * SCALE},${pt.y * SCALE}`).join(" ")}
          >
            <title>{part.label}</title>
          </polygon>
        ) : null,
      )}

      {/* KEEP-CLEAR reference geometry LAST. It was under the parts for one
          render and disappeared exactly where it matters: a sticker zone you
          cannot see is a sticker zone you cannot see being covered. Amber
          reads against both the pale plate and the dark parts over it, and the
          label carries a white halo (paint-order stroke) so it survives either
          background. */}
      {corners.map((c, i) => (
        <rect
          key={`zone-${i}`}
          className="fb-ref"
          x={c.x * SCALE}
          y={c.y * SCALE}
          width={zone * SCALE}
          height={zone * SCALE}
        />
      ))}
      <line
        className="fb-ref"
        x1={0}
        y1={dateY * SCALE}
        x2={plateW * SCALE}
        y2={dateY * SCALE}
      />
      <text
        className="fb-svg-note"
        x={(zone + 0.2) * SCALE}
        y={(dateY - 0.13) * SCALE}
        fontSize={LABEL_FONT}
      >
        MO date line
      </text>

      {/* Dimensions. */}
      <line className="fb-dim-line" x1={b.x * SCALE} y1={dimTop} x2={(b.x + b.w) * SCALE} y2={dimTop} />
      <line className="fb-dim-line" x1={b.x * SCALE} y1={dimTop - 5} x2={b.x * SCALE} y2={dimTop + 5} />
      <line className="fb-dim-line" x1={(b.x + b.w) * SCALE} y1={dimTop - 5} x2={(b.x + b.w) * SCALE} y2={dimTop + 5} />
      <text
        className="fb-svg-dim"
        x={((b.x + b.w / 2)) * SCALE}
        y={dimTop - 9}
        fontSize={DIM_FONT}
        textAnchor="middle"
      >
        {widthLabel}
      </text>

      <line className="fb-dim-line" x1={dimLeft} y1={b.y * SCALE} x2={dimLeft} y2={(b.y + b.h) * SCALE} />
      <line className="fb-dim-line" x1={dimLeft - 5} y1={b.y * SCALE} x2={dimLeft + 5} y2={b.y * SCALE} />
      <line className="fb-dim-line" x1={dimLeft - 5} y1={(b.y + b.h) * SCALE} x2={dimLeft + 5} y2={(b.y + b.h) * SCALE} />
      <text
        className="fb-svg-dim"
        x={dimLeft - 9}
        y={((b.y + b.h / 2)) * SCALE}
        fontSize={DIM_FONT}
        textAnchor="middle"
        transform={`rotate(-90 ${dimLeft - 9} ${((b.y + b.h / 2)) * SCALE})`}
      >
        {heightLabel}
      </text>

      <line
        className="fb-dim-line"
        x1={(plateW / 2) * SCALE}
        y1={plateH * SCALE}
        x2={(plateW / 2) * SCALE}
        y2={dimBottom - 12}
        strokeDasharray="4 3"
      />
      <text
        className="fb-svg-dim"
        x={(plateW / 2) * SCALE}
        y={dimBottom}
        fontSize={DIM_FONT}
        textAnchor="middle"
      >
        {dropLabel}
      </text>
    </svg>
  );
}

// ─── The bench itself ────────────────────────────────────────────────────────

export function FitBench() {
  // SSR renders the default spec; the URL is adopted after mount. See useUrlSpec.
  const [spec, setSpec] = useUrlSpec();
  const [copied, setCopied] = useState(false);

  // One query string per render, shared by the three things that need it: which
  // preset is lit, the copied link, and the print sheet's href. Building it three
  // times invited three answers.
  const currentQuery = specToQuery(spec);

  // The URL IS the document. replaceState rather than push so the back button
  // still leaves the page instead of walking back through every slider tick, and
  // debounced so a drag writes once at the end rather than once per tick. This
  // effect is declared AFTER the read above, so on mount the read has already
  // landed by the time the timer fires and the equivalent-query write it would
  // otherwise do is cancelled by its own cleanup.
  useEffect(() => {
    const timer = setTimeout(() => {
      window.history.replaceState(null, "", `${window.location.pathname}?${currentQuery}`);
    }, URL_WRITE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [currentQuery]);

  const set = <K extends keyof FitSpec>(key: K, value: FitSpec[K]) => {
    setSpec((prev) => ({ ...prev, [key]: value }));
  };

  const setKeystone = (key: keyof KeystoneSpec, value: number) => {
    setSpec((prev) => ({
      ...prev,
      keystone: { ...(prev.keystone ?? DEFAULT_KEYSTONE), [key]: value },
    }));
  };

  const readout = computeFit(spec);
  const parts = outlineParts(spec);
  const refusals = shippabilityRefusals(spec);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${currentQuery}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const ks = spec.keystone;

  return (
    <div className="fit-bench">
      <header className="fb-head">
        <h1>Fit bench</h1>
        <p>
          Turn a dial, read the consequence. The whole geometry lives in the URL, so a
          configuration is a link. Ground truth: the July 4 ring is the only geometry that
          ever completed design to physical part, and the BOTTOM edge is what fails the car.
          Height wanted at the bottom is bought inward over the plate face, never downward.
        </p>
      </header>

      <div className="fb-grid">
        {/* ── LEFT: the dials ─────────────────────────────────────────────── */}
        <section className="fb-controls" aria-label="Geometry controls">
          <div className="fb-block">
            <h2>Presets</h2>
            <div className="fb-presets">
              {PRESETS.map((p, i) => (
                <button
                  key={p.key}
                  type="button"
                  className={`fb-preset${PRESET_QUERIES[i] === currentQuery ? " is-on" : ""}`}
                  onClick={() => setSpec(p.spec)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fb-block">
            <h2>Grid and window</h2>
            <Dial
              label="Tile pitch"
              hint={`in. Bill's sleds read 1.000; the July files were ${JULY_SPEC.pitchInches.toFixed(3)}.`}
              value={spec.pitchInches}
              min={0.75}
              max={1.1}
              step={0.005}
              onChange={(v) => set("pitchInches", v)}
            />
            <Dial
              label="Window columns"
              hint="cells across the plate opening"
              value={spec.windowCols}
              min={9}
              max={13}
              step={1}
              onChange={(v) => set("windowCols", v)}
            />
            <Dial
              label="Window rows"
              hint="cells down the plate opening"
              value={spec.windowRows}
              min={4}
              max={6}
              step={1}
              onChange={(v) => set("windowRows", v)}
            />
          </div>

          <div className="fb-block">
            <h2>Bottom edge</h2>
            <Dial
              label="Below plate drop"
              hint={`in. July sat at ${JULY_SPEC.bottomDropInches.toFixed(4)}, the most ever shown to fit a car.`}
              value={spec.bottomDropInches}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => set("bottomDropInches", v)}
            />
            <Dial
              label="Runner height"
              hint="in. Total height of the bottom banner part."
              value={spec.runnerHeightInches}
              min={0.5}
              max={2.5}
              step={0.05}
              onChange={(v) => set("runnerHeightInches", v)}
            />
          </div>

          <div className="fb-block">
            <h2>Reach over the plate face</h2>
            <Dial
              label="Side badge cells"
              hint="1 = a single column, 2 = a 2x2 badge column"
              value={spec.sideBadgeCells}
              min={1}
              max={3}
              step={1}
              onChange={(v) => set("sideBadgeCells", v)}
            />
            <Dial
              label="Side inward"
              // The hint quoted the embossed-character margin and read as the
              // limit, but the flag fires at MAX_SIDE_INWARD_INCHES, which is
              // lower. Both numbers, each doing its own job.
              hint={`in. Flagged past ${MAX_SIDE_INWARD_INCHES.toFixed(
                2,
              )}; embossed characters start about ${CHARACTER_MARGIN_INCHES.toFixed(2)} in from the edge.`}
              value={spec.sideInwardInches}
              min={0}
              max={1.2}
              step={0.05}
              onChange={(v) => set("sideInwardInches", v)}
            />
            <Dial
              label="Top inward"
              hint="in. How far the top rail reaches down over the face."
              value={spec.topInwardInches}
              min={0}
              max={1.2}
              step={0.05}
              onChange={(v) => set("topInwardInches", v)}
            />
          </div>

          <div className="fb-block">
            <div className="fb-block-head">
              <h2>Keystone</h2>
              <label className="fb-toggle">
                <input
                  type="checkbox"
                  checked={ks !== null}
                  onChange={(e) => set("keystone", e.target.checked ? DEFAULT_KEYSTONE : null)}
                />
                <span>{ks ? "On" : "Off"}</span>
              </label>
            </div>
            <p className="fb-block-note">
              A centre section of the bottom banner rising UP into the plate opening. It buys
              banner height without adding a thousandth below the plate.
            </p>
            {ks ? (
              <>
                <Dial
                  label="Rise"
                  hint={`in. Stay under ${MO_DATE_LINE_INCHES.toFixed(2)} on a Missouri plate.`}
                  value={ks.riseInches}
                  min={0}
                  max={1.2}
                  step={0.05}
                  onChange={(v) => setKeystone("riseInches", v)}
                />
                <Dial
                  label="Base width"
                  hint="in. Where it meets the banner."
                  value={ks.baseInches}
                  min={3}
                  max={9}
                  step={0.05}
                  onChange={(v) => setKeystone("baseInches", v)}
                />
                <Dial
                  label="Top width"
                  hint="in. The narrower face, up on the plate."
                  value={ks.topInches}
                  min={2}
                  max={8}
                  step={0.05}
                  onChange={(v) => setKeystone("topInches", v)}
                />
                <Dial
                  label="Corner radius"
                  hint="in. Rounding on the keystone's two top corners."
                  value={ks.cornerRadiusInches}
                  min={0}
                  max={0.5}
                  step={0.05}
                  onChange={(v) => setKeystone("cornerRadiusInches", v)}
                />
              </>
            ) : null}
          </div>

          <div className="fb-block fb-share">
            <button type="button" className="fb-action" onClick={copyLink}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            <a className="fb-action fb-action-link" href={`/lab/fit/print?${currentQuery}`}>
              Print the 1:1 paper templates
            </a>
          </div>
        </section>

        {/* ── RIGHT: the picture and the numbers ──────────────────────────── */}
        <section className="fb-view" aria-label="Front view and readout">
          <div className="fb-figure">
            <FrontView
              parts={parts}
              widthLabel={`${inches(readout.totalWidthInches)} wide`}
              heightLabel={`${inches(readout.totalHeightInches)} tall`}
              dropLabel={`${inches(readout.belowPlateInches)} below plate`}
            />
            <p className="fb-legend">
              Light rectangle is the {PLATE.widthInches} x {PLATE.heightInches} plate. Dashed
              squares are the registration sticker zones, dashed line is the Missouri date
              line. Dark shapes are frame parts, drawn semi-opaque so plate coverage is
              visible.
            </p>
          </div>

          <table className="fb-readout">
            <caption>Readout</caption>
            <tbody>
              <tr>
                <th scope="row">Total size</th>
                <td>{inches(readout.totalWidthInches)} x {inches(readout.totalHeightInches)}</td>
              </tr>
              <tr>
                <th scope="row">Below plate</th>
                <td>{inches(readout.belowPlateInches)}</td>
              </tr>
              <tr>
                <th scope="row">Above plate</th>
                <td>{inches(readout.abovePlateInches)}</td>
              </tr>
              <tr>
                <th scope="row">Face coverage, left</th>
                <td>{inches(readout.faceCoverage.left)}</td>
              </tr>
              <tr>
                <th scope="row">Face coverage, right</th>
                <td>{inches(readout.faceCoverage.right)}</td>
              </tr>
              <tr>
                <th scope="row">Face coverage, top</th>
                <td>{inches(readout.faceCoverage.top)}</td>
              </tr>
              <tr>
                <th scope="row">Face coverage, bottom full width</th>
                <td>{inches(readout.faceCoverage.bottomFullWidth)}</td>
              </tr>
              <tr>
                <th scope="row">Face coverage, bottom centre</th>
                <td>{inches(readout.faceCoverage.bottomCenter)}</td>
              </tr>
              <tr>
                <th scope="row">Corner clearance</th>
                <td>{inches(readout.cornerClearInches)}</td>
              </tr>
              <tr>
                <th scope="row">Fits the E1 bed, rotated</th>
                <td className={readout.fitsBedRotated ? "fb-yes" : "fb-no"}>
                  {readout.fitsBedRotated ? "Yes" : "No"}
                </td>
              </tr>
              <tr>
                <th scope="row">
                  Under the Pilot ceiling ({PILOT_HEIGHT_CEILING_INCHES.toFixed(3)}&Prime;)
                </th>
                <td className={readout.underPilotCeiling ? "fb-yes" : "fb-no"}>
                  {readout.underPilotCeiling ? "Yes" : "No"}
                </td>
              </tr>
              {/* The OTHER question. "Does it fit the car" is only half the flip
                  gate; the other half is whether the geometry can be written down
                  as a FrameConfig at all. The bench's dials are continuous and the
                  printed product is a lattice, so a geometry can be perfect on
                  paper and unbuildable — and until this row existed, the two
                  looked identical in the readout and on the paper templates. */}
              <tr>
                <th scope="row">Buildable as a frame config</th>
                <td className={refusals.length === 0 ? "fb-yes" : "fb-no"}>
                  {refusals.length === 0 ? "Yes" : "No"}
                </td>
              </tr>
            </tbody>
          </table>

          {refusals.length > 0 && (
            <div className="fb-flags">
              <strong>Not buildable on the lattice</strong>
              <ul>
                {refusals.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="fb-flags" aria-live="polite">
            {readout.flags.length === 0 ? (
              <p className="fb-flag fb-flag-ok">No rule violations. This geometry is clean.</p>
            ) : (
              <ul className="fb-flag-list">
                {readout.flags.map((flag) => (
                  <li key={flag} className="fb-flag fb-flag-warn">
                    {flag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
