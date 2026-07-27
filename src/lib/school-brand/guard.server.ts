// ─── The server-side half: everything the pure parser is not allowed to do ───
//
// `src/lib/school-brand/*` is pure by design — HTML string in, data out — because
// this sandbox cannot reach a school website (every CONNECT is answered "403" by
// the proxy) and a test that pretended otherwise would be a lie. This file is where
// the impurity is quarantined: DNS, sockets, byte streams.
//
// It is still written so that the DECISIONS are pure and testable even though the
// I/O is not. `classifyAddress`, `sniffImageType`, `readImageHeader`, `parseRobots`
// and `robotsAllows` are all plain functions over strings and bytes with unit tests;
// `assertPublicUrl` and `fetchGuarded` are the thin async shells that call them.
// That split is deliberate — the IP classification table is the part that has to be
// RIGHT, and it is the part that would otherwise only ever be exercised by a
// network call nobody can make here.
//
// Three separate dangers live in this file and they are not variations of each
// other:
//
//   1. SSRF. A URL box that our server fetches is, by default, a hole punched
//      through the firewall for anybody on the internet. `http://169.254.169.254/`
//      is the cloud metadata endpoint and it hands out IAM credentials to whoever
//      asks from inside the VPC.
//   2. RESOURCE EXHAUSTION. A hostile (or merely enormous) response can be an
//      infinite stream, a redirect loop, or a 900 MB "logo".
//   3. THE DECODER SEGFAULT. Reproduced: feeding TIFF or ICO bytes to the installed
//      decoder exits the process with 139 (SIGSEGV). Not an exception — a signal.
//      There is no try/catch around a segfault; the shield has to be refusing to
//      hand the bytes over at all. See `sniffImageType`.

import dns from "node:dns/promises";
import net from "node:net";

import { sniffImageFormat, type SniffResult } from "./raster-safety";

// ─── the truthful identity we present ────────────────────────────────────────

/**
 * The User-Agent. Deliberately NOT a browser string.
 *
 * Copying Chrome's UA is the obvious way to get past the school sites that block
 * non-browsers, and it is the wrong trade: it is a lie told to somebody whose
 * robots.txt we are simultaneously claiming to respect, it makes us
 * indistinguishable from a scraper in their logs when they try to work out what hit
 * them, and it means the block we get is one they never chose to apply to us. A
 * site that turns this UA away produces `blocked-by-site`, which the taxonomy
 * already has honest copy for.
 */
export const USER_AGENT =
  "FestiveFramesBrandScan/1.0 (+https://festiveframes.co/bot; one-off school logo lookup on a parent's request)";

/** The token a robots.txt would name us by, lowercased for matching. */
export const ROBOTS_TOKEN = "festiveframesbrandscan";

// ─── limits ──────────────────────────────────────────────────────────────────

/**
 * Redirect cap. Three is enough for the real chains school sites have —
 * `example.org` → `www.example.org` → `https://www.example.org` → the CMS's
 * trailing-slash canonicaliser is already three — and low enough that a redirect
 * loop costs four DNS lookups rather than twenty.
 *
 * EVERY HOP IS RE-GUARDED. That is the whole reason redirects are followed by hand
 * instead of with `redirect: "follow"`: a public host that 302s to
 * `http://169.254.169.254/latest/meta-data/` is the standard SSRF-guard bypass, and
 * `fetch`'s own redirect handling checks nothing.
 */
export const MAX_REDIRECTS = 3;

/**
 * Body caps. A school home page is 50–400 KB of HTML; 2 MB is ten times the fattest
 * one and still small enough that a slow-loris stream is bounded in memory.
 *
 * The image cap is 8 MB. A 4 MP PNG crest is comfortably under 2 MB; 8 MB leaves
 * room for a poorly-exported photo without letting a 200 MB TIFF through the door
 * (it would be refused by the sniffer anyway, but not before we had buffered it).
 */
export const MAX_PAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_ROBOTS_BYTES = 512 * 1024;

/**
 * Timeouts. School sites are frequently slow rather than broken — shared hosting,
 * a CMS render on every request — so 8 s for the page is generous on purpose and
 * the `timeout` outcome tells the user it is worth one more try. Images come off a
 * CDN and get 6 s. robots.txt gets 4 s because a missing robots.txt is the common
 * case and we must not spend the page's whole budget discovering that.
 */
