/**
 * Maps state abbreviations to their standard license plate image filename
 * from the GitHub repo: jonkeegan/us-license-plates
 *
 * URL pattern: https://raw.githubusercontent.com/jonkeegan/us-license-plates/main/plates/{STATE}/{filename}
 *
 * States without a mapped image will fall back to the CSS-rendered plate.
 */

const REPO_BASE = "https://raw.githubusercontent.com/jonkeegan/us-license-plates/main/plates";

// High-quality local plates in /public/plates/ (Wikimedia Commons, CC-BY-SA)
const localPlates: Record<string, string> = {
  CA: "/plates/california.jpg",
  MO: "/plates/missouri.jpg",
};

const plateImageFiles: Record<string, string> = {
  AL: "Alabama_Standard_Plate.jpg",
  AK: "blue-n-gold.png",
  AZ: "AZ_Base.png",
  AR: "passenger.jpg",
  CO: "co-passenger.png",
  CT: "ct-standard.jpg",
  // DE: GIF-only in repo — use CSS fallback (better quality)
  DC: "dc-standard.jpg",
  FL: "FL_image-001.jpg",
  GA: "ga-standard.jpg",
  HI: "hi-rainbow.png",
  ID: "id-standard.jpg",
  IL: "il-standard.jpg",
  IN: "in-standard.jpg",
  IA: "ia-standard.jpg",
  KS: "ks-standard.jpg",
  KY: "ky-standard.jpg",
  LA: "la-standard.jpg",
  ME: "me-standard.jpg",
  MD: "md-standard.jpg",
  MA: "ma-standard.jpg",
  MI: "mi-standard.jpg",
  MN: "mn-standard.jpg",
  MS: "ms-standard.jpg",
  // MO: local high-res photo in /public/plates/missouri.jpg
  MT: "mt-standard.jpg",
  NE: "ne-standard.jpg",
  NV: "nv-standard.jpg",
  NH: "nh-standard.jpg",
  NJ: "nj-standard.jpg",
  NM: "nm-standard.jpg",
  NY: "excelsior_embossed_plate_3d_master.jpg",
  NC: "nc-standard.jpg",
  ND: "nd-standard.jpg",
  OH: "oh-standard.jpg",
  OK: "ok-standard.jpg",
  OR: "or-standard.jpg",
  PA: "pa-standard.jpg",
  RI: "ri-standard.jpg",
  SC: "sc-standard.jpg",
  SD: "sd-standard.jpg",
  TN: "tn-standard.jpg",
  TX: "auto.LoneStarSilver.png",
  UT: "ut-standard.jpg",
  VT: "vt-standard.jpg",
  VA: "va-standard.jpg",
  WA: "wa-standard.jpg",
  WV: "wv-standard.jpg",
  WI: "wi-standard.jpg",
  WY: "wy-standard.jpg",
};

export function getPlateImageUrl(stateAbbr: string): string | null {
  // Prefer high-quality local images
  if (localPlates[stateAbbr]) return localPlates[stateAbbr];
  const filename = plateImageFiles[stateAbbr];
  if (!filename) return null;
  return `${REPO_BASE}/${stateAbbr}/${filename}`;
}
