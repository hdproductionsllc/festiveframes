import { describe, it, expect } from "vitest";
import {
  checkUrlShape,
  classifyAddress,
  isPublicAddress,
  outcomeForFailure,
  parseRobots,
  readImageHeader,
  robotsAllows,
  sniffImageType,
  MAX_REDIRECTS,
  ROBOTS_TOKEN,
  USER_AGENT,
} from "./guard.server";
import { describeOutcome } from "./index";

// Everything in this file is decidable WITHOUT a network, which is the only kind of
// test this sandbox can honestly run — every CONNECT here is answered "403" by the
// proxy, so a test that claimed to have fetched a school site would be a lie. What
// IS testable is the decision each network step makes, and those decisions are the
// part that has to be right: the IP table, the magic-byte allowlist, the header
// reader that keeps a decode bounded, and the mapping from failure to user copy.

// ─── IP classification ───────────────────────────────────────────────────────

describe("classifyAddress — the SSRF table", () => {
  it("allows ordinary public IPv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "104.16.0.1", "23.45.67.89", "172.15.255.255", "172.32.0.1"]) {
      expect(classifyAddress(ip), ip).toEqual({ public: true });
    }
  });

  it("blocks the cloud metadata endpoint, which is the reason this exists", () => {
    // 169.254.169.254 hands out IAM role credentials to anything inside the VPC that
    // asks. A server-side URL fetcher with no guard IS that anything.
    const v = classifyAddress("169.254.169.254");
    expect(v.public).toBe(false);
    if (!v.public) expect(v.reason).toBe("link-local-metadata");
    expect(isPublicAddress("169.254.0.1")).toBe(false);
  });

  it("blocks loopback, RFC1918, CGNAT and this-network", () => {
    const cases: [string, string][] = [
      ["127.0.0.1", "loopback"],
      ["127.255.255.254", "loopback"],
      ["10.0.0.5", "private"],
      ["172.16.0.1", "private"],
      ["172.31.255.255", "private"],
      ["192.168.1.1", "private"],
      ["100.64.0.1", "cgnat"],
      ["0.0.0.0", "this-network"],
    ];
    for (const [ip, reason] of cases) {
      const v = classifyAddress(ip);
      expect(v.public, ip).toBe(false);
      if (!v.public) expect(v.reason, ip).toBe(reason);
    }
  });

  it("blocks the documentation, benchmark, multicast and reserved ranges", () => {
    for (const ip of ["192.0.2.1", "198.18.0.1", "198.51.100.7", "203.0.113.9", "224.0.0.1", "240.0.0.1", "255.255.255.255", "192.88.99.1"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("unwraps IPv4-mapped IPv6, in the compressed form the URL parser produces", () => {
    // This is the single most common way a v4-only guard gets walked past, and the
    // compression is what makes it invisible: `new URL("http://[::ffff:127.0.0.1]/")`
    // rewrites the hostname to `[::ffff:7f00:1]`, so a guard that string-matched on
    // "127." would see nothing at all.
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("::ffff:7f00:1")).toBe(false);
    expect(isPublicAddress("::ffff:10.0.0.5")).toBe(false);
    expect(isPublicAddress("::ffff:a00:5")).toBe(false);
    expect(isPublicAddress("::ffff:169.254.169.254")).toBe(false);
    // A mapped PUBLIC address is still public — the unwrap must not be a blanket ban.
    expect(isPublicAddress("::ffff:8.8.8.8")).toBe(true);
  });

  it("unwraps NAT64 and 6to4 rather than waving them through as 'some IPv6'", () => {
    expect(isPublicAddress("64:ff9b::7f00:1")).toBe(false); // NAT64 of 127.0.0.1
    expect(isPublicAddress("64:ff9b::8.8.8.8")).toBe(true);
    expect(isPublicAddress("2002:0a00:0001::1")).toBe(false); // 6to4 of 10.0.0.1
    expect(isPublicAddress("2002:0808:0808::1")).toBe(true); // 6to4 of 8.8.8.8
  });

  it("blocks native IPv6 loopback, unique-local, link-local and multicast", () => {
    const cases: [string, string][] = [
      ["::1", "loopback"],
      ["::", "unspecified"],
      ["fc00::1", "unique-local"],
      ["fd12:3456:789a::1", "unique-local"],
      ["fe80::1", "link-local"],
      ["febf:ffff::1", "link-local"],
      ["ff02::1", "multicast"],
      ["2001:db8::1", "documentation"],
      ["100::1", "discard"],
    ];
    for (const [ip, reason] of cases) {
      const v = classifyAddress(ip);
      expect(v.public, ip).toBe(false);
      if (!v.public) expect(v.reason, ip).toBe(reason);
    }
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });

  it("treats anything it cannot parse as NOT public — it fails closed", () => {
    // An address this parser gives up on is an address we must refuse. Failing OPEN
    // here would make every form the parser does not know about a hole.
    for (const junk of ["", "not-an-ip", "1.2.3", "1.2.3.4.5", "999.1.1.1", "::gggg", "1::2::3", "12345::1"]) {
      expect(classifyAddress(junk).public, junk).toBe(false);
    }
  });
});

// ─── URL shape ───────────────────────────────────────────────────────────────

describe("checkUrlShape — everything judgeable before DNS", () => {
  it("accepts ordinary school URLs, including an explicit default port", () => {
    for (const u of [
      "https://lincolnhigh.org/",
      "http://www.pvusd.k12.ca.us/index.html",
      // WHATWG strips the default port, so `:443` on https never reaches the port
      // check at all — asserted so a future tightening of that check does not
      // accidentally refuse the many school links that carry it.
      "https://roosevelt.sfusd.edu:443/",
      "http://roosevelt.sfusd.edu:80/",
    ]) {
      expect(checkUrlShape(u).ok, u).toBe(true);
    }
  });

  it("refuses the RFC 2606 reserved TLDs, which never name a real school", () => {
    // `.example`, `.test` and `.invalid` are reserved and do not resolve. Refusing
    // them by name costs nothing and keeps documentation copy-paste out of the
    // fetcher; it is also why the cases above use real school-shaped hostnames.
    for (const h of ["school.example", "foo.test", "bar.invalid"]) {
      const v = checkUrlShape(`https://${h}/`);
      expect(v.ok, h).toBe(false);
      if (!v.ok) expect(v.reason).toBe("private-suffix");
    }
  });

  it("refuses non-http schemes, which is where file:// and gopher:// would come in", () => {
    for (const u of ["file:///etc/passwd", "gopher://x/", "ftp://x/", "data:text/html,<b>", "javascript:alert(1)"]) {
      const v = checkUrlShape(u);
      expect(v.ok, u).toBe(false);
      if (!v.ok) expect(v.reason).toBe("unsupported-scheme");
    }
  });

  it("refuses ports other than 80/443, so this is not a port scanner", () => {
    // Without this, a public hostname is a probe for whatever else it runs:
    // :6379 Redis, :9200 Elasticsearch, :8080 the admin app behind the LB.
    for (const p of ["6379", "9200", "8080", "22"]) {
      const v = checkUrlShape(`https://public.example:${p}/`);
      expect(v.ok, p).toBe(false);
      if (!v.ok) expect(v.reason).toBe("non-web-port");
    }
  });

  it("refuses embedded credentials rather than stripping them", () => {
    const v = checkUrlShape("http://admin:hunter2@school.org/");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("embedded-credentials");
  });

  it("catches the obfuscated IPv4 literals, via WHATWG normalisation", () => {
    // `http://2130706433/` and `http://0x7f.1/` both normalise to 127.0.0.1 in the
    // URL parser, which is why classifying `hostname` is enough and a regex over the
    // raw string would not have been.
    for (const u of ["http://2130706433/", "http://0x7f.1/", "http://127.1/", "http://[::1]/", "http://[::ffff:127.0.0.1]/"]) {
      const v = checkUrlShape(u);
      expect(v.ok, u).toBe(false);
      if (!v.ok) expect(v.reason.startsWith("ip:"), `${u} -> ${v.reason}`).toBe(true);
    }
  });

  it("refuses the private-suffix hostnames, including the GCP metadata alias", () => {
    for (const h of ["localhost", "app.local", "metadata.google.internal", "db.corp", "printer.lan"]) {
      const v = checkUrlShape(`http://${h}/`);
      expect(v.ok, h).toBe(false);
      if (!v.ok) expect(v.reason).toBe("private-suffix");
    }
  });

  it("refuses a private IP literal before any DNS happens", () => {
    for (const h of ["10.0.0.5", "169.254.169.254", "192.168.0.1"]) {
      expect(checkUrlShape(`http://${h}/`).ok, h).toBe(false);
    }
  });
});

// ─── the sniffer (constraint 2) ──────────────────────────────────────────────

const bytes = (...v: number[]) => Uint8Array.from(v);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0, 0x10, 0);
const TIFF_LE = bytes(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0);
const TIFF_BE = bytes(0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8);
const ICO = bytes(0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20);
const BMP = bytes(0x42, 0x4d, 0x36, 0, 0, 0);

