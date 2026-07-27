"use client";

// ─── "Paste your school's website" — the brand import panel ──────────────────
//
// A parent pastes a URL, we scan the page, and they get their crest and their name
// without hunting for files. It sits at the TOP of the left tools rail because it is
// the first thing you do once and never again; the palette and the upload button
// below it are the things you reach for on every subsequent action.
//
// THIS COMPONENT DOES NOT THINK. Every judgement it makes — is this candidate
// addable, what do we say about it, which suggested action can we actually run, which
// detected text is worth offering — lives in `@/lib/school-brand/import-ui` as a pure
// function with a test. `vitest.config.ts` is `environment: "node"` with no jsdom, so
// a decision left inside this file is a decision with no test, and the two decisions
// that matter most here (the full-res handoff, the resolution gate) are invisible on
// every screen a human will ever look at.
//
// TWO THINGS IT DELIBERATELY DOES NOT DO:
//
//   1. IT DOES NOT PLACE ART. `Add to frame` builds a `File` out of the candidate's
//      FULL-RES png and hands it to `useSnappetUpload.begin` — the same call
//      `UploadPhotoButton` makes. Everything downstream is therefore the existing
//      flow, unchanged: the aspect-locked `ImageCropModal` with its live DPI gate, the
//      2x2 `frameConfig.minTileSpan` floor, `putFullRes` into IndexedDB,
//      `placeImageSnappet`. A second placement path would be a second copy of all
//      three, and the copy would drift.
//   2. IT DOES NOT WRITE ITS OWN ERROR COPY for a scan that ran. The route returns
//      `copy` from `describeOutcome`/`buildEmptyState` — five distinguishable states
//      plus one deliberately opaque one — and this renders what it is given. Only ONE
//      message originates here (`TRANSPORT_COPY`), and it is about US rather than
//      about the school's website. See the note on it.

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { BrandScanResponse } from "@/app/api/school/brand-scan/route";
import type { OutcomeCopy, NextAction } from "@/lib/school-brand";
import {
  artworkOf,
  bannerFills,
  candidateAspect,
  candidateFileName,
  candidateNotes,
  dataUrlToFile,
  groupBannerFills,
  isSubmittableUrl,
  performableActions,
  type BannerFill,
} from "@/lib/school-brand/import-ui";
import type { ScanCandidate, RejectedCandidate } from "@/lib/school-brand/prepare-artwork.server";
import { useDesignStore } from "@/stores/design-store";
import { buildBrandKit, type SchoolBrandKit } from "@/lib/school-brand/apply-brand";
import { SECTION_LABELS } from "@/lib/utils/sections";
import type { SectionId } from "@/lib/types";

import { readImageAspect, uploadableSections, useSnappetUpload } from "./useSnappetUpload";

/** Render fixed overlays into <body> so no transformed/clipping ancestor can trap
 *  them (a real iOS failure mode). No-op during SSR (document is undefined). */
