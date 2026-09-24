import { describe, it, expect } from "vitest";
import { placedPreviewPx } from "./uploads";
import { schoolVariant, SCHOOL_SHIPPING_VARIANT } from "@/data/school-variants";
import { largestBadgeInches } from "./snappet";
import { SCHOOL_PRINT_DPI } from "@/lib/constants/frame";

/**
 * The placed photo's own copy is print's FALLBACK: when IndexedDB has no original
 * (the write was refused, a private window, evicted site data) the composer prints
 * this url. A fixed 512px printed that fallback at 228 DPI on the 2.25" badge.
 */
describe("placedPreviewPx", () => {
  it("prints the shipping frame's largest badge at 300 DPI", () => {
    const config = schoolVariant(SCHOOL_SHIPPING_VARIANT).config;
    const inches = largestBadgeInches(config)!;
    expect(inches).toBeCloseTo(2.25, 6);
    const px = placedPreviewPx(config);
    expect(px).toBe(Math.ceil(inches * SCHOOL_PRINT_DPI));
    expect(px / inches).toBeGreaterThanOrEqual(300);
  });
});
