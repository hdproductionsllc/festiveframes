import { NextResponse } from "next/server";
import { sendReviewEmail } from "@/lib/email";

export const runtime = "nodejs";

// POST /api/review — collects a customer review and emails it to the team to
// vet before publishing. Stores nothing; genuine ones get added to copy.ts.
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { rating, body: text, name } = (body ?? {}) as Record<string, unknown>;

  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: "Please choose a star rating." }, { status: 400 });
  }
  if (typeof text !== "string" || text.trim().length < 4 || text.length > 1000) {
    return NextResponse.json({ error: "Please write a short review." }, { status: 400 });
  }
  if (typeof name !== "string" || name.trim().length < 1 || name.length > 80) {
    return NextResponse.json({ error: "Please add your name." }, { status: 400 });
  }

  try {
    await sendReviewEmail({ rating: r, body: text.trim(), name: name.trim() });
  } catch (err) {
    console.error("[review] failed:", err);
    // Don't fail the user; we logged it.
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
