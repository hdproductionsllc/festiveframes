import { toPng } from "html-to-image";

/**
 * Capture a DOM element as a PNG data URL.
 * Reusable by both export (download) and preview (overlay).
 */
export async function captureFrameAsDataUrl(
  element: HTMLElement,
  options?: { pixelRatio?: number; backgroundColor?: string }
): Promise<string> {
  return toPng(element, {
    pixelRatio: options?.pixelRatio ?? 2,
    backgroundColor: options?.backgroundColor ?? "#1a1a1a",
    filter: (node) => {
      if (node instanceof HTMLElement && node.dataset.exportIgnore) {
        return false;
      }
      return true;
    },
  });
}
