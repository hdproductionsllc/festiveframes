# High School Collection artwork

Becky Newman's high-school snappets (delivered 2026-07-22, 20 PNGs).

The piece data is already wired up in `src/data/sets/high-school.ts` and expects the
20 slugged filenames listed in that file's `ART_MANIFEST`. Becky's originals are named
`High School Collection <Thing> snappet.png`; the importer does the renaming:

```
node scripts/import-high-school-art.mjs <dir-with-her-pngs>
```

It reports anything missing or unmatched, and exits non-zero until all 20 are present.

Once they are, add `"hs"` to `SCHOOL_SURFACED_SET_IDS` in `src/data/sets/index.ts` and
the collection appears in the school builder's palette. It is held out of that list
until then so the palette never renders broken images.
