// ─── A small, deliberate HTML scanner ────────────────────────────────────────
//
// No DOMParser (there is no DOM here — this runs in node, in a route handler and
// in vitest), no cheerio, no jsdom, no new dependency at all. What we need from a
// school home page is shallow: the meta block, the <style> blocks, the <img>/<svg>
// in the header, the JSON-LD, and the text of a few headings. A tag scanner does
// that in ~300 lines and cannot be tripped by a page that a real parser would
// refuse outright — and school CMS output is FULL of unclosed <p>, stray `<`, and
// attributes quoted three different ways in the same tag.
//
// It is a scanner, not a parser. It has no tree, so it cannot answer "is this
// inside that" — except that every tag carries the open-element stack that was
// live when it was seen (`ancestors`), which is exactly the one structural
// question this feature asks: "is this <svg> inside .edlio-logo?"

/** One ancestor, flattened to the only three things anything here asks about. */
export interface TagAncestor {
  name: string;
  id: string;
  className: string;
}

export interface ScannedTag {
  /** Lowercased element name. */
  name: string;
  /** Lowercased attribute names → entity-decoded values. Bare attrs map to "". */
  attrs: Record<string, string>;
  /** Byte offset of the opening `<`. */
  start: number;
  /** Byte offset just past the opening tag's `>`. */
  end: number;
  selfClosing: boolean;
  /** Open elements at the moment this tag was seen, outermost first. */
  ancestors: TagAncestor[];
}

/**
 * Elements with no closing tag. If these were pushed onto the ancestor stack, a
 * page with 40 <img> in a gallery would report a 40-deep ancestry and every
 * "is this inside the header" test would come back true.
 */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * Elements whose content is NOT markup. Skipping their bodies is load-bearing: a
 * school page's inline analytics blob is full of `x < y` and `</div>` inside string
 * literals, and treating those as tags produced a scanner that thought the header
 * was still open at the footer.
 */
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);

const ATTR_RE = /([^\s"'>/=]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(src)) !== null) {
    const name = m[1].toLowerCase();
    if (!name || name === "/") continue;
    const raw = m[3] ?? m[4] ?? m[5] ?? "";
    // First wins. Duplicated attributes are a copy-paste artefact and the browser
    // keeps the first too, so matching that is the least surprising choice.
    if (!(name in attrs)) attrs[name] = decodeEntities(raw);
  }
  return attrs;
}

/** Index of the matching `</name>` at or after `from`, or -1. */
function indexOfClose(html: string, name: string, from: number): number {
  const re = new RegExp(`</${escapeRe(name)}\\s*>`, "i");
  const rest = html.slice(from);
  const m = re.exec(rest);
  return m ? from + m.index : -1;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Walk every tag in the document.
 *
 * `filter` narrows the RESULT, never the walk — the ancestor stack has to be built
 * from the whole document or the ancestry of the tags you asked for is wrong.
 */
export function scanTags(html: string, filter?: string | string[]): ScannedTag[] {
  const want =
    filter == null
      ? null
      : new Set((Array.isArray(filter) ? filter : [filter]).map((s) => s.toLowerCase()));
  const out: ScannedTag[] = [];
  const stack: TagAncestor[] = [];
  const n = html.length;
  let i = 0;

  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) break;
    const next = html[lt + 1];

    if (next === "!") {
      if (html.startsWith("<!--", lt)) {
        const e = html.indexOf("-->", lt + 4);
        i = e < 0 ? n : e + 3;
      } else {
        const e = html.indexOf(">", lt);
        i = e < 0 ? n : e + 1;
      }
      continue;
    }
    if (next === "?") {
      const e = html.indexOf(">", lt);
      i = e < 0 ? n : e + 1;
      continue;
    }
    if (next === "/") {
      const gt = html.indexOf(">", lt);
      if (gt < 0) break;
      const name = html.slice(lt + 2, gt).trim().toLowerCase();
      // Pop to the nearest matching ancestor. An unmatched close tag (very common —
      // a stray </div> in a CMS content block) pops NOTHING rather than emptying the
      // stack, which would otherwise make everything after it look top-level.
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].name === name) {
          stack.length = s;
          break;
        }
      }
      i = gt + 1;
      continue;
    }
    if (!next || !/[a-zA-Z]/.test(next)) {
      // A bare `<` in text ("K<8 program"). Not a tag; step over it.
      i = lt + 1;
      continue;
    }

    let j = lt + 1;
    while (j < n && !/[\s/>]/.test(html[j])) j++;
    const name = html.slice(lt + 1, j).toLowerCase();

    // Find the `>` that actually ends the tag — quoted attribute values are allowed
    // to contain `>` and routinely do (inline SVG `data-` payloads, srcset).
    let k = j;
    let quote = "";
    while (k < n) {
      const ch = html[k];
      if (quote) {
        if (ch === quote) quote = "";
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      k++;
    }
    const attrSrc = html.slice(j, k);
    const attrs = parseAttrs(attrSrc);
    const selfClosing = attrSrc.trimEnd().endsWith("/") || VOID_ELEMENTS.has(name);
    const tag: ScannedTag = {
      name,
      attrs,
      start: lt,
      end: k + 1,
      selfClosing,
      ancestors: stack.slice(),
    };
    if (!want || want.has(name)) out.push(tag);

    i = k + 1;
    if (!selfClosing) {
      if (RAW_TEXT_ELEMENTS.has(name)) {
        // Jump to the close tag but leave `i` ON the `<` so the close branch above
        // does the popping — one place that pops, one place that can be wrong.
        const close = indexOfClose(html, name, i);
        i = close < 0 ? n : close;
      }
      stack.push({ name, id: attrs.id ?? "", className: attrs.class ?? "" });
    }
  }

  return out;
}

