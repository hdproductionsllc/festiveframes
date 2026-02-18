"use client";

import { useState } from "react";
import { useOrderStore } from "@/stores/order-store";
import { lookupCoupon } from "@/lib/constants/coupons";

export function CouponInput() {
  const appliedCoupon = useOrderStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useOrderStore((s) => s.setAppliedCoupon);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleApply() {
    const coupon = lookupCoupon(input);
    if (coupon) {
      setAppliedCoupon(coupon);
      setInput("");
      setError("");
    } else {
      setError("Invalid coupon code");
    }
  }

  function handleRemove() {
    setAppliedCoupon(null);
    setError("");
  }

  if (appliedCoupon) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1 text-xs font-medium text-green-400">
          {appliedCoupon.code} &mdash; {appliedCoupon.label}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Coupon code"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          className="flex-1 rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-surface-100
            placeholder:text-surface-500 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/25 transition-colors"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={!input.trim()}
          className="rounded-lg bg-surface-700 px-3 py-2 text-sm font-medium text-surface-200
            hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Apply
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
