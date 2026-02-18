"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrderStore } from "@/stores/order-store";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { PricingBreakdown } from "@/components/checkout/PricingBreakdown";
import { CustomerForm } from "@/components/checkout/CustomerForm";

export default function CheckoutPage() {
  const router = useRouter();
  const order = useOrderStore((s) => s.order);
  const submitOrder = useOrderStore((s) => s.submitOrder);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Wait for hydration before evaluating order
  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-surface-400 text-sm">Loading...</div>
      </div>
    );
  }

  // No order data — redirect back to designer
  if (!order) {
    router.replace("/");
    return null;
  }

  function handlePlaceOrder() {
    submitOrder();
    router.push("/confirmation");
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-brand-red tracking-tight">
            Festive Frames
          </h1>
          <button
            onClick={() => router.back()}
            className="text-sm text-surface-400 hover:text-surface-200 transition-colors"
          >
            &larr; Back to designer
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-surface-100 mb-6">Checkout</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column — order summary */}
          <div className="space-y-4">
            <OrderSummary order={order} />
          </div>

          {/* Right column — pricing + form */}
          <div className="space-y-4">
            <PricingBreakdown order={order} editable />
            <CustomerForm onSubmit={handlePlaceOrder} />
          </div>
        </div>
      </main>
    </div>
  );
}
