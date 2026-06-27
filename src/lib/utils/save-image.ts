// Save an image (given as a data: URL) to the user's device — robust across
// every platform, because the naive `<a download>` fails on mobile:
//
//   • MOBILE (iOS / Android): iOS Safari IGNORES the `download` attribute and
//     refuses to open a blob: URL in a new tab, so the only reliable path is the
//     native SHARE SHEET (Web Share API with a File) → "Save Image" / "Save to
//     Photos". We gate this to coarse-pointer (touch) devices so desktop keeps a
//     plain download instead of popping a share dialog.
//   • DESKTOP / Android-without-share: a real download via a blob object URL
//     (falling back to the data URL if blob construction fails).
//
// Never throws. A share the user cancels (AbortError) is treated as "done".
// The Web Share call is reached synchronously from the click (only sync work
// before it), so it stays inside the user-gesture window iOS requires.

/** data: URL → Blob (synchronous). Returns null if the string isn't decodable. */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma === -1) return null;
    const meta = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export async function saveImage(dataUrl: string, filename: string): Promise<void> {
  if (!dataUrl) return;
  const blob = dataUrlToBlob(dataUrl);

  // 1) Mobile: native share sheet (the only reliable "save to Photos" on iOS).
  if (
    blob &&
    isTouchDevice() &&
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function"
  ) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return; // shared, or user cancelled — either way we're finished
      }
    } catch (err) {
      // User dismissed the share sheet on purpose → stop. Any other failure →
      // fall through to the download path below.
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  // 2) Desktop / Android: trigger a real file download.
  const url = blob ? URL.createObjectURL(blob) : dataUrl;
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    if (blob) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
