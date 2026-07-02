import type { BottomBarConfig } from "@/lib/types";

// A section's TEXT rendered as a MULTI-LINE block (honors `\n`), sized off the
// section box so it works on a wide top/bottom bar AND a tall/narrow side panel.
// Unlike the single-line banner, this stacks lines — so a vertical panel can read
// "GO / MUSTANGS / 2026". Size is user-controlled via config.fontSize.

export function SectionTextElement({
  width,
  height,
  config,
}: {
  width: number;
  height: number;
  config: BottomBarConfig;
}) {
  // Base the font on the box's SHORTER edge (so text fills a narrow vertical panel
  // by width, and a short horizontal bar by height), scaled by the size control.
  const base = Math.min(width, height);
  const fontPx = Math.max(6, base * 0.4 * (config.fontSize ?? 1));

  const align =
    config.textAlign === "left" ? "flex-start" : config.textAlign === "right" ? "flex-end" : "center";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: config.backgroundColor,
        color: config.textColor,
        fontFamily: config.fontFamily,
        fontSize: fontPx,
        fontWeight: 700,
        lineHeight: 1.02,
        letterSpacing: config.letterSpacing,
        whiteSpace: "pre-line", // honor the \n line breaks
        textAlign: config.textAlign,
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        justifyContent: "center",
        overflow: "hidden",
        padding: "3%",
        wordBreak: "break-word",
      }}
    >
      {config.text}
    </div>
  );
}