describe("sniffImageType — the shield against the decoder SIGSEGV", () => {
  it("allows exactly png/jpeg/webp/gif", () => {
    expect(sniffImageType(PNG)).toMatchObject({ decode: true, format: "png" });
    expect(sniffImageType(JPEG)).toMatchObject({ decode: true, format: "jpeg" });
    expect(sniffImageType(GIF)).toMatchObject({ decode: true, format: "gif" });
    const webp = new Uint8Array(32);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImageType(webp)).toMatchObject({ decode: true, format: "webp" });
  });

  it("refuses TIFF and ICO, which exit the process with signal 139", () => {
    // There is no try/catch around a segfault: the node process is gone and the
    // request never answers. And ICO is not hypothetical — `/favicon.ico` is one of
    // the sources `collectLogoCandidates` deliberately goes looking at.
    for (const b of [TIFF_LE, TIFF_BE, ICO]) {
      const v = sniffImageType(b);
      expect(v.decode).toBe(false);
      if (v.decode) throw new Error("expected a refusal");
      expect(v.svg).toBe(false);
      if (!v.svg) expect(v.reason).toMatch(/SIGSEGV/);
    }
  });

  it("refuses everything not on the allowlist, including empty and truncated junk", () => {
    for (const b of [BMP, bytes(), bytes(1, 2, 3, 4), bytes(0xff)]) {
      expect(sniffImageType(b).decode).toBe(false);
    }
  });

  it("routes SVG to the source-scan path rather than to a decoder", () => {
    const svg = new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>');
    const v = sniffImageType(svg);
    expect(v.decode).toBe(false);
    if (!v.decode) expect(v.svg).toBe(true);
  });

  it("ignores the declared content-type entirely — the bytes are the only honest thing", () => {
    // School CMSes serve `logo.png` that is really a Windows ICO (the favicon
    // pipeline does this constantly) and serve every upload as octet-stream. A
    // content-type-led decision hands the ICO straight to the segfault.
    expect(sniffImageType(ICO, "image/png").decode).toBe(false);
    expect(sniffImageType(PNG, "application/octet-stream")).toMatchObject({ decode: true, format: "png" });
    expect(sniffImageType(PNG, "text/html")).toMatchObject({ decode: true, format: "png" });
  });
});

