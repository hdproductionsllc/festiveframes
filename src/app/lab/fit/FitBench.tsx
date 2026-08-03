"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeFit, outlineParts } from "@/lib/fit/geometry";
import {
  CANDIDATE_SPEC,
  MO_DATE_LINE_INCHES,
  PILOT_HEIGHT_CEILING_INCHES,
  PLATE,
  PRESETS,
  STICKER_ZONE_INCHES,
  specFromQuery,
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
const DEFAULT_KEYSTONE: KeystoneSpec = {
  riseInches: 0.55,
  baseInches: 6,
  topInches: 5,
  cornerRadiusInches: 0.25,
};

const inches = (n: number) => `${n.toFixed(3)}"`;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Snap to the dial's step so the URL never carries floating-point dust. */
function quantise(n: number, step: number): number {
  const snapped = Math.round(n / step) * step;
  return Number(snapped.toFixed(4));
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
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n)) onChange(n);
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
          onChange={(e) => onChange(quantise(Number(e.target.value), step))}
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
            const n = Number(draft);
            const next = Number.isFinite(n) && draft.trim() !== "" ? clamp(quantise(n, step), min, max) : value;
            setDraft(String(next));
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}

// ─── The drawing ─────────────────────────────────────────────────────────────

function partBounds(parts: FitPart[]) {
  // Annotated as number: PLATE is `as const`, so its members are literal types
  // and an inferred `let` would refuse every widening assignment below.
  let minX: number = 0;
  let minY: number = 0;
  let maxX: number = PLATE.widthInches;
  let maxY: number = PLATE.heightInches;
  for (const part of parts) {
    if (part.rect) {
      minX = Math.min(minX, part.rect.x);
      minY = Math.min(minY, part.rect.y);
      maxX = Math.max(maxX, part.rect.x + part.rect.w);
      maxY = Math.max(maxY, part.rect.y + part.rect.h);
    }
    if (part.polygon) {
      for (const pt of part.polygon) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function FrontView({ parts, widthLabel, heightLabel, dropLabel }: {
  parts: FitPart[];
  widthLabel: string;
  heightLabel: string;
  dropLabel: string;
}) {
  const b = partBounds(parts);
  const viewX = (b.minX - PAD_INCHES) * SCALE;
  const viewY = (b.minY - PAD_INCHES) * SCALE;
  const viewW = (b.maxX - b.minX + PAD_INCHES * 2) * SCALE;
  const viewH = (b.maxY - b.minY + PAD_INCHES * 2) * SCALE;

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

  const dimTop = (b.minY - 0.42) * SCALE;
  const dimLeft = (b.minX - 0.42) * SCALE;
  const dimBottom = (b.maxY + 0.5) * SCALE;

  return (
    <svg
      className="fb-svg"
      viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
      role="img"
      aria-label="Front view of the frame over a 12 by 6 inch plate"
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
            x={part.rect.x * SCALE}
            y={part.rect.y * SCALE}
            width={part.rect.w * SCALE}
            height={part.rect.h * SCALE}
            fill="rgba(32,36,42,0.74)"
            stroke="#14171b"
            strokeWidth={1.25}
          >
            <title>{part.label}</title>
          </rect>
        ) : part.polygon ? (
          <polygon
            key={part.id}
            points={part.polygon.map((pt) => `${pt.x * SCALE},${pt.y * SCALE}`).join(" ")}
            fill="rgba(32,36,42,0.74)"
            stroke="#14171b"
            strokeWidth={1.25}
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
          x={c.x * SCALE}
          y={c.y * SCALE}
          width={zone * SCALE}
          height={zone * SCALE}
          fill="none"
          stroke="#c1852b"
          strokeWidth={1.25}
          strokeDasharray="5 4"
        />
      ))}
      <line
        x1={0}
        y1={dateY * SCALE}
        x2={plateW * SCALE}
        y2={dateY * SCALE}
        stroke="#c1852b"
        strokeWidth={1.25}
        strokeDasharray="5 4"
      />
      <text
        className="fb-svg-note"
        x={(zone + 0.2) * SCALE}
        y={(dateY - 0.13) * SCALE}
        fontSize={10}
      >
        MO date line
      </text>

      {/* Dimensions. */}
      <line x1={b.minX * SCALE} y1={dimTop} x2={b.maxX * SCALE} y2={dimTop} stroke="#5a5a54" strokeWidth={1} />
      <line x1={b.minX * SCALE} y1={dimTop - 5} x2={b.minX * SCALE} y2={dimTop + 5} stroke="#5a5a54" strokeWidth={1} />
      <line x1={b.maxX * SCALE} y1={dimTop - 5} x2={b.maxX * SCALE} y2={dimTop + 5} stroke="#5a5a54" strokeWidth={1} />
      <text
        className="fb-svg-dim"
        x={((b.minX + b.maxX) / 2) * SCALE}
        y={dimTop - 9}
        fontSize={12}
        textAnchor="middle"
      >
        {widthLabel}
      </text>

      <line x1={dimLeft} y1={b.minY * SCALE} x2={dimLeft} y2={b.maxY * SCALE} stroke="#5a5a54" strokeWidth={1} />
      <line x1={dimLeft - 5} y1={b.minY * SCALE} x2={dimLeft + 5} y2={b.minY * SCALE} stroke="#5a5a54" strokeWidth={1} />
      <line x1={dimLeft - 5} y1={b.maxY * SCALE} x2={dimLeft + 5} y2={b.maxY * SCALE} stroke="#5a5a54" strokeWidth={1} />
      <text
        className="fb-svg-dim"
        x={dimLeft - 9}
        y={((b.minY + b.maxY) / 2) * SCALE}
        fontSize={12}
        textAnchor="middle"
        transform={`rotate(-90 ${dimLeft - 9} ${((b.minY + b.maxY) / 2) * SCALE})`}
      >
        {heightLabel}
      </text>

      <line
        x1={(plateW / 2) * SCALE}
        y1={plateH * SCALE}
        x2={(plateW / 2) * SCALE}
        y2={dimBottom - 12}
        stroke="#5a5a54"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <text
        className="fb-svg-dim"
        x={(plateW / 2) * SCALE}
        y={dimBottom}
        fontSize={12}
        textAnchor="middle"
      >
        {dropLabel}
      </text>
    </svg>
  );
}