function Overlay({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/**
 * The ONE piece of failure copy written here rather than returned by the route.
 *
 * It covers our own `fetch` throwing: the request never reached the handler, so there
 * is no outcome and no server copy to render. It gets its own words instead of being
 * folded into `unreachable` because the two are about different machines. "We couldn't
 * reach that address" sends the user to re-read the URL they typed — and the URL was
 * never the problem; ours was down, or their phone dropped off wifi mid-tap. Retrying
 * the SAME address is the right advice here and the wrong advice there.
 */
const TRANSPORT_COPY: OutcomeCopy = {
  headline: "We couldn't run the scan",
  detail:
    "That's on our end, not the school's site — the address you pasted was never tried. Give it another go, or skip it and use a photo.",
  actions: [
    { id: "upload-photo", label: "Upload a photo", primary: true },
    { id: "try-another-page", label: "Try a different page", primary: false },
  ],
  retryable: true,
};

type Phase =
  | { kind: "idle" }
  | { kind: "scanning" }
  /** The scan produced a verdict we could not use. `copy` is the route's, not ours. */
  | { kind: "failed"; copy: OutcomeCopy }
  /** The scan ran and found nothing printable. THE MOST LIKELY SUCCESSFUL OUTCOME. */
  | {
      kind: "empty";
      copy: OutcomeCopy;
      fills: BannerFill[];
      /** What was actually fetched and measured. Rendered behind a disclosure so
       *  "nothing works" can always be turned into "here is what it found". */
      candidates: ScanCandidate[];
      rejected: RejectedCandidate[];
      kit: SchoolBrandKit | null;
      /** Discarded before any fetch — vendor marks, print-black SVGs. Without these
       *  the list cannot distinguish "never saw the crest" from "saw it and dropped
       *  it", which is the distinction that matters when a scan comes back empty. */
      dropped: { url: string; kind: string; reason: string }[];
    }
  | {
      kind: "results";
      candidates: ScanCandidate[];
      fills: BannerFill[];
      rejected: number;
      truncated: boolean;
      kit: SchoolBrandKit | null;
    };

/** The "where should it go?" hand-off, shared by Add-a-candidate and Upload-a-photo. */
type Placing =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "choose"; file: File; aspect: number; panels: SectionId[] }
  | { kind: "full" };

/**
 * The check mark, as a line icon rather than a ✓ character. It is semi load-bearing
 * in two places — it is the ONLY marker that a banner fill has been applied, and the
 * only marker that a candidate was repaired — so it is replaced, not dropped. Same
 * house spec as every other icon in the re-skin: 24x24 box, no fill, 1.5 stroke,
 * round caps, 16px, `currentColor`.
 */
function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

/** Path + filename of a URL, for the diagnostic list. Full URLs wrap to four lines
 *  in a 340px rail and bury the part that identifies the file. */
function shortUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const tail = u.pathname.split("/").filter(Boolean).slice(-2).join("/");
    return (tail || u.pathname) + (u.search ? u.search.slice(0, 40) : "");
  } catch {
    return url.slice(0, 60);
  }
}