/** Offsets of an element's content and of the end of its close tag. */
export interface ElementRange {
  innerStart: number;
  innerEnd: number;
  outerEnd: number;
}

/**
 * Find where an element's content ends, counting nesting of the same name so a
 * `<div class="logo">` containing three `<div>` does not end at the first `</div>`.
 */
export function elementRange(html: string, tag: ScannedTag): ElementRange {
  if (tag.selfClosing) {
    return { innerStart: tag.end, innerEnd: tag.end, outerEnd: tag.end };
  }
  const re = new RegExp(`<(/?)${escapeRe(tag.name)}(?=[\\s/>])`, "gi");
  re.lastIndex = tag.end;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1] === "/") {
      depth--;
      if (depth === 0) {
        const gt = html.indexOf(">", m.index);
        return {
          innerStart: tag.end,
          innerEnd: m.index,
          outerEnd: gt < 0 ? html.length : gt + 1,
        };
      }
    } else {
      // A self-closing `<svg/>` inside an `<svg>` would over-count, but that shape
      // does not occur; an unclosed element is the real risk and it lands here as
      // "runs to end of document", which is the safe direction for our uses.
      depth++;
    }
  }
  return { innerStart: tag.end, innerEnd: html.length, outerEnd: html.length };
}

/** The markup between an element's tags. */
export function elementInner(html: string, tag: ScannedTag): string {
  const r = elementRange(html, tag);
  return html.slice(r.innerStart, r.innerEnd);
}

/** The element including its own tags — the form `svgRenderRisks` wants. */
export function elementOuter(html: string, tag: ScannedTag): string {
  const r = elementRange(html, tag);
  return html.slice(tag.start, r.outerEnd);
}

/**
 * Visible text of a fragment: tags out, entities decoded, whitespace collapsed.
 *
 * <script> and <style> bodies are removed FIRST. Without that, a page's inline CSS
 * ends up in the "school name" pool and you get candidates like
 * ".site-header{background:#0b3d91}" ranked as a motto.
 */