export const PAGE_TIMEOUT_MS = 8_000;
export const IMAGE_TIMEOUT_MS = 6_000;
export const ROBOTS_TIMEOUT_MS = 4_000;

// ─── IP classification (pure, and the part that has to be right) ─────────────

export type AddressVerdict =
  | { public: true }
  | { public: false; reason: string };

/** Parse dotted-quad IPv4 into 4 bytes. Canonical form only. */
function parseIPv4(input: string): number[] | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}

/**
 * Parse IPv6 into 16 bytes, including `::` compression and a dotted-quad tail.
 *
 * Written by hand rather than pulled from a package because the classification
 * below is only as good as this: an address this parser gives up on is an address
 * the guard has to refuse, and a package that silently accepts a form we do not
 * expect is a hole. `null` means "I could not read this", and the caller treats
 * that as unsafe, never as safe.
 */
function parseIPv6(input: string): number[] | null {
  let s = input.trim();
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  // A zone id (`fe80::1%eth0`) only ever appears on a link-local address, which is
  // blocked anyway — but strip it so the parse does not fail open somewhere else.
  const pct = s.indexOf("%");
  if (pct >= 0) s = s.slice(0, pct);

  // Dotted-quad tail (`::ffff:127.0.0.1`, `64:ff9b::8.8.8.8`) → two hex groups.
  const lastColon = s.lastIndexOf(":");
  if (lastColon >= 0 && s.slice(lastColon + 1).includes(".")) {
    const v4 = parseIPv4(s.slice(lastColon + 1));
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    s = `${s.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : [];
  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  }
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push((n >> 8) & 255, n & 255);
  }
  return bytes;
}

/** IPv4 ranges that must never be fetched, with the reason each one is here. */
function classifyIPv4(b: number[]): AddressVerdict {
  const [a, c, d] = b;
  // 0.0.0.0/8 — "this network". On Linux, connecting to 0.0.0.0 reaches localhost.
  if (a === 0) return { public: false, reason: "this-network" };
  // 10/8, 172.16/12, 192.168/16 — RFC1918. The office LAN, the VPC, the k8s pods.
  if (a === 10) return { public: false, reason: "private" };
  if (a === 172 && c >= 16 && c <= 31) return { public: false, reason: "private" };
  if (a === 192 && c === 168) return { public: false, reason: "private" };
  // 100.64/10 — CGNAT. Reaches other tenants on a shared provider network.
  if (a === 100 && c >= 64 && c <= 127) return { public: false, reason: "cgnat" };
  // 127/8 — loopback. Every admin panel anybody ever bound to localhost.
  if (a === 127) return { public: false, reason: "loopback" };
  // 169.254/16 — link-local, and the reason this whole function exists:
  // 169.254.169.254 is the AWS/GCP/Azure instance metadata service, which hands out
  // role credentials to any process inside the VPC that asks. A server-side fetcher
  // with no guard IS that process.
  if (a === 169 && c === 254) return { public: false, reason: "link-local-metadata" };
  // 192.0.0/24 IETF assignments, 192.0.2/24 TEST-NET-1, 192.88.99/24 6to4 relay.
  if (a === 192 && c === 0 && (d === 0 || d === 2)) return { public: false, reason: "reserved" };
  if (a === 192 && c === 88 && d === 99) return { public: false, reason: "6to4-relay" };
  // 198.18/15 benchmarking, 198.51.100/24 TEST-NET-2, 203.0.113/24 TEST-NET-3.
  if (a === 198 && (c === 18 || c === 19)) return { public: false, reason: "benchmark" };
  if (a === 198 && c === 51 && d === 100) return { public: false, reason: "reserved" };
  if (a === 203 && c === 0 && d === 113) return { public: false, reason: "reserved" };
  // 224/4 multicast, 240/4 reserved (which swallows 255.255.255.255 broadcast).
  if (a >= 224 && a <= 239) return { public: false, reason: "multicast" };
  if (a >= 240) return { public: false, reason: "reserved" };
  return { public: true };
}

/**
 * Classify any IP literal. `null`/unparseable is treated as NOT public.
 *
 * The IPv6 arms matter more than they look. `::ffff:127.0.0.1` is loopback wearing
 * an IPv6 hat, and it is the single most common way a v4-only guard gets walked
 * past — note that WHATWG URL parsing rewrites it to `::ffff:7f00:1`, so a guard
 * that string-matched on "127." would see nothing at all. Same story for NAT64
 * (`64:ff9b::a00:1`) and 6to4 (`2002:0a00:0001::`), both of which carry a v4
 * address in their bits and are therefore unwrapped and re-classified rather than
 * waved through as "some IPv6 address".
 */
export function classifyAddress(ip: string): AddressVerdict {
  const raw = ip.trim();
  const v4 = parseIPv4(raw);
  if (v4) return classifyIPv4(v4);

  const b = parseIPv6(raw);
  if (!b) return { public: false, reason: "unparseable" };

  const allZero = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);

  // ::/128 unspecified and ::1/128 loopback.
  if (allZero(0, 15) && (b[15] === 0 || b[15] === 1)) {
    return { public: false, reason: b[15] === 0 ? "unspecified" : "loopback" };
  }
  // ::ffff:0:0/96 — IPv4-mapped. Unwrap; do NOT judge it as IPv6.
  if (allZero(0, 10) && b[10] === 0xff && b[11] === 0xff) {
    return classifyIPv4([b[12], b[13], b[14], b[15]]);
  }
  // 64:ff9b::/96 — NAT64. Also carries a v4 address in the low 32 bits.
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && allZero(4, 12)) {
    return classifyIPv4([b[12], b[13], b[14], b[15]]);
  }
  // 2002::/16 — 6to4. The v4 address sits in bits 16–48.
  if (b[0] === 0x20 && b[1] === 0x02) {
    return classifyIPv4([b[2], b[3], b[4], b[5]]);
  }
  // 100::/64 discard-only, 2001:db8::/32 documentation.
  if (b[0] === 0x01 && b[1] === 0x00 && allZero(2, 8)) {
    return { public: false, reason: "discard" };
  }
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) {
    return { public: false, reason: "documentation" };
  }
  // fc00::/7 unique-local (the IPv6 RFC1918), fe80::/10 link-local, ff00::/8 multicast.
  if ((b[0] & 0xfe) === 0xfc) return { public: false, reason: "unique-local" };
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return { public: false, reason: "link-local" };
  if (b[0] === 0xff) return { public: false, reason: "multicast" };

  return { public: true };
}

export const isPublicAddress = (ip: string): boolean => classifyAddress(ip).public;

// ─── URL shape (pure) ────────────────────────────────────────────────────────

export type UrlShapeVerdict =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

/**
 * Hostname suffixes that never name a public site. DNS on a corporate network will
 * happily resolve them, and `.internal` in particular is the GCP metadata alias
 * (`metadata.google.internal`) — the same credential endpoint by another name.
 */
const PRIVATE_SUFFIX = /(^|\.)(localhost|local|internal|intranet|corp|home|lan|test|invalid|example|onion)$/i;

/**
 * Everything about a URL that can be judged without touching the network.
 *
 * Ports are restricted to 80/443. That is stricter than it needs to be for school
 * websites (which are all on the defaults) and it removes a whole class of use:
 * without it, this endpoint is a port scanner for anything the DNS name resolves
 * to — `http://public-host.example:6379/` to poke Redis, `:9200` for Elasticsearch,
 * `:8080` for whatever admin app is behind the load balancer. The IP guard blocks
 * private addresses; this blocks the services that are reachable on a public one.
 *
 * Embedded credentials are refused outright rather than stripped. `http://a@b/` is
 * a phishing shape more than a fetch shape, and a URL box that quietly rewrites
 * what the user pasted is worse than one that says no.
 */
export function checkUrlShape(input: string): UrlShapeVerdict {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: "unparseable-url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "unsupported-scheme" };
  }
  if (url.username || url.password) return { ok: false, reason: "embedded-credentials" };

  const port = url.port;
  if (port && port !== "80" && port !== "443") return { ok: false, reason: "non-web-port" };

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) return { ok: false, reason: "no-host" };
  if (PRIVATE_SUFFIX.test(host)) return { ok: false, reason: "private-suffix" };

  // An IP literal never has to be resolved, so classify it here and now. WHATWG URL
  // has already normalised the obfuscated decimal/hex forms (`http://2130706433/`
  // becomes `127.0.0.1`), which is why this check is safe to do on `hostname`.
  if (net.isIP(host) !== 0) {
    const verdict = classifyAddress(host);
    if (!verdict.public) return { ok: false, reason: `ip:${verdict.reason}` };
  } else if (/^[\d.]+$/.test(host)) {
    // Digits and dots but not a valid IP — a malformed literal that some resolver
    // downstream might interpret differently to us. Refuse rather than guess.
    return { ok: false, reason: "malformed-ip-literal" };
  }

  return { ok: true, url };
}

