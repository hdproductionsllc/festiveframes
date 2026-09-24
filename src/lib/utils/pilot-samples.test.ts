import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, isAbsolute, join } from "node:path";
import sharp from "sharp";
import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";
import { chipPiece, schoolPlatePhoto, type SchoolKit } from "@/data/school-kits";
import { pilotSchoolKits } from "@/data/school-pilot";
import { schoolStoreOptions } from "@/data/school-store";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { getPreset, layPreset, sideColumn, type SchoolPreset } from "@/data/school-presets";
import { bannerTagline, type BannerLineId } from "@/data/frame-buyers";
import { getActivity, hasJerseyNumber } from "@/data/activities";
import { kitMarkIds, kitMarkPieces } from "@/data/sets/school-marks";
import { getPiece } from "@/data/sets";
import { createDesignStore } from "@/stores/design-store";
import { writePersonOnBanner } from "@/lib/utils/school-banner";
import {
  SCHOOL_PRINT_DPI,
  drawSchoolFrame,
  schoolCanvasSize,
  schoolDesignOf,
  type SchoolDesign,
  type SchoolImageBundle,
} from "@/lib/utils/compose-school-frame";
import { registerNodeFonts } from "@/lib/utils/node-fonts";
import { getPlateArea } from "@/lib/utils/layout";
import { isMultiCell, placementContext, resolveTapDrop } from "@/lib/utils/snappet";
import { thinKitFromRoster } from "@/data/thin-kit";
import { artFieldCollision, ART_FIELD_COLLISION_MAX, badgeArtworkUrls } from "@/lib/utils/tile-theme";

// ─── THE PILOT SAMPLE SET: six finished frames per pilot school ──────────────
//
// What Bill shows a PTO, in the order he pitches it (see PLAN below). Each frame
// is produced the way a PARENT produces it in /s/<slug>: a real design store
// built with the options `SchoolBuilder` passes, then the builder's own one-tap
// path — `layPreset` with the school's marks, tap-to-place (`placeTile`) for the
// mixed sports frame, and the banner line written through the builder's own
// `writePersonOnBanner`. Nothing here types a banner line the builder would not.
//
//   PILOT_SAMPLES_DIR="C:\...\samples" npx vitest run src/lib/utils/pilot-samples.test.ts
//
// Unset, the whole file is a no-op, so CI renders nothing. The directory's old
// renders are cleared first, so a sheet never mixes two runs.
//
// Writes, per school:
//   <dir>/<slug>/<n>-<design>.png        the PRODUCTION export (300 DPI, 15.5 x 6.75):
//                                        plate opening back-filled, exactly as printed
//   <dir>/<slug>/<n>-<design>-web.png    1600 px wide PREVIEW: a plate in the window
//   <dir>/<slug>/contact-sheet.png       the six previews, 3 x 2, captioned
// and once:
//   <dir>/overview.png                   every school's frame 1, 3 x 2
//   <dir>/any-school/yearbook*.png       a yearbook frame on the neutral stock kit
//   <dir>/manifest.tsv                   every frame's words, badges and sourcing
//
// Why two renders: the print path fills the plate opening with body colour (the
// customer's own plate covers it), so on a sales sheet the frame read as a big
// coloured sign. The preview draws the plate FIRST, at the rect the builder uses
// (`getPlateArea`), then the unchanged print renderer over it — its back-fill is
// `destination-over`, so it fills only what the plate and the frame left empty.

const OUT = process.env.PILOT_SAMPLES_DIR;
const PUBLIC = join(process.cwd(), "public");
const WEB_WIDTH = 1600;
const CLASS_YEAR = "2027";
const JERSEY = "12";
/** Printed on every sheet: nothing here is confirmed by a school yet. */
const DISCLAIMER = "Demo colours; school marks shown with permission pending";

registerNodeFonts();

// The design store skips persistence when there is no `window` (its storage getter
// throws, on purpose, as it does on the server), and zustand then warns on every
// write. Nothing here is meant to persist, so that one warning is muted — and only
// that one; anything else the store says still reaches the log.
if (OUT) {
  const warn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("[zustand persist middleware]")) return;
    warn(...args);
  };
}

