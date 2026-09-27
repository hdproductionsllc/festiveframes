// ─────────────────────────────────────────────────────────────
// The browser half of the funnel (lib/school-designs/funnel) — CLIENT ONLY.
//
// Keeps two things in localStorage, nothing personal:
//   msf_anon           a random id for this browser, so one parent counts once
//   msf_via:<school>   the QR placement this browser last arrived by
//                      (from `?via=` on the /q redirect), so a later send or
//                      purchase is credited to that QR code
// and sends the two browser-side steps ("open", "engage") as beacons.
//
// Every storage access is wrapped: blocked or full storage means an uncounted
// visit, never a broken page.
// ─────────────────────────────────────────────────────────────

import type { Track } from "./funnel";

const ANON_KEY = "msf_anon";
const viaKey = (school: string) => `msf_via:${school}`;

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: this visit simply isn't linked to the next.
  }
}

export function anonId(): string {
  let id = get(ANON_KEY);
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = randomId();
    set(ANON_KEY, id);
  }
  return id;
}

/**
 * Adopt `?via=<placement>` from the address bar (the /q redirect), remember it for
 * this school, and take it out of the address so a shared link doesn't carry it.
 * Returns the placement this browser is credited to, or null (a direct visit).
 */
export function adoptPlacement(school: string): string | null {
  try {
    const url = new URL(window.location.href);
    const via = url.searchParams.get("via");
    if (via && /^[a-z0-9-]{1,40}$/.test(via)) {
      set(viaKey(school), via);
      url.searchParams.delete("via");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  } catch {
    // Unparseable address: fall through to what is remembered.
  }
  return get(viaKey(school));
}

/** What a design or checkout carries to the server. */
export function trackFor(school: string | undefined): Track | null {
  if (!school) return null;
  return { anonId: anonId(), placement: get(viaKey(school)) };
}

/** Send one browser-side step. Fire and forget. */
export function beacon(kind: "open" | "engage", school: string): void {
  try {
    const body = JSON.stringify({ k: kind, s: school, p: get(viaKey(school)), a: anonId() });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/t", blob)) {
      void fetch("/api/t", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Not counted — never an error a parent sees.
  }
}
