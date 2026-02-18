import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlacedTile, BottomBarConfig } from "@/lib/types";
import type { CouponDefinition } from "@/lib/constants/coupons";

export interface CustomerInfo {
  name: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface TileSetLineItem {
  setId: string;
  setName: string;
  price: number;
}

export interface OrderSnapshot {
  frameImageDataUrl: string;
  designName: string;
  bottomBarText: string;
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig;
  tileSetLineItems: TileSetLineItem[];
  frameBasePrice: number;
  total: number;
}

interface OrderState {
  order: OrderSnapshot | null;
  customer: CustomerInfo;
  submittedAt: number | null;
  includeFrame: boolean;
  appliedCoupon: CouponDefinition | null;

  setOrder: (order: OrderSnapshot) => void;
  setCustomer: (updates: Partial<CustomerInfo>) => void;
  setIncludeFrame: (include: boolean) => void;
  setAppliedCoupon: (coupon: CouponDefinition | null) => void;
  submitOrder: () => void;
  clear: () => void;
}

const emptyCustomer: CustomerInfo = {
  name: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zip: "",
};

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      order: null,
      customer: { ...emptyCustomer },
      submittedAt: null,
      includeFrame: true,
      appliedCoupon: null,

      setOrder: (order) =>
        set({ order, submittedAt: null, includeFrame: true, appliedCoupon: null }),

      setCustomer: (updates) =>
        set((state) => ({
          customer: { ...state.customer, ...updates },
        })),

      setIncludeFrame: (includeFrame) => set({ includeFrame }),

      setAppliedCoupon: (appliedCoupon) => set({ appliedCoupon }),

      submitOrder: () => set({ submittedAt: Date.now() }),

      clear: () =>
        set({
          order: null,
          customer: { ...emptyCustomer },
          submittedAt: null,
          includeFrame: true,
          appliedCoupon: null,
        }),
    }),
    {
      name: "festive-frames-order",
    }
  )
);
