// ─────────────────────────────────────────────────────────────
// Staff sign-in for the /admin dashboard — no passwords, no accounts.
//
// Who: the addresses in ADMIN_EMAILS (comma-separated, server env). Nobody else,
// ever; there is no sign-up.
// How: a staff member asks for a link; if their address is on the list, a
// ONE-TIME link valid for 15 minutes is emailed to THAT address (a server-fixed
// staff inbox, so it keeps the rule that nothing a stranger types becomes a
// recipient of anything). Following it starts a 30-day session on that device.
// Stored: only sha256 of every token, like a parent's design link, so a leaked
// database row is not a working login. A session also stops working the moment
// its address is removed from ADMIN_EMAILS.
//
// Storage: the school-designs database (db.ts); memory in dev/tests; nothing in
// production without a database. SERVER ONLY.
// ─────────────────────────────────────────────────────────────

import { createHash, randomBytes } from "node:crypto";
import { ensureSchema, getPool, storageMode } from "@/lib/school-designs/db";

export const ADMIN_COOKIE = "msf_admin";
export const LOGIN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Kind = "login" | "session";
interface TokenRow {
  kind: Kind;
  email: string;
  expiresAt: number;
  usedAt: number | null;
}

const g = globalThis as typeof globalThis & { __msfAdminTokens?: Map<string, TokenRow> };
const memTokens = (g.__msfAdminTokens ??= new Map<string, TokenRow>());

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const wellFormed = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);

/** The staff allowlist, lower-cased. Empty = nobody can sign in. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

async function put(kind: Kind, email: string, ttlMs: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const row: TokenRow = { kind, email, expiresAt: Date.now() + ttlMs, usedAt: null };
  const mode = storageMode();
  if (mode === "unavailable") throw new Error("Admin sign-in needs a database.");
  if (mode === "memory") {
    memTokens.set(hash(token), row);
    return token;
  }
  await ensureSchema();
  await getPool().query(
    `INSERT INTO admin_tokens (token_hash, kind, email, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' milliseconds')::interval)`,
    [hash(token), kind, email, String(ttlMs)],
  );
  return token;
}

/**
 * A one-time sign-in token for `email`, or null when the address is not on the
 * staff list. The caller answers the same either way, so the page cannot be used
 * to discover who is on the list.
 */
export async function createLoginToken(email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (!isAdminEmail(e)) return null;
  return put("login", e, LOGIN_TTL_MS);
}

/**
 * Spend a sign-in link: valid, unexpired, unused, still on the list. Returns a
 * new SESSION token (for the cookie), or null. A link works once.
 */
export async function exchangeLoginToken(token: unknown): Promise<string | null> {
  if (!wellFormed(token)) return null;
  const h = hash(token);
  const mode = storageMode();
  if (mode === "unavailable") return null;
  let email: string | null = null;
  if (mode === "memory") {
    const row = memTokens.get(h);
    if (row && row.kind === "login" && !row.usedAt && row.expiresAt > Date.now()) {
      row.usedAt = Date.now();
      email = row.email;
    }
  } else {
    await ensureSchema();
    const res = await getPool().query<{ email: string }>(
      `UPDATE admin_tokens SET used_at = now()
        WHERE token_hash = $1 AND kind = 'login' AND used_at IS NULL AND expires_at > now()
        RETURNING email`,
      [h],
    );
    email = res.rows[0]?.email ?? null;
  }
  if (!email || !isAdminEmail(email)) return null;
  return put("session", email, SESSION_TTL_MS);
}

/** The signed-in staff address for a session token, or null. */
export async function sessionEmail(token: unknown): Promise<string | null> {
  if (!wellFormed(token)) return null;
  const h = hash(token);
  const mode = storageMode();
  if (mode === "unavailable") return null;
  let email: string | null = null;
  if (mode === "memory") {
    const row = memTokens.get(h);
    if (row && row.kind === "session" && row.expiresAt > Date.now()) email = row.email;
  } else {
    await ensureSchema();
    const res = await getPool().query<{ email: string }>(
      `SELECT email FROM admin_tokens WHERE token_hash = $1 AND kind = 'session' AND expires_at > now()`,
      [h],
    );
    email = res.rows[0]?.email ?? null;
  }
  // Removing someone from ADMIN_EMAILS signs them out everywhere, at once.
  return email && isAdminEmail(email) ? email : null;
}

/** Sign out: the session stops working now. */
export async function endSession(token: unknown): Promise<void> {
  if (!wellFormed(token)) return;
  const mode = storageMode();
  if (mode === "memory") {
    memTokens.delete(hash(token));
    return;
  }
  if (mode === "unavailable") return;
  await ensureSchema();
  await getPool().query(`DELETE FROM admin_tokens WHERE token_hash = $1`, [hash(token)]);
}
