"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getPlateDesign } from "@/data/plates";
import { getPlateImageUrl, getPlateImageDisplay } from "@/data/plate-images";

interface LicensePlateAreaProps {
  x: number;
  y: number;
  width: number;
  height: number;
  plateState: string;
  /** Override the stock photo for this state — a kit's own plate. Absent on
   *  /build and on any kit without one, which keeps the stock path unchanged. */
  plateImageOverride?: string;
}

// State name fonts — mapped to match real plate typography
const stateFontMap: Record<string, string> = {
  script: "'Dancing Script', 'Brush Script MT', cursive",
  serif: "Georgia, 'Times New Roman', serif",
  block: "'Oswald', 'Impact', sans-serif",
  normal: "'Barlow Condensed', 'Arial Narrow', 'Helvetica Neue', sans-serif",
};

// Plate number font — authentic embossed plate typeface
const PLATE_NUMBER_FONT = "'LICENSE PLATE USA', 'Barlow Condensed', 'Arial Narrow', sans-serif";

export function LicensePlateArea({ x, y, width, height, plateState, plateImageOverride }: LicensePlateAreaProps) {
  const plate = getPlateDesign(plateState);
  const plateImageUrl = plateImageOverride ?? getPlateImageUrl(plateState);
  const plateImageDisplay = getPlateImageDisplay(plateState);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Reset when the IMAGE changes, not when the state does. Those came apart the
  // moment a kit could override the photo for a state: switching kits, or the
  // override arriving after first paint, changed the URL while `plateState`
  // stayed "MO", so a `failed` flag from the previous image stuck and the plate
  // stayed on its CSS fallback forever. Keying on the URL is the honest
  // dependency — it is the thing whose loading is being tracked.
  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [plateImageUrl]);

  const boltSize = Math.max(6, width * 0.015);
  const boltInset = width * 0.04;
  const plateNumSize = Math.max(12, height * 0.28);
  const stateNameSize = Math.max(8, height * 0.11);
  const mottoSize = Math.max(6, height * 0.065);

  if (!plate) {
    return (
      <div className="absolute" style={{ left: x, top: y, width, height }}>
        <div className="w-full h-full rounded-md bg-surface-700/40 border border-surface-600/30 flex items-center justify-center">
          <span className="text-surface-400/60 select-none" style={{ fontSize: stateNameSize }}>
            SELECT A STATE
          </span>
        </div>
      </div>
    );
  }

  const stateFont = stateFontMap[plate.stateFontStyle || "normal"];
  const showImage = plateImageUrl && !imageFailed;
  // Ours or somebody else's. Every plate a KIT supplies is a file we ship under
  // public/plates (the gen-plate.mjs pipeline writes them there), and so are CA
  // and MO; every other state is still a raw.githubusercontent.com URL from
  // plate-images.ts. next/image can optimize the first kind with nothing added to
  // next.config; the second kind would need each remote host whitelisted, so it
  // stays a plain <img> and behaves exactly as it did.
  const isLocalPlateImage = !!plateImageUrl && plateImageUrl.startsWith("/");

  // The plate sits in the frame's window: ~232 CSS px on a 390 phone, ~656 on a
  // 1440 desktop (measured). The ladder resolves both to w=750 — oversampled
  // against the phone's 696 device px at dpr 3, and under the 924 px source, so
  // nothing is upscaled. The win is the FORMAT: the shipped photos are a 103 KB
  // JPEG and a 340 KB PNG, and webp at the size actually drawn is a fraction of
  // either.
  const PLATE_SIZES = "(max-width: 767px) 60vw, 660px";
  // The plate image is stacked over the CSS fallback, edge to edge in the window.
  // Both renderings get this, so the box geometry cannot drift between them: same
  // fill, same object-fit, same per-plate scale from plate-images.ts.
  const plateImageStyle: React.CSSProperties = {
    opacity: imageLoaded ? 1 : 0,
    transition: "opacity 0.4s ease-out",
    objectFit: plateImageDisplay.objectFit,
    objectPosition: plateImageDisplay.objectPosition,
    transform: plateImageDisplay.scale !== 1 ? `scale(${plateImageDisplay.scale})` : undefined,
  };

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width,
        height,
        // On-screen-only drop shadow so the plate reads as sitting INSIDE the
        // frame with depth: a soft cast shadow below/around it, plus a tight
        // contact shadow at the seam. Lives on this (non-clipping) wrapper so it
        // isn't cut off by the plate's own overflow-hidden. NOT applied to the
        // print/export render (compose-frame.ts), which draws the plate flat.
        borderRadius: Math.max(3, width * 0.012),
        boxShadow:
          "0 6px 16px rgba(0,0,0,0.45), " +
          "0 2px 5px rgba(0,0,0,0.35), " +
          "0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="w-full h-full overflow-hidden relative"
        style={{
          background: plate.bgGradient || plate.bgColor,
          border: `2px solid ${plate.borderColor}`,
          borderRadius: Math.max(3, width * 0.012),
          boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        {/* Real plate image (loads over CSS fallback) */}
        {showImage && isLocalPlateImage && (
          <Image
            src={plateImageUrl}
            alt={`${plate.state} license plate`}
            // `fill` is the same box the raw <img> drew: absolutely positioned,
            // inset 0, 100% x 100% of this (relative, overflow-hidden) parent.
            fill
            sizes={PLATE_SIZES}
            // The CSS plate shows underneath until this resolves, so any delay
            // here is time spent looking at the fallback rather than the product.
            // `priority` is what the raw <img>'s loading="eager" + fetchPriority
            // ="high" already said; `decoding="sync"` is gone with it — it blocked
            // the main thread to decode a photo that fades in over 400ms anyway.
            priority
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            draggable={false}
            style={plateImageStyle}
          />
        )}
        {showImage && !isLocalPlateImage && (
          // A remote state plate from plate-images.ts — unchanged.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plateImageUrl}
            alt={`${plate.state} license plate`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            draggable={false}
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full"
            style={plateImageStyle}
          />
        )}

        {/* CSS fallback — visible until image loads */}
        {(!showImage || !imageLoaded) && (
          <>
            {/* Brushed metal texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 1px,
                  rgba(255,255,255,0.015) 1px,
                  rgba(255,255,255,0.015) 2px
                )`,
              }}
            />

            {/* Stripes */}
            {plate.stripes?.map((stripe, i) => (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  [stripe.position]: 0,
                  height: stripe.height,
                  background: stripe.color,
                }}
              />
            ))}

            {/* State name at top */}
            <div
              className="absolute left-0 right-0 flex justify-center select-none"
              style={{ top: height * 0.08 }}
            >
              <span
                className="tracking-wider uppercase"
                style={{
                  fontSize: stateNameSize,
                  color: plate.textColor,
                  fontFamily: stateFont,
                  fontWeight: plate.stateFontStyle === "script" ? 400 : 700,
                  fontStyle: plate.stateFontStyle === "script" ? "italic" : "normal",
                  letterSpacing: plate.stateFontStyle === "script" ? "0.08em" : "0.15em",
                  textTransform: plate.stateFontStyle === "script" ? "capitalize" : "uppercase",
                  textShadow: "0 1px 0 rgba(255,255,255,0.4), 0 -0.5px 0 rgba(0,0,0,0.1)",
                }}
              >
                {plate.state}
              </span>
            </div>

            {/* Plate number — embossed/stamped look */}
            <div className="absolute inset-0 flex items-center justify-center select-none">
              <span
                style={{
                  fontSize: plateNumSize,
                  color: plate.numberColor,
                  fontFamily: PLATE_NUMBER_FONT,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  opacity: 0.2,
                  textShadow: "0 1.5px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(0,0,0,0.15)",
                }}
              >
                ABC 1234
              </span>
            </div>

            {/* Motto at bottom */}
            {plate.motto && (
              <div
                className="absolute left-0 right-0 flex justify-center select-none"
                style={{ bottom: height * 0.06 }}
              >
                <span
                  style={{
                    fontSize: mottoSize,
                    color: plate.accentColor || plate.textColor,
                    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                    textShadow: "0 0.5px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  {plate.motto}
                </span>
              </div>
            )}
          </>
        )}

        {/* Bolt holes — recessed with shadow */}
        {[
          { left: boltInset, top: "50%" },
          { right: boltInset, top: "50%" },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: boltSize,
              height: boltSize,
              transform: "translateY(-50%)",
              background: "radial-gradient(circle at 40% 40%, #999 0%, #666 50%, #444 100%)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), 0 0.5px 0 rgba(255,255,255,0.2)",
              ...pos,
            }}
          />
        ))}

        {/* Embossed raised-plate edge lighting */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow:
              "inset 0 2px 3px rgba(255,255,255,0.35), " +
              "inset 0 -2px 3px rgba(0,0,0,0.15), " +
              "inset 2px 0 3px rgba(255,255,255,0.1), " +
              "inset -2px 0 3px rgba(0,0,0,0.08)",
            borderRadius: Math.max(2, width * 0.01),
          }}
        />
      </div>
    </div>
  );
}