// ─── the async guard ─────────────────────────────────────────────────────────

/**
 * Thrown by `assertPublicUrl`. Carries a `reason` for OUR logs only.
 *
 * The reason must never reach the user — see the `unreachable` arm of the taxonomy
 * in `types.ts`. Telling a stranger "that host resolves to 10.0.0.5 and we won't
 * touch it" and telling them "that host does not exist" are different sentences,
 * and the difference is a working oracle for what is alive behind our firewall.
 * One message covers both.
 */
export class GuardError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`blocked: ${reason}`);
    this.name = "GuardError";
    this.reason = reason;
  }
}

export interface ResolvedTarget {
  url: URL;
  /** Every address DNS returned. ALL of them passed; see below. */
  addresses: string[];
}

/**
 * Resolve a URL and refuse it unless EVERY address it resolves to is public.
 *
 * "Every", not "the first one". A hostname with an A record for a real CDN and a
 * second A record for 127.0.0.1 is a one-line DNS entry, and a guard that checks
 * `addresses[0]` gives whoever wrote that zone file a coin flip on each request.
 *
 * This does NOT close the TOCTOU window — the resolver could answer differently
 * between this lookup and the socket connect (DNS rebinding). Closing it properly
 * means connecting to the validated IP with the Host header pinned, which needs a
 * custom agent that undici's `fetch` does not expose cleanly. The window is
 * narrowed to the length of one connect and the residual risk is accepted here;
 * this comment exists so the next person knows it was a decision and not an
 * oversight.
 */
