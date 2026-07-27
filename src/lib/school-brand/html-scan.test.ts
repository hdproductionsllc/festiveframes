import { describe, it, expect } from "vitest";
import {
  decodeEntities,
  elementInner,
  elementOuter,
  innerText,
  jsonLdBlocks,
  metaMap,
  normalizeColor,
  resolveUrl,
  scanPage,
  scanTags,
  styleBlocks,
} from "./html-scan";
import { EDLIO_PAGE } from "./__fixtures__/edlio-page";
import { WORDPRESS_PAGE } from "./__fixtures__/wordpress-page";

describe("scanTags", () => {
  it("reads attributes in all three quoting styles from one tag", () => {
    const [tag] = scanTags(`<img src="/a.png" alt='Lincoln High' width=512 hidden>`, "img");
    expect(tag.attrs).toMatchObject({
      src: "/a.png",
      alt: "Lincoln High",
      width: "512",
      hidden: "",
    });
  });

  it("does not end a tag on a '>' inside a quoted attribute value", () => {
    // Real school markup carries these in data- payloads and in srcset.
    const [tag] = scanTags(`<div data-json="{&quot;a&quot;:1}" title="a > b" class="logo"></div>`, "div");
    expect(tag.attrs.class).toBe("logo");
    expect(tag.attrs.title).toBe("a > b");
  });

  it("ignores markup inside <script>, which is where the stray '</div>' live", () => {
    const html = `<header><script>var a = 1 < 2; document.write("</div>");</script><img src="/x.png"></header>`;
    const [img] = scanTags(html, "img");
    // If the script body were scanned, that "</div>" would have popped the header.
    expect(img.ancestors.map((a) => a.name)).toContain("header");
  });

  it("does not treat a bare '<' in text as a tag", () => {
    const tags = scanTags(`<p>K<8 program</p>`);
    expect(tags.map((t) => t.name)).toEqual(["p"]);
  });

  it("keeps void elements off the ancestor stack", () => {
    const html = `<div class="a"><img src="1.png"><img src="2.png"><span></span></div>`;
    const [span] = scanTags(html, "span");
    expect(span.ancestors.map((a) => a.name)).toEqual(["div"]);
  });

  it("survives an unmatched close tag without unwinding the whole stack", () => {
    const html = `<header class="site-header"></section><img src="/logo.png"></header>`;
    const [img] = scanTags(html, "img");
    expect(img.ancestors.map((a) => a.className)).toContain("site-header");
  });

  it("gives every tag the ancestry that the vendor check depends on", () => {
    const [svg] = scanTags(EDLIO_PAGE, "svg");
    expect(svg.ancestors.map((a) => a.className)).toContain("edlio-logo");
  });
});

describe("elementInner / elementOuter", () => {
  it("counts nesting rather than stopping at the first close tag", () => {
    const html = `<div class="logo"><div>a</div><div>b</div></div>`;
    const [outer] = scanTags(html, "div");
    expect(elementInner(html, outer)).toBe("<div>a</div><div>b</div>");
  });

  it("returns the whole <svg> element, which is what svgRenderRisks needs", () => {
    const [svg] = scanTags(EDLIO_PAGE, "svg");
    const outer = elementOuter(EDLIO_PAGE, svg);
    expect(outer.startsWith("<svg")).toBe(true);
    expect(outer.endsWith("</svg>")).toBe(true);
  });
});

describe("innerText", () => {
  it("drops <style> and <script> bodies rather than reading them as copy", () => {
    const text = innerText(`<div><style>.a{color:#fff}</style><p>Go Eagles</p></div>`);
    expect(text).toBe("Go Eagles");
  });

  it("puts a space between elements so adjacent list items do not fuse", () => {
    expect(innerText(`<li>Eagles</li><li>Pride</li>`)).toBe("Eagles Pride");
  });

  it("decodes entities on the way out", () => {
    expect(innerText(`<p>Smith &amp; Jones &#8212; Washington&#8217;s</p>`)).toBe(
      "Smith & Jones — Washington’s",
    );
  });
});

describe("metaMap", () => {
  it("keys on property, name and itemprop alike", () => {
    const meta = metaMap(EDLIO_PAGE);
    expect(meta["og:site_name"]).toBe("Lincoln High School");
    expect(meta["theme-color"]).toBe("#0B3D91");
    expect(meta["generator"]).toBe("Edlio CMS");
  });

  it("keeps the FIRST declaration, matching how Open Graph consumers read", () => {
    const meta = metaMap(
      `<meta property="og:image" content="/first.png"><meta property="og:image" content="/second.png">`,
    );
    expect(meta["og:image"]).toBe("/first.png");
  });
});

