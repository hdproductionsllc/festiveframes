// ─────────────────────────────────────────────────────────────
// THE PEOPLE BEHIND A DESIGN — students and customers (2026-09-27).
//
// Three things, kept apart on purpose (Henry's plan, from outside advice):
//   CUSTOMER  the adult who pays. Known ONLY by a proven email: a payment today,
//             an emailed link later. A typed email (the Send sheet) is never
//             enough — linking by it would let a stranger's child appear under
//             someone else's address.
//   STUDENT   the person a design celebrates: first name, school, class year,
//             activity, number, and who is buying ("my student", "I went here").
//             Created silently from the builder's OWN answers (the intake) — there
//             is no profile form, and profile creation is a consequence of
//             designing, never a prerequisite.
//   DESIGN    a configuration (store.ts), which points at its student.
//
// One parent can have several students; one student several designs; every
// future product (magnet, senior frame, diploma frame) reads the same student.
//
// Minimal by design — these are mostly minors: no birthday, address, phone or
// photo is stored here, and the parent owns and controls the record.
//
// Storage: db.ts (`storageMode`). SERVER ONLY.
// ─────────────────────────────────────────────────────────────

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { ensureSchema, getPool, storageMode } from "./db";

/** The student facts a design may carry — nothing else is accepted. */
export interface StudentInput {
  displayName: string | null;
  gradYear: number | null;
  activity: string | null;
  number: string | null;
  /** Who is buying, in the builder's own terms ("student", "grandparent", "alum"…). */
  relation: string | null;
}

/** What the browser keeps so its next design is the same student. */
export interface StudentRef {
  id: string;
  token: string;
}

export interface StudentRecord extends StudentInput {
  id: string;
  customerId: string | null;
  school: string | null;
  createdAt: number;
  updatedAt: number;
}

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s || null;
};

/**
 * Coerce the builder's untrusted `student` into the allowed facts only, or null
 * when it says nothing about anyone (no name, year, activity or number).
 */
export function coerceStudent(v: unknown): StudentInput | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const yearNum = typeof r.gradYear === "number" ? r.gradYear : typeof r.gradYear === "string" ? Number.parseInt(r.gradYear, 10) : NaN;
  const s: StudentInput = {
    displayName: str(r.displayName, 60),
    gradYear: Number.isInteger(yearNum) && yearNum >= 1950 && yearNum <= 2100 ? yearNum : null,
    activity: str(r.activity, 60),
    number: str(r.number, 8),
    relation: str(r.relation, 30),
  };
  return s.displayName || s.gradYear || s.activity || s.number ? s : null;
}

/** Same person? An empty name on either side does not tell two people apart;
 *  two DIFFERENT names do (a parent designing for their second child). */
function samePerson(stored: string | null, incoming: string | null): boolean {
  if (!stored || !incoming) return true;
  return stored.trim().toLowerCase() === incoming.trim().toLowerCase();
}

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const wellFormed = (ref: unknown): ref is StudentRef =>
  !!ref &&
  typeof ref === "object" &&
  typeof (ref as StudentRef).id === "string" &&
  /^[0-9a-f-]{36}$/i.test((ref as StudentRef).id) &&
  typeof (ref as StudentRef).token === "string" &&
  /^[A-Za-z0-9_-]{43}$/.test((ref as StudentRef).token);

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Only facts the new design actually states replace stored ones. */
function merged(old: StudentInput, next: StudentInput): StudentInput {
  return {
    displayName: next.displayName ?? old.displayName,
    gradYear: next.gradYear ?? old.gradYear,
    activity: next.activity ?? old.activity,
    number: next.number ?? old.number,
    relation: next.relation ?? old.relation,
  };
}

// ── Memory (dev/tests) ───────────────────────────────────────────────────────
interface MemStudent extends StudentRecord {
  tokenHash: string;
}
interface MemCustomer {
  id: string;
  email: string;
  verifiedAt: number | null;
  marketingOptInAt: number | null;
}
const g = globalThis as typeof globalThis & {
  __msfStudents?: Map<string, MemStudent>;
  __msfCustomers?: Map<string, MemCustomer>;
};
const memStudents = (g.__msfStudents ??= new Map<string, MemStudent>());
const memCustomers = (g.__msfCustomers ??= new Map<string, MemCustomer>());

