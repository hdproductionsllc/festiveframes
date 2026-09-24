/**
 * No MySchoolFrame surface carries the holiday product's domain.
 *
 * Owner, 2026-09-23: school mail goes to bill@myschoolframe.com, and "there should
 * essentially be no trace of festiveframes.co at all" on MySchoolFrame. The two
 * products share one deployment, so the old address creeps back the easy way — a
 * fallback copied from the holiday code, a contact derived from the holiday copy,
 * a scanner User-Agent nobody reads. This test reads every MySchoolFrame source
 * file and fails on the first `festiveframes` it finds.
 *
 * Scope is the files a school parent, a school, or MySchoolFrame's own inbox can
 * see the output of: the school routes, their components, the brand scanner that
 * introduces itself to school web servers, the school order/request mail and the
 * shared infrastructure it sends through. Test files are skipped (they may name the
 * domain to assert its absence). The Festive Frames holiday product is out of
 * scope on purpose and is left exactly as it is.
 *
 * Source text cannot see a brand NAME that arrives through a layout, a title
 * template or a metadata default. `app/school/msf-pages.test.ts` renders the
 * MySchoolFrame warranty, terms, privacy, thanks and 404 pages and fails on
 * either form of the holiday brand.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { SITE_URL } from "@/config/season";
import { getSchoolKit } from "@/data/school-kits";
import { PILOT_SCHOOL_SLUGS } from "@/data/school-pilot";
import { schoolStoreOptions } from "@/data/school-store";
import { createDesignStore } from "@/stores/design-store";

const ROOT = join(__dirname, "..", "..");
const FORBIDDEN = /festiveframes/i;

/** Directories that are MySchoolFrame through and through (read recursively). */
const SURFACE_DIRS = [
  "src/app/school",
  "src/app/s",
  "src/app/lab/school",
  "src/app/api/school",
  "src/components/school",
  "src/lib/school-brand",
];

/** Single files: school components that live beside holiday ones, school data and
 *  content, and the shared infrastructure school mail and pages go through. */
const SURFACE_FILES = [
  "src/components/designer/SchoolDesigner.tsx",
  "src/components/designer/SchoolKitPage.tsx",
  "src/components/designer/SendDesignSheet.tsx",
  "src/components/designer/SchoolBrandImport.tsx",
  "src/components/designer/UploadRightsGate.tsx",
  "src/components/designer/GraduateExpress.tsx",
  "src/content/school-contact.ts",
  "src/content/upload-rights.ts",
  "src/content/school-activity-count.ts",
  "src/content/msf-pages.ts",
  // Shared with the holiday product, but it renders MySchoolFrame's /school/thanks.
  "src/components/site/thanks/OrderFulfiller.tsx",
  "src/lib/order/thanks-order.ts",
  "src/lib/email-msf.ts",
  // Shared with the holiday product, but it renders every MySchoolFrame email.
  "src/lib/email-production.ts",
  "src/lib/order/fulfill.ts",
  "src/lib/order/order-contact.ts",
  "src/lib/order/artwork-rights.ts",
  "src/lib/order/square-badges.ts",
  "src/lib/order/school-ledger.ts",
  "src/lib/school-requests.ts",
  "src/config/school-checkout.ts",
  "src/config/offers.ts",
  "src/config/season.ts",
  "src/data/school-kits.ts",
  "src/data/school-pilot.ts",
  "src/data/school-presets.ts",
  "src/data/school-resolve.ts",
  "src/data/school-store.ts",
  "src/data/school-variants.ts",
  "src/data/school-phrases.ts",
  "src/data/thin-kit.ts",
];

/**
 * Files in scope that may name the domain, each with the reason. Every entry must
 * still need its exemption (checked below), so the list cannot quietly go stale.
 */
const ALLOWLIST: Record<string, string> = {
  "src/config/season.ts":
    "Shared infra. A COMMENT records that festiveframes.co 301-redirects to SITE_URL at the Cloudflare edge; SITE_URL itself is myschoolframe.com. History, not a value anything renders.",
};

const SOURCE = /\.(tsx?|css|svg|mjs|js|txt|json)$/;

function walk(dir: string): string[] {
  const abs = join(ROOT, dir);
  return readdirSync(abs).flatMap((name) => {
    const full = join(abs, name);
    const rel = relative(ROOT, full).split(sep).join("/");
    if (statSync(full).isDirectory()) return name === "__fixtures__" ? [] : walk(rel);
    return SOURCE.test(name) && !/\.test\.[tj]sx?$/.test(name) ? [rel] : [];
  });
}

const files = [...new Set([...SURFACE_DIRS.flatMap(walk), ...SURFACE_FILES])].sort();

describe("MySchoolFrame surfaces carry no festiveframes.co", () => {
  it("every named surface file still exists (a rename must not shrink the scan)", () => {
    for (const f of [...SURFACE_DIRS, ...SURFACE_FILES]) {
      expect(existsSync(join(ROOT, f)), `${f} is gone: update this test's scope`).toBe(true);
    }
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files.filter((f) => !(f in ALLOWLIST)))("%s", (f) => {
    const lines = readFileSync(join(ROOT, f), "utf8").split("\n");
    const hits = lines.flatMap((l, i) => (FORBIDDEN.test(l) ? [`${f}:${i + 1}: ${l.trim()}`] : []));
    expect(hits, "a MySchoolFrame surface names festiveframes; use SCHOOL_CONTACT_EMAIL / lib/email-msf").toEqual([]);
  });

  it.each(Object.keys(ALLOWLIST))("allowlisted %s still needs its exemption", (f) => {
    expect(files, `${f} is allowlisted but no longer in scope`).toContain(f);
    expect(readFileSync(join(ROOT, f), "utf8"), `${f} no longer names the domain; drop it from ALLOWLIST`).toMatch(FORBIDDEN);
  });
});

// Values, not just source text: a school store DERIVES its QR address from a
// default, and a default copied from the holiday product would never show up in
// the scan above. DEFAULT_QR_CODE is festiveframes.co on purpose (/build).
describe("a school design's QR points at MySchoolFrame", () => {
  it.each([
    ["an authored kit", PILOT_SCHOOL_SLUGS[0]],
    ["no kit (the generic builder)", undefined],
  ])("%s", (_label, slug) => {
    const kit = slug ? getSchoolKit(slug) : undefined;
    const store = createDesignStore(`qr-guard:${slug ?? "none"}`, schoolStoreOptions({ kit }));
    const { url } = store.getState().qrCode;
    expect(url).not.toMatch(FORBIDDEN);
    expect(url).toBe(`${SITE_URL}${kit ? `/s/${kit.slug}` : ""}`);
  });
});