// ─── header dimensions (constraint 3) ────────────────────────────────────────

describe("readImageHeader — dimensions BEFORE any allocation", () => {
  it("reads PNG IHDR", () => {
    const b = new Uint8Array(32);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    b.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
    b.set([0, 0, 0x0b, 0xb8], 16); // 3000
    b.set([0, 0, 0x07, 0xd0], 20); // 2000
    expect(readImageHeader(b)).toEqual({ width: 3000, height: 2000 });
  });

  it("reads GIF's little-endian logical screen descriptor", () => {
    const b = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xf0, 0x00, 0);
    expect(readImageHeader(b)).toEqual({ width: 320, height: 240 });
  });

  it("walks the JPEG segment chain to the first real SOF", () => {
    // The point of the walk: JPEG has no fixed offset, and C4/C8/CC share the SOF
    // marker range while carrying completely different payloads. Reading a DHT as a
    // frame header yields nonsense dimensions — which would then size a decode.
    const b = new Uint8Array(64);
    b.set([0xff, 0xd8], 0);
    b.set([0xff, 0xc4, 0x00, 0x06, 1, 2, 3, 4], 2); // DHT, length 6 — must be skipped
    b.set([0xff, 0xe0, 0x00, 0x04, 0, 0], 10); // APP0, length 4
    // SOF0 at 16: marker, length, precision, height(2), width(2)
    b.set([0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20], 16);
    expect(readImageHeader(b)).toEqual({ width: 800, height: 600 });
  });

  it("reads all three WebP sub-formats, whose dimensions live in three different places", () => {
    const lossy = new Uint8Array(40);
    lossy.set([0x52, 0x49, 0x46, 0x46], 0);
    lossy.set([0x57, 0x45, 0x42, 0x50], 8);
    lossy.set([0x56, 0x50, 0x38, 0x20], 12); // "VP8 "
    lossy.set([0x9d, 0x01, 0x2a], 23);
    lossy.set([0x90, 0x01], 26); // 400
    lossy.set([0x2c, 0x01], 28); // 300
    expect(readImageHeader(lossy)).toEqual({ width: 400, height: 300 });

    const ext = new Uint8Array(40);
    ext.set([0x52, 0x49, 0x46, 0x46], 0);
    ext.set([0x57, 0x45, 0x42, 0x50], 8);
    ext.set([0x56, 0x50, 0x38, 0x58], 12); // "VP8X"
    ext.set([0x3f, 0x00, 0x00], 24); // width-1  = 63  -> 64
    ext.set([0x7f, 0x00, 0x00], 27); // height-1 = 127 -> 128
    expect(readImageHeader(ext)).toEqual({ width: 64, height: 128 });

    // Lossless packs 14 bits of (w-1) then 14 of (h-1) LSB-first — byte-aligned
    // reads give the wrong answer here, which is the whole reason it is separate.
    const w = 500, h = 400;
    const packed = ((w - 1) | ((h - 1) << 14)) >>> 0;
    const ll = new Uint8Array(40);
    ll.set([0x52, 0x49, 0x46, 0x46], 0);
    ll.set([0x57, 0x45, 0x42, 0x50], 8);
    ll.set([0x56, 0x50, 0x38, 0x4c], 12); // "VP8L"
    ll[20] = 0x2f;
    ll.set([packed & 255, (packed >> 8) & 255, (packed >> 16) & 255, (packed >>> 24) & 255], 21);
    expect(readImageHeader(ll)).toEqual({ width: 500, height: 400 });
  });

  it("returns null when it cannot tell, so the caller refuses instead of decoding blind", () => {
    // An unbounded allocation is the exact failure this path exists to prevent
    // (10 MP RGBA measured +480 MB through analyze+repair), so "I don't know" must
    // never be optimistic.
    expect(readImageHeader(bytes(1, 2, 3, 4))).toBeNull();
    expect(readImageHeader(bytes(0xff, 0xd8, 0xff))).toBeNull();
    expect(readImageHeader(new Uint8Array(0))).toBeNull();
  });
});

