/**
 * Is the Festive Frames holiday shop open? The ONE switch.
 *
 * CLOSED since 2026-09-26 (Henry: "Festive Frames is defunct"). While false:
 *   - /api/checkout refuses holiday orders ("custom-frame", "cart") with 410,
 *   - /api/order/draft (the holiday checkout's first step) refuses with 410,
 *   - /build, /cart, /checkout and /buy redirect to /school (next.config.ts).
 * The holiday code stays in the project, so reopening is this one line. School
 * checkout has its own switch (config/school-checkout.ts) and is unaffected.
 */
export const HOLIDAY_SHOP_OPEN: boolean = false;
