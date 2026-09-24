/**
 * Is the school checkout open? The ONE switch — its full story (what it waits on,
 * what flips with it) is on the re-export in config/offers.ts.
 *
 * It lives here, apart from the prices, because school-facing pages read it to
 * choose their wording and the pricing guard forbids them from importing the offer
 * config at all. A flag is not a figure.
 */
export const SCHOOL_CHECKOUT_OPEN: boolean = false;