describe("styleBlocks", () => {
  it("finds the :root block Edlio hides inside <main>, not just <head>", () => {
    // The whole reason this function scans the document instead of the head. A
    // head-only scan reports that this school has no colours at all.
    const blocks = styleBlocks(EDLIO_PAGE);
    expect(blocks.length).toBe(2);
    expect(blocks.some((b) => b.includes("--primary-color: #0B3D91"))).toBe(true);
    // And prove it: nothing in <head> carries that declaration.
    const head = EDLIO_PAGE.slice(0, EDLIO_PAGE.indexOf("<body"));
    expect(head.includes("--primary-color")).toBe(false);
  });
});

describe("jsonLdBlocks", () => {
  it("unrolls @graph so a School buried in an array is reachable", () => {
    const nodes = jsonLdBlocks(WORDPRESS_PAGE);
    expect(nodes.some((n) => n["@type"] === "School" && n.name === "Westbrook Middle School")).toBe(
      true,
    );
  });

  it("skips a malformed block instead of failing the page", () => {
    const html = `<script type="application/ld+json">{"a":1,}</script><script type="application/ld+json">{"@type":"School","name":"OK"}</script>`;
    expect(jsonLdBlocks(html)).toEqual([{ "@type": "School", name: "OK" }]);
  });
});

describe("decodeEntities", () => {
  it("handles named, decimal and hex forms", () => {
    expect(decodeEntities("Home &#8211; Westbrook")).toBe("Home – Westbrook");
    expect(decodeEntities("&amp;&lt;&gt;&quot;")).toBe('&<>"');
    expect(decodeEntities("&#x2019;")).toBe("’");
  });

  it("leaves an unknown named entity visible rather than deleting it", () => {
    expect(decodeEntities("100&curren;")).toBe("100&curren;");
  });
});

describe("resolveUrl", () => {
  const base = "https://www.lincolnhs.org/about/staff";

  it("absolutises the three relative forms", () => {
    expect(resolveUrl("/pics/logo.png", base)).toBe("https://www.lincolnhs.org/pics/logo.png");
    expect(resolveUrl("logo.png", base)).toBe("https://www.lincolnhs.org/about/logo.png");
    expect(resolveUrl("//cdn.edlio.com/a.png", base)).toBe("https://cdn.edlio.com/a.png");
  });

  it("refuses schemes that are not pictures", () => {
    expect(resolveUrl("javascript:void(0)", base)).toBeNull();
    expect(resolveUrl("mailto:office@lincolnhs.org", base)).toBeNull();
    expect(resolveUrl("", base)).toBeNull();
  });

  it("keeps a data: image, which costs no request", () => {
    expect(resolveUrl("data:image/png;base64,AAAA", base)).toBe("data:image/png;base64,AAAA");
  });
});

describe("normalizeColor", () => {
  it("normalises every form to #RRGGBB", () => {
    expect(normalizeColor("#0b3d91")).toBe("#0B3D91");
    expect(normalizeColor("#abc")).toBe("#AABBCC");
    expect(normalizeColor("rgb(11, 61, 145)")).toBe("#0B3D91");
    expect(normalizeColor("rgb(11 61 145 / 0.5)")).toBe("#0B3D91");
    expect(normalizeColor("hsl(0, 100%, 50%)")).toBe("#FF0000");
    expect(normalizeColor("navy")).toBe("#000080");
  });

  it("drops alpha rather than ranking a hover state as a school colour", () => {
    expect(normalizeColor("rgba(11,61,145,0.06)")).toBe("#0B3D91");
    expect(normalizeColor("#0B3D9199")).toBe("#0B3D91");
  });

  it("returns null for the keywords that are references, not colours", () => {
    for (const k of ["transparent", "currentColor", "inherit", "none", "var(--x)"]) {
      expect(normalizeColor(k)).toBeNull();
    }
  });
});

describe("scanPage", () => {
  it("collects one page into the shape the extractors share", () => {
    const scan = scanPage(WORDPRESS_PAGE, "https://westbrookms.org/");
    expect(scan.host).toBe("westbrookms.org");
    expect(scan.title).toBe("Home – Westbrook Middle School");
    expect(scan.styles.length).toBeGreaterThan(0);
    expect(scan.text).toContain("Go Wildcats!");
    expect(scan.text).not.toContain("--wp--preset--color--primary");
  });

  it("does not throw on a URL that will not parse", () => {
    const scan = scanPage("<html><title>x</title></html>", "not a url");
    expect(scan.host).toBe("");
  });
});