// ─── robots.txt ──────────────────────────────────────────────────────────────

describe("parseRobots / robotsAllows", () => {
  it("uses the * group when nothing names us", () => {
    const r = parseRobots("User-agent: *\nDisallow: /private/\n");
    expect(r.matchedAgent).toBe("*");
    expect(robotsAllows(r, "/private/x").allowed).toBe(false);
    expect(robotsAllows(r, "/").allowed).toBe(true);
  });

  it("prefers the group that names us OVER the * group, rather than merging them", () => {
    // A site that blanket-blocks `*` and then carves out a named exception means the
    // exception. Merging would refuse a page they explicitly opened for us.
    const r = parseRobots(
      `User-agent: *\nDisallow: /\n\nUser-agent: ${ROBOTS_TOKEN}\nDisallow: /staff/\n`,
    );
    expect(r.matchedAgent).toBe(ROBOTS_TOKEN);
    expect(robotsAllows(r, "/").allowed).toBe(true);
    expect(robotsAllows(r, "/staff/list").allowed).toBe(false);
  });

  it("groups consecutive user-agent lines together and starts a new group after a rule", () => {
    const r = parseRobots("User-agent: googlebot\nUser-agent: *\nDisallow: /a/\n\nUser-agent: bingbot\nDisallow: /b/\n");
    expect(r.matchedAgent).toBe("*");
    expect(robotsAllows(r, "/a/x").allowed).toBe(false);
    expect(robotsAllows(r, "/b/x").allowed).toBe(true);
  });

  it("lets the longest match win, with Allow beating Disallow on a tie", () => {
    const r = parseRobots("User-agent: *\nDisallow: /\nAllow: /about\n");
    expect(robotsAllows(r, "/about/us").allowed).toBe(true);
    expect(robotsAllows(r, "/staff").allowed).toBe(false);
  });

  it("handles wildcards, the $ anchor, comments and an empty Disallow", () => {
    const r = parseRobots("# hello\nUser-agent: *\nDisallow: /*.pdf$   # no documents\nDisallow:\n");
    expect(robotsAllows(r, "/handbook.pdf").allowed).toBe(false);
    expect(robotsAllows(r, "/handbook.pdf.html").allowed).toBe(true);
    expect(robotsAllows(r, "/").allowed).toBe(true);
  });

  it("treats an empty or ruleless robots.txt as allow-all", () => {
    // Which is also what a 404 means, and why the fetch layer maps a failed
    // robots.txt request to "allowed": no answer is not consent withheld.
    expect(robotsAllows(parseRobots(""), "/").allowed).toBe(true);
    expect(robotsAllows(parseRobots("Sitemap: https://x/sitemap.xml\n"), "/").allowed).toBe(true);
  });

  it("names the rule that blocked us, so the copy can quote it", () => {
    const v = robotsAllows(parseRobots("User-agent: *\nDisallow: /calendar\n"), "/calendar/2026");
    expect(v.allowed).toBe(false);
    expect(v.rule).toBe("Disallow: /calendar");
  });
});

