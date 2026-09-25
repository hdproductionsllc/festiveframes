// ─────────────────────────────────────────────────────────────
// Which SAVED design this browser's design is — so a second Send from the same
// phone becomes revision 2 of the same design, not a stranger to revision 1.
//
// One entry per builder persist key (a family with two schools holds two
// designs, and so two links). It holds the raw token: this browser either
// received it from the Send that created the design or opened the link that
// carries it, so it holds nothing it was not already given.
//
// Every access is wrapped: storage can be full, blocked, or absent, and a
// forgotten link only means the next Send starts a new design — never an error.
// CLIENT ONLY.
// ─────────────────────────────────────────────────────────────

export interface DesignLink {
  id: string;
  token: string;
  code: string;
}

const keyFor = (persistKey: string) => `${persistKey}:saved-link`;

export function readDesignLink(persistKey: string): DesignLink | null {
  try {
    const raw = window.localStorage.getItem(keyFor(persistKey));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<DesignLink>;
    return typeof v.id === "string" && typeof v.token === "string" && typeof v.code === "string"
      ? { id: v.id, token: v.token, code: v.code }
      : null;
  } catch {
    return null;
  }
}

export function writeDesignLink(persistKey: string, link: DesignLink | null): void {
  try {
    if (link) window.localStorage.setItem(keyFor(persistKey), JSON.stringify(link));
    else window.localStorage.removeItem(keyFor(persistKey));
  } catch {
    // Full or blocked storage: the next Send simply starts a new design.
  }
}

/** The token in a `#d=<token>` link fragment, or null. */
export function tokenFromHash(hash: string): string | null {
  const m = /[#&]d=([A-Za-z0-9_-]{43})(?:&|$)/.exec(hash);
  return m ? m[1] : null;
}