export async function assertPublicUrl(input: string): Promise<ResolvedTarget> {
  const shape = checkUrlShape(input);
  if (!shape.ok) throw new GuardError(shape.reason);
  const url = shape.url;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) !== 0) {
    // Already classified in `checkUrlShape`; no DNS to do.
    return { url, addresses: [host] };
  }

  let records: { address: string }[];
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new GuardError("dns-failed");
  }
  if (!records.length) throw new GuardError("dns-empty");

  for (const { address } of records) {
    const verdict = classifyAddress(address);
    if (!verdict.public) throw new GuardError(`ip:${verdict.reason}`);
  }
  return { url, addresses: records.map((r) => r.address) };
}

// ─── the guarded fetch ───────────────────────────────────────────────────────

export type FetchFailure =
  | { kind: "guard" }
  | { kind: "timeout"; ms: number }
  | { kind: "network" }
  | { kind: "too-large"; limit: number }
  | { kind: "too-many-redirects" };

export type GuardedFetch =
  | {
      ok: true;
      status: number;
      contentType: string;
      bytes: Uint8Array;
      /** The URL the bytes actually came from, after redirects. */
      finalUrl: string;
      redirects: number;
    }
  | { ok: false; failure: FetchFailure };

/** Read a body with a hard byte ceiling, aborting the stream rather than buffering it. */
async function readCapped(res: Response, limit: number): Promise<Uint8Array | "too-large"> {
  // Content-Length is a hint from an untrusted server, so it is used only to bail
  // EARLY — a missing or lying header changes nothing, because the stream loop below
  // is what actually enforces the cap.
  const declared = Number(res.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > limit) return "too-large";

  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.byteLength > limit ? "too-large" : buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => {});
        return "too-large";
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }

  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export interface GuardedFetchOptions {
  maxBytes: number;
  timeoutMs: number;
  /** Sent as `Accept`. Lets the page fetch ask for HTML and the image fetch for images. */
  accept: string;
  maxRedirects?: number;
}

