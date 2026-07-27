import { describe, it, expect } from "vitest";
import { detectPlatform } from "./detect-platform";
import { parseSchoolPage } from "./index";
import { EDLIO_PAGE } from "./__fixtures__/edlio-page";
import { WORDPRESS_PAGE } from "./__fixtures__/wordpress-page";
import { FAVICON_ONLY_PAGE } from "./__fixtures__/favicon-only-page";
import { VENDOR_MARK_PAGE } from "./__fixtures__/vendor-mark-page";

describe("detectPlatform", () => {
  it("fingerprints the four platforms the fixtures cover", () => {
    expect(detectPlatform(EDLIO_PAGE).platform).toBe("edlio");
    expect(detectPlatform(WORDPRESS_PAGE).platform).toBe("wordpress");
    expect(detectPlatform(VENDOR_MARK_PAGE).platform).toBe("finalsite");
  });

  it("recognises apptegy and squarespace from their own markers", () => {
    expect(
      detectPlatform(`<html><body><script src="https://cmsv2-assets.apptegy.net/app.js"></script></body></html>`)
        .platform,
    ).toBe("apptegy");
    expect(
      detectPlatform(`<!-- This is Squarespace. --><html><body class="sqs-block"></body></html>`).platform,
    ).toBe("squarespace");
  });

  it("reports the signals that fired, so a wrong guess is debuggable", () => {
    const d = detectPlatform(EDLIO_PAGE);
    expect(d.signals).toContain("generator: Edlio");
    expect(d.confidence).toBeGreaterThan(0.8);
  });

  it("does not let one embedded widget outvote the host platform", () => {
    // A WordPress site with a Finalsite calendar embed. Four structural WordPress
    // signals against one hostname; a first-match detector gets this backwards.
    const mixed = `<html><head><meta name="generator" content="WordPress 6.4">
      <link href="/wp-content/themes/x/style.css"><style>:root{--wp--preset--color--primary:#123456}</style></head>
      <body><iframe src="https://calendar.finalsite.com/embed"></iframe><script src="/wp-json/"></script></body></html>`;
    expect(detectPlatform(mixed).platform).toBe("wordpress");
  });

  it("caps confidence when only a weak signal matched", () => {
    const weak = `<html><body><img src="/pics/logo.png"></body></html>`;
    const d = detectPlatform(weak);
    expect(d.platform).toBe("edlio"); // the /pics/ path, weight 1
    expect(d.confidence).toBeLessThanOrEqual(0.35);
  });

  it("returns 'unknown' with an explanation, not an error", () => {
    const d = detectPlatform(FAVICON_ONLY_PAGE);
    expect(d.platform).toBe("unknown");
    expect(d.confidence).toBe(0);
    expect(d.signals[0]).toMatch(/generic extractors/);
  });

  it("still produces a fully usable profile when the platform is unknown", () => {
    // The load-bearing property: detection ADDS hints, it never gates extraction.
    const profile = parseSchoolPage(FAVICON_ONLY_PAGE, "https://riverbendcharter.org/");
    expect(profile.platform).toBe("unknown");
    expect(profile.names[0].value).toBe("Riverbend Charter Academy");
    expect(profile.mottos[0].value).toBe("Small school, big horizons.");
    expect(profile.colors[0].hex).toBe("#1B4D3E");
    expect(profile.logos.length).toBeGreaterThan(0);
  });
});
