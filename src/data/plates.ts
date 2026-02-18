export interface PlateStripe {
  position: "top" | "bottom";
  color: string;
  height: string; // percentage like "8%"
}

export interface PlateDesign {
  state: string;
  abbr: string;
  motto?: string;
  stateFontStyle?: "script" | "serif" | "block" | "normal";
  bgColor: string;
  bgGradient?: string;
  textColor: string;
  numberColor: string;
  accentColor?: string;
  borderColor: string;
  stripes?: PlateStripe[];
  bottomAccent?: string; // color for a bottom decorative band
}

export const plateDesigns: PlateDesign[] = [
  // Alabama — white, "Heart of Dixie" at bottom, red numbers
  { state: "Alabama", abbr: "AL", motto: "Heart of Dixie", stateFontStyle: "block", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F8 100%)", textColor: "#CC0000", numberColor: "#1a1a1a", accentColor: "#CC0000", borderColor: "#CC0000", stripes: [{ position: "top", color: "#CC0000", height: "5%" }] },
  // Alaska — gold/yellow background, dark blue text, "The Last Frontier"
  { state: "Alaska", abbr: "AK", motto: "The Last Frontier", stateFontStyle: "block", bgColor: "#FFD700", bgGradient: "linear-gradient(180deg, #FFD700 0%, #F0C800 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // Arizona — white with desert sunset gradient at bottom, maroon text
  { state: "Arizona", abbr: "AZ", motto: "Grand Canyon State", stateFontStyle: "serif", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 45%, #FFE8B0 60%, #FFB870 75%, #E87040 90%, #C84030 100%)", textColor: "#8B0000", numberColor: "#8B0000", accentColor: "#E87040", borderColor: "#8B0000" },
  // Arkansas — white, "The Natural State", red/blue accents
  { state: "Arkansas", abbr: "AR", motto: "The Natural State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F0 100%)", textColor: "#CC0000", numberColor: "#1a1a1a", accentColor: "#CC0000", borderColor: "#CC0000", stripes: [{ position: "top", color: "#CC0000", height: "4%" }, { position: "bottom", color: "#CC0000", height: "4%" }] },
  // California — white, red top stripe, script "CALIFORNIA" in navy
  { state: "California", abbr: "CA", motto: "", stateFontStyle: "script", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)", textColor: "#1B3264", numberColor: "#1B3264", accentColor: "#CC0000", borderColor: "#CC0000", stripes: [{ position: "top", color: "#CC0000", height: "6%" }] },
  // Colorado — white with green mountain silhouette
  { state: "Colorado", abbr: "CO", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 55%, #C8E0C0 70%, #5A9A5A 85%, #3D7A3D 100%)", textColor: "#2D5A2D", numberColor: "#2D5A2D", accentColor: "#2D5A2D", borderColor: "#2D5A2D" },
  // Connecticut — white/blue, "Constitution State"
  { state: "Connecticut", abbr: "CT", motto: "Constitution State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #E8EFF8 0%, #FFFFFF 50%, #E8EFF8 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // Delaware — buff/gold, "The First State"
  { state: "Delaware", abbr: "DE", motto: "The First State", stateFontStyle: "serif", bgColor: "#F0DEB0", bgGradient: "linear-gradient(180deg, #F0DEB0 0%, #E4D098 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#C4A44A", borderColor: "#1B3A6B" },
  // Florida — white with orange/sunrise and green
  { state: "Florida", abbr: "FL", motto: "Sunshine State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFF8E0 30%, #FFE0A0 50%, #FFFFFF 70%, #E8F5E0 100%)", textColor: "#2D6B2D", numberColor: "#2D6B2D", accentColor: "#FF8C00", borderColor: "#2D6B2D" },
  // Georgia — white with peach tint
  { state: "Georgia", abbr: "GA", motto: "", stateFontStyle: "serif", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFF5EC 0%, #FFFFFF 40%, #FFF0E0 100%)", textColor: "#1a1a1a", numberColor: "#CC0000", accentColor: "#E87040", borderColor: "#1a1a1a" },
  // Hawaii — rainbow state, white with rainbow stripe
  { state: "Hawaii", abbr: "HI", motto: "Aloha State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 100%)", textColor: "#1a1a1a", numberColor: "#1a1a1a", accentColor: "#FFD700", borderColor: "#1a1a1a", stripes: [{ position: "top", color: "linear-gradient(90deg, #CC0000, #FF8C00, #FFD700, #2D8B46, #1B4DFF, #6A0DAD)", height: "6%" }] },
  // Idaho — white/scenic, "Famous Potatoes"
  { state: "Idaho", abbr: "ID", motto: "Famous Potatoes", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #D8E8FF 0%, #FFFFFF 35%, #E8F0E0 60%, #FFFFFF 100%)", textColor: "#CC0000", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // Illinois — white, "Land of Lincoln", blue/red
  { state: "Illinois", abbr: "IL", motto: "Land of Lincoln", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)", textColor: "#CC0000", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B", stripes: [{ position: "top", color: "#1B3A6B", height: "4%" }, { position: "bottom", color: "#1B3A6B", height: "4%" }] },
  // Indiana — white, "In God We Trust"
  { state: "Indiana", abbr: "IN", motto: "In God We Trust", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F5F5FF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Iowa — white, red text
  { state: "Iowa", abbr: "IA", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)", textColor: "#CC0000", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1a1a1a" },
  // Kansas — white/wheat tint
  { state: "Kansas", abbr: "KS", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #E8F0FF 0%, #FFFFFF 40%, #FFF8E0 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Kentucky — blue tint, "Bluegrass State"
  { state: "Kentucky", abbr: "KY", motto: "Bluegrass State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #E0E8FF 0%, #FFFFFF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B", stripes: [{ position: "top", color: "#1B3A6B", height: "4%" }] },
  // Louisiana — white, "Sportsman's Paradise"
  { state: "Louisiana", abbr: "LA", motto: "Sportsman's Paradise", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8FFF8 100%)", textColor: "#1a1a1a", numberColor: "#1a1a1a", accentColor: "#2D6B2D", borderColor: "#1a1a1a" },
  // Maine — white, "Vacationland", lobster red
  { state: "Maine", abbr: "ME", motto: "Vacationland", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F4F8 100%)", textColor: "#1B3A6B", numberColor: "#CC0000", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Maryland — white, black/gold accents
  { state: "Maryland", abbr: "MD", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F0 100%)", textColor: "#1a1a1a", numberColor: "#1a1a1a", accentColor: "#CC0000", borderColor: "#1a1a1a", stripes: [{ position: "top", color: "#CC0000", height: "4%" }, { position: "bottom", color: "#FFD700", height: "4%" }] },
  // Massachusetts — white, red text
  { state: "Massachusetts", abbr: "MA", motto: "The Spirit of America", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F8F0 100%)", textColor: "#CC0000", numberColor: "#CC0000", accentColor: "#1B3A6B", borderColor: "#CC0000" },
  // Michigan — white/blue, "Pure Michigan"
  { state: "Michigan", abbr: "MI", motto: "Pure Michigan", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 50%, #D0E8FF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // Minnesota — white/blue, "10,000 Lakes"
  { state: "Minnesota", abbr: "MN", motto: "10,000 Lakes", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #D8E8FF 0%, #FFFFFF 40%, #E0F0E0 70%, #FFFFFF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // Mississippi — white, "In God We Trust"
  { state: "Mississippi", abbr: "MS", motto: "In God We Trust", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #E8F0FF 0%, #FFFFFF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Missouri — white, "Show-Me State"
  { state: "Missouri", abbr: "MO", motto: "Show-Me State", stateFontStyle: "block", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #E0E8F8 0%, #FFFFFF 100%)", textColor: "#1B3A6B", numberColor: "#CC0000", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Montana — white/scenic, mountain
  { state: "Montana", abbr: "MT", motto: "Big Sky Country", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #B8D8FF 0%, #FFFFFF 30%, #FFFFFF 55%, #D8C8A0 75%, #A08850 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#8B6914", borderColor: "#1B3A6B" },
  // Nebraska — white
  { state: "Nebraska", abbr: "NE", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)", textColor: "#1B3A6B", numberColor: "#CC0000", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Nevada — silver/blue
  { state: "Nevada", abbr: "NV", motto: "The Silver State", stateFontStyle: "normal", bgColor: "#E8E8F0", bgGradient: "linear-gradient(180deg, #D0D8E8 0%, #E8E8F0 40%, #D0D8E8 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#C0C0C0", borderColor: "#1B3A6B" },
  // New Hampshire — green, "Live Free or Die"
  { state: "New Hampshire", abbr: "NH", motto: "Live Free or Die", stateFontStyle: "block", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F8F0 100%)", textColor: "#2D5A2D", numberColor: "#2D5A2D", accentColor: "#2D5A2D", borderColor: "#2D5A2D" },
  // New Jersey — buff/cream, "Garden State"
  { state: "New Jersey", abbr: "NJ", motto: "Garden State", stateFontStyle: "normal", bgColor: "#F5E6AA", bgGradient: "linear-gradient(180deg, #F5E6AA 0%, #E8D488 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // New Mexico — yellow, "Land of Enchantment", red zia symbol
  { state: "New Mexico", abbr: "NM", motto: "Land of Enchantment", stateFontStyle: "normal", bgColor: "#FFD700", bgGradient: "linear-gradient(180deg, #FFD700 0%, #FFCC00 100%)", textColor: "#CC0000", numberColor: "#CC0000", accentColor: "#CC0000", borderColor: "#CC0000" },
  // New York — gold-to-white-to-blue
  { state: "New York", abbr: "NY", motto: "Excelsior", stateFontStyle: "block", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFE066 0%, #FFF0A0 15%, #FFFFFF 35%, #FFFFFF 65%, #C0D8F0 85%, #1B3A6B 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#FFD700", borderColor: "#1B3A6B" },
  // North Carolina — red top stripe, blue bottom stripe, "First in Flight"
  { state: "North Carolina", abbr: "NC", motto: "First in Flight", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 100%)", textColor: "#CC0000", numberColor: "#CC0000", accentColor: "#1B3A6B", borderColor: "#CC0000", stripes: [{ position: "top", color: "#CC0000", height: "7%" }, { position: "bottom", color: "#1B3A6B", height: "7%" }] },
  // North Dakota — white, "Peace Garden State"
  { state: "North Dakota", abbr: "ND", motto: "Peace Garden State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Ohio — white, red/blue, "Birthplace of Aviation"
  { state: "Ohio", abbr: "OH", motto: "Birthplace of Aviation", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FF 100%)", textColor: "#CC0000", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#CC0000", stripes: [{ position: "top", color: "#CC0000", height: "5%" }] },
  // Oklahoma — white, "Native America"
  { state: "Oklahoma", abbr: "OK", motto: "Native America", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #E8F0FF 0%, #FFFFFF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Oregon — gold/yellow
  { state: "Oregon", abbr: "OR", motto: "", stateFontStyle: "normal", bgColor: "#F0D860", bgGradient: "linear-gradient(180deg, #F0D860 0%, #E8C840 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // Pennsylvania — blue-to-yellow
  { state: "Pennsylvania", abbr: "PA", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #D0E0FF 0%, #FFFFFF 40%, #FFFFFF 60%, #FFF0C0 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#FFD700", borderColor: "#1B3A6B" },
  // Rhode Island — white/blue, "Ocean State"
  { state: "Rhode Island", abbr: "RI", motto: "Ocean State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #E0F0FF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // South Carolina — white
  { state: "South Carolina", abbr: "SC", motto: "While I Breathe, I Hope", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F8F0 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#1B3A6B", borderColor: "#1B3A6B" },
  // South Dakota — "Great Faces. Great Places."
  { state: "South Dakota", abbr: "SD", motto: "Great Faces. Great Places.", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #E0E8F8 0%, #FFFFFF 40%, #F8F0D8 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Tennessee — white/green
  { state: "Tennessee", abbr: "TN", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F8F0 100%)", textColor: "#2D5A2D", numberColor: "#2D5A2D", accentColor: "#CC0000", borderColor: "#2D5A2D", stripes: [{ position: "top", color: "#CC0000", height: "4%" }, { position: "bottom", color: "#2D5A2D", height: "4%" }] },
  // Texas — white, clean, "The Lone Star State"
  { state: "Texas", abbr: "TX", motto: "The Lone Star State", stateFontStyle: "block", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F8 100%)", textColor: "#1a1a1a", numberColor: "#1a1a1a", accentColor: "#CC0000", borderColor: "#1a1a1a" },
  // Utah — red top, white middle, arches brown bottom
  { state: "Utah", abbr: "UT", motto: "Life Elevated", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC3333", borderColor: "#CC3333", stripes: [{ position: "top", color: "#CC3333", height: "12%" }, { position: "bottom", color: "#D4A050", height: "12%" }] },
  // Vermont — green
  { state: "Vermont", abbr: "VT", motto: "Green Mountain State", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 50%, #D0E8D0 75%, #90C090 100%)", textColor: "#2D5A2D", numberColor: "#2D5A2D", accentColor: "#2D5A2D", borderColor: "#2D5A2D" },
  // Virginia — white — the ONLY US state with serif plate typography
  { state: "Virginia", abbr: "VA", motto: "Virginia is for Lovers", stateFontStyle: "serif", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F5F5FF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#CC0000", borderColor: "#1B3A6B" },
  // Washington — white with green/blue scenic
  { state: "Washington", abbr: "WA", motto: "", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 40%, #D0E8D0 65%, #4A8A4A 80%, #2D6B2D 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#2D5A2D", borderColor: "#1B3A6B" },
  // West Virginia — gold top/blue bottom stripe
  { state: "West Virginia", abbr: "WV", motto: "Wild, Wonderful", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 100%)", textColor: "#1B3A6B", numberColor: "#1B3A6B", accentColor: "#FFD700", borderColor: "#1B3A6B", stripes: [{ position: "top", color: "#FFD700", height: "8%" }, { position: "bottom", color: "#1B3A6B", height: "8%" }] },
  // Wisconsin — white, "America's Dairyland"
  { state: "Wisconsin", abbr: "WI", motto: "America's Dairyland", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)", textColor: "#1a1a1a", numberColor: "#CC0000", accentColor: "#CC0000", borderColor: "#1a1a1a" },
  // Wyoming — gold borders, bucking horse
  { state: "Wyoming", abbr: "WY", motto: "Equal Rights", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8F8F0 100%)", textColor: "#1a1a1a", numberColor: "#1a1a1a", accentColor: "#8B4513", borderColor: "#1a1a1a", stripes: [{ position: "top", color: "#D4A030", height: "6%" }, { position: "bottom", color: "#D4A030", height: "6%" }] },
  // DC — white, red text
  { state: "Washington D.C.", abbr: "DC", motto: "Taxation Without Representation", stateFontStyle: "normal", bgColor: "#FFFFFF", bgGradient: "linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)", textColor: "#CC0000", numberColor: "#CC0000", accentColor: "#1B3A6B", borderColor: "#CC0000" },
];

const plateMap = new Map(plateDesigns.map((p) => [p.abbr, p]));

export function getPlateDesign(abbr: string): PlateDesign | undefined {
  return plateMap.get(abbr);
}
