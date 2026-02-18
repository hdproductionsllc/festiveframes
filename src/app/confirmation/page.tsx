"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrderStore } from "@/stores/order-store";
import { PricingBreakdown } from "@/components/checkout/PricingBreakdown";

export default function ConfirmationPage() {
  const router = useRouter();
  const order = useOrderStore((s) => s.order);
  const customer = useOrderStore((s) => s.customer);
  const submittedAt = useOrderStore((s) => s.submittedAt);
  const clear = useOrderStore((s) => s.clear);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-surface-400 text-sm">Loading...</div>
      </div>
    );
  }

  // No submitted order — redirect
  if (!order || !submittedAt) {
    router.replace("/");
    return null;
  }

  const tileCount = Object.keys(order.slots).length;

  function handleDesignAnother() {
    clear();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-800 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-bold text-brand-red tracking-tight">
            Festive Frames
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-100 mb-2">
            Order Submitted!
          </h2>
          <p className="text-surface-400 text-sm">
            A confirmation will be sent to {customer.email}
          </p>
        </div>

        {/* Order recap card */}
        <div className="rounded-xl bg-surface-800 border border-surface-700 overflow-hidden mb-8">
          {/* Frame image */}
          <div className="p-4 bg-surface-900/50">
            <img
              src={order.frameImageDataUrl}
              alt="Your frame design"
              className="w-full max-w-md mx-auto rounded-lg"
            />
          </div>

          {/* Details grid */}
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between text-surface-300">
              <span className="text-surface-500">Design</span>
              <span>{order.designName}</span>
            </div>
            {order.bottomBarText && (
              <div className="flex justify-between text-surface-300">
                <span className="text-surface-500">Bottom bar</span>
                <span>&ldquo;{order.bottomBarText}&rdquo;</span>
              </div>
            )}
            <div className="flex justify-between text-surface-300">
              <span className="text-surface-500">Tiles</span>
              <span>{tileCount} placed</span>
            </div>
            <div className="flex justify-between text-surface-300">
              <span className="text-surface-500">Ship to</span>
              <span>{customer.name}</span>
            </div>

            <div className="border-t border-surface-700 pt-3">
              <PricingBreakdown order={order} />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={handleDesignAnother}
            className="px-6 py-3 rounded-lg text-sm font-bold transition-all active:scale-95
              bg-gradient-to-r from-brand-gold to-yellow-500 text-black
              hover:from-yellow-400 hover:to-yellow-500
              shadow-[0_0_12px_rgba(255,215,0,0.3)] hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]"
          >
            Design Another Frame
          </button>
        </div>
      </main>
    </div>
  );
}
