// Every `fullResId` in a design — shared by the builder (which uploads those
// originals with a Send) and the server (which keeps only the ones the design
// references). Pure: no browser or server APIs.

const FULL_RES_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Every `fullResId` in a design, wherever it sits (badge tiles, section logos,
 * section images, the upload tray). Found by walking the design rather than by a
 * list of where uploads live: a list is what the fifth place to put a photo
 * forgets.
 */
export function collectFullResIds(design: unknown): string[] {
  const found = new Set<string>();
  const walk = (v: unknown, depth: number) => {
    if (!v || typeof v !== "object" || depth > 12) return;
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1);
      return;
    }
    for (const [k, x] of Object.entries(v)) {
      if (k === "fullResId" && typeof x === "string" && FULL_RES_ID_RE.test(x)) found.add(x);
      else walk(x, depth + 1);
    }
  };
  walk(design, 0);
  return [...found];
}
