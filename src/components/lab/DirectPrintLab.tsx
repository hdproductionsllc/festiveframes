"use client";

import { useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT-PRINT BUILDER — INTERNAL PROTOTYPE (concept review only)
//
// A PARALLEL playground for the planned V2 "direct print" frame: a single
// continuous canvas (no tiles) printed onto a one-piece molded frame of the SAME
// outer dimensions. It shares NOTHING with the live tile builder/store — it's a
// standalone visual mock so we can react to the viral art lanes we workshopped:
//   • Faces (the plate becomes a mouth/eyes)
//   • Optical / tessellation (the premium "whoa" lane)
//   • Upload-your-face / pet (the personalized share-magnet)
//
// Art here is SVG PLACEHOLDER, drawn in code — real illustration is a separate
// art-pipeline dependency. The point is the LAYOUT + concept, not final art.
// ─────────────────────────────────────────────────────────────────────────────

// Frame geometry (≈ inches × 100). Border is wider at the BOTTOM — the "mouth /
// banner" punchline zone we said we'd lean into.
const VB_W = 1288;
const VB_H = 694;
const PLATE = { x: 110, y: 96, w: 1068, h: 408, r: 18 };
const BOTTOM_MID_Y = (PLATE.y + PLATE.h + VB_H) / 2; // center of the wide bottom rail

const INK = "#1e1b17";

interface DesignOpts {
  color: string;
  banner: string;
  photo: string | null;
}

interface Design {
  id: string;
  name: string;
  tag: "Gag" | "Identity" | "Premium" | "Custom";
  blurb: string;
  /** Palette swatches offered for this design. */
  colors: string[];
  /** Layers BEHIND the plate (the ring fill / pattern). */
  bg: (o: DesignOpts) => React.ReactNode;
  /** Layers IN FRONT of the plate (eyes, teeth, banner, photo…). */
  fg: (o: DesignOpts) => React.ReactNode;
}

// ── Shared bits ──────────────────────────────────────────────────────────────

function Plate() {
  return (
    <g>
      <rect x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} rx={PLATE.r} fill="#f6f7f9" stroke={INK} strokeWidth={5} />
      <text x={VB_W / 2} y={PLATE.y + 70} textAnchor="middle" fontSize="46" fontWeight="700" fill="#9aa1ab" letterSpacing="6">MISSOURI</text>
      <text x={VB_W / 2} y={PLATE.y + 250} textAnchor="middle" fontSize="190" fontWeight="800" fill="#2b3a67" letterSpacing="10" fontFamily="Arial, sans-serif">FF1 250</text>
      <text x={VB_W / 2} y={PLATE.y + PLATE.h - 26} textAnchor="middle" fontSize="34" fontWeight="700" fill="#9aa1ab" letterSpacing="3">SHOW-ME STATE</text>
    </g>
  );
}

function Banner({ text, color = "#fff", weight = 800 }: { text: string; color?: string; weight?: number }) {
  if (!text) return null;
  return (
    <text x={VB_W / 2} y={BOTTOM_MID_Y + 26} textAnchor="middle" fontSize="78" fontWeight={weight} fill={color}
      style={{ fontFamily: "'Fredoka', 'Arial Black', sans-serif" }} letterSpacing="1">
      {text.toUpperCase()}
    </text>
  );
}

function teeth(yEdge: number, pointDown: boolean, count = 9) {
  const span = PLATE.w - 40;
  const step = span / count;
  const h = 46;
  return Array.from({ length: count }, (_, i) => {
    const x = PLATE.x + 20 + i * step;
    const tip = pointDown ? yEdge + h : yEdge - h;
    return <polygon key={i} points={`${x},${yEdge} ${x + step},${yEdge} ${x + step / 2},${tip}`} fill="#fff" stroke={INK} strokeWidth={3} />;
  });
}

function Eye(cx: number, cy: number, r: number, look = 0.35) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth={5} />
      <circle cx={cx + r * look} cy={cy + r * 0.2} r={r * 0.45} fill={INK} />
      <circle cx={cx + r * look + r * 0.15} cy={cy + r * 0.2 - r * 0.15} r={r * 0.12} fill="#fff" />
    </g>
  );
}

// ── The catalog (placeholder art) ────────────────────────────────────────────

