import { it } from "vitest";
import { parseSchoolPage } from "./index";
import { EDLIO_PAGE } from "./__fixtures__/edlio-page";
import { WORDPRESS_PAGE } from "./__fixtures__/wordpress-page";
import { FAVICON_ONLY_PAGE } from "./__fixtures__/favicon-only-page";
import { ILLUSTRATOR_SVG_PAGE } from "./__fixtures__/illustrator-svg-page";
import { VENDOR_MARK_PAGE } from "./__fixtures__/vendor-mark-page";

const show = (label: string, html: string, url: string) => {
  const p = parseSchoolPage(html, url);
  console.log(`\n===== ${label} =====`);
  console.log("platform", p.platform, p.platformConfidence.toFixed(2), p.platformSignals);
  console.log("names", p.names.map((n) => `${n.value} :: ${n.confidence.toFixed(2)} :: ${n.source}`));
  console.log("mottos", p.mottos.map((n) => `${n.value} :: ${n.confidence.toFixed(2)} :: ${n.source}`));
  console.log("mascots", p.mascots.map((n) => `${n.value} :: ${n.confidence.toFixed(2)} :: ${n.source}`));
  console.log("colors", p.colors.map((c) => `${c.hex} ${c.role} ${c.confidence.toFixed(2)} ${c.source} n=${c.hits}`));
  console.log("logos", p.logos.map((l) => `${l.score} ${l.kind} ${l.url || l.source}`));
  console.log("dropped", p.droppedLogos.map((l) => `${l.dropped} ${l.kind} ${l.url || l.source}`));
  console.log("hints", p.imageHints, "empty", p.empty, p.emptyState?.headline);
  console.log("warnings", p.warnings);
};

it("dump", () => {
  show("edlio", EDLIO_PAGE, "https://www.lincolnhs.org/");
  show("wordpress", WORDPRESS_PAGE, "https://westbrookms.org/");
  show("favicon", FAVICON_ONLY_PAGE, "https://riverbendcharter.org/");
  show("illustrator", ILLUSTRATOR_SVG_PAGE, "https://mesaverdeacademy.org/");
  show("vendor", VENDOR_MARK_PAGE, "https://marshallhs.org/");
});
