// ─────────────────────────────────────────────────────────────────────────────
// What the world already knows about this school
//
// The scanner reads a school's CSS to work out that Northwestern is purple. That
// is a lot of machinery to rediscover a fact any person could tell you, and it
// only works when the page happens to declare its palette somewhere a parser can
// reach. A university front page whose colours live in a hashed bundle, a site
// that renders its theme in JavaScript, a school with no website worth scraping —
// all of them defeat it, and all of them are trivially known.
//
// So this asks. It is a FALLBACK, not a replacement: the page is still the better
// source when it answers, because it reflects the school's brand as it is *today*,
// including a redesign the model has never seen. This fills the gaps the page left.
//
// TWO PROPERTIES MATTER MORE THAN COVERAGE, and both are enforced below:
//
//   1. It must say "I don't know". There are ~26,000 US high schools and the model
//      has genuinely never heard of most of them. A confidently invented colour is
//      worse than an empty result — the empty result asks the user to pick, the
//      invention silently ships someone else's scheme. Hence the explicit
//      `known: false` path and the confidence floor.
//
//   2. Its answers must be LABELLED. The caller marks these candidates with their
//      own source so the panel can say where a colour came from, and so a wrong
//      answer is debuggable rather than mysterious.
//
// Degrades to null with no API key, on any error, and on any low-confidence answer,
// so the scan never gets worse than it was.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";

/** Below this the model is guessing from the name, which is exactly the failure
 *  mode that ships a stranger's colours. Tuned high on purpose: a miss costs the
 *  user nothing (they pick a colour), a false positive costs them a wrong frame. */
const MIN_CONFIDENCE = 0.7;

/** One factual lookup with a tiny output — it does not need a long leash. */
const MAX_TOKENS = 1024;

/** A scan already feels slow; this rides alongside the fetch, not in front of it. */
const TIMEOUT_MS = 20_000;

export interface KnownSchool {
  /** The school's full name as commonly written. */
  name: string | null;
  /** Team nickname — "Wildcats". Null when the school has none or it is unknown. */
  mascot: string | null;
  /** Official colours, most important first, as #RRGGBB. */
  colors: string[];
  /** The model's own confidence, 0–1. Below MIN_CONFIDENCE the result is discarded. */
  confidence: number;
  /** Free text: what it recognised, or why it is unsure. Surfaced in the scan notes. */
  reasoning: string;
}

const SYSTEM_PROMPT = `You identify a school from its website address and report ONLY what you actually know about it.

You are helping build a custom license-plate frame in a school's colours. A wrong colour means a parent receives a physical product in the wrong school's scheme, so being unsure is genuinely more useful than being confident.

Report:
- The school's full name as it is commonly written.
- Its team nickname / mascot, if it has one.
- Its official colours, most important first, as #RRGGBB hex.
- Your confidence that this is the right school AND that these details are correct.

RULES:
- If you do not recognise this specific school, set known to false. Do not guess from the name, the state, or what schools of that type usually pick. There are tens of thousands of schools and not recognising one is the expected outcome.
- Never infer colours from the mascot. A school called the Cardinals is not necessarily red.
- Give the OFFICIAL colours, not a website's theme. If a school is navy and gold, say navy and gold even if its site is mostly white.
- Use the school's own published hex values when you know them; otherwise give your best hex for the named colour (e.g. a school that says "purple and white" and is known to use #4E2A84 should get #4E2A84).
- Two or three colours is typical. Include white or black only when the school genuinely lists them as an official colour.
- Confidence above 0.8 means you specifically recognise this school. Between 0.5 and 0.8 means you are fairly sure but hazy on details. Below 0.5 means you are guessing — set known to false instead.
- Keep reasoning to one sentence: what you recognised, or what you are unsure about.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    known: {
      type: "boolean" as const,
      description: "True only if you specifically recognise this school.",
    },
    name: { type: ["string", "null"] as unknown as "string", description: "Full school name." },
    mascot: {
      type: ["string", "null"] as unknown as "string",
      description: "Team nickname, or null.",
    },
    colors: {
      type: "array" as const,
      items: { type: "string" as const, description: "#RRGGBB" },
      description: "Official colours, most important first.",
    },
    confidence: { type: "number" as const, description: "0 to 1." },
    reasoning: { type: "string" as const, description: "One sentence." },
  },
  required: ["known", "name", "mascot", "colors", "confidence", "reasoning"],
  additionalProperties: false,
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Keep only well-formed, de-duplicated hex values — the schema constrains the
 *  shape of the response, not the meaning of a string inside it. */
function cleanColors(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of raw) {
    if (typeof c !== "string") continue;
    const hex = c.trim().toUpperCase();
    if (!HEX.test(hex) || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }
  return out.slice(0, 4);
}

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(/\s+/g, " ");
  return s && s.length <= max ? s : null;
}

/**
 * Ask what is publicly known about the school at `pageUrl`.
 *
 * `hints` are whatever the page scan already extracted — a name or mascot read off
 * the site is strong evidence of WHICH school this is, and passing them turns a
 * recall problem into a much easier verification one.
 *
 * Returns null when there is no API key, when the model does not recognise the
 * school, when confidence is below the floor, or on any error. Never throws: this
 * is a bonus source, and a scan that worked before must not start failing because
 * of it.
 */
export async function lookupKnownSchool(
  pageUrl: string,
  hints: { name?: string | null; mascot?: string | null } = {},
): Promise<KnownSchool | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  let host: string;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    return null;
  }

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: TIMEOUT_MS });

  const found = [
    hints.name ? `The page's own title suggests the name "${hints.name}".` : "",
    hints.mascot ? `Text on the page suggests the mascot "${hints.mascot}".` : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: MAX_TOKENS,
      // The system prompt is byte-identical on every scan and is the bulk of the
      // request, so it caches; the per-school line rides along uncached.
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: `School website: ${host} (${pageUrl})${found ? `\n\n${found}` : ""}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return null;

    const parsed = JSON.parse(text.text) as Record<string, unknown>;
    if (parsed.known !== true) return null;

    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    if (confidence < MIN_CONFIDENCE) return null;

    const colors = cleanColors(parsed.colors);
    const name = cleanText(parsed.name, 120);
    const mascot = cleanText(parsed.mascot, 60);
    // Nothing usable came back. A "known" school with no name, no mascot and no
    // colour is a null answer wearing a yes.
    if (!colors.length && !name && !mascot) return null;

    return {
      name,
      mascot,
      colors,
      confidence,
      reasoning: cleanText(parsed.reasoning, 300) ?? "",
    };
  } catch {
    // Timeout, rate limit, refusal, malformed JSON — all the same to the caller.
    return null;
  }
}