/**
 * Fetch a URL with the guard applied to EVERY hop.
 *
 * `redirect: "manual"` is not a style choice. `fetch`'s own follower does no
 * validation, so `https://school.example/logo` → `http://169.254.169.254/…` walks
 * straight past `assertPublicUrl`, which only ever saw the first URL. Following by
 * hand means every `Location` goes back through the guard before a socket opens.
 *
 * The timeout is a single budget for the whole chain, not per hop — three hops at
 * 8 s each is a 24 s request, and the user is staring at a spinner for all of it.
 */
export async function fetchGuarded(
  input: string,
  opts: GuardedFetchOptions,
): Promise<GuardedFetch> {
  const maxRedirects = opts.maxRedirects ?? MAX_REDIRECTS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  let current = input;
  let redirects = 0;

  try {
    for (;;) {
      let target: ResolvedTarget;
      try {
        target = await assertPublicUrl(current);
      } catch {
        return { ok: false, failure: { kind: "guard" } };
      }

      let res: Response;
      try {
        res = await fetch(target.url, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "user-agent": USER_AGENT,
            accept: opts.accept,
            // No cookies, no referer, no auth. Nothing that could make our server's
            // ambient identity part of the request.
            "accept-language": "en-US,en;q=0.9",
          },
        });
      } catch (err) {
        if (controller.signal.aborted) {
          return { ok: false, failure: { kind: "timeout", ms: opts.timeoutMs } };
        }
        void err;
        return { ok: false, failure: { kind: "network" } };
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        await res.body?.cancel().catch(() => {});
        if (!location) return { ok: false, failure: { kind: "network" } };
        if (redirects >= maxRedirects) {
          return { ok: false, failure: { kind: "too-many-redirects" } };
        }
        redirects++;
        try {
          current = new URL(location, target.url).toString();
        } catch {
          return { ok: false, failure: { kind: "guard" } };
        }
        continue;
      }

      const body = await readCapped(res, opts.maxBytes);
      if (body === "too-large") {
        return { ok: false, failure: { kind: "too-large", limit: opts.maxBytes } };
      }

      return {
        ok: true,
        status: res.status,
        contentType: (res.headers.get("content-type") ?? "").toLowerCase(),
        bytes: body,
        finalUrl: target.url.toString(),
        redirects,
      };
    }
  } catch (err) {
    if (controller.signal.aborted) {
      return { ok: false, failure: { kind: "timeout", ms: opts.timeoutMs } };
    }
    void err;
    return { ok: false, failure: { kind: "network" } };
  } finally {
    clearTimeout(timer);
  }
}

// ─── image sniffing (constraint 2) ───────────────────────────────────────────

export type ImageVerdict =
  | { decode: true; format: "png" | "jpeg" | "webp" | "gif"; sniff: SniffResult }
  /** Text/XML that has to go through `svgRenderRisks` before anything renders it. */
  | { decode: false; svg: true; sniff: SniffResult }
  | { decode: false; svg: false; reason: string; sniff: SniffResult };

/**
 * The one gate every downloaded image passes through before a decoder sees it.
 *
 * It DELEGATES to `sniffImageFormat` in `raster-safety.ts` rather than restating the
 * magic bytes. That matters: the allowlist is the shield against a SIGSEGV, and two
 * copies of a shield is one copy that will eventually be out of date. This wrapper
 * adds only the server-side framing — a shape the route can switch on, and the
 * observation that the declared content-type and the file extension are advisory
 * at best.
 *
 * WHY AN ALLOWLIST AND NOT A COMPLETENESS CHECK, restated because it is the
 * counter-intuitive part: a truncated PNG or half-downloaded JPEG does NOT crash
 * the decoder — it errors, and that is handled. The crash comes from COMPLETE,
 * VALID TIFF and ICO files, which any "is this container intact" check waves
 * through. Format is the only property that correlates with the crash. And ICO is
 * not hypothetical here: `/favicon.ico` is a candidate source, so the crashing
 * format is one the collector actively goes looking for.
 *
 * `contentType` is accepted only so the caller can log the disagreement. It is
 * never allowed to override the bytes: school CMSes serve `logo.png` that is really
 * a Windows ICO (the favicon pipeline does this constantly) and serve every upload
 * as `application/octet-stream`.
 */