/**
 * BILL'S PITCH ORDER (pilot meeting, 2026-09-23): six frames per school, in the
 * order he walks a PTO through them —
 *
 *   1 School pride   the school's own mascot and a crest; HOME OF THE / MASCOT
 *   2 Sports         the school's big two sports, mixed across the sides, #12
 *   3 Academic/arts  science, orchestra, theatre… — not only sports
 *   4 Niche pride    a program the school is known for (water polo, Scholar Bowl)
 *   5 Proud Parent   Class of 2027
 *   6 Grandparent / Senior   the second buyer and the student's own car
 *
 * Every activity is one the school's OWN kit names (signature or welcome chips),
 * so a sheet never shows a programme its data does not back — except where the
 * meeting named it (Marquette's football and girls volleyball), which is said so
 * in `why` and in the manifest so it gets checked before outreach.
 */
interface SchoolPlan {
  /** Two sports, mixed down the sides (A top-left and bottom-right). */
  sports: [string, string];
  academic: string;
  niche: string;
  /** The activity on the Proud Parent frame. */
  parent: string;
  /** The sixth frame's banner line. */
  last: "grandparent" | "senior";
  why: string;
}

const PLAN: Record<string, SchoolPlan> = {
  "marquette-mustangs": {
    sports: ["hs:football-patch", "hs:volleyball-patch"],
    academic: "hs:robotics",
    niche: "hs:ice-hockey",
    parent: "hs:band",
    last: "grandparent",
    why: "sports: football + girls volleyball are FROM THE MEETING BRIEF, not the kit (kit chips/signature name neither) - confirm; robotics, band: chips; ice hockey: signature #1 (\"a cold rink on a Friday night\")",
  },
  "eureka-wildcats": {
    sports: ["hs:volleyball-patch", "hs:cross-country"],
    academic: "hs:orchestra",
    niche: "hs:lacrosse",
    parent: "hs:choir",
    last: "senior",
    why: "volleyball, cross country: signature sports #1/#2 (2018 volleyball title, 2024 girls XC title); orchestra, choir: chips; lacrosse: signature (2024 girls lacrosse title)",
  },
  "lafayette-lancers": {
    sports: ["hs:volleyball-patch", "hs:softball-patch"],
    academic: "hs:marching-band",
    niche: "hs:wrestling",
    parent: "hs:field-hockey",
    last: "grandparent",
    why: "volleyball, softball: signature sports #1/#2; marching band: signature (the Lancer Regiment); wrestling, field hockey: chips",
  },
  "parkway-west-longhorns": {
    sports: ["hs:field-hockey", "hs:cross-country"],
    academic: "hs:drama",
    // Not water polo, though a chip names it: that art's light-blue waves are
    // nearly West's own #5199CD field, so half the badge vanished on the sheet
    // (and the kit no longer seeds it as a signature badge, for the same reason).
    niche: "hs:journalism",
    parent: "hs:band",
    last: "senior",
    why: "field hockey: signature; cross country: chip; theatre: signature + chip; journalism: signature; band: signature + chip. Water polo (chip) is NOT shown: its light-blue wave enamel nearly matches West's field - redraw or darken the waves before showing it",
  },
  "parkway-central-colts": {
    sports: ["hs:soccer-patch", "hs:basketball-patch"],
    academic: "hs:debate",
    niche: "hs:swim-dive",
    // Not journalism: Parkway West's sheet shows it, and two Parkway sheets side by
    // side must not share a frame. Water polo reads well on Central's red.
    parent: "hs:water-polo",
    last: "grandparent",
    why: "soccer: signature; basketball: chip (both numbered, so #12 shows); speech & debate: signature; swim & dive: signature #1; water polo: chip (Scholar Bowl is a chip, but its badge art is withheld - WITHHELD_ART - until redrawn)",
  },
  "ladue-rams": {
    sports: ["hs:football-patch", "hs:track"],
    academic: "hs:band",
    niche: "hs:tennis",
    parent: "hs:swim-dive",
    last: "senior",
    why: "football, track: signature sports (football leads so #12 shows); band: chip (Scholar Bowl leads the welcome copy, but its badge art is withheld - WITHHELD_ART - until redrawn); tennis: signature + chip; swim & dive: chip",
  },
};

/** Every badge a plan names must be one the kit itself backs — signature or a
 *  welcome chip — unless the plan says, in `why`, that it came from the meeting. */
function kitBacks(kit: SchoolKit, id: string): boolean {
  const chips = (kit.welcome?.chips ?? []).map((c) => chipPiece(c));
  return (kit.signature ?? []).includes(id) || chips.includes(id);
}

