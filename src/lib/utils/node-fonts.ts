import { GlobalFonts } from "@napi-rs/canvas";
import { join } from "node:path";

// ─── The banner faces, in node ───────────────────────────────────────────────
//
// The print path draws through @napi-rs/canvas, which knows nothing about the
// browser's font loading: an unregistered family silently falls back to a default
// sans and the render still looks plausible. That is worse than a crash — it is a
// render you can look at, believe, and sign off, showing a typeface the product
// never uses. Every school's banner came out in the wrong face exactly once
// before this file existed.
//
// The browser export path (composeSchoolPanels) needs none of this: it runs in a
// document that already has the faces. This is for node renders only — tests, and
// the kit sample harness CLAUDE.md requires before reporting visual work.

const FONT_DIR = join(process.cwd(), "public", "fonts");

/** Family name -> file, for every face the school frame's banners can ask for.
 *  Keep in step with `SCHOOL_HEADLINE_FONT` / `SCHOOL_TAGLINE_FONT` and any face
 *  a kit may name in `fontFamily`. */
const FACES: Array<[family: string, file: string]> = [
  ["Graduate", "graduate.ttf"],
  ["Oswald", "oswald-latin.woff2"],
  ["Stars and Stripes", "stars-and-stripes.ttf"],
  ["Fredoka", "fredoka-latin.woff2"],
  ["Nunito", "nunito-latin.woff2"],
];

let done = false;

/** Register the banner faces with the node canvas. Idempotent. */
export function registerNodeFonts(): void {
  if (done) return;
  for (const [family, file] of FACES) GlobalFonts.registerFromPath(join(FONT_DIR, file), family);
  done = true;
}

/** The families node canvas can actually draw, for a test that wants to assert a
 *  face is present rather than trusting the fallback. */
export function registeredFamilies(): string[] {
  return GlobalFonts.families.map((f) => f.family);
}
