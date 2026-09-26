import { SITE_URL } from "@/config/season";

/**
 * MySchoolFrame's own address, e.g. "https://www.myschoolframe.com" — THE one
 * answer for every link we email and every redirect we send.
 *
 * Never the request's own URL: behind Railway's proxy the app sees itself as
 * "localhost:8080", and a sign-in redirect built from `request.url` sent a staff
 * member to https://localhost:8080 (found live, 2026-09-26). Never the request's
 * Origin header either, or anyone could mint a MySchoolFrame email pointing
 * anywhere. And not the SITE_URL env var: it pointed at the holiday domain for
 * weeks. `MSF_SITE_URL` overrides for a local run only.
 */
export function msfOrigin(): string {
  return (process.env.MSF_SITE_URL || SITE_URL).replace(/\/$/, "");
}
