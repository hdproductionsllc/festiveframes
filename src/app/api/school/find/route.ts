import { NextResponse } from "next/server";
import { searchRoster } from "@/data/roster";
import { authoredSlugForRosterId } from "@/data/school-resolve";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/school/find?q= — the finder, nationally.
//
// `FindMySchool` has always ranked the 27 authored kits in the browser, instantly,
// off an array it already has. That stays: it is the fastest possible answer for
// the schools we have done real work on. This route answers for the other 29,440,
// which cannot ship to a phone — the roster is 2.4 MB.
//
// The two are merged on the client, authored first. So this route deliberately
// DROPS any roster row that belongs to an authored kit: serving it would show the
// same school twice under two names, and picking the roster one only redirects
// back to the authored page anyway.
//
// GET, cacheable, no side effects, no body. It is therefore not in `proxy.ts`'s
// rate-limit table, which covers POSTs that spend money or write to Postgres —
// this reads an in-memory index and is cheaper than serving the page around it.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs"; // the roster is read off disk

/** What a result row needs to be pickable: enough to tell two Lincoln Highs
 *  apart, and nothing more. Names repeat nationally, so city and state are not
 *  decoration here — they are the disambiguator. */
export interface SchoolFindResult {
  slug: string;
  name: string;
  city: string;
  state: string;
  type: "PUBLIC" | "PRIVATE";
}

const LIMIT = 10;

export async function GET(request: Request): Promise<NextResponse> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 120).trim();

  // Under two characters the index declines to answer anyway; returning early
  // keeps a stray "?q=" off the search path entirely.
  const results: SchoolFindResult[] =
    q.length < 2
      ? []
      : searchRoster(q, LIMIT + 4)
          .filter((e) => !authoredSlugForRosterId(e.id))
          .slice(0, LIMIT)
          .map((e) => ({
            slug: e.slug,
            name: e.name,
            city: e.city,
            state: e.state,
            type: e.type,
          }));

  return NextResponse.json(
    { results },
    {
      // Five minutes, public: the roster only changes when somebody rebuilds the
      // file and redeploys, and a parent typing a name produces a burst of nearly
      // identical requests that a CDN should absorb.
      headers: { "Cache-Control": "public, max-age=300" },
    },
  );
}
