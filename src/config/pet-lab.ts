/**
 * Is the pet-frame lab open? The ONE switch.
 *
 * CLOSED since 2026-09-27 (Henry: "switch it off"). The lab was a Festive Frames
 * prototype, and three of its routes were public on the live site and spend
 * money on every call, with no one using them on purpose:
 *   - /api/cartoonize     → Google Gemini image (the same key as the badge art),
 *   - /api/pet-caption    → the Anthropic API,
 *   - /api/lab/pet-submit → sends an email.
 * While false, all three answer 410 before reading a key or a body, and
 * /lab/pet-frame is a 404. The code stays, so reopening is this one line.
 */
export const PET_LAB_OPEN: boolean = false;
