"use client";

import { useEffect, useState } from "react";

import { CANDIDATE_SPEC, specFromQuery, type FitSpec } from "@/lib/fit/spec";

/**
 * The bench's spec, seeded from the URL.
 *
 * Both surfaces that read a link — the bench and the print sheet — need the same
 * two-step: render the default on the server, then adopt the query after mount.
 * Reading `window.location` during render instead would make a link-borne spec a
 * hydration mismatch every single time, because the server has no URL query to
 * read. Having it once means one place explains the guard, and the two pages
 * cannot drift on what a link means.
 *
 * The `setState`-in-an-effect lint warning is inherent to that guard and is
 * accepted HERE rather than in each page: this is the "subscribe to an external
 * system" case the rule carves out, the external system being the address bar.
 * It runs once, on mount, with an empty dependency list.
 */
export function useUrlSpec(): [FitSpec, React.Dispatch<React.SetStateAction<FitSpec>>] {
  const [spec, setSpec] = useState<FitSpec>(CANDIDATE_SPEC);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (Array.from(q.keys()).length > 0) setSpec(specFromQuery(q));
  }, []);

  return [spec, setSpec];
}
