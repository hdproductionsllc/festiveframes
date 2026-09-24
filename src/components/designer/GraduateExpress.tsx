"use client";

import "./graduate-express.css";
import { BANNER_NAME_LABEL, DEFAULT_BUYER, getBuyer } from "@/data/frame-buyers";
import { NOTHING_PRINTS_UNTIL_YES } from "@/content/msf-pages";

// ─── The graduate plate, in two fields ───────────────────────────────────────
//
// The builder is a power path, and it was the ONLY path. Most people arriving to
// buy a graduation gift do not want to design anything: they want the frame that
// already exists, with the right name and the right year on it, and a button.
//
// So the graduate plate is now the FIRST thing on the page. The year, an
// optional line of banner text, a live frame behind it, and Send.
//
// THE YEAR LEADS, THE NAME IS OPTIONAL (owner, 2026-09-23). The card used to ask
// for "Student's last name" with MILLER as the example, and Send stayed disabled
// until one was typed — so a parent who wanted WILDCATS / CLASS OF 2027 could not
// send from the front door. Left blank, the big line is the school's mascot. The builder is still right there for anyone who
// wants more, and one link away rather than in the way.
//
// SENDS, does not CHARGE. Direct checkout stays closed until the owner has run
// one end-to-end test payment (SCHOOL_CHECKOUT_OPEN) — the published path is send-your-design and we follow up with
// ordering details. The first cut of this card wired its button to handleBuy and
// walked straight past the `{false && ...}` guard that parks the Buy button in
// the header, which would have put an unconfirmed price one tap from the front
// door of a school page.
//
// Graduation earns the primary slot over general spirit for reasons that are
// commercial rather than aesthetic: it has a deadline, it is a gift, and it sells
// several frames per student — parents, both sets of grandparents, and the
// graduate's own car — where a spirit frame sells one to whoever thinks of it.

export function GraduateExpress({
  schoolLabel,
  name,
  onName,
  year,
  onYear,
  years,
  onSend,
  onCustomize,
  busy,
}: {
  /** "SLUH" or null on the generic builder, where we cannot name a school. */
  schoolLabel: string | null;
  name: string;
  onName: (v: string) => void;
  year: string;
  onYear: (v: string) => void;
  years: number[];
  onSend: () => void;
  onCustomize: () => void;
  busy: boolean;
}) {
  return (
    <section className="msf-express" aria-labelledby="msf-express-title">
      <p className="msf-express-eyebrow">🎓 Class of {year || years[0]}</p>
      <h2 className="msf-express-title" id="msf-express-title">
        Their {schoolLabel ? `${schoolLabel} ` : ""}graduation frame
      </h2>
      <p className="msf-express-lede">
        Choose their class year and the frame on this page updates to match,
        with their cap and diploma already on it. What you see here is what we
        print, and you&apos;re welcome to add a line of your own.
      </p>

      <div className="msf-express-fields">
        {/* Year first: it is the one thing the frame needs. */}
        <label className="msf-express-field msf-express-year">
          <span>Class year</span>
          <select name="grad-year" value={year} onChange={(e) => onYear(e.target.value)}>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="msf-express-field">
          <span>{BANNER_NAME_LABEL}</span>
          <input
            type="text"
            name="grad-name"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder={getBuyer(DEFAULT_BUYER).namePlaceholder}
            maxLength={14}
            autoComplete="off"
          />
        </label>
      </div>

      <button
        type="button"
        className="msf-express-order"
        onClick={onSend}
        disabled={busy}
      >
        {busy ? "Sending…" : "Send this design"}
      </button>
      <p className="msf-express-note">
        {NOTHING_PRINTS_UNTIL_YES} We&apos;ll follow up with ordering
        details.
      </p>

      <button type="button" className="msf-express-more" onClick={onCustomize}>
        Or make it your own: badges, colors and the things they do
      </button>
    </section>
  );
}
