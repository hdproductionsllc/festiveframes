export interface CouponDefinition {
  code: string;
  label: string;
  type: "percent" | "fixed";
  value: number; // percent (0–100) or dollar amount
}

const COUPONS: CouponDefinition[] = [
  { code: "FESTIVE10", label: "10% off", type: "percent", value: 10 },
  { code: "WELCOME5", label: "$5 off", type: "fixed", value: 5 },
  { code: "HALFOFF", label: "50% off", type: "percent", value: 50 },
];

export function lookupCoupon(raw: string): CouponDefinition | null {
  const normalized = raw.trim().toUpperCase();
  return COUPONS.find((c) => c.code === normalized) ?? null;
}