// ── Samples-only school marks ────────────────────────────────────────────────
//
// The pilot schools' own mascots, prepared for SALES SAMPLES ONLY (Pilot Kit/
// school-brand/<slug>/badge-mascot.png, with sources.md beside each). They must
// not reach the public builder until a school gives written permission, so they
// are NOT kit data: the sample gives each kit a `marks` block in memory, and the
// one flat piece lookup both renderers use learns them for this file alone.
const SAMPLE_MARKS = vi.hoisted(() => new Map<string, import("@/lib/types").TilePiece>());
vi.mock("@/data/sets", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/data/sets")>();
  return { ...real, getPiece: (id: string) => SAMPLE_MARKS.get(id) ?? real.getPiece(id) };
});

const BRAND_DIR = process.env.PILOT_BRAND_DIR ?? (OUT ? join(OUT, "..", "school-brand") : "");

/**
 * Prepared mascots the samples must NOT show yet, slug -> why. Frame 1 then falls
 * back to the crest exactly as the public builder does for a school without
 * marks, and its caption says so rather than promising a mascot.
 */
const HELD_MASCOTS: Record<string, string> = {
  "eureka-wildcats":
    "the wildcat head is visually the Kansas State 'Powercat', a mark K-State licenses actively; a print needs K-State's clearance, not only Eureka's. Ask Eureka whether its use is licensed and whether that licence covers third-party products",
  "parkway-central-colts":
    "the only mark the school publishes is the PARKWAY CENTRAL COLTS wordmark, not a mascot: it repeats the banners (COLTS three times) and fills ~40% of the badge, from a 256px raster. Needs a colt/horse mark or the vector from the school",
};

/** The kit as the sample shows it: its own mascot on, when the file exists and
 *  the mascot is not held. */
function withSampleMascot(kit: SchoolKit): SchoolKit {
  const file = join(BRAND_DIR, kit.slug, "badge-mascot.png");
  if (!BRAND_DIR || !existsSync(file) || HELD_MASCOTS[kit.slug]) return kit;
  const badge = { key: "mascot", name: `${kit.mascot} (sample)`, artworkUrl: file, emoji: "", field: "navy" as const };
  const withMarks: SchoolKit = { ...kit, marks: { ...kit.marks, badges: [badge] } };
  for (const piece of kitMarkPieces(withMarks)) SAMPLE_MARKS.set(piece.id, piece);
  return withMarks;
}

// ── The student photo on the academic frame ─────────────────────────────────
//
// The academic frame (3) also shows the upload feature: one side badge is a
// student photo, placed through the builder's own `placeImageSnappet` exactly as
// a parent's upload is. The photos are GENERATED stand-ins (Pilot Kit/gemini/
// photos, square 1024 crops), not real students, and the caption says so. Each
// school gets the one closer to its academic pick: the cellist on a music frame,
// the student with the beaker everywhere else.
const PHOTOS_DIR = process.env.PILOT_PHOTOS_DIR ?? (OUT ? join(OUT, "..", "gemini", "photos") : "");
const PHOTOS = {
  music: "PICK-cello-boy-1-crop1024.png",
  study: "PICK-chem-girl-1-crop1024.png",
} as const;
const MUSIC = new Set(["hs:orchestra", "hs:band", "hs:marching-band", "hs:jazz-band", "hs:choir"]);
/** Where the photo goes: the left column's middle badge, so the activity badge
 *  still leads in the top corners. */
const PHOTO_AT = { side: "wing-left", index: 1 } as const;

function photoFor(activity: string): string {
  return join(PHOTOS_DIR, MUSIC.has(activity) ? PHOTOS.music : PHOTOS.study);
}

/** Captions a salesperson can read aloud without over-promising. */
const NOTE = {
  pride: "The school's own mascot. Shown with permission pending.",
  prideCrest: "School colours and a crest. The mascot goes on once the school says yes.",
  sports: "Two sports on one frame, and their number.",
  academic: "Clubs, arts and academics, and a photo of their own if they like (sample photo).",
  // Says what the PRODUCT does, not how big the program is: the niche pick is
  // sometimes a title-winner (Eureka lacrosse, Marquette hockey), so "the smaller
  // programs" would be a wrong fact read aloud to the school that won it.
  niche: "Every program gets its badge, not only the headline sports.",
  parent: "One tap: PROUD PARENT. Their activity on the badges.",
  grandparent: "One tap: PROUD GRANDPARENT. Cap and diploma.",
  senior: "One tap: SENIOR. For the student's own car.",
} as const;