export function sniffImageType(bytes: Uint8Array, contentType?: string): ImageVerdict {
  void contentType; // advisory only, deliberately unused in the decision
  const sniff = sniffImageFormat(bytes);
  if (sniff.decodable) return { decode: true, format: sniff.format, sniff };
  if (sniff.format === "svg") return { decode: false, svg: true, sniff };
  return { decode: false, svg: false, reason: sniff.reason, sniff };
}

// ─── header dimensions (constraint 3) ────────────────────────────────────────

export interface ImageHeader {
  width: number;
  height: number;
}

/**
 * Read width/height out of the container header, WITHOUT decoding.
 *
 * This is the load-bearing half of the memory constraint. A 10 MP RGBA image
 * through `analyzeArtwork` + `repairArtwork` measured heapUsed +480 MB — which is
 * arithmetic, not a leak: 10 MP × 4 bytes = 40 MB per buffer, and the pipeline holds
 * the decoded original, the QC copy, `repairArtwork`'s `new Uint8ClampedArray`,
 * `cutBackground`'s second copy, the flood-fill's `seen`, and the re-encoded PNG at
 * once. Decoding first and checking the size afterwards has already paid the peak
 * you were trying to avoid. So the size question has to be answered from a few
 * dozen header bytes, before any allocation, which is what this does.
 *
 * Returns `null` when the header cannot be read — the caller must then treat the
 * image as unknown-size and refuse it, rather than optimistically decoding.
 */
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const b = bytes;
  const u16be = (i: number) => (b[i] << 8) | b[i + 1];
  const u32be = (i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  const u16le = (i: number) => b[i] | (b[i + 1] << 8);
  const u24le = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

  // PNG: IHDR is always the first chunk, width/height at fixed offsets 16 and 20.
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: u32be(16), height: u32be(20) };
  }

  // GIF: logical screen descriptor, little-endian, right after the 6-byte signature.
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { width: u16le(6), height: u16le(8) };
  }

  // WebP: three sub-formats, three completely different places to look. Getting the
  // lossless one wrong is easy — its dimensions are bit-packed, not byte-aligned.
  if (
    b.length >= 30 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8X") {
      // Extended: 24-bit canvas width-1 / height-1 at 24 and 27.
      return { width: u24le(24) + 1, height: u24le(27) + 1 };
    }
    if (chunk === "VP8 ") {
      // Lossy: 3-byte frame tag, then the 3-byte start code 9d 01 2a, then 14-bit
      // dimensions (the top two bits of each 16 are a scale factor, hence the mask).
      if (b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
        return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
      }
      return null;
    }
    if (chunk === "VP8L") {
      // Lossless: signature byte 0x2f, then 14 bits of (width-1) and 14 of
      // (height-1) packed LSB-first across the next four bytes.
      if (b[20] !== 0x2f) return null;
      const v = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
      return { width: (v & 0x3fff) + 1, height: ((v >>> 14) & 0x3fff) + 1 };
    }
    return null;
  }

  // JPEG: no fixed offset at all — walk the segment chain to the first SOF.
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++; // resync; malformed padding between segments is common in the wild
        continue;
      }
      const marker = b[i + 1];
      // Standalone markers with no length field.
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      if (marker === 0xff) {
        i++; // fill byte
        continue;
      }
      // SOF0–SOF15 carry the dimensions, EXCEPT C4 (define Huffman table), C8
      // (JPEG extension) and CC (define arithmetic coding), which share the range
      // and would give nonsense if read as a frame header.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: u16be(i + 7), height: u16be(i + 5) };
      }
      const len = u16be(i + 2);
      if (len < 2) return null;
      i += 2 + len;
    }
    return null;
  }

  return null;
}

// ─── robots.txt (pure parser, network-fetched body) ──────────────────────────