// ─── the error taxonomy (constraint 6) ───────────────────────────────────────

describe("outcomeForFailure — transport failure to user-facing state", () => {
  it("keeps timeout distinguishable, because 'try again' is honest there and nowhere else", () => {
    const o = outcomeForFailure({ kind: "timeout", ms: 8000 });
    expect(o).toEqual({ kind: "timeout", ms: 8000 });
    expect(describeOutcome(o).retryable).toBe(true);
  });

  it("collapses guard, DNS, network and redirect-loop into the ONE opaque message", () => {
    // The collapse is the security property. If a host resolving to 10.0.0.5 read
    // differently from a host that does not resolve, this endpoint is an
    // internal-network scanner: submit a URL, read the error, learn what is alive.
    const outcomes = (["guard", "network", "too-many-redirects"] as const).map((k) =>
      outcomeForFailure({ kind: k }),
    );
    for (const o of outcomes) expect(o).toEqual({ kind: "unreachable" });
    const texts = new Set(outcomes.map((o) => JSON.stringify(describeOutcome(o))));
    expect(texts.size).toBe(1);
  });

  it("never leaks an address, a reason code or an IP into the copy", () => {
    const copy = describeOutcome(outcomeForFailure({ kind: "guard" }));
    const all = `${copy.headline} ${copy.detail}`;
    expect(all).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    expect(all.toLowerCase()).not.toMatch(/private|internal|loopback|metadata|dns|blocked|guard/);
    // And it still has a way out — every dead end ends at "Upload a photo".
    expect(copy.actions.some((a) => a.id === "upload-photo" && a.primary)).toBe(true);
  });

  it("maps an over-large body to not-html, which points at the right fix", () => {
    expect(outcomeForFailure({ kind: "too-large", limit: 1 }).kind).toBe("not-html");
  });

  it("gives every mapped outcome at least one action", () => {
    const all = [
      outcomeForFailure({ kind: "timeout", ms: 1 }),
      outcomeForFailure({ kind: "guard" }),
      outcomeForFailure({ kind: "network" }),
      outcomeForFailure({ kind: "too-many-redirects" }),
      outcomeForFailure({ kind: "too-large", limit: 1 }),
    ];
    for (const o of all) expect(describeOutcome(o).actions.length).toBeGreaterThan(0);
  });
});

// ─── identity ────────────────────────────────────────────────────────────────

describe("the identity we present", () => {
  it("is a truthful non-browser User-Agent with a contact URL", () => {
    // Copying Chrome's UA is the obvious way past the sites that block non-browsers,
    // and it is a lie told to somebody whose robots.txt we simultaneously claim to
    // respect. A site that turns THIS away produces `blocked-by-site`, which the
    // taxonomy already has honest copy for.
    expect(USER_AGENT).not.toMatch(/Mozilla|Chrome|Safari|AppleWebKit|Gecko/i);
    expect(USER_AGENT).toContain("+https://");
    expect(USER_AGENT.toLowerCase()).toContain(ROBOTS_TOKEN);
  });

  it("caps redirects low enough that a loop is cheap", () => {
    expect(MAX_REDIRECTS).toBeGreaterThanOrEqual(2);
    expect(MAX_REDIRECTS).toBeLessThanOrEqual(5);
  });
});