// ─── The bench itself ────────────────────────────────────────────────────────

export function FitBench() {
  // SSR renders the default spec; the URL is read after mount so the server and
  // the first client render agree. Without that guard a link-borne spec is a
  // hydration mismatch every time.
  const [spec, setSpec] = useState<FitSpec>(CANDIDATE_SPEC);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (Array.from(q.keys()).length > 0) setSpec(specFromQuery(q));
    setHydrated(true);
  }, []);

  // The URL IS the document. replaceState rather than push so the back button
  // still leaves the page instead of walking back through every slider tick.
  useEffect(() => {
    if (!hydrated) return;
    const query = specToQuery(spec);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
  }, [spec, hydrated]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const set = useCallback(<K extends keyof FitSpec>(key: K, value: FitSpec[K]) => {
    setSpec((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setKeystone = useCallback((key: keyof KeystoneSpec, value: number) => {
    setSpec((prev) => ({
      ...prev,
      keystone: { ...(prev.keystone ?? DEFAULT_KEYSTONE), [key]: value },
    }));
  }, []);

  const readout = useMemo(() => computeFit(spec), [spec]);
  const parts = useMemo(() => outlineParts(spec), [spec]);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${specToQuery(spec)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const specMatchesPreset = (candidate: FitSpec) =>
    specToQuery(candidate) === specToQuery(spec);

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
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`fb-preset${specMatchesPreset(p.spec) ? " is-on" : ""}`}
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
              hint="in. Bill's sleds read 1.000; the July files were 0.991."
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
              hint="in. July sat at 0.469, the most ever shown to fit a car."
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
              hint="in. Past 0.750 it starts covering the embossed characters."
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
                  hint="in."
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
            <a className="fb-action fb-action-link" href={`/lab/fit/print?${specToQuery(spec)}`}>
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
              Light rectangle is the 12 x 6 plate. Dashed squares are the registration sticker
              zones, dashed line is the Missouri date line. Dark shapes are frame parts, drawn
              semi-opaque so plate coverage is visible.
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
            </tbody>
          </table>

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
