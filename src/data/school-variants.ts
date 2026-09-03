import type { FrameConfig } from "@/lib/types";
import {
  SCHOOL_FLUSH_FRAME_CONFIG,
  SCHOOL_FRAME_CONFIG,
  SCHOOL_SLIM_FRAME_CONFIG,
} from "@/lib/constants/frame";
import { FLUSH_PRESETS, SCHOOL_PRESETS, SLIM_PRESETS, type SchoolPreset } from "@/data/school-presets";

// ─── Frame variants: a geometry and everything that belongs to it ────────────
//
// The school builder is one component wearing one of several physical frames.
// Until now a variant was a bare string on the persist key plus a `frameConfig`
// prop, and everything ELSE that depends on the geometry was inferred by sniffing
// the config — `frameConfig.bottomTab ? SLIM_PRESETS : SCHOOL_PRESETS` in two
// places. The flush fork also has a keystone, so that test would have handed it
// the slim frame's badge stack, computed against a grid it does not have. Nothing
// would have failed; the badges would have landed on the wrong rows.
//
// So a variant is a record: the config, the preset layouts computed against THAT
// config, and a label. Routes and kits name one by id; the builder resolves it
// here and never guesses. Adding a geometry means adding a row.

export type SchoolVariantId = "live" | "slim" | "flush";

export interface SchoolVariant {
  id: SchoolVariantId;
  /** Short, for a fork bar or a parts list. */
  label: string;
  config: FrameConfig;
  /** Start-from-a-design layouts, anchored on this variant's own grid. */
  presets: SchoolPreset[];
}

export const SCHOOL_VARIANTS: Record<SchoolVariantId, SchoolVariant> = {
  live: { id: "live", label: "Live frame", config: SCHOOL_FRAME_CONFIG, presets: SCHOOL_PRESETS },
  slim: { id: "slim", label: "Slim (half cantilever)", config: SCHOOL_SLIM_FRAME_CONFIG, presets: SLIM_PRESETS },
  flush: { id: "flush", label: "Flush 15 x 6.75", config: SCHOOL_FLUSH_FRAME_CONFIG, presets: FLUSH_PRESETS },
};

/** The variant for an id, defaulting to the live frame — which is what every
 *  route that says nothing has always meant. */
export function schoolVariant(id?: SchoolVariantId): SchoolVariant {
  return SCHOOL_VARIANTS[id ?? "live"];
}
