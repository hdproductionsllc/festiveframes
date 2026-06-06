"use client";

import { useMemo, useRef, useState } from "react";
import { useDesignStore } from "@/stores/design-store";
import { getPiece } from "@/data/sets";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { captureFrameAsDataUrl } from "@/lib/utils/capture";
import { BottomTextBar } from "@/components/frame/BottomTextBar";

// Short, stable part-number prefixes per set. Falls back to the first 3 letters.
const SET_CODE: Record<string, string> = {
  july4th: "J4",
  essentials: "ESS",
};

/** Stable part number derived from the piece id (not the filename). */
function skuFor(pieceId: string): string {
  const [setId, slug = pieceId] = pieceId.split(":");
  const code = SET_CODE[setId] ?? setId.slice(0, 3).toUpperCase();
  return `${code}-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}

const UNIT_PX = 180; // print resolution per tile unit for downloaded text bars

interface Row {
  sku: string;
  name: string;
  pieceId: string;
  artworkUrl: string;
  color: string;
  qty: number;
}

/**
 * Internal production sheet. Tallies stock tiles (part #, thumbnail, color,
 * qty), embeds a mockup of the assembled frame, and lets us download
 * print-ready PNGs of the custom parts (the text bars). Captures an order
 * number / customer name so the sheet is traceable.
 */
export function ExportPartsList({
  open,
  onClose,
  frameImage,
}: {
  open: boolean;
  onClose: () => void;
  frameImage?: string | null;
}) {
  const slots = useDesignStore((s) => s.slots);
  const textBars = useDesignStore((s) => s.textBars);
  const qrCode = useDesignStore((s) => s.qrCode);
  const plateState = useDesignStore((s) => s.plateState);
  const designName = useDesignStore((s) => s.designName);
  const tileIn = useDesignStore((s) => s.frameConfig.tileSizeInches);

  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const barRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rows = useMemo<Row[]>(() => {
    const counts = new Map<string, number>();
    const covered = new Set(coveredSlotIds(textBars));
    for (const [slotId, placed] of Object.entries(slots)) {
      if (covered.has(slotId)) continue; // hidden under a text bar — not produced
      counts.set(placed.pieceId, (counts.get(placed.pieceId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([pieceId, qty]) => {
        const piece = getPiece(pieceId);
        return {
          sku: skuFor(pieceId),
          name: piece?.name ?? pieceId,
          pieceId,
          artworkUrl: piece?.artworkUrl ?? "",
          color: piece?.backgroundColor ?? "#FFFFFF",
          qty,
        };
      })
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  }, [slots, textBars]);

  const totalTiles = rows.reduce((sum, r) => sum + r.qty, 0);
  const slug = (designName || "festive-frames").replace(/[^a-z0-9]+/gi, "-");

  if (!open) return null;

  function downloadCsv() {
    const lines: string[][] = [
      ["Order #", orderNumber],
      ["Customer", customerName],
      ["Design", designName],
      ["Plate", plateState],
      ["QR", qrCode.enabled ? qrCode.url : "off"],
      [],
      ["Part #", "Tile", "Color", "Qty"],
      ...rows.map((r) => [r.sku, r.name, r.color, String(r.qty)]),
      ["", "", "Total tiles", String(totalTiles)],
      [],
      ["Custom parts (text bars)"],
      ["Text", "Font", "Row", "Size (tiles)", "Size (in)"],
      ...textBars.map((b) => [
        b.config.text,
        b.config.fontFamily,
        b.row,
        `${b.widthUnits} x 1`,
        `${(b.widthUnits * tileIn).toFixed(2)} x ${tileIn.toFixed(2)}`,
      ]),
    ];
    const csv = lines
      .map((cols) => cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}${orderNumber ? `-${orderNumber}` : ""}-parts-list.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadBarPng(barId: string, sku: string) {
    const el = barRefs.current[barId];
    if (!el) return;
    const bar = textBars.find((b) => b.id === barId);
    const dataUrl = await captureFrameAsDataUrl(el, {
      pixelRatio: 2,
      backgroundColor: bar?.config.backgroundColor ?? "#FFFFFF",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slug}${orderNumber ? `-${orderNumber}` : ""}-${sku}.png`;
    a.click();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Production parts list"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="print-parts max-h-[88vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 text-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Production parts list</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 text-gray-500 hover:text-gray-900 print:hidden"
          >
            ✕
          </button>
        </div>

        {/* Order / customer */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-gray-600">
            Order #
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. 1042"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Customer
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Name"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            />
          </label>
        </div>

        {/* Frame mockup */}
        {frameImage && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-gray-500">Frame mockup</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frameImage} alt="Assembled frame mockup" className="w-full rounded border border-gray-200" />
          </div>
        )}

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No tiles placed yet. Add tiles, then export.</p>
        ) : (
          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-1">Part #</th>
                <th className="py-1">Tile</th>
                <th className="py-1">Color</th>
                <th className="py-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pieceId} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-mono text-xs">{r.sku}</td>
                  <td className="py-1">
                    <div className="flex items-center gap-2">
                      {r.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.artworkUrl} alt="" className="h-7 w-7 rounded border border-gray-200 object-cover" />
                      ) : (
                        <span
                          className="h-7 w-7 rounded border border-gray-300"
                          style={{ background: r.color }}
                        />
                      )}
                      {r.name}
                    </div>
                  </td>
                  <td className="py-1">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-600">
                      <span className="inline-block h-3 w-3 rounded-sm border border-gray-300" style={{ background: r.color }} />
                      {r.color}
                    </span>
                  </td>
                  <td className="py-1 text-right font-semibold">{r.qty}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300">
                <td className="py-1 font-semibold" colSpan={3}>
                  Total tiles
                </td>
                <td className="py-1 text-right font-bold">{totalTiles}</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Custom parts — text bars */}
        {textBars.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-gray-500">Custom parts — text bars</p>
            <ul className="space-y-2">
              {textBars.map((b) => {
                const sku = `BAR-${b.widthUnits}U`;
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded border border-gray-200 p-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{b.config.text || "(blank)"}</div>
                      <div className="text-xs text-gray-500">
                        {b.row} · {b.widthUnits} × 1 tiles · {(b.widthUnits * tileIn).toFixed(2)}″ × {tileIn.toFixed(2)}″
                        <span
                          className="ml-2 inline-block h-3 w-3 translate-y-0.5 rounded-sm border border-gray-300"
                          style={{ background: b.config.backgroundColor }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadBarPng(b.id, sku)}
                      className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 print:hidden"
                    >
                      Download PNG
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <dl className="mt-4 space-y-1 text-xs text-gray-600">
          <div><span className="font-semibold">Plate:</span> {plateState}</div>
          <div><span className="font-semibold">QR:</span> {qrCode.enabled ? qrCode.url : "off"}</div>
        </dl>

        <div className="mt-5 flex gap-3 print:hidden">
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Offscreen high-res renders of each text bar, for PNG download. */}
      <div aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
        {textBars.map((b) => (
          <div
            key={b.id}
            ref={(el) => {
              barRefs.current[b.id] = el;
            }}
            style={{ position: "relative", width: b.widthUnits * UNIT_PX, height: UNIT_PX, overflow: "hidden" }}
          >
            <BottomTextBar
              config={b.config}
              qrConfig={{ ...qrCode, enabled: b.qr }}
              x={0}
              y={0}
              width={b.widthUnits * UNIT_PX}
              height={UNIT_PX}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