export function innerText(fragment: string): string {
  return decodeEntities(
    fragment
      .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // Block-level tags become a space, not nothing: "<li>Eagles</li><li>Pride</li>"
      // must not read as "EaglesPride".
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * name/property/itemprop → content, for every <meta> in the document.
 *
 * First declaration wins. Pages that emit `og:image` three times list the primary
 * one first, and Open Graph consumers take the first, so we match them.
 */
export function metaMap(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of scanTags(html, "meta")) {
    const key = (tag.attrs.property ?? tag.attrs.name ?? tag.attrs.itemprop ?? "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const value = (tag.attrs.content ?? "").trim();
    if (!value) continue;
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/**
 * Every <style> block's CSS, IN DOCUMENT ORDER, from the WHOLE document.
 *
 * Not just <head>. This is the single most important line in the file and it was
 * written after the head-only version returned nothing on a real Edlio page: Edlio
 * emits its `:root { --primary-color: … }` block INSIDE <main>, below the fold,
 * next to the content it styles. A head-only scan finds a reset stylesheet and
 * concludes the school has no colours.
 */
export function styleBlocks(html: string): string[] {
  const out: string[] = [];
  for (const tag of scanTags(html, "style")) {
    const css = elementInner(html, tag).trim();
    if (css) out.push(css);
  }
  return out;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Parsed `application/ld+json` blocks, flattened.
 *
 * Flattening matters: WordPress SEO plugins emit ONE script containing
 * `{"@graph":[…]}` with the Organization buried at index 4, while Finalsite emits
 * several separate scripts. Callers should not have to know which shape they got,
 * so arrays and `@graph` are unrolled here and the result is always a flat list of
 * objects.
 *
 * A block that does not parse is skipped in silence. Hand-edited JSON-LD with a
 * trailing comma is common and is not a reason to fail the whole page.
 */
export function jsonLdBlocks(html: string): Record<string, JsonValue>[] {
  const out: Record<string, JsonValue>[] = [];
  const push = (v: JsonValue): void => {
    if (Array.isArray(v)) {
      for (const item of v) push(item);
      return;
    }
    if (v && typeof v === "object") {
      const obj = v as Record<string, JsonValue>;
      out.push(obj);
      const graph = obj["@graph"];
      if (graph) push(graph);
    }
  };
  for (const tag of scanTags(html, "script")) {
    const type = (tag.attrs.type ?? "").toLowerCase();
    if (!type.includes("ld+json")) continue;
    const body = elementInner(html, tag).trim();
    if (!body) continue;
    try {
      push(JSON.parse(body) as JsonValue);
    } catch {
      // Malformed JSON-LD is normal. Nothing to report, nothing to fix.
    }
  }
  return out;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", hellip: "…", middot: "·",
  bull: "•", trade: "™", reg: "®", copy: "©", deg: "°", times: "×",
  eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ntilde: "ñ",
  uuml: "ü", ouml: "ö", auml: "ä", aacute: "á", iacute: "í", oacute: "ó",
};

/**
 * Decode the entities that actually show up in school markup.
 *
 * Not a complete HTML5 entity table — that is 2,231 names and a 150 KB import for
 * a feature whose whole job is to read `&amp;` in "Smith &amp; Jones Elementary"
 * and `&#8217;` in "Washington&#8217;s". Numeric forms are handled generally, so
 * anything exotic still survives; unknown NAMED entities are left verbatim rather
 * than dropped, because a visible `&curren;` is a better bug report than a hole.
 */
export function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);?/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const hit = NAMED_ENTITIES[body.toLowerCase()];
    return hit ?? whole;
  });
}

/**
 * Absolutise a URL found in markup, or refuse it.
 *
 * Refuses anything that is not http(s) or a data: image. `javascript:`, `mailto:`,
 * `tel:` and `about:` all appear in header anchors and none of them is a picture;
 * letting one through means the fetch layer is handed a scheme it must then
 * re-validate, and the safest place to drop it is the moment it is read.
 *
 * `data:` URIs are kept as-is: a data-URI crest is already the bytes, needs no
 * request, and dropping it would lose a candidate that costs nothing.
 */
export function resolveUrl(href: string, base: string): string | null {
  const raw = href.trim();
  if (!raw) return null;
  if (/^data:image\//i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return null;
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const NAMED_COLORS: Record<string, string> = {
  black: "#000000", white: "#FFFFFF", red: "#FF0000", green: "#008000",
  blue: "#0000FF", navy: "#000080", maroon: "#800000", gold: "#FFD700",
  silver: "#C0C0C0", gray: "#808080", grey: "#808080", yellow: "#FFFF00",
  orange: "#FFA500", purple: "#800080", teal: "#008080", olive: "#808000",
  crimson: "#DC143C", forestgreen: "#228B22", royalblue: "#4169E1",
  darkblue: "#00008B", darkred: "#8B0000", darkgreen: "#006400",
  midnightblue: "#191970", goldenrod: "#DAA520", firebrick: "#B22222",
};

/**
 * Normalise any CSS colour we can reach into `#RRGGBB`, uppercase, or null.
 *
 * Alpha is parsed and then DISCARDED, deliberately. Everything downstream of this
 * is a printed colour: a UV printer lays ink or it does not, and `rgba(11,61,145,.6)`
 * is not a school colour, it is a hover state. Keeping the alpha would let a 6%-opacity
 * overlay outrank the crest's actual navy on hit count.
 *
 * `transparent`, `currentColor`, `inherit`, `none` and `initial` return null — they
 * are not colours, they are references to somewhere we cannot see.
 */
export function normalizeColor(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (["transparent", "currentcolor", "inherit", "initial", "unset", "none", "auto"].includes(s)) {
    return null;
  }

  const hex = /^#([0-9a-f]{3,8})$/.exec(s);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
    }
    if (h.length === 6 || h.length === 8) return `#${h.slice(0, 6)}`.toUpperCase();
    return null;
  }

  const fn = /^(rgba?|hsla?)\s*\(([^)]*)\)$/.exec(s);
  if (fn) {
    // Both comma and space syntax; the `/ alpha` form is split off and ignored.
    const parts = fn[2]
      .replace(/\//g, " ")
      .split(/[\s,]+/)
      .filter(Boolean);
    if (parts.length < 3) return null;
    if (fn[1].startsWith("rgb")) {
      const nums = parts.slice(0, 3).map((p) =>
        p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p),
      );
      if (nums.some((v) => !Number.isFinite(v))) return null;
      return toHex(nums[0], nums[1], nums[2]);
    }
    const h = parseFloat(parts[0]);
    const sat = parseFloat(parts[1]) / 100;
    const light = parseFloat(parts[2]) / 100;
    if (![h, sat, light].every(Number.isFinite)) return null;
    return toHex(...hslToRgb(h, sat, light));
  }

  return NAMED_COLORS[s] ?? null;
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * Math.max(0, Math.min(1, s));
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(hh / 60) % 6;
  const table: [number, number, number][] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ];
  const [r, g, b] = table[seg];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Relative luminance, 0–1, of a `#RRGGBB`. Cheap sRGB approximation. */
