"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore, cartTotals } from "@/stores/cart-store";
import { useDesignStore } from "@/stores/design-store";
import { formatUsd, MAX_CART_FRAMES } from "@/config/offers";
import { season } from "@/config/season";

const INK = "#1e1b17";

// The cart — review every designed frame, set how many of each, see the
// pairs-priced total (2 for $69), then design another or check out. The cart IS
// the order; checkout sends all designs + quantities to one Stripe session.
export default function CartPage() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const clearWorkingDesign = useDesignStore((s) => s.clearAll);
  const setDesignName = useDesignStore((s) => s.setDesignName);

  // Avoid a hydration mismatch: the persisted cart only exists on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = cartTotals(lines, season.flatShippingCents);
  const atCap = totals.frames >= MAX_CART_FRAMES;

  // Start a fresh design: clear the working canvas (the builder re-seeds a new
  // starting point) and go to the builder. The cart itself is untouched.
  const designAnother = () => {
    clearWorkingDesign();
    setDesignName("");
    router.push("/build");
  };

  const checkout = async () => {
    if (checkingOut || lines.length === 0) return;
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "cart",
          lines: lines.map((l) => ({ orderId: l.orderId, quantity: l.quantity, designName: l.designName })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "We couldn't start checkout. Please try again.");
      setCheckingOut(false);
    } catch {
      setError("We couldn't start checkout. Please try again.");
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf0d6]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b-[3px] border-[#1e1b17] bg-[#1e1b17] px-4 py-2">
        <a href="/" aria-label="Festive Frames home" className="flex items-center">
          <Image src="/redesign/logo.png" alt="Festive Frames" width={420} height={425} priority className="h-16 w-auto sm:h-20" />
        </a>
        <Link
          href="/build"
          className="rounded-full border-2 border-[#1e1b17] bg-[#3fb0e6] px-4 py-1.5 text-sm font-bold text-[#fff9ec] transition-all hover:brightness-110 active:scale-95"
        >
          ← Back to builder
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="s-display mb-1 text-[clamp(28px,5vw,40px)] font-bold tracking-[-1px] text-[#1e1b17]">Your cart</h1>
        <p className="mb-7 text-base font-semibold text-[#6a6354]">
          Every two frames is $69 (instead of $78). Mix designs or order multiples of the same one.
        </p>

        {!mounted ? null : lines.length === 0 ? (
          <div
            className="rounded-[20px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-6 py-12 text-center"
            style={{ boxShadow: `6px 6px 0 ${INK}` }}
          >
            <p className="mb-5 text-lg font-bold text-[#1e1b17]">Your cart is empty.</p>
            <Link
              href="/build"
              className="s-display inline-block rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-7 py-3 text-base font-semibold text-[#1e1b17] transition-all hover:brightness-105 active:scale-95"
              style={{ boxShadow: `4px 4px 0 ${INK}` }}
            >
              Design your frame →
            </Link>
          </div>
        ) : (
          <>
            {/* Lines */}
            <div className="flex flex-col gap-4">
              {lines.map((line) => (
                <div
                  key={line.orderId}
                  className="flex items-center gap-4 rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] p-4"
                  style={{ boxShadow: `5px 5px 0 ${INK}` }}
                >
                  <div className="h-16 w-24 flex-none overflow-hidden rounded-lg border-2 border-[#1e1b17]/15 bg-white">
                    {line.thumbDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.thumbDataUrl} alt={`Proof of ${line.designName}`} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#1e1b17]/40">
                        Custom frame
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-[#1e1b17]">{line.designName || "Custom frame"}</p>
                    <button
                      type="button"
                      onClick={() => removeLine(line.orderId)}
                      className="mt-1 text-[13px] font-semibold text-[#c8102e] underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Quantity stepper — order multiples of the same design. */}
                  <div className="flex flex-none items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity(line.orderId, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      className="h-9 w-9 rounded-full border-2 border-[#1e1b17] bg-white text-lg font-bold text-[#1e1b17] transition-all hover:bg-[#f1e4c6] active:scale-95 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-base font-extrabold text-[#1e1b17]">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQuantity(line.orderId, line.quantity + 1)}
                      disabled={atCap}
                      className="h-9 w-9 rounded-full border-2 border-[#1e1b17] bg-white text-lg font-bold text-[#1e1b17] transition-all hover:bg-[#f1e4c6] active:scale-95 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Design another */}
            <button
              type="button"
              onClick={designAnother}
              disabled={atCap}
              className="mt-4 w-full rounded-[14px] border-[3px] border-dashed border-[#1e1b17] bg-transparent px-4 py-3 text-sm font-bold text-[#1e1b17] transition-all hover:bg-[#1e1b17]/[0.04] active:scale-[0.99] disabled:opacity-40"
            >
              {atCap ? `Max ${MAX_CART_FRAMES} frames per order` : "+ Design another frame"}
            </button>

            {/* Totals */}
            <div
              className="mt-6 rounded-[20px] border-[3px] border-[#1e1b17] bg-[#f8c53b] px-6 py-5"
              style={{ boxShadow: `6px 6px 0 ${INK}` }}
            >
              <div className="flex items-center justify-between text-sm font-bold text-[#3a2f0c]">
                <span>{totals.frames} frame{totals.frames === 1 ? "" : "s"}</span>
                <span>{formatUsd(totals.fullCents)}</span>
              </div>
              {totals.savingsCents > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-sm font-bold text-[#c8102e]">
                  <span>Multi-frame discount</span>
                  <span>−{formatUsd(totals.savingsCents)}</span>
                </div>
              )}
              <div className="mt-1.5 flex items-center justify-between text-sm font-bold text-[#3a2f0c]">
                <span>Shipping</span>
                <span>{formatUsd(totals.shippingCents)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t-2 border-[#1e1b17]/30 pt-3">
                <span className="s-display text-lg font-bold text-[#1e1b17]">Total</span>
                <span className="s-display text-2xl font-bold text-[#1e1b17]">{formatUsd(totals.totalCents)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={checkout}
              disabled={checkingOut}
              className="s-display s-press mt-5 w-full rounded-full border-[3px] border-[#1e1b17] bg-[#ed5aa0] px-6 py-4 text-lg font-semibold text-[#fff9ec] transition-all disabled:opacity-70"
              style={{
                boxShadow: `5px 5px 0 ${INK}`,
                ["--press-shadow-lift" as string]: `7px 7px 0 ${INK}`,
                ["--press-shadow-press" as string]: `2px 2px 0 ${INK}`,
              }}
            >
              {checkingOut ? "Starting checkout…" : `Checkout · ${formatUsd(totals.totalCents)}`}
            </button>
            {error && (
              <p role="alert" className="mt-3 text-center text-sm font-bold text-[#c8102e]">
                {error}
              </p>
            )}
            <p className="mt-3 text-center text-[13px] font-semibold text-[#6a6354]">
              $5 flat shipping · 30-day guarantee · made to order in St. Louis
            </p>
          </>
        )}
      </main>
    </div>
  );
}