// ── Resolve the student for a design being saved ─────────────────────────────

/**
 * The student this save belongs to, updated with what the design now says:
 *   1. the design's own student, when the save continues an existing design;
 *   2. else the student this browser remembers (id + token);
 *   3. else — or when the name says it is somebody else — a NEW student.
 * Returns the student id, plus a fresh ref when one was created (for the browser
 * to remember). Runs inside the design save's transaction when there is one.
 */
export async function resolveStudent(
  o: { input: StudentInput | null; school: string | null; designStudentId: string | null; ref: unknown },
  client?: PoolClient,
): Promise<{ id: string; ref: StudentRef | null } | null> {
  const input = o.input;
  if (!input) return o.designStudentId ? { id: o.designStudentId, ref: null } : null;
  const mode = storageMode();
  if (mode === "unavailable") return null;

  if (mode === "memory") {
    let cur: MemStudent | undefined = o.designStudentId ? memStudents.get(o.designStudentId) : undefined;
    if (!cur && wellFormed(o.ref)) {
      const s = memStudents.get(o.ref.id);
      if (s && sameHash(s.tokenHash, hash(o.ref.token))) cur = s;
    }
    if (cur && samePerson(cur.displayName, input.displayName)) {
      Object.assign(cur, merged(cur, input), { school: o.school ?? cur.school, updatedAt: Date.now() });
      return { id: cur.id, ref: null };
    }
    const token = randomBytes(32).toString("base64url");
    const s: MemStudent = {
      id: randomUUID(),
      tokenHash: hash(token),
      customerId: null,
      school: o.school,
      ...input,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    memStudents.set(s.id, s);
    return { id: s.id, ref: { id: s.id, token } };
  }

  const q = client ?? getPool();
  if (!client) await ensureSchema();
  type Row = { id: string; display_name: string | null; grad_year: number | null; activity: string | null; number: string | null; relation: string | null };
  let cur: Row | undefined;
  if (o.designStudentId) {
    cur = (await q.query<Row>(`SELECT id, display_name, grad_year, activity, number, relation FROM students WHERE id = $1`, [o.designStudentId])).rows[0];
  }
  if (!cur && wellFormed(o.ref)) {
    cur = (
      await q.query<Row>(
        `SELECT id, display_name, grad_year, activity, number, relation FROM students WHERE id = $1 AND token_hash = $2`,
        [o.ref.id, hash(o.ref.token)],
      )
    ).rows[0];
  }
  if (cur && samePerson(cur.display_name, input.displayName)) {
    const m = merged(
      { displayName: cur.display_name, gradYear: cur.grad_year, activity: cur.activity, number: cur.number, relation: cur.relation },
      input,
    );
    await q.query(
      `UPDATE students SET display_name = $2, grad_year = $3, activity = $4, number = $5, relation = $6,
              school_slug = COALESCE($7, school_slug), updated_at = now()
        WHERE id = $1`,
      [cur.id, m.displayName, m.gradYear, m.activity, m.number, m.relation, o.school],
    );
    return { id: cur.id, ref: null };
  }
  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  await q.query(
    `INSERT INTO students (id, token_hash, display_name, school_slug, grad_year, activity, number, relation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, hash(token), input.displayName, o.school, input.gradYear, input.activity, input.number, input.relation],
  );
  return { id, ref: { id, token } };
}

// ── Link to a customer — on PROOF only ───────────────────────────────────────

/**
 * A paid order: the buyer's email is proven (Stripe collected it and sends the
 * receipt there). Upsert that customer, link the order, and adopt the design's
 * student if no one has claimed it yet. `optIn` is the future-products consent
 * given on the Send sheet, honoured ONLY when it was given with this same email.
 */
export async function linkCustomerOnPayment(o: {
  email: string | null;
  orderId: string;
  studentId: string | null;
  optIn: boolean;
}): Promise<string | null> {
  const email = o.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const mode = storageMode();
  if (mode === "unavailable") return null;
  if (mode === "memory") {
    let c = [...memCustomers.values()].find((x) => x.email === email);
    if (!c) {
      c = { id: randomUUID(), email, verifiedAt: Date.now(), marketingOptInAt: null };
      memCustomers.set(c.id, c);
    }
    c.verifiedAt ??= Date.now();
    if (o.optIn) c.marketingOptInAt ??= Date.now();
    const s = o.studentId ? memStudents.get(o.studentId) : undefined;
    if (s && !s.customerId) s.customerId = c.id;
    return c.id;
  }
  await ensureSchema();
  const p = getPool();
  const res = await p.query<{ id: string }>(
    `INSERT INTO customers (id, email, verified_at, marketing_opt_in_at)
     VALUES ($1, $2, now(), CASE WHEN $3 THEN now() END)
     ON CONFLICT (email) DO UPDATE
       SET verified_at = COALESCE(customers.verified_at, now()),
           marketing_opt_in_at = COALESCE(customers.marketing_opt_in_at, EXCLUDED.marketing_opt_in_at)
     RETURNING id`,
    [randomUUID(), email, o.optIn],
  );
  const customerId = res.rows[0].id;
  await p.query(`UPDATE school_orders SET customer_id = $2 WHERE order_id = $1`, [o.orderId, customerId]);
  if (o.studentId) {
    await p.query(`UPDATE students SET customer_id = COALESCE(customer_id, $2) WHERE id = $1`, [o.studentId, customerId]);
  }
  return customerId;
}

// ── Staff views ──────────────────────────────────────────────────────────────

export async function getStudent(id: string | null): Promise<StudentRecord | null> {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const mode = storageMode();
  if (mode === "unavailable") return null;
  if (mode === "memory") {
    const s = memStudents.get(id);
    if (!s) return null;
    const { tokenHash: _t, ...rec } = s;
    void _t;
    return rec;
  }
  await ensureSchema();
  const r = (await getPool().query(`SELECT * FROM students WHERE id = $1`, [id])).rows[0];
  return r ? fromRow(r) : null;
}

/** Students per school and class year — the dashboard's "who we know". */
export async function studentCounts(): Promise<Array<{ school: string; gradYear: number | null; students: number }>> {
  const mode = storageMode();
  if (mode === "unavailable") return [];
  if (mode === "memory") {
    const m = new Map<string, { school: string; gradYear: number | null; students: number }>();
    for (const s of memStudents.values()) {
      if (!s.school) continue;
      const k = `${s.school}|${s.gradYear}`;
      const row = m.get(k) ?? { school: s.school, gradYear: s.gradYear, students: 0 };
      row.students += 1;
      m.set(k, row);
    }
    return [...m.values()];
  }
  await ensureSchema();
  const res = await getPool().query(
    `SELECT school_slug, grad_year, count(*)::int AS n FROM students WHERE school_slug IS NOT NULL GROUP BY 1, 2`,
  );
  return res.rows.map((r: Record<string, unknown>) => ({
    school: String(r.school_slug),
    gradYear: r.grad_year == null ? null : Number(r.grad_year),
    students: Number(r.n),
  }));
}

function fromRow(r: Record<string, unknown>): StudentRecord {
  return {
    id: String(r.id),
    customerId: (r.customer_id as string | null) ?? null,
    school: (r.school_slug as string | null) ?? null,
    displayName: (r.display_name as string | null) ?? null,
    gradYear: r.grad_year == null ? null : Number(r.grad_year),
    activity: (r.activity as string | null) ?? null,
    number: (r.number as string | null) ?? null,
    relation: (r.relation as string | null) ?? null,
    createdAt: new Date(r.created_at as string).getTime(),
    updatedAt: new Date(r.updated_at as string).getTime(),
  };
}

/** Test seams. */
export const __memStudentsForTest = memStudents;
export const __memCustomersForTest = memCustomers;
