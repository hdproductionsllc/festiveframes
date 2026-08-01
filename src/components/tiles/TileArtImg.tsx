"use client";

import Image from "next/image";

// ─── Badge artwork, at the size it is actually shown ─────────────────────────
//
// The badge PNGs are PRINT masters: 66 of them in the high-school set, 15MB on
// disk, several over 400KB each. Every one of them was being fetched at full
// resolution by a plain <img> to fill a 56px swatch, so opening a school page
// pulled ~16MB before anyone had touched anything — the single biggest reason
// the builder was slow on a phone.
//
// next/image serves a resized WebP from the same file and lazy-loads what is
// below the fold, which is most of a scrolling palette. The print path is
// untouched: `compose-school-frame` loads the original PNGs itself at export
// time and never goes near this component.
//
// Not every artwork URL can go through the optimizer — an uploaded photo is a
// `data:` URL and a school's mark may be remote — so those keep the plain <img>
// they always had, with lazy loading added.

export function TileArtImg({
  src,
  alt,
  width,
  height,
  className,
  priority,
  style: styleOverride,
}: {
  src: string;
  alt: string;
  /** Rendered size in CSS px — what the optimizer sizes against. */
  width: number;
  height: number;
  className?: string;
  /** Above the fold and worth blocking on. Off by default. */
  priority?: boolean;
  /**
   * Merged over the base fill. The frame draws its badges `contain` (a badge is a
   * mark on a field, and cropping a square logo into a 2x1 removes the part that
   * carries the meaning) while the palette swatch is `cover`.
   */
  style?: React.CSSProperties;
}) {
  const local = src.startsWith("/") && !src.startsWith("//");
  const style = { width: "100%", height: "100%", objectFit: "cover" as const, ...styleOverride };

  if (!local) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={Math.max(1, Math.round(width))}
      height={Math.max(1, Math.round(height))}
      // `sizes` is what makes the browser pick by DEVICE PIXEL RATIO. Without it
      // a fixed-size next/image emits 1x and 2x only, and a phone at dpr 3 was
      // being handed a badge barely wider than the box it was drawn in — soft,
      // on the one object the customer is buying. With it the srcset covers the
      // full ladder and a 3x screen takes the 3x file, which is still a few KB.
      sizes={`${Math.max(1, Math.round(width))}px`}
      className={className}
      style={style}
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
    />
  );
}