export interface RobotsRules {
  /** Longest-match-wins prefix rules for the group that applies to us. */
  allow: string[];
  disallow: string[];
  /** Which user-agent group these came from, for the debug panel. */
  matchedAgent: string;
}

/**
 * Parse robots.txt for one user-agent.
 *
 * Group selection follows the de-facto rule everyone implements: the MOST SPECIFIC
 * matching agent wins outright, and `*` is the fallback only when no named group
 * matches. Merging our named group with `*` would be wrong in the direction that
 * matters — a site that writes `User-agent: *  Disallow: /` and then carves out an
 * exception for a named crawler means the exception, not the union.
 *
 * A blank or missing robots.txt parses to no rules, which allows everything. That is
 * the correct default and it is also what a 404 means; the caller maps a failed
 * fetch to "allowed" for the same reason.
 */
export function parseRobots(text: string, agent: string = ROBOTS_TOKEN): RobotsRules {
  const token = agent.toLowerCase();
  const groups = new Map<string, { allow: string[]; disallow: string[] }>();
  let currentAgents: string[] = [];
  // robots.txt groups are "one or more User-agent lines, then rules". A rule line
  // after a rule line continues the group; a User-agent line after a rule line
  // STARTS a new group. This flag is what tracks that transition.
  let sawRule = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (sawRule) {
        currentAgents = [];
        sawRule = false;
      }
      currentAgents.push(value.toLowerCase());
      if (!groups.has(value.toLowerCase())) {
        groups.set(value.toLowerCase(), { allow: [], disallow: [] });
      }
      continue;
    }
    if (field !== "allow" && field !== "disallow") continue;
    sawRule = true;
    for (const a of currentAgents) {
      const g = groups.get(a);
      if (!g) continue;
      if (field === "allow") g.allow.push(value);
      else g.disallow.push(value);
    }
  }

  // Most specific match first: an exact token, then the longest prefix that is a
  // substring of our UA token, then `*`.
  let matched: string | null = null;
  for (const name of groups.keys()) {
    if (name === "*") continue;
    if (token === name || token.includes(name)) {
      if (matched === null || name.length > matched.length) matched = name;
    }
  }
  if (matched === null && groups.has("*")) matched = "*";
  if (matched === null) return { allow: [], disallow: [], matchedAgent: "" };
  const g = groups.get(matched)!;
  return { allow: g.allow, disallow: g.disallow, matchedAgent: matched };
}

/** Length of the matching prefix, or -1. Supports `*` wildcards and a trailing `$`. */
function ruleMatchLength(rule: string, path: string): number {
  if (rule === "") return -1; // `Disallow:` with an empty value means "allow all"
  if (!rule.includes("*") && !rule.endsWith("$")) {
    return path.startsWith(rule) ? rule.length : -1;
  }
  const anchored = rule.endsWith("$");
  const body = anchored ? rule.slice(0, -1) : rule;
  const re = new RegExp(
    "^" + body.split("*").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") +
      (anchored ? "$" : ""),
  );
  return re.test(path) ? body.length : -1;
}

export interface RobotsVerdict {
  allowed: boolean;
  /** The rule that decided it, for the `blocked-by-robots` message. */
  rule?: string;
}

/**
 * Longest-match-wins, with Allow beating Disallow on a tie.
 *
 * That tie-break is the documented behaviour and it is also the charitable one: a
 * site that writes `Disallow: /` then `Allow: /about` is opting that page IN, and
 * reading the tie the other way would have us refuse a page they explicitly opened.
 */
export function robotsAllows(rules: RobotsRules, path: string): RobotsVerdict {
  let bestAllow = -1;
  let bestDisallow = -1;
  let rule: string | undefined;
  for (const a of rules.allow) {
    const n = ruleMatchLength(a, path);
    if (n > bestAllow) bestAllow = n;
  }
  for (const d of rules.disallow) {
    const n = ruleMatchLength(d, path);
    if (n > bestDisallow) {
      bestDisallow = n;
      rule = d;
    }
  }
  if (bestDisallow < 0) return { allowed: true };
  if (bestAllow >= bestDisallow) return { allowed: true };
  return { allowed: false, rule: `Disallow: ${rule}` };
}
