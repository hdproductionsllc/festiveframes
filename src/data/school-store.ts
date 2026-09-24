import { kitSections, kitPlateState, type SchoolKit } from "@/data/school-kits";
import { kitMarkPair, kitSeedTiles } from "@/data/kit-seed";
import { schoolVariant, type SchoolVariantId } from "@/data/school-variants";
import { SCHOOL_DEFAULT_SECTIONS } from "@/lib/constants/defaults";
import { migrateSchoolDesign } from "@/lib/utils/school-migration";
import type { DesignStoreOptions } from "@/stores/design-store";
import type { FrameConfig } from "@/lib/types";
import { SITE_URL } from "@/config/season";
import { getPiece } from "@/data/sets";
import type { KitMarkUpgrade } from "@/lib/utils/kit-marks-upgrade";

/**
 * THE options a school builder's store is created with — the one definition.
 *
 * `SchoolBuilder` builds its store from this, and so do the node renders that
 * claim to show what a parent gets (kit-sample, pilot-samples). They used to
 * re-type it: kit-sample once passed only `frameColor` and rendered every school's
 * badges on stock navy, and the builder's own exports once dropped `tileFieldColor`
 * and `rimColor`. A render that seeds a store any other way is not a sample of the
 * product, so there is no other way.
 *
 * A KIT parameterizes, never forks: same engine, same geometry, same migrations —
 * the kit only supplies seeds (colours, banner text, badges, plate state). Every
 * seed is INITIAL STATE ONLY; a returning user's persisted design wins on hydrate.
 * `frameConfig` is the exception, owned by the store (see DesignStoreOptions).
 */
export function schoolStoreOptions({
  kit,
  variant,
  frameConfig = schoolVariant(variant).config,
}: {
  kit?: SchoolKit;
  variant?: SchoolVariantId;
  /** Override the variant's geometry. Tests and the odd experiment only. */
  frameConfig?: FrameConfig;
}): DesignStoreOptions {
  return {
    frameConfig,
    // School-only persist migration: the wing trim (3 tile columns per side → 1)
    // invalidated slot ids that are still valid on /build.
    migrateExtra: migrateSchoolDesign,
    // Top/bottom start as TEXT banners — kit-branded when there is a kit.
    sections: kit ? kitSections(kit) : SCHOOL_DEFAULT_SECTIONS,
    // DERIVED from the kit's signature badges against this frame's own side
    // column (data/kit-seed.ts). Kits name no slot ids.
    initialSlots: kit ? kitSeedTiles(kit, frameConfig) : undefined,
    // A design saved before this school had its own marks gets them once.
    markUpgrade: kit ? kitMarkUpgrade(kit) : undefined,
    // Read off the kit's city, so a school outside Missouri opens on its own plate.
    initialPlateState: kitPlateState(kit) ?? undefined,
    // A banner QR (latent: the school builder has no QR toggle yet) points at
    // this school's own builder, or the MySchoolFrame front door without a kit.
    initialQrUrl: `${SITE_URL}${kit ? `/s/${kit.slug}` : ""}`,
    // All THREE brand colours. Leaving out tileFieldColor or rimColor puts the
    // badges on stock navy and brass while the banners wear the school's colour.
    initialBrand: kit
      ? {
          frameColor: kit.colors.frame,
          tileFieldColor: kit.colors.tileField,
          rimColor: kit.colors.rim,
        }
      : undefined,
  };
}

/**
 * What a saved design needs to catch up with this school's own marks: the
 * banner crest a fresh design seeds, and the school's pieces in place of the
 * generic stand-ins the same kit was seeded with before it had marks. Both pairs
 * come from `kitMarkPair`, the rule the seed itself uses, so an upgraded design
 * is the frame a new visitor gets rather than a second opinion of it. Undefined
 * when the kit has no marks: there is nothing to bring in.
 */
function kitMarkUpgrade(kit: SchoolKit): KitMarkUpgrade | undefined {
  if (!kit.marks?.badges?.length) return undefined;
  const tile = (id: string) => ({ pieceId: id, setId: getPiece(id)?.setId ?? id.split(":")[0] });
  const own = kitMarkPair(kit);
  const standIns = kitMarkPair(kit, { ownMarks: false });
  const replace: KitMarkUpgrade["replace"] = {};
  standIns.forEach((id, i) => {
    replace[id] = tile(own[i]);
  });
  return { crestLogo: kitSections(kit).bottom?.text?.logo, replace };
}
