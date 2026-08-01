// ─── What they do ────────────────────────────────────────────────────────────
//
// The intake's activity list, lifted out of the builder's JSX so it can carry
// facts about each entry rather than only a label. Two of those matter:
//
//   • whether the activity has a UNIFORM NUMBER, which decides whether we ask
//   • which GROUP it belongs to, so a forty-item list is scannable on a phone
//
// The number question is the one worth getting right. A swimmer, a wrestler and
// a golfer have no number, and asking a parent for one is asking a question with
// no answer — the field has to earn its place per sport rather than per sport-ish
// category. Where a sport is judged case by case, the rule used is whether the
// number is worn on the athlete AND stays theirs for the season:
//
//   • Track and cross country pin on a BIB, assigned fresh at every meet. It is
//     not their number, so they do not get the field.
//   • Water polo caps ARE numbered, and the number is the player's for the
//     season, so they do.
//   • Rugby numbers are positional (a 10 is the fly-half) rather than personal,
//     but they are worn all season and every player knows theirs, so they do.
//   • Wrestling is a weight class, not a number.
//   • Esports has a tag, not a number, and it is not a number we could print in
//     two digits anyway.
//
// The whole list is an educated call, not a rule handed down; a sport that turns
// out to want a number is a one-word edit here.

export type ActivityGroup = "Sports" | "Arts" | "Academics & clubs";

export interface Activity {
  /** The badge piece this places. */
  id: string;
  label: string;
  group: ActivityGroup;
  /** Worn on the uniform, theirs for the season. See the note above. */
  numbered?: boolean;
}

export const ACTIVITIES: Activity[] = [
  // ── Sports ────────────────────────────────────────────────────────────────
  { id: "hs:football-patch", label: "Football", group: "Sports", numbered: true },
  { id: "hs:soccer-patch", label: "Soccer", group: "Sports", numbered: true },
  { id: "hs:basketball-patch", label: "Basketball", group: "Sports", numbered: true },
  { id: "hs:volleyball-patch", label: "Volleyball", group: "Sports", numbered: true },
  { id: "hs:baseball-patch", label: "Baseball", group: "Sports", numbered: true },
  { id: "hs:softball-patch", label: "Softball", group: "Sports", numbered: true },
  { id: "hs:lacrosse", label: "Lacrosse", group: "Sports", numbered: true },
  { id: "hs:ice-hockey", label: "Ice Hockey", group: "Sports", numbered: true },
  { id: "hs:field-hockey", label: "Field Hockey", group: "Sports", numbered: true },
  { id: "hs:water-polo", label: "Water Polo", group: "Sports", numbered: true },
  { id: "hs:rugby", label: "Rugby", group: "Sports", numbered: true },
  { id: "hs:track", label: "Track", group: "Sports" },
  { id: "hs:cross-country", label: "Cross Country", group: "Sports" },
  { id: "hs:swim-dive", label: "Swim & Dive", group: "Sports" },
  { id: "hs:wrestling", label: "Wrestling", group: "Sports" },
  { id: "hs:tennis", label: "Tennis", group: "Sports" },
  { id: "hs:golf", label: "Golf", group: "Sports" },
  { id: "hs:racquetball", label: "Racquetball", group: "Sports" },
  { id: "hs:gymnastics", label: "Gymnastics", group: "Sports" },
  { id: "hs:bowling", label: "Bowling", group: "Sports" },
  { id: "hs:cheer", label: "Cheer", group: "Sports" },
  { id: "hs:dance", label: "Dance", group: "Sports" },
  { id: "hs:esports", label: "Esports", group: "Sports" },

  // ── Arts ──────────────────────────────────────────────────────────────────
  { id: "hs:band", label: "Band", group: "Arts" },
  { id: "hs:marching-band", label: "Marching Band", group: "Arts" },
  { id: "hs:orchestra", label: "Orchestra", group: "Arts" },
  { id: "hs:choir", label: "Choir", group: "Arts" },
  { id: "hs:drama", label: "Drama", group: "Arts" },
  { id: "hs:art-club", label: "Art Club", group: "Arts" },
  { id: "hs:photography", label: "Photography", group: "Arts" },

  // ── Academics & clubs ─────────────────────────────────────────────────────
  { id: "hs:yearbook", label: "Yearbook", group: "Academics & clubs" },
  { id: "hs:journalism", label: "Journalism", group: "Academics & clubs" },
  { id: "hs:science", label: "Science", group: "Academics & clubs" },
  { id: "hs:robotics", label: "Robotics", group: "Academics & clubs" },
  { id: "hs:robotic-arm", label: "Engineering", group: "Academics & clubs" },
  { id: "hs:chess", label: "Chess", group: "Academics & clubs" },
  { id: "hs:debate", label: "Debate", group: "Academics & clubs" },
  { id: "hs:quiz-bowl", label: "Quiz Bowl", group: "Academics & clubs" },
  { id: "hs:gavel", label: "Student Government", group: "Academics & clubs" },
  { id: "hs:service", label: "Service", group: "Academics & clubs" },
  { id: "hs:rotc", label: "ROTC", group: "Academics & clubs" },
  { id: "hs:honor-star", label: "Honor Roll", group: "Academics & clubs" },
];

export const ACTIVITY_GROUPS: ActivityGroup[] = ["Sports", "Arts", "Academics & clubs"];

export function getActivity(id: string | null | undefined): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}

/** Does this activity wear a number? Unknown or unset means no. */
export function hasJerseyNumber(id: string | null | undefined): boolean {
  return getActivity(id)?.numbered === true;
}
