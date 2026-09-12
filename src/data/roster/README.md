# The national school roster

`us-high-schools.json` is every US high school this product can build a page for.
It is generated, committed, and read only on the server.

## Source

The **NCES CCD** (public school directory) and **PSS** (private school survey)
directories, the US Department of Education's own listings — public-domain
federal data. The extract this file was built from was rebuilt **2026-06** and
lives outside this repo as `us_high_schools.json`: an array of
`{id, name, street, city, state, zip, agency?, population?, type, alias?}`.

## Rebuild

```
node scripts/build-roster.mjs <path-to-us_high_schools.json>
```

Deterministic and offline — same input, byte-identical output. Commit the result.

## Counts

| | |
|---|---|
| rows in | 33,923 |
| dropped, name matched a facility pattern | 205 |
| dropped, enrolment under 50 | 4,251 |
| **rows kept** | **29,467**, across 56 states and territories |

## Filters

1. **`population < 50` is dropped.** Below that a "high school" is usually a
   program of a handful of students inside another school's building, and a
   frame fundraiser needs a parent body. Rows with **no** population are
   **kept** — private (PSS) entries often omit it, and absence is not smallness.
2. **Facilities are dropped by name:**
   `detention|juvenile|correction|jail|prison|hospital|treatment|residential|rehab|day treatment|alternative learning ctr`.
   Every one serves real students; none has the school community this product is
   for, and a license-plate frame naming a juvenile detention centre is a mistake
   we would only hear about from the person it happened to.
3. **Names are not re-worded.** The source already title-cases. Normalising here
   is whitespace only — "St Louis" stays "St Louis". Anything cleverer invents a
   name the school does not use, and the name is what a parent types.

## Shape

A compact array-of-arrays with a **header row**, one row per line: 34k objects
repeating seven keys each is about 9 MB of the same seven words.

```json
[
["id","name","city","state","zip","type","population"],
["010000500871","Albertville High School","Albertville","AL","35950","PUBLIC",1710],
...
]
```

## No slug column

A school's URL identity is derived once, in `src/data/roster.ts`, from its own
name + city + state (`rosterSlug`). The build script does not compute slugs, so
the two cannot drift apart — the recurring defect in this codebase is an axis
derived on one side and written longhand on the other. `roster.test.ts` asserts
the derived slugs are unique across every row.

## How a row becomes a page

`data/thin-kit.ts` turns a row into a `SchoolKit` at request time; `/s/<slug>`
resolves through `data/school-resolve.ts` (authored kit → roster row → 404).
See **National roster — how a school page resolves** in `CLAUDE.md`.