const DESIGNS: Design[] = [
  {
    id: "chomp",
    name: "CHOMP",
    tag: "Gag",
    blurb: "A goofy monster — the plate is its toothy mouth. The flagship 'haha'.",
    colors: ["#7cc242", "#ed5aa0", "#3fb0e6", "#f8c53b"],
    bg: ({ color }) => <rect x={0} y={0} width={VB_W} height={VB_H} rx={34} fill={color} />,
    fg: ({ banner }) => (
      <g>
        {teeth(PLATE.y, true)}
        {teeth(PLATE.y + PLATE.h, false)}
        {Eye(330, 70, 78)}
        {Eye(VB_W - 330, 70, 78)}
        {/* tongue on the wide bottom rail */}
        <ellipse cx={VB_W / 2} cy={VB_H - 30} rx={300} ry={120} fill="#ff5d8f" stroke={INK} strokeWidth={4} />
        <Banner text={banner} color={INK} />
      </g>
    ),
  },
  {
    id: "screamer",
    name: "SCREAMER",
    tag: "Gag",
    blurb: "Munch-style panic face, plate = the open mouth. For the tailgater behind you.",
    colors: ["#f2e3c4", "#ffd27a", "#d6e6f2"],
    bg: ({ color }) => <rect x={0} y={0} width={VB_W} height={VB_H} rx={34} fill={color} />,
    fg: ({ banner }) => (
      <g>
        {/* wavy hands on the side rails */}
        <path d={`M70,${PLATE.y + 40} q-30,150 0,300`} fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" />
        <path d={`M${VB_W - 70},${PLATE.y + 40} q30,150 0,300`} fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" />
        {Eye(360, 60, 52, 0)}
        {Eye(VB_W - 360, 60, 52, 0)}
        {/* dark "open mouth" ring hugging the plate */}
        <rect x={PLATE.x - 14} y={PLATE.y - 14} width={PLATE.w + 28} height={PLATE.h + 28} rx={PLATE.r + 10} fill="none" stroke={INK} strokeWidth={16} opacity={0.55} />
        <Banner text={banner} color={INK} />
      </g>
    ),
  },
  {
    id: "stars",
    name: "STARS & STRIPES",
    tag: "Identity",
    blurb: "Continuous patriotic wrap (no tile seams) — the brand, direct-printed.",
    colors: ["#1b2a4a", "#c8102e"],
    bg: ({ color }) => (
      <g>
        <rect x={0} y={0} width={VB_W} height={VB_H} rx={34} fill={color} />
        {/* stripes on the wide bottom rail */}
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={0} y={PLATE.y + PLATE.h + i * 32} width={VB_W} height={16} fill={i % 2 ? "#c8102e" : "#fff"} opacity={0.85} />
        ))}
        {/* scattered stars in the top + side rails */}
        {[[180, 48], [430, 40], [860, 40], [1110, 48], [60, 300], [VB_W - 60, 300]].map(([x, y], i) => (
          <Star key={i} cx={x} cy={y} r={26} />
        ))}
      </g>
    ),
    fg: ({ banner }) => <Banner text={banner} color="#fff" />,
  },
  {
    id: "ripple",
    name: "RIPTIDE",
    tag: "Premium",
    blurb: "Op-art that shimmers at speed. The 'whoa, sick' lane for design nerds.",
    colors: ["#1e1b17", "#2b3a67", "#7a3cbd"],
    bg: ({ color }) => (
      <g>
        <rect x={0} y={0} width={VB_W} height={VB_H} rx={34} fill={color} />
        {Array.from({ length: 26 }, (_, i) => (
          <rect key={i} x={i * 52 - 10} y={0} width={22} height={VB_H} fill="#f8c53b" opacity={i % 2 ? 0.0 : 0.5} transform={`skewX(-18)`} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={`o${i}`} cx={VB_W / 2} cy={VB_H / 2} rx={120 + i * 90} ry={70 + i * 46} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.18} />
        ))}
      </g>
    ),
    fg: ({ banner }) => <Banner text={banner} color="#f8c53b" />,
  },
  {
    id: "you",
    name: "YOU, FRAMED",
    tag: "Custom",
    blurb: "Upload a selfie or your pet → it becomes the character (per-order UV print).",
    colors: ["#3fb0e6", "#f8c53b", "#ed5aa0"],
    bg: ({ color }) => <rect x={0} y={0} width={VB_W} height={VB_H} rx={34} fill={color} />,
    fg: ({ banner, photo }) => (
      <g>
        <defs>
          <clipPath id="headclip"><circle cx={VB_W / 2} cy={70} r={92} /></clipPath>
        </defs>
        {photo ? (
          <>
            <image href={photo} x={VB_W / 2 - 92} y={-22} width={184} height={184} preserveAspectRatio="xMidYMid slice" clipPath="url(#headclip)" />
            <circle cx={VB_W / 2} cy={70} r={92} fill="none" stroke={INK} strokeWidth={6} />
          </>
        ) : (
          <>
            <circle cx={VB_W / 2} cy={70} r={92} fill="#ffffff" stroke={INK} strokeWidth={6} strokeDasharray="10 10" />
            <text x={VB_W / 2} y={64} textAnchor="middle" fontSize="34" fontWeight="700" fill="#9aa1ab">UPLOAD</text>
            <text x={VB_W / 2} y={100} textAnchor="middle" fontSize="28" fontWeight="700" fill="#9aa1ab">A PHOTO</text>
          </>
        )}
        <Banner text={banner} color={INK} />
      </g>
    ),
  },
];

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    return `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
  }).join(" ");
  return <polygon points={pts} fill="#fff" opacity={0.9} />;
}

export function DirectPrintLab() {
  const [designId, setDesignId] = useState(DESIGNS[0].id);
  const design = DESIGNS.find((d) => d.id === designId)!;
  const [color, setColor] = useState(design.colors[0]);
  const [banner, setBanner] = useState("LET FREEDOM RING");
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (d: Design) => {
    setDesignId(d.id);
    setColor(d.colors[0]);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(typeof r.result === "string" ? r.result : null);
    r.readAsDataURL(f);
  };

  const opts: DesignOpts = { color, banner, photo };

  return (
    <div className="min-h-screen bg-[#13110e] text-[#faf0d6]">
      {/* Prototype banner */}
      <div className="border-b-2 border-[#f8c53b]/40 bg-[#f8c53b]/10 px-4 py-2 text-center text-sm font-bold text-[#f8c53b]">
        🧪 DIRECT-PRINT BUILDER — INTERNAL PROTOTYPE · concept review only · not customer-facing · art is placeholder
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 p-5 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Canvas */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#1c1915] p-4">
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" style={{ filter: "drop-shadow(10px 10px 0 rgba(0,0,0,0.5))" }}>
              {design.bg(opts)}
              <Plate />
              {design.fg(opts)}
              {/* subtle outer frame edge */}
              <rect x={2.5} y={2.5} width={VB_W - 5} height={VB_H - 5} rx={32} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={5} />
            </svg>
          </div>
          <p className="text-center text-sm text-white/55">
            One continuous canvas wrapping the plate · wider bottom = the “mouth / banner” zone · same outer size as the tiled frame
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#f8c53b]">Design</h2>
            <div className="grid grid-cols-1 gap-2">
              {DESIGNS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => pick(d)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    d.id === designId ? "border-[#f8c53b] bg-[#f8c53b]/10" : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold">{d.name}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">{d.tag}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-white/55">{d.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#f8c53b]">Color</h2>
            <div className="flex gap-2">
              {design.colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`color ${c}`}
                  className={`h-9 w-9 rounded-full border-2 ${color === c ? "border-[#f8c53b]" : "border-white/20"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Banner text */}
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#f8c53b]">Bottom banner</h2>
            <input
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              maxLength={22}
              placeholder="Your phrase…"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-[#faf0d6] placeholder:text-white/30 focus:border-[#f8c53b] focus:outline-none"
            />
          </div>

          {/* Upload (for YOU, FRAMED) */}
          {design.id === "you" && (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#f8c53b]">Your photo</h2>
              <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="rounded-lg border-2 border-[#3fb0e6] bg-[#3fb0e6]/15 px-4 py-2 text-sm font-bold text-[#3fb0e6]">
                  {photo ? "Change photo" : "Upload a selfie / pet"}
                </button>
                {photo && (
                  <button onClick={() => setPhoto(null)} className="rounded-lg border-2 border-white/15 px-4 py-2 text-sm font-bold text-white/70">
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-white/45">Prototype mock — real version AI-cartoonizes it and wraps the plate.</p>
            </div>
          )}

          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-[12px] leading-relaxed text-white/55">
            <strong className="text-white/75">Why this matters:</strong> one molded blank → cheap fixed catalog (volume) + per-order UV print (custom). The moat is the art library. This mock is for reacting to the concept, not final designs.
          </p>
        </div>
      </div>
    </div>
  );
}