/**
 * The neutral stock kit, standing in for "any school". The yearbook frame goes on
 * this rather than on a pilot kit whose own data never mentions a yearbook. Built
 * from the real thin-kit rule (navy, white rim, non-claiming signature), with
 * placeholder words where a school's name would go.
 */
function anySchoolKit(): SchoolKit {
  const base = thinKitFromRoster({
    id: "sample-any-school",
    slug: "any-school",
    name: "Your High School",
    city: "St. Louis",
    state: "MO",
    zip: "",
    type: "PUBLIC",
    population: null,
  });
  return {
    ...base,
    shortName: "Your School",
    mascot: "Mascots",
    city: "St. Louis, MO",
    // The kits' own layout: the school on the top runner, HOME OF THE (the default
    // tagline) over the mascot.
    banners: { ...base.banners, top: "YOUR HIGH SCHOOL", bottom: "YOUR MASCOT", tagline: undefined },
  };
}

// ── The builder, minus React ─────────────────────────────────────────────────

/** The store `SchoolBuilder` creates for a kit page: the builder's own options. */
function storeFor(kit: SchoolKit) {
  return createDesignStore(
    `pilot-sample:${kit.slug}:${Math.random()}`,
    schoolStoreOptions({ kit, variant: SCHOOL_SHIPPING_VARIANT }),
  );
}

type Store = ReturnType<typeof storeFor>;

interface Intake {
  activity?: string;
  year?: string;
  number?: string;
  /** The one-tap banner line; nothing is written when absent (the kit's seed). */
  line?: BannerLineId;
}

/** SchoolDesigner's `applyFramePreset`, with the intake fields as arguments. */
function applyFramePreset(kit: SchoolKit, store: Store, preset: SchoolPreset, intake: Intake) {
  if (preset.needsActivity && !intake.activity) throw new Error(`${preset.id} needs an activity`);
  // The builder's own shared preset layer and mark picker — not copies of them.
  layPreset(store.getState(), preset, intake.activity || null, kitMarkIds(kit));
  // The number is printed only under the "#Number" line, exactly as on screen.
  const tagline = bannerTagline(intake.line, {
    year: intake.year,
    number: intake.line === "number" ? intake.number : undefined,
  });
  writePersonOnBanner(store.getState(), kit, { tagline });
}

/**
 * RailSlot's tap-to-place: a badge armed in the tray, then one tap on a side
 * badge. The frame resolves the footprint (`resolveTapDrop`), so one tap
 * replaces exactly the badge tapped — what a parent does to mix two sports.
 */
function tapPlace(store: Store, slotId: string, pieceId: string) {
  const s = store.getState();
  const drop = resolveTapDrop(
    placementContext(s.frameConfig, { slots: s.slots, sections: s.sections, textBars: s.textBars }),
    slotId,
    getPiece(pieceId),
    s.frameConfig.minTileSpan,
  );
  expect(drop?.valid, `tap on ${slotId} with ${pieceId}`).toBe(true);
  const span = { cols: drop!.cols, rows: drop!.rows };
  s.placeTile(drop!.anchorSlotId ?? slotId, pieceId, pieceId.split(":")[0], isMultiCell(span) ? span : undefined);
}

// ── The six designs ──────────────────────────────────────────────────────────

interface Sample {
  n: number;
  key: string;
  caption: string;
  /** Second, smaller line under the caption: what the salesperson should say. */
  note: string;
  preset: string;
  intake: Intake;
  /** Badges the parent then taps on by hand: [side, position top→bottom, piece]. */
  taps?: Array<["wing-left" | "wing-right", number, string]>;
  /** Badges this frame is ABOUT; each must land. */
  shows: string[];
  /** A photo the parent uploads onto one badge (absolute path). */
  photo?: string;
}

/** What the SCHOOL calls it — its own welcome chip ("Scholar Bowl", "Theatre")
 *  when one names this badge, else the builder's label. */
const labelIn = (kit: SchoolKit, id: string) =>
  (kit.welcome?.chips ?? []).find((c) => chipPiece(c) === id) ?? getActivity(id)?.label ?? id;
const classOf = { line: "class" as const, year: CLASS_YEAR };

