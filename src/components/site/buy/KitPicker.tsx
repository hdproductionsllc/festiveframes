"use client";

import Image from "next/image";
import { offer, formatUsd } from "@/config/offers";
import { track } from "@/lib/analytics";
import { useBuyStore, ACTIVE_KITS } from "./useBuyStore";

// Client island. The six active kits as recognition-first cards: a swipeable
// horizontal row on mobile, a grid on desktop. One tap sets the selected kit,
// which updates the hero, the sticky bar, and the offer block. No paragraphs
// on cards. The limited kit shows its badge.
export function KitPicker() {
  const selectedKitId = useBuyStore((s) => s.selectedKitId);
  const setSelectedKit = useBuyStore((s) => s.setSelectedKit);

  return (
    <section className="paper-grain" aria-labelledby="kit-picker-heading">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="kit-picker-heading"
          className="text-2xl font-bold uppercase tracking-tight text-brand-navy sm:text-3xl"
        >
          Pick your kit
        </h2>

        <ul
          className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3"
          role="list"
        >
          {ACTIVE_KITS.map((kit) => {
            const isSelected = kit.id === selectedKitId;
            return (
              <li
                key={kit.id}
                className="w-64 shrink-0 snap-start sm:w-auto sm:shrink"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedKit(kit.id);
                    track("kit_selected", { kitId: kit.id });
                  }}
                  aria-pressed={isSelected}
                  className={`flex h-full w-full flex-col overflow-hidden rounded-lg border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy ${
                    isSelected
                      ? "border-brand-red bg-brand-cream-soft"
                      : "border-brand-navy/15 bg-brand-cream-soft hover:border-brand-navy/40"
                  }`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-brand-navy-soft/15">
                    <Image
                      src={kit.thumbnailImage}
                      alt={`${kit.name} snap-on license plate frame kit. ${kit.identityLine}`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 16rem"
                      className="object-cover vintage-photo"
                    />
                    {kit.limited && (
                      <span className="absolute left-2 top-2 rounded-sm bg-brand-gold px-2 py-0.5 font-mkt-display text-[10px] font-bold uppercase tracking-widest text-brand-navy-deep">
                        Limited
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute right-2 top-2 rounded-sm bg-brand-red px-2 py-0.5 font-mkt-display text-[10px] font-bold uppercase tracking-widest text-brand-white">
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-mkt-display text-lg font-bold uppercase tracking-tight text-brand-navy">
                      {kit.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-brand-red">
                      {kit.identityLine}
                    </p>
                    <p className="mt-3 font-mkt-display text-base font-bold uppercase tracking-wide text-brand-navy">
                      {formatUsd(offer.singlePrice)}
                    </p>
                    <span
                      className={`mt-3 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                        isSelected
                          ? "bg-brand-red text-brand-white"
                          : "border border-brand-navy text-brand-navy"
                      }`}
                    >
                      {isSelected ? "Picked" : "Pick This One"}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
