"use client";

import { useRef } from "react";
import { stockCars } from "@/data/stock-cars";
import { usePreviewStore } from "@/stores/preview-store";

export function CarSelector() {
  const carPhotoUrl = usePreviewStore((s) => s.carPhotoUrl);
  const carPhotoSource = usePreviewStore((s) => s.carPhotoSource);
  const setCarPhoto = usePreviewStore((s) => s.setCarPhoto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStockSelected = (src: string) =>
    carPhotoSource === "stock" && carPhotoUrl === src;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stockCars.map((car) => (
        <button
          key={car.id}
          onClick={() => setCarPhoto(car.src, "stock")}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${isStockSelected(car.src)
              ? "bg-brand-gold/20 text-brand-gold ring-1 ring-brand-gold/50"
              : "bg-surface-700 text-surface-300 hover:bg-surface-600"
            }
          `}
        >
          {car.label}
        </button>
      ))}

      <button
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${carPhotoSource === "upload"
            ? "bg-brand-gold/20 text-brand-gold ring-1 ring-brand-gold/50"
            : "bg-surface-700 text-surface-300 hover:bg-surface-600"
          }
        `}
      >
        Upload Photo
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          setCarPhoto(url, "upload");
          e.target.value = "";
        }}
      />
    </div>
  );
}