function samplesFor(kit: SchoolKit): Sample[] {
  const plan = PLAN[kit.slug];
  if (!plan) throw new Error(`${kit.slug} has no sample plan`);
  const label = (id: string) => labelIn(kit, id);
  const [a, b] = plan.sports;
  // The number rides the sport that has one; lead with it so "#12" is true of
  // the badge in the top corner.
  const numbered = hasJerseyNumber(a) || hasJerseyNumber(b);
  const last = plan.last;
  return [
    {
      n: 1, key: "school-pride", caption: "School pride",
      note: kitMarkIds(kit).mascot ? NOTE.pride : NOTE.prideCrest,
      preset: "school", intake: {}, shows: [kitMarkIds(kit).mascot ?? "hs:crest"],
    },
    {
      n: 2, key: "sports",
      caption: `Sports: ${label(a)} + ${label(b)}${numbered ? `, #${JERSEY}` : ""}`,
      note: NOTE.sports, preset: "athlete",
      intake: numbered ? { activity: a, line: "number", number: JERSEY, year: CLASS_YEAR } : { activity: a, ...classOf },
      // Mixed on the diagonal: A B down the left reads A . B, the right B . A —
      // symmetric across the plate, never the same badge twice in a column.
      taps: [["wing-left", 2, b], ["wing-right", 0, b]],
      shows: [a, b],
    },
    {
      n: 3, key: "academic", caption: `Academics & arts: ${label(plan.academic)}`, note: NOTE.academic,
      preset: "athlete", intake: { activity: plan.academic, ...classOf }, shows: [plan.academic],
      photo: photoFor(plan.academic),
    },
    {
      n: 4, key: "niche", caption: `Niche pride: ${label(plan.niche)}`, note: NOTE.niche,
      preset: "athlete", intake: { activity: plan.niche, ...classOf }, shows: [plan.niche],
    },
    {
      n: 5, key: "proud-parent", caption: `Proud Parent: ${label(plan.parent)}, Class of ${CLASS_YEAR}`,
      note: NOTE.parent, preset: "athlete",
      intake: { activity: plan.parent, line: "parent", year: CLASS_YEAR }, shows: [plan.parent],
    },
    {
      n: 6, key: last === "grandparent" ? "proud-grandparent" : "senior",
      caption: last === "grandparent" ? `Proud Grandparent, Class of ${CLASS_YEAR}` : `Senior, Class of ${CLASS_YEAR}`,
      note: NOTE[last], preset: "graduate", intake: { line: last, year: CLASS_YEAR }, shows: ["hs:diploma-cap"],
    },
  ];
}

/** The design exactly as the on-screen builder holds it, all three brand colours. */
function designOf(store: Store): SchoolDesign {
  // The builder's own picker — the one every export goes through.
  return schoolDesignOf(store.getState());
}

/** Artwork bytes: a stock badge from /public, a samples-only mark from its file. */
async function artBytes(artworkUrl: string): Promise<Buffer> {
  return readFile(isAbsolute(artworkUrl) && existsSync(artworkUrl) ? artworkUrl : join(PUBLIC, artworkUrl));
}

async function bundleFor(design: SchoolDesign): Promise<SchoolImageBundle> {
  const pieces = new Map<string, Image>();
  const snappets = new Map<string, Image>();
  for (const [slotId, tile] of Object.entries(design.slots)) {
    // An uploaded photo: keyed by its anchor slot, as the builder's loader does.
    if (tile.image) {
      snappets.set(slotId, await loadImage(await artBytes(tile.image.url)));
      continue;
    }
    const piece = getPiece(tile.pieceId);
    if (!piece?.artworkUrl) throw new Error(`no artwork for ${tile.pieceId}`);
    for (const url of badgeArtworkUrls(piece)) {
      if (!pieces.has(url)) pieces.set(url, await loadImage(await artBytes(url)));
    }
  }
  return {
    plate: null,
    pieces: pieces as SchoolImageBundle["pieces"],
    snappets: snappets as SchoolImageBundle["snappets"],
    sections: new Map(),
    qr: null,
    logos: new Map(),
  };
}

/**
 * The plate in the preview window: exactly the one the builder shows —
 * `schoolPlatePhoto`, the kit's own vanity plate (Ladue's RAMS) or the school
 * stock plate (a real Missouri plate, number privacy-blurred). One rule, so a
 * sample can never show a plate the builder does not.
 */
async function platePhotoFor(kit: SchoolKit, design: SchoolDesign): Promise<Image> {
  const src = schoolPlatePhoto(kit, design.plateState);
  if (!src) throw new Error(`${kit.slug}: no school plate for ${design.plateState}`);
  return loadImage(await readFile(join(PUBLIC, src)));
}

/** Draw `img` to cover the rect, centred — `object-fit: cover`, which is what the
 *  builder's plate display asks for (plate-images.ts, scale 1). */
