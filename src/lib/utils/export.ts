import { toPng } from "html-to-image";

export async function exportFrameAsPng(
  element: HTMLElement,
  designName: string
): Promise<void> {
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#1a1a1a",
    filter: (node) => {
      // Filter out elements with data-export-ignore
      if (node instanceof HTMLElement && node.dataset.exportIgnore) {
        return false;
      }
      return true;
    },
  });

  // Create download link
  const link = document.createElement("a");
  const safeName = designName.replace(/[^a-zA-Z0-9 -]/g, "").trim() || "frame-design";
  link.download = `${safeName.replace(/ /g, "-").toLowerCase()}.png`;
  link.href = dataUrl;
  link.click();
}
