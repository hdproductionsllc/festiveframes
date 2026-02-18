"use client";

import { useState, useEffect } from "react";
import { getPlateDesign } from "@/data/plates";
import { getPlateImageUrl } from "@/data/plate-images";

interface LicensePlateAreaProps {
  x: number;
  y: number;
  width: number;
  height: number;
  plateState: string;
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

export function LicensePlateArea({ x, y, width, height, plateState }: LicensePlateAreaProps) {
  const plate = getPlateDesign(plateState);
  const plateImageUrl = getPlateImageUrl(plateState);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Reset image state when plate state changes
  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [plateState]);

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

  return (
    <div className="absolute" style={{ left: x, top: y, width, height }}>
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
        {showImage && (
          <img
            src={plateImageUrl}
            alt={`${plate.state} license plate`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            draggable={false}
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: imageLoaded ? 1 : 0, transition: "opacity 0.4s ease-out" }}
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