function drawCover(ctx: CanvasRenderingContext2D, img: Image, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img as unknown as CanvasImageSource, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/**
 * Render the frame. With `plate`, it is the sales PREVIEW: the plate is drawn first
 * at the builder's plate rect and the print renderer paints over it untouched —
 * its back-fill composites `destination-over`, so the plate survives exactly where
 * the frame leaves the window open. Without, it is the production export.
 */
async function render(design: SchoolDesign, plate: Image | null = null): Promise<Buffer> {
  const { width, height } = schoolCanvasSize(design.frameConfig, SCHOOL_PRINT_DPI);
  const canvas = createCanvas(width, height);
  if (plate) {
    const r = getPlateArea(design.frameConfig, width);
    drawCover(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, plate, r.x, r.y, r.width, r.height);
  }
  drawSchoolFrame(
    canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
    design,
    await bundleFor(design),
    width,
  );
  return canvas.toBuffer("image/png");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Cell {
  png: Buffer;
  caption: string;
  note: string;
}

/** 3 x 2, light card background, a caption and a spoken note under each frame,
 *  the disclaimer in the header AND the footer so a cropped screenshot keeps it. */
async function sheet(title: string, subtitle: string, cells: Cell[]): Promise<Buffer> {
  const cols = 3;
  const cellW = 1000;
  const meta = await sharp(cells[0].png).metadata();
  const cellH = Math.round((cellW * meta.height!) / meta.width!);
  const pad = 44;
  const capH = 96;
  const titleH = 112;
  const footH = 56;
  const rows = Math.ceil(cells.length / cols);
  const W = pad * (cols + 1) + cellW * cols;
  const H = titleH + pad + (cellH + capH + pad) * rows + footH;
  const composites: sharp.OverlayOptions[] = [];
  const font = `font-family="Arial, Helvetica, sans-serif"`;
  const text: string[] = [
    `<text x="${pad}" y="70" ${font} font-size="44" font-weight="700" fill="#1E1B17">${esc(title)}</text>`,
    `<text x="${W - pad}" y="58" text-anchor="end" ${font} font-size="26" fill="#6B645A">${esc(subtitle)}</text>`,
    `<text x="${W - pad}" y="94" text-anchor="end" ${font} font-size="24" font-weight="600" fill="#8A3B12">${esc(DISCLAIMER)}</text>`,
    `<text x="${W / 2}" y="${H - 22}" text-anchor="middle" ${font} font-size="22" fill="#6B645A">${esc(DISCLAIMER)} · plate shown for scale</text>`,
  ];
  for (const [i, cell] of cells.entries()) {
    const x = pad + (i % cols) * (cellW + pad);
    const y = titleH + pad + Math.floor(i / cols) * (cellH + capH + pad);
    composites.push({ input: await sharp(cell.png).resize(cellW).png().toBuffer(), left: x, top: y });
    text.push(
      `<text x="${x + cellW / 2}" y="${y + cellH + 42}" text-anchor="middle" ${font} font-size="29" font-weight="600" fill="#1E1B17">${esc(cell.caption)}</text>`,
      `<text x="${x + cellW / 2}" y="${y + cellH + 78}" text-anchor="middle" ${font} font-size="22" fill="#6B645A">${esc(cell.note)}</text>`,
    );
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${text.join("")}</svg>`);
  return sharp({ create: { width: W, height: H, channels: 4, background: "#F4F1EA" } })
    .composite([...composites, { input: svg, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

function badgeList(design: SchoolDesign): string {
  return Object.entries(design.slots)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, t]) => `${slot}=${t.pieceId}`)
    .join(", ");
}

/** The badges down one side, top to bottom, as the frame declares its positions. */
function column(design: SchoolDesign, side: "wing-left" | "wing-right"): string[] {
  return sideColumn(design.frameConfig, side).map(({ slot }) => design.slots[slot]?.pieceId ?? "");
}

/** Build one design the builder's way and write its production file and preview. */
async function renderSample(
  kit: SchoolKit,
  sample: Pick<Sample, "preset" | "intake" | "taps" | "photo">,
  dir: string,
  base: string,
): Promise<{ design: SchoolDesign; preview: Buffer }> {
  const { config, presets } = schoolVariant(SCHOOL_SHIPPING_VARIANT);
  const preset = getPreset(sample.preset, presets);
  expect(preset, sample.preset).toBeDefined();
  const store = storeFor(kit);
  applyFramePreset(kit, store, preset!, sample.intake);
  for (const [side, i, piece] of sample.taps ?? []) tapPlace(store, sideColumn(config, side)[i].slot, piece);
  if (sample.photo) {
    // The upload path: the crop is already the badge's square, so the parent's
    // pick names exactly this badge (`at`), as the upload commit does.
    expect(existsSync(sample.photo), `${kit.slug} ${base}: photo ${sample.photo}`).toBe(true);
    const at = sideColumn(config, PHOTO_AT.side)[PHOTO_AT.index];
    store.getState().placeImageSnappet(
      PHOTO_AT.side,
      { imageUrl: sample.photo, sourceAspect: 1 },
      config.minTileSpan,
      { anchorSlotId: at.slot, span: at.span },
    );
    expect(store.getState().slots[at.slot]?.image?.url, `${kit.slug} ${base}: photo seated`).toBe(sample.photo);
  }
  const design = designOf(store);

  // Three SQUARE badges down each side, every one at a position the frame declares.
  for (const side of ["wing-left", "wing-right"] as const) {
    const run = column(design, side);
    expect(run.every(Boolean), `${kit.slug} ${base}: ${side} has an empty position`).toBe(true);
    // Rule 1 of the presets: never the same badge twice in a row.
    run.forEach((p, i) => expect(p === run[i + 1], `${kit.slug} ${base}: ${side} repeats ${p}`).toBe(false));
    for (const { slot, span } of sideColumn(config, side)) {
      expect(design.slots[slot]?.span ?? span, `${kit.slug} ${base}: ${slot} span`).toEqual(span);
    }
  }
  expect(Object.keys(design.slots).length, `${kit.slug} ${base}: badge count`).toBe(6);
  // The badge field is the banner colour.
  expect(design.tileFieldColor).toBe(design.frameColor);

  // Declared at 300 DPI, so it imports at 15.5 x 6.75 in. Canvas writes 72, which
  // declares the same pixels as 64.6 x 28.1 in — and a file that imports at the
  // wrong size is the invitation to stretch it that the project forbids.
  const print = await sharp(await render(design)).withMetadata({ density: SCHOOL_PRINT_DPI }).png().toBuffer();
  expect((await sharp(print).metadata()).density, `${base}: print DPI`).toBe(SCHOOL_PRINT_DPI);
  writeFileSync(join(dir, `${base}.png`), print);
  const preview = await render(design, await platePhotoFor(kit, design));
  writeFileSync(join(dir, `${base}-web.png`), await sharp(preview).resize(WEB_WIDTH).png().toBuffer());
  return { design, preview };
}

describe("pilot sample set", () => {
  it.skipIf(!OUT)("renders Bill's six frames per pilot school to PILOT_SAMPLES_DIR", async () => {
    // Clear the previous run: a stale file beside a new one is a sheet that lies.
    mkdirSync(OUT!, { recursive: true });
    for (const entry of readdirSync(OUT!)) rmSync(join(OUT!, entry), { recursive: true, force: true });

    const manifest: string[] = [];
    const overview: Cell[] = [];
    for (const authored of pilotSchoolKits()) {
      const kit = withSampleMascot(authored);
      const marks = kitMarkIds(kit);
      // Every school shows its mascot unless it is HELD, and says why.
      if (HELD_MASCOTS[kit.slug]) expect(marks.mascot, `${kit.slug}: held mascot shown`).toBeNull();
      else expect(marks.mascot, `${kit.slug}: no samples-only mascot in ${BRAND_DIR}`).not.toBeNull();
      // A mascot filled with the badge's own colour reads as a hollow outline.
      // Measured, on the field it will actually sit on: a mark over the line gets
      // its own card (scripts/card-mark.mjs), never a renderer override.
      if (marks.mascot) {
        const art = await loadImage(await artBytes(getPiece(marks.mascot!)!.artworkUrl));
        const cv = createCanvas(128, 128);
        cv.getContext("2d").drawImage(art, 0, 0, 128, 128);
        const lost = artFieldCollision(cv.getContext("2d").getImageData(0, 0, 128, 128).data, kit.colors.tileField ?? kit.colors.frame);
        expect(lost, `${kit.slug}: mascot vanishes into its field — card it`).toBeLessThanOrEqual(ART_FIELD_COLLISION_MAX);
      }

      const plan = PLAN[kit.slug];
      for (const id of [...plan.sports, plan.academic, plan.niche, plan.parent]) {
        expect(getPiece(id), `${kit.slug}: ${id} has no badge`).toBeDefined();
        if (!kitBacks(kit, id)) {
          expect(plan.why, `${kit.slug}: ${id} is not backed by the kit and the plan does not say why`).toMatch(/MEETING/);
        }
      }
      expect(getActivity(plan.academic)?.group, `${kit.slug}: academic pick is a sport`).not.toBe("Sports");

      const dir = join(OUT!, kit.slug);
      mkdirSync(dir, { recursive: true });
      const cells: Cell[] = [];
      for (const sample of samplesFor(kit)) {
        const base = `${sample.n}-${sample.key}`;
        const { design, preview } = await renderSample(kit, sample, dir, base);

        const top = design.sections.top?.text?.text ?? "";
        const bottom = design.sections.bottom?.text?.text ?? "";
        const tagline = design.sections.bottom?.text?.tagline ?? "";
        const pieces = Object.values(design.slots).map((t) => t.pieceId);
        for (const id of sample.shows) expect(pieces, `${kit.slug} ${base}`).toContain(id);
        const photo = Object.values(design.slots).find((t) => t.image)?.image?.url;
        expect(photo, `${kit.slug} ${base}: photo`).toBe(sample.photo);
        // The owner's layout on every frame: the school on the top runner, the
        // mascot on the bottom headline — no student names anywhere.
        expect(top, `${kit.slug} ${base}: top runner`).toBe(kit.banners.top);
        expect(bottom, `${kit.slug} ${base}: headline`).toBe(kit.banners.bottom);
        const want: Record<string, string> = {
          "school-pride": "HOME OF THE",
          sports: `#${JERSEY} · CLASS OF ${CLASS_YEAR}`,
          academic: `CLASS OF ${CLASS_YEAR}`,
          niche: `CLASS OF ${CLASS_YEAR}`,
          "proud-parent": `PROUD PARENT · ${CLASS_YEAR}`,
          "proud-grandparent": `PROUD GRANDPARENT · ${CLASS_YEAR}`,
          senior: `SENIOR · CLASS OF ${CLASS_YEAR}`,
        };
        expect(tagline, `${kit.slug} ${base}: tagline`).toBe(want[sample.key]);
        if (sample.key === "school-pride") expect(pieces).toContain(marks.mascot ?? "hs:crest");

        const cell = { png: preview, caption: `${sample.n}. ${sample.caption}`, note: sample.note };
        cells.push(cell);
        if (sample.n === 1) overview.push({ ...cell, caption: `${kit.schoolName}`, note: `${kit.mascot} · ${kit.city}` });
        manifest.push(
          `${kit.slug}\t${base}\ttop="${top}"\tbottom="${bottom}"\ttagline="${tagline}"\t` +
            `L=${column(design, "wing-left").join("/")}\tR=${column(design, "wing-right").join("/")}\t${badgeList(design)}` +
            (photo ? `\tphoto=${basename(photo)} (generated stand-in, not a real student)` : ""),
        );
      }
      writeFileSync(
        join(dir, "contact-sheet.png"),
        await sheet(`${kit.schoolName} ${kit.mascot}`, "MySchoolFrame pilot samples · 15.5 x 6.75 in", cells),
      );
      manifest.push(`${kit.slug}\tsourcing\t${plan.why}`);
      if (HELD_MASCOTS[kit.slug]) manifest.push(`${kit.slug}\tmascot HELD\t${HELD_MASCOTS[kit.slug]}`);
    }
    writeFileSync(
      join(OUT!, "overview.png"),
      await sheet("MySchoolFrame · six pilot schools", "Frame 1, School pride · 15.5 x 6.75 in", overview),
    );

    // Yearbook, which the owner named and no pilot kit's own data backs: shown once,
    // on the neutral stock kit, rather than forced onto a school.
    const any = anySchoolKit();
    const anyDir = join(OUT!, "any-school");
    mkdirSync(anyDir, { recursive: true });
    const { design } = await renderSample(
      any,
      { preset: "athlete", intake: { activity: "hs:yearbook", ...classOf } },
      anyDir,
      "yearbook",
    );
    expect(Object.values(design.slots).map((t) => t.pieceId)).toContain("hs:yearbook");
    manifest.push(
      `any-school\tyearbook\ttop="${design.sections.top?.text?.text ?? ""}"\tbottom="${design.sections.bottom?.text?.text ?? ""}"\ttagline="${design.sections.bottom?.text?.tagline ?? ""}"\t${badgeList(design)}`,
    );

    writeFileSync(join(OUT!, "manifest.tsv"), manifest.join("\n") + "\n");
  }, 900_000);
});