export function colorLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** HSL saturation, 0–1, of a `#RRGGBB`. Used only to spot greys. */
export function colorSaturation(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** One pass over a page, so five extractors do not each re-walk the document. */
export interface PageScan {
  html: string;
  pageUrl: string;
  /** Lowercase hostname, or "" when `pageUrl` will not parse. */
  host: string;
  title: string;
  meta: Record<string, string>;
  styles: string[];
  jsonLd: Record<string, JsonValue>[];
  /** Every tag in the document, in order, each with its ancestor stack. */
  tags: ScannedTag[];
  /** Visible text of the whole page, collapsed. */
  text: string;
}

export function scanPage(
  html: string,
  pageUrl: string,
  /**
   * CSS from EXTERNAL stylesheets, already fetched by the caller.
   *
   * Inline `<style>` alone was a real blind spot: this package claims to collect
   * CSS-background logos, but a Finalsite/WordPress theme compiles its header rules
   * into a linked .css file, so the crest — and most of the brand palette — lived
   * somewhere nothing here ever read. Threaded in as a parameter rather than fetched
   * here, because this module must stay pure and network-free to be testable.
   */
  extraCss: string[] = [],
): PageScan {
  const tags = scanTags(html);
  const titleTag = tags.find((t) => t.name === "title");
  let host = "";
  try {
    host = new URL(pageUrl).hostname.toLowerCase();
  } catch {
    host = "";
  }
  return {
    html,
    pageUrl,
    host,
    title: titleTag ? innerText(elementInner(html, titleTag)) : "",
    meta: metaMap(html),
    styles: [...styleBlocks(html), ...extraCss],
    jsonLd: jsonLdBlocks(html),
    tags,
    text: innerText(html),
  };
}

/** True when any ancestor (or the tag itself) matches a class/id predicate. */
export function inContainer(
  tag: ScannedTag,
  predicate: (id: string, className: string, name: string) => boolean,
): boolean {
  if (predicate(tag.attrs.id ?? "", tag.attrs.class ?? "", tag.name)) return true;
  return tag.ancestors.some((a) => predicate(a.id, a.className, a.name));
}
