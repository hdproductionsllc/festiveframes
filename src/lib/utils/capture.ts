import { toPng } from "html-to-image";

/**
 * Wait until every <img> inside the node is fully loaded AND decoded. Mobile
 * Safari fires html-to-image's snapshot before images are paintable, which is
 * why tile artwork and the plate came out blank (only solid-color div tiles
 * survived). Decoding first guarantees they're ready.
 */
async function waitForImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return img.decode ? img.decode().catch(() => undefined) : Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    })
  );
}

/**
 * Capture a DOM element as a PNG data URL.
 * Reusable by both export (download) and preview (overlay).
 */
export async function captureFrameAsDataUrl(
  element: HTMLElement,
  options?: { pixelRatio?: number; backgroundColor?: string }
): Promise<string> {
  const opts = {
    pixelRatio: options?.pixelRatio ?? 2,
    backgroundColor: options?.backgroundColor ?? "#1a1a1a",
    cacheBust: true,
    filter: (node: HTMLElement) => !(node instanceof HTMLElement && node.dataset.exportIgnore),
  };

  await waitForImages(element);
  // First pass primes html-to-image's internal resource cache; on mobile the
  // first render frequently omits images, so we render again and return that.
  await toPng(element, opts);
  await waitForImages(element);
  return toPng(element, opts);
}
