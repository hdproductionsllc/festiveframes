"use client";

import { useOrderStore, type OrderSnapshot } from "@/stores/order-store";
import { computePricing } from "@/lib/utils/pricing";
import { CouponInput } from "./CouponInput";

interface PricingBreakdownProps {
  order: OrderSnapshot;
  editable?: boolean;
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function PricingBreakdown({ order, editable = false }: PricingBreakdownProps) {
  const includeFrame = useOrderStore((s) => s.includeFrame);
  const setIncludeFrame = useOrderStore((s) => s.setIncludeFrame);
  const appliedCoupon = useOrderStore((s) => s.appliedCoupon);

  const { subtotal, discount, total } = computePricing(
    order.frameBasePrice,
    includeFrame,
    order.tileSetLineItems,
    appliedCoupon
  );

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-surface-100">
        Pricing
      </h3>

      <div className="space-y-2 text-sm">
        {/* Frame line */}
        <div className="flex items-center justify-between text-surface-300">
          <div className="flex items-center gap-2">
            {editable && (
              <button
                type="button"
                onClick={() => setIncludeFrame(!includeFrame)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
                  ${includeFrame ? "bg-brand-gold" : "bg-surface-600"}`}
                role="switch"
                aria-checked={includeFrame}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                    ${includeFrame ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            )}
            <span className={!includeFrame ? "line-through text-surface-500" : ""}>
              Custom frame
            </span>
          </div>
          <span className={!includeFrame ? "line-through text-surface-500" : ""}>
            {formatPrice(order.frameBasePrice)}
          </span>
        </div>

        {!includeFrame && (
          <p className="text-xs text-surface-500 italic ml-11">
            I already own a frame
          </p>
        )}

        {/* Tile sets */}
        {order.tileSetLineItems.map((item) => (
          <div key={item.setId} className="flex justify-between text-surface-300">
            <span>{item.setName} tile set</span>
            <span>{formatPrice(item.price)}</span>
          </div>
        ))}

        {/* Coupon input (editable only) */}
        {editable && (
          <div className="pt-1">
            <CouponInput />
          </div>
        )}

        {/* Discount line */}
        {appliedCoupon && discount > 0 && (
          <div className="flex justify-between text-green-400">
            <span>Discount ({appliedCoupon.label})</span>
            <span>&minus;{formatPrice(discount)}</span>
          </div>
        )}

        {/* Divider + total */}
        <div className="border-t border-surface-700 pt-2 flex justify-between font-semibold text-surface-50">
          <span>Total</span>
          <span className="text-brand-gold">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}
