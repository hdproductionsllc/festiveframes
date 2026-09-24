import { ACTIVITIES } from "@/data/activities";

// ─── "40+ activities" — one number, derived ──────────────────────────────────
//
// The homepage said "60+ activity badges" and the school landing said "30+
// activities" on the same day, both typed by hand. The number a parent can
// actually pick from is the builder's own activity list, so both surfaces read
// it from there, rounded DOWN to the ten so the claim stays true as the list
// shrinks as well as grows.

export const ACTIVITY_COUNT_LABEL = `${Math.floor(ACTIVITIES.length / 10) * 10}+`;
