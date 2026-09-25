import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * NO PRICE ON ANY SCHOOL-FACING SURFACE.
 *
 * The pilot price IS owner-confirmed now ($24.95, $5 of it to the school — see
 * config/offers.ts). What is not done is the one end-to-end test payment that
 * opens checkout (SCHOOL_CHECKOUT_OPEN), so the published path is still
 * send-your-design and we follow up with ordering details. Until checkout opens,
 * a figure on a school surface quotes a price nobody can pay yet, and the owner's
 * call is that school pages show no figure until then. When checkout opens, this
 * test is the place to decide deliberately where the confirmed price may appear.
 *
 * It then leaked back in anyway, in four places at once, because each addition
 * looked harmless on its own: "$10 per frame" on the homepage panel, the same on
 * the booster page, a donation figure in the share message that gets forwarded
 * into parent group chats, and — worst — a graduate "Order" button wired straight
 * past the parked guard to Stripe.
 *
 * A number in any of these gets forwarded and repeated before we can stand behind
 * it at checkout, so this fails the build rather than relying on anyone
 * remembering.
 *
 * NOTE: /build is a different, live product with confirmed pricing ($39/$69).
 * Only school surfaces are covered here.
 */

const ROOT = process.cwd();

const SURFACES = [
  "src/app/school",
  "src/app/s",
  "src/app/(home)/_components/SchoolSpotlight.tsx",
  "src/components/school",
  "src/components/designer/school-builder-flow.css",
];

function filesUnder(rel: string): string[] {
  const abs = path.join(ROOT, rel);
  const st = statSync(abs, { throwIfNoEntry: false });
  if (!st) return [];
  if (st.isFile()) return [abs];
  return readdirSync(abs, { recursive: true, encoding: "utf8" })
    .map((f) => path.join(abs, f))
    .filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes(".test.") && statSync(f).isFile());
}

const FILES = SURFACES.flatMap(filesUnder);

describe("school surfaces carry no price", () => {
  it("found the files to check", () => {
    expect(FILES.length).toBeGreaterThan(5);
  });

  it.each(FILES.map((f) => [path.relative(ROOT, f), f] as const))(
    "%s shows no dollar figure",
    (_rel, file) => {
      const src = readFileSync(file, "utf8");
      // Strip comments: the explanations above and in the source deliberately
      // mention the figures they are banning.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      const hits = [...code.matchAll(/\$\s?\d[\d,.]*/g)].map((m) => m[0]);
      expect(hits, `price literal in ${path.relative(ROOT, file)}`).toEqual([]);
    },
  );

  it("no school surface imports the offer config", () => {
    // The figure can arrive as `schoolOffer.schoolDonationCents` just as easily
    // as a literal; only the checkout API has any business reading it.
    for (const file of FILES) {
      const src = readFileSync(file, "utf8");
      expect(src.includes("@/config/offers"), `${path.relative(ROOT, file)} imports offers`).toBe(false);
    }
  });

  it("the builder's own Send sends the design and never starts checkout", () => {
    const src = readFileSync(path.join(ROOT, "src/components/designer/SchoolDesigner.tsx"), "utf8");
    // handleBuy still exists for the flip back once pricing is confirmed, but
    // nothing user-reachable may call it while the header's guard is `false`.
    // Every Send on the page opens the send sheet (contact first); the sheet sends.
    expect(src).toContain("onClick={() => void openSend()}");
    expect(src).toContain("onSend={(contact, opts) => void handleSubmit(contact, opts)}");
    expect(src).not.toContain("onSend={handleBuy}");
    expect(src).not.toContain("onOrder={handleBuy}");
  });
});
