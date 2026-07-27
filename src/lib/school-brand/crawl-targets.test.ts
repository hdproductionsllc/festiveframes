import { describe, it, expect } from "vitest";
import { pickCrawlTargets } from "./crawl-targets";

// The first live scan returned nothing usable because only the pasted page was
// fetched — homepage header logos sit below the print floor. These tests pin the
// second-hop SELECTION: the athletics/brand pages get fetched, and the calendar,
// the PDFs and other hosts never do.

const BASE = "https://www.lincolnhigh.org/";

const page = (links: string) => `<!doctype html><html><body><nav>${links}</nav></body></html>`;

describe("pickCrawlTargets", () => {
  it("finds athletics and brand pages, ranked with brand first", () => {
    const html = page(`
      <a href="/athletics">Athletics</a>
      <a href="/about-us">About</a>
      <a href="/brand-guidelines">Brand Guidelines</a>
    `);
    const t = pickCrawlTargets(html, BASE);
    expect(t.map((x) => new URL(x.url).pathname)).toEqual([
      "/brand-guidelines",
      "/athletics",
      "/about-us",
    ]);
  });

  it("scores ANCHOR TEXT so CMS ids still qualify", () => {
    // Apptegy/Edlio nav links are /page/12345 — the path says nothing; the text says
    // everything. This is the common case, not the corner case.
    const html = page(`<a href="/page/49301">Athletics</a><a href="/page/11">Lunch Menu</a>`);
    const t = pickCrawlTargets(html, BASE);
    expect(t).toHaveLength(1);
    expect(t[0].url).toContain("/page/49301");
  });

  it("stays on the pasted host — other domains are not ours to crawl", () => {
    const html = page(`<a href="https://lincolnathletics.rschooltoday.com/">Athletics</a>`);
    expect(pickCrawlTargets(html, BASE)).toHaveLength(0);
  });

  it("skips files and account-ish pages even when they match a signal", () => {
    const html = page(`
      <a href="/athletics/schedule.pdf">Athletics Schedule</a>
      <a href="/athletics/login">Athletics Login</a>
    `);
    expect(pickCrawlTargets(html, BASE)).toHaveLength(0);
  });

  it("dedupes header+footer copies of the same link, never returns the entry page", () => {
    const html = page(`
      <a href="/athletics">Athletics</a>
      <a href="/athletics#top">Athletics (footer)</a>
      <a href="/">Home of the Lancers Athletics</a>
    `);
    const t = pickCrawlTargets(html, BASE);
    expect(t).toHaveLength(1);
    expect(new URL(t[0].url).pathname).toBe("/athletics");
  });

  it("caps the list — a mega-nav does not become a crawl", () => {
    const links = Array.from({ length: 20 }, (_, i) => `<a href="/athletics-${i}">Athletics ${i}</a>`).join("");
    expect(pickCrawlTargets(page(links), BASE)).toHaveLength(3);
  });

  it("returns [] for an unparsable page URL rather than throwing", () => {
    expect(pickCrawlTargets(page(`<a href="/athletics">Athletics</a>`), "not a url")).toEqual([]);
  });
});
