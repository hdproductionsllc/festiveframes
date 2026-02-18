import type { CouponDefinition } from "@/lib/constants/coupons";
import type { TileSetLineItem } from "@/stores/order-store";

export interface PricingResult {
  subtotal: number;
  discount: number;
  total: number;
}

export function computePricing(
  frameBasePrice: number,
  includeFrame: boolean,
  tileSetLineItems: TileSetLineItem[],
  coupon: CouponDefinition | null
): PricingResult {
  const tileTotal = tileSetLineItems.reduce((sum, item) => sum + item.price, 0);
  const subtotal = (includeFrame ? frameBasePrice : 0) + tileTotal;

  let discount = 0;
  if (coupon) {
    discount =
      coupon.type === "percent"
        ? subtotal * (coupon.value / 100)
        : coupon.value;
    // Round discount to 2 decimal places
    discount = Math.round(discount * 100) / 100;
  }

  const total = Math.max(0, subtotal - discount);

  return { subtotal, discount, total };
}