export function SchoolBrandImport() {
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const slots = useDesignStore((s) => s.slots);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const selectSection = useDesignStore((s) => s.selectSection);
  const setSectionText = useDesignStore((s) => s.setSectionText);
  const setSectionMode = useDesignStore((s) => s.setSectionMode);
  const setFrameColor = useDesignStore((s) => s.setFrameColor);
  const setTileFieldColor = useDesignStore((s) => s.setTileFieldColor);
  const setRimColor = useDesignStore((s) => s.setRimColor);

  // The EXISTING upload flow, untouched. `begin` opens the aspect-locked crop modal
  // with its live print-resolution gate and commits through `placeImageSnappet` at the
  // 2x2 floor. Nothing about a scanned logo is special once it is a File.
  const { begin, cropModal } = useSnappetUpload();

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [placing, setPlacing] = useState<Placing>({ kind: "idle" });
  const [filled, setFilled] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const canScan = useMemo(() => isSubmittableUrl(url), [url]);
  const scanning = phase.kind === "scanning";

  // ── the scan ──
  const runScan = async () => {
    if (!canScan || scanning) return;
    setPhase({ kind: "scanning" });
    setFilled(null);
    let data: BrandScanResponse;
    try {
      const res = await fetch("/api/school/brand-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      // The route answers 200 for every verdict it successfully established about
      // somebody else's server (a 404 over there is a fact, not a failure over here)
      // and 400 only for a URL that is not a URL. Both carry `copy`, so both are
      // parsed rather than branched on `res.ok`.
      data = (await res.json()) as BrandScanResponse;
    } catch {
      setPhase({ kind: "failed", copy: TRANSPORT_COPY });
      return;
    }

    if (!data.ok) {
      setPhase({ kind: "failed", copy: data.copy });
      return;
    }

    const fills = bannerFills(data.profile);
    // BRANDING IS INDEPENDENT OF ARTWORK, and that distinction is the whole point: a
    // page whose every image is a 180px web asset still names the school, names the
    // mascot and declares its colours. Treating "no printable logo" as "the scan
    // failed" threw all of that away — the frame could have been in the school's
    // colours with its mascot on it, and instead the user got an apology.
    const kit = buildBrandKit(data.profile);
    // `data.empty` is the route's own recount AFTER decoding, not the parse-time
    // guess: the profile could not know that all four surviving candidates turned out
    // to be 180px. Trusting `candidates.length` instead would show a grid of cards
    // whose buttons are all disabled, which is the empty state wearing a costume.
    if (data.empty) {
      setPhase({
        kind: "empty",
        copy: {
          headline: data.emptyState?.headline ?? "Nothing on this page prints at 2 inches",
          detail: data.emptyState?.detail ?? "",
          actions: data.emptyState?.actions ?? [],
          retryable: false,
        },
        // The text is still worth keeping even when no artwork survived — a page with
        // a 180px crest usually still names the school, and that is half the banner.
        fills,
        // Kept, not discarded. The route measured every one of these; throwing the
        // measurements away is what made "nothing prints" unanswerable — for the
        // owner debugging a scan, and for anyone wondering whether we even looked.
        candidates: data.candidates,
        rejected: data.rejected,
        dropped: data.dropped ?? [],
        kit,
      });
      return;
    }

    setPhase({
      kind: "results",
      candidates: data.candidates,
      fills,
      rejected: data.rejected.length,
      truncated: data.truncated,
      kit,
    });
  };

  // ── the shared hand-off into the existing upload path ──
  const offerFile = (file: File, aspect: number) => {
    const panels = uploadableSections(frameConfig, slots, sections, textBars);
    if (panels.length === 0) {
      setPlacing({ kind: "full" });
      return;
    }
    setPlacing({ kind: "choose", file, aspect, panels });
  };

  const addCandidate = (c: ScanCandidate) => {
    // CONSTRAINT 4, at the one place it can go wrong on the client. `artworkOf` returns
    // the FULL-RES image; the `<img>` on the card above renders `c.preview`. Reaching
    // for `preview` here would look identical on every screen and throw away most of
    // the pixels on the printed badge.
    const art = artworkOf(c);
    let file: File;
    try {
      file = dataUrlToFile(art.dataUrl, candidateFileName(c));
    } catch {
      setPhase({ kind: "failed", copy: TRANSPORT_COPY });
      return;
    }
    // Aspect measured on the full-res too, and passed as `knownAspect` so `begin`
    // skips a redundant decode of an image we already have the dimensions of.
    offerFile(file, candidateAspect(c));
  };

  const onPickFile = async (file?: File) => {
    if (!file) return;
    setPlacing({ kind: "reading" }); // immediate feedback before a slow phone decode
    offerFile(file, await readImageAspect(file));
  };

  const choosePanel = (file: File, aspect: number, panel: SectionId) => {
    setPlacing({ kind: "idle" });
    selectSection(panel); // reflect it in the Sections panel + the editor below
    void begin(file, panel, aspect);
  };

  // ── one-tap banner fills ──
  const applyFill = (f: BannerFill) => {
    // `setSectionText` forces the section into text mode itself, but the mode is set
    // explicitly first so the top bar's guard (`sectionSupportsTiles` is false there,
    // so text is the only legal mode) runs before the write rather than after it.
    setSectionMode(f.section, "text");
    setSectionText(f.section, { [f.field]: f.value });
    selectSection(f.section);
    setFilled(`${f.kind}:${f.value}`);
  };

  // ── apply the WHOLE brand in one stroke ──
  const applyKit = (k: SchoolBrandKit) => {
    // The BODY first, because it is the change you actually see: it is the largest
    // area of the product, and recolouring only the banners was the gap that made
    // "use this school" feel like it had barely done anything.
    setFrameColor(k.frameColor);
    // The BADGE fields and the RIM too. Recolouring the body alone left every tile on
    // its own navy chip and the rim still gold, so the frame was the school's colour
    // everywhere except the parts you actually look at.
    setTileFieldColor(k.tileFieldColor);
    setRimColor(k.rimColor);
    // Mode before text: the top bar cannot hold tiles, so `sectionSupportsTiles` has
    // to have run before the write rather than after it.
    //
    // The top strip is OPTIONAL. When the scan found no mascot and no motto the
    // school's name goes on the bottom banner alone, and there is nothing true left
    // for the top to say — so it keeps whatever the user already had rather than
    // being overwritten with a repeat of the name.
    if (k.top) {
      setSectionMode("top", "text");
      setSectionText("top", k.top);
    }
    setSectionMode("bottom", "text");
    setSectionText("bottom", k.bottom);
    selectSection("bottom");
    setFilled(`kit:${k.schoolName}`);
  };

  // ── the suggested next actions, filtered to what this panel can run ──
  const runAction = (a: NextAction) => {
    switch (a.id) {
      case "try-another-page":
        setPhase({ kind: "idle" });
        setUrl("");
        urlRef.current?.focus();
        return;
      case "type-it-in":
        // Somebody who has given up on the scan wants to be typing, so put them there:
        // the bottom banner, in text mode, selected, with the editor open beneath.
        setSectionMode("bottom", "text");
        selectSection("bottom");
        return;
      case "upload-photo":
      case "paste-image-url":
        // `upload-photo` is a <label> around a real file input rather than a button —
        // see the render below. `paste-image-url` never reaches here; it is filtered
        // out by `performableActions` because nothing in this app accepts one.
        return;
    }
  };

  const outcomeCopy = phase.kind === "failed" || phase.kind === "empty" ? phase.copy : null;
  const fills = phase.kind === "results" || phase.kind === "empty" ? phase.fills : [];

  return (
    <div className="ff-panel p-3">
      {/* The 🏫 is gone rather than swapped for a line icon: it was decoration in a
          heading, and a heading that needs a picture to be understood has the wrong
          words. Sentence case at 600 — the whole page tops out at 600. */}
      <h3 className="ff-h2 mb-1">Get your school&apos;s branding</h3>
      <p className="ff-help mb-2.5">
        Paste your school&apos;s website and we&apos;ll look for the crest, the name and
        the motto. Nothing is added until you pick it.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runScan();
        }}
        className="flex gap-2"
      >
        {/* `type="text"`, NOT `type="url"`. This was a real defect, found only by
            driving the page in Chromium: with `type="url"` the browser's own
            constraint validation rejects a bare hostname, so submitting
            `lincolnhigh.org` — the exact string in our own placeholder, and a string
            the route deliberately accepts by prefixing https:// — silently did
            nothing. The button looked live, the field looked valid, and the form
            never fired. `inputMode="url"` still gets the right phone keyboard, which
            is the only part of `type="url"` that was earning its place. */}
        <input
          ref={urlRef}
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="lincolnhigh.org"
          aria-label="School website address"
          className="ff-field min-w-0 flex-1"
        />
        {/* Scan is the ONE primary action in this panel. */}
        <button type="submit" disabled={!canScan || scanning} className="ff-btn ff-btn-primary shrink-0">
          {scanning ? "Scanning..." : "Scan"}
        </button>
      </form>

      {/* Scanning. Named steps rather than a bare spinner: the route fetches
          robots.txt, then the page, then up to twelve images SEQUENTIALLY (the memory
          cap makes that non-negotiable), so this legitimately takes ten or twenty
          seconds on a slow school CDN and a silent spinner reads as a hang. */}
      {scanning && (
        <div role="status" className="ff-well mt-2.5 px-3 py-2.5">
          <p className="ff-label">Reading the page...</p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ff-line)]">
            <div className="ff-upload-bar h-full rounded-full bg-[var(--ff-accent)]" />
          </div>
          <p className="ff-micro mt-1.5">
            We check each logo at print size one at a time - this can take a few
            seconds.
          </p>
        </div>
      )}

      {/* Failure and empty share a shape, because to the user they are the same
          moment: the scan is over and there is no crest on screen. What differs is the
          words and whether Retry can possibly work — both of which come from the
          route's own taxonomy, not from here.

          The two now differ in SURFACE as well as words: empty is a warning (the scan
          ran; nothing printable came back) and failure is an error. They used to be
          gold and white, which said nothing about which was which. */}
      {outcomeCopy && (
        <div
          role="status"
          className={`mt-2.5 rounded-[10px] border border-[var(--ff-line)] px-3 py-2.5 ${
            phase.kind === "empty" ? "bg-[var(--ff-warn-soft)]" : "bg-[var(--ff-danger-soft)]"
          }`}
        >
          <p className="text-[13px] font-semibold leading-snug text-[var(--ff-ink)]">
            {outcomeCopy.headline}
          </p>
          {outcomeCopy.detail && (
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--ff-ink-2)]">
              {outcomeCopy.detail}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* `performableActions` drops anything this panel cannot actually run and
                guarantees at least "Upload a photo" survives — the action that works
                no matter what the school's website did. An empty row here would be a
                state the user cannot leave. */}
            {performableActions(outcomeCopy.actions).map((a) =>
              a.id === "upload-photo" ? (
                <UploadChip key={a.id} primary={a.primary} label={a.label} onPick={onPickFile} />
              ) : (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => runAction(a)}
                  className="ff-chip"
                >
                  {a.label}
                </button>
              ),
            )}
            {outcomeCopy.retryable && (
              <button
                type="button"
                onClick={() => void runScan()}
                disabled={!canScan}
                className="ff-chip ff-chip-on"
              >
                Try again
              </button>
            )}
          </div>

          {/* THE ONE-STROKE APPLY, above the per-field chips. Offered on the EMPTY
              outcome too: the artwork failing says nothing about whether we know the
              school's name, mascot and colours, and on a real site those survived
              while every image was too small to print. */}
          {phase.kind === "empty" && phase.kit && (
            <div className="ff-panel mt-2.5 p-2.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-6 w-6 shrink-0 rounded-[var(--ff-radius-sm,6px)] border"
                  style={{ background: phase.kit.frameColor, borderColor: "var(--ff-line,#1e1b17)" }}
                />
                <span
                  aria-hidden
                  title="Rim"
                  className="h-6 w-6 shrink-0 rounded-full border"
                  style={{ background: phase.kit.rimColor, borderColor: "var(--ff-line,#1e1b17)" }}
                />
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--ff-ink,#1e1b17)]">
                  {phase.kit.schoolName}
                  {phase.kit.mascot ? ` · ${phase.kit.mascot}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyKit(phase.kit!)}
                className="ff-btn ff-btn-primary ff-btn-block mt-2"
              >
                Use this school&apos;s branding
              </button>
              <p className="ff-help mt-1">
                One background behind the badges and both banners, the school&apos;s
                lighter colour on the rim and the lettering. Change anything after.
              </p>
            </div>
          )}

          {/* WHAT WE ACTUALLY FOUND.
              "Nothing on this page prints" is an assertion the user has no way to
              check, and the route already measured every one of these — the sizes
              were being computed and thrown away. Behind a disclosure so the normal
              path stays one sentence, but one click from "it doesn't work" to the
              filename and the pixel size of each thing we looked at. It is also the
              only diagnostic available for a site the developer cannot reach: the
              shape of these URLs says which collector is still blind. */}
          {phase.kind === "empty" &&
            (phase.candidates.length > 0 ||
              phase.rejected.length > 0 ||
              phase.dropped.length > 0) && (
              <details className="mt-2 border-t border-[var(--ff-line)] pt-1.5">
                <summary className="ff-label cursor-pointer">
                  What we found (
                  {phase.candidates.length + phase.rejected.length + phase.dropped.length})
                </summary>
                <ul className="mt-1.5 space-y-1.5">
                  {phase.candidates.map((c, i) => (
                    <li key={`c${i}`} className="ff-micro">
                      <span className="font-bold">
                        {c.fullRes.width}×{c.fullRes.height}
                      </span>
                      {" — "}
                      {c.resolution.blocked
                        ? `${Math.round(c.resolution.dpi)} DPI at 2 inches, needs 200`
                        : (c.qc.findings[0]?.message ?? "Not sharp enough to print")}
                      <span className="ff-micro block break-all font-mono">
                        {shortUrl(c.url) || `${c.kind} (inline)`}
                      </span>
                    </li>
                  ))}
                  {phase.dropped.map((d, i) => (
                    <li key={`d${i}`} className="ff-micro">
                      <span className="font-bold">skipped: {d.reason}</span>
                      <span className="ff-micro block break-all font-mono">
                        {shortUrl(d.url) || `${d.kind} (inline)`}
                      </span>
                    </li>
                  ))}
                  {phase.rejected.map((r, i) => (
                    <li key={`r${i}`} className="ff-micro">
                      <span className="font-bold">{r.reason}</span>
                      {r.detail ? ` — ${r.detail}` : ""}
                      <span className="ff-micro block break-all font-mono">
                        {shortUrl(r.url) || `${r.kind} (inline)`}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
        </div>
      )}

      {/* Candidates. Each card shows the PREVIEW (display only — see `addCandidate`
          for the full-res handoff), what it is, what we measured, and what we already
          fixed. A card whose Add button is off always says why. */}
      {phase.kind === "results" && (
        <div className="mt-2.5 space-y-2">
          <p className="ff-label">
            {phase.candidates.length === 1 ? "1 logo found" : `${phase.candidates.length} logos found`}
            {phase.truncated && " · showing the best ones"}
            {phase.rejected > 0 && ` · ${phase.rejected} skipped`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {phase.candidates.map((c, i) => (
              <CandidateCard key={`${c.url}-${i}`} candidate={c} onAdd={() => addCandidate(c)} />
            ))}
          </div>
        </div>
      )}

      {/* Detected text. Offered in BOTH the results and the empty state, because a
          page whose crest is too small to print usually still names the school — and
          the name is half of what the frame is for. */}
      {fills.length > 0 && (
        <div className="ff-well mt-2.5 px-3 py-2.5">
          <p className="ff-label">Tap to fill a banner</p>
          {/* Grouped, so the destination is said ONCE per group. Two name candidates
              used to render as two chips each stamped "SCHOOL NAME → TOP BAR", which
              reads as two controls that happen to share a label rather than as one
              choice with two answers. */}
          <div className="mt-1.5 space-y-2">
            {groupBannerFills(fills).map((g) => (
              <div key={g.kind}>
                <p className="ff-micro">
                  {g.label} <span>{g.hint}</span>
                </p>
                <div className="mt-1 space-y-1">
                  {g.fills.map((f) => {
                    const key = `${f.kind}:${f.value}`;
                    const isFilled = filled === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyFill(f)}
                        title={f.value}
                        className={`block w-full rounded-[6px] border px-2.5 py-1.5 text-left text-[12px] font-medium leading-tight transition-colors ${
                          isFilled
                            ? "border-[var(--ff-accent)] bg-[var(--ff-accent)] text-white"
                            : "border-[var(--ff-line-strong)] bg-[var(--ff-card)] text-[var(--ff-ink)] hover:bg-[var(--ff-sunk)]"
                        }`}
                      >
                        <span className="block truncate">
                          {isFilled && <CheckIcon />}
                          {f.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="ff-micro mt-1.5">
            These are our best guesses from the page — tap one, then edit it in the
            panel editor below.
          </p>
        </div>
      )}

      {/* ── the shared "where should it go?" hand-off ── */}

      {placing.kind === "reading" && (
        <Overlay>
          <div className="ff-school-portal ff-scrim fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="ff-modal w-full max-w-[320px] p-5 text-center">
              <p className="ff-h2 mb-3">Loading your photo...</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ff-line)]">
                <div className="ff-upload-bar h-full rounded-full bg-[var(--ff-accent)]" />
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {placing.kind === "choose" && (
        <Overlay>
          <div
            className="ff-school-portal ff-scrim fixed inset-0 z-[110] flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            onClick={() => setPlacing({ kind: "idle" })}
          >
            <div
              className="ff-modal w-full max-w-[360px] p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="ff-h2 mb-1">Where should it go?</h3>
              <p className="ff-help mb-3">
                Pick a spot - you can drag and resize it after.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {placing.panels.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => choosePanel(placing.file, placing.aspect, id)}
                    className="ff-btn ff-btn-secondary ff-btn-block"
                  >
                    {SECTION_LABELS[id]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPlacing({ kind: "idle" })}
                className="ff-btn ff-btn-secondary ff-btn-sm mt-3 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {placing.kind === "full" && (
        <p className="ff-well mt-2 px-2.5 py-1.5 text-[12px] text-[var(--ff-ink-2)]">
          Every panel is full or set to text. Clear a tile or switch a panel back to{" "}
          <span className="font-medium text-[var(--ff-ink)]">Badges</span>, then try again.
        </p>
      )}

      {cropModal}
    </div>
  );
}

/**
 * "Upload a photo" as a real file input rather than a button.
 *
 * A `<label>` wrapping a visually-hidden (NOT `display:none`) input is the reliable
 * iOS pattern — tapping the label opens the picker AND the native label→input link
 * fires `change` on selection. A `display:none` input opens the picker and then often
 * never fires `change`, which reads as the tap having done nothing. Copied
 * deliberately from `UploadPhotoButton`, where that failure was actually hit.
 */
function UploadChip({
  primary,
  label,
  onPick,
}: {
  primary: boolean;
  label: string;
  onPick: (file?: File) => void | Promise<void>;
}) {
  return (
    <label
      className={`ff-chip cursor-pointer ${primary ? "ff-chip-on" : ""}`}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = ""; // let the same file be re-picked / re-cropped
        }}
      />
      {label}
    </label>
  );
}

/** One candidate. All of its copy comes from `candidateNotes`. */
function CandidateCard({ candidate, onAdd }: { candidate: ScanCandidate; onAdd: () => void }) {
  const notes = candidateNotes(candidate);
  return (
    <div
      className={`flex flex-col rounded-[10px] border border-[var(--ff-line)] bg-[var(--ff-card)] p-2 ${
        notes.addable ? "" : "opacity-75"
      }`}
    >
      {/* The PREVIEW, and only here. `addCandidate` sends the full-res.
          A checkerboard behind it, because most of these are transparent PNGs and a
          white swatch on a white card is how you fail to notice a baked-in white box. */}
      <div
        className="mb-1.5 flex h-20 items-center justify-center overflow-hidden rounded-[6px] border border-[var(--ff-line)]"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#eceae6 25%,transparent 25%,transparent 75%,#eceae6 75%),linear-gradient(45deg,#eceae6 25%,transparent 25%,transparent 75%,#eceae6 75%)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0, 6px 6px",
          backgroundColor: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a base64 data URL from
            our own API; next/image would round-trip it through the optimizer for no gain. */}
        <img
          src={candidate.preview.dataUrl}
          alt={candidate.alt || "Logo found on the school's website"}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <p className="ff-label truncate">
        {notes.title}
      </p>
      {/* The page's own alt text, on its own line and clamped to two. Combined with
          the kind on one line it truncated to `LOGO IMAGE — "LIN…` in a 340px rail,
          which threw away the only part that tells two crests apart. */}
      {notes.alt && (
        <p
          className="ff-micro line-clamp-2"
          title={notes.alt}
        >
          “{notes.alt}”
        </p>
      )}
      <p className="ff-micro">{notes.spec}</p>
      <p
        className={`mt-1 text-[11px] leading-snug ${
          notes.addable ? "text-[var(--ff-ink-2)]" : "text-[var(--ff-danger)]"
        }`}
      >
        {notes.verdict}
      </p>

      {notes.cautions.map((c) => (
        <p key={c} className="ff-micro mt-0.5">
          · {c}
        </p>
      ))}
      {/* What we already did to it, so "why does this look different from their
          website" has an answer on the card instead of in a support email. The raw
          repair strings are engineer-facing ("Removed the (255,255,255) matte from 812
          edge pixels") so they go in the tooltip, not the card. */}
      {notes.repairs.length > 0 && (
        <p
          className="ff-micro mt-0.5 flex items-center gap-1"
          title={notes.repairs.join(" ")}
        >
          <CheckIcon />
          Cleaned up for print
        </p>
      )}

      {/* `mt-auto` so the buttons line up across a row whose cards have different
          amounts of text — without it a two-line caution on one card pushed its
          button below its neighbour's and the row read as broken. */}
      <div className="mt-auto pt-1.5">
        <button
          type="button"
          onClick={onAdd}
          disabled={!notes.addable}
          className="ff-btn ff-btn-primary ff-btn-sm w-full"
        >
          {notes.addable ? "Add to frame" : "Too small"}
        </button>
      </div>
    </div>
  );
}
