"use client";

import "./graduate-express.css";

// ─── The graduate plate, in two fields ───────────────────────────────────────
//
// The builder is a power path, and it was the ONLY path. Most people arriving to
// buy a graduation gift do not want to design anything: they want the frame that
// already exists, with the right name and the right year on it, and a button.
//
// So the graduate plate is now the FIRST thing on the page. Two fields, a live
// frame behind it, and Order. The builder is still right there for anyone who
// wants more, and one link away rather than in the way.
//
// SENDS, does not CHARGE. Direct checkout is parked until pricing is
// owner-confirmed — the published path is send-your-design and we follow up with
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
  disabled,
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
  /** Stays disabled until there is something worth sending. */
  disabled: boolean;
}) {
  return (
    <section className="msf-express" aria-labelledby="msf-express-title">
      <p className="msf-express-eyebrow">🎓 Class of {year || years[0]}</p>
      <h2 className="msf-express-title" id="msf-express-title">
        Get the {schoolLabel ? `${schoolLabel} ` : ""}graduate plate
      </h2>
      <p className="msf-express-lede">
        Their name and their year. That is the whole thing — the frame below is
        the frame we print.
      </p>

      <div className="msf-express-fields">
        <label className="msf-express-field">
          <span>Student&apos;s last name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="MILLER"
            maxLength={14}
            autoComplete="off"
          />
        </label>
        <label className="msf-express-field msf-express-year">
          <span>Class year</span>
          <select value={year} onChange={(e) => onYear(e.target.value)}>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className="msf-express-order"
        onClick={onSend}
        disabled={busy || disabled}
      >
        {busy ? "Sending…" : "Send this design"}
      </button>
      <p className="msf-express-note">
        Nothing prints until you approve it. We&apos;ll follow up with ordering
        details.
      </p>

      <button type="button" className="msf-express-more" onClick={onCustomize}>
        Or customize it — badges, colours, their sport
      </button>
    </section>
  );
}
