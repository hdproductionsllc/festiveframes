// ─────────────────────────────────────────────────────────────
// Pet caption engine — "what my pet thinks" one-liner for the car.
//
// Reads the uploaded pet PHOTO (Claude Haiku vision) and writes ONE short,
// bumper-legible line in the pet's voice — the "thought" printed on the wing
// opposite the cartoon pet. Mirrors the proven Pet Subtitles approach, but
// re-tuned for a license-plate frame: ONE line, car/road context, readable at
// a car-length glance (not the classic two-part top/bottom meme).
//
// Graceful: with no ANTHROPIC_API_KEY (or on hard failure) it returns a curated
// car one-liner so the builder still works — `generated:false` flags that it's a
// sample, not photo-aware. Add the key for lines written from the actual pet.
// ─────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";

export type CaptionVoice = "funny" | "sassy" | "dramatic" | "genz";

export const CAPTION_VOICES: { id: CaptionVoice; label: string }[] = [
  { id: "funny", label: "Funny" },
  { id: "sassy", label: "Sassy" },
  { id: "dramatic", label: "Dramatic" },
  { id: "genz", label: "Gen-Z" },
];

export function isCaptionVoice(v: unknown): v is CaptionVoice {
  return v === "funny" || v === "sassy" || v === "dramatic" || v === "genz";
}

export type CaptionMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// Car legibility is the whole point — keep it short. Hard cap on output length.
const MAX_LINE = 34;

// Haiku tier: cheap + fast vision, the right call for a one-line generation.
// (User-named model, mirroring the working Pet Subtitles app.)
const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You write ONE short line for the back of a car — the funny "thought" a pet is having, printed on a license-plate frame wing right next to a cartoon of that pet. The driver behind reads it at a glance while moving, so it MUST be short and punchy.

STEP 1 — look at the photo: what species, what expression, what attitude?
STEP 2 — write ONE line, first person as the pet, that lands as a bumper one-liner. Lean into riding in the car / the road / the human's driving when it fits the pet's vibe — but a great pure pet-attitude line is also fine.

Return ONLY a JSON object: {"line": "..."}

RULES:
- ONE line. 2–5 words ideal. Hard max ~30 characters — shorter is funnier AND more readable from a car.
- First person, as the pet.
- Deadpan. No exclamation marks unless it truly earns one.
- ALL CAPS is fine (it's bumper text) but not required.
- No emojis, no hashtags, no surrounding quotes, no trailing period.
- Never invent the pet's name; use it only if the user provides one.
- STRICTLY OFF-LIMITS: death, illness, abuse, abandonment, anything sad or morbid. Never crude or mean-spirited. Never mention being an AI.

Examples of the CALIBER (write an ORIGINAL line based on the actual photo — do NOT reuse these):
ARE WE THERE YET
I CALLED SHOTGUN
SLOW DOWN HUMAN
BACKSEAT DRIVER
JUDGING YOUR PARKING
MY HUMAN DRIVES LIKE THIS`;

const VOICE_MODIFIERS: Record<CaptionVoice, string> = {
  funny: "",
  sassy:
    "Maximum attitude and diva energy — unbothered, superior, dramatic about minor inconveniences. The pet is too good for this car ride and wants you to know.",
  dramatic:
    "Narrate like an epic movie trailer or nature documentary about a completely mundane car moment. Full gravitas. The gap between the epic tone and the trivial subject IS the joke.",
  genz:
    "Chronically-online internet speak used to AMPLIFY the joke, not replace it: 'fr', 'lowkey', 'the audacity', 'main character', \"it's giving\". Keep it readable at a glance.",
};

// Curated car one-liners — used when there's no API key or generation fails.
// These are genuinely good, so the builder always shows something demoable.
const FALLBACK_LINES: Record<CaptionVoice, string[]> = {
  funny: [
    "ARE WE THERE YET",
    "I CALLED SHOTGUN",
    "SLOW DOWN, HUMAN",
    "BACKSEAT DRIVER",
    "JUDGING YOUR PARKING",
    "WINDOWS DOWN ALWAYS",
    "I PICKED THIS SEAT",
    "HONK IF YOU AGREE",
  ],
  sassy: [
    "I DON'T DO TRAFFIC",
    "MY CAR NOW",
    "UGH, RED LIGHTS",
    "STILL JUDGING YOU",
    "NOT MY DRIVING",
    "VALET, PLEASE",
  ],
  dramatic: [
    "BORN TO RIDE",
    "THE OPEN ROAD CALLS",
    "A HERO RIDES ALONG",
    "DESTINY HAS A LEASH",
    "LEGENDS RIDE SHOTGUN",
  ],
  genz: [
    "IT'S GIVING ROAD TRIP",
    "MAIN CHARACTER, OBVI",
    "LOWKEY THE DRIVER",
    "NO CAP, BEST SEAT",
    "THE AUDACITY: RED LIGHT",
  ],
};

function fallbackLine(voice: CaptionVoice): string {
  const pool = FALLBACK_LINES[voice] ?? FALLBACK_LINES.funny;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Normalize a model line to bumper form: strip quotes/fences/trailing period, collapse space. */
function cleanLine(s: string): string {
  let line = s.trim();
  line = line.replace(/^["'“”]+|["'“”]+$/g, "").trim(); // surrounding quotes
  line = line.replace(/[.\s]+$/g, "").trim(); // trailing period(s)/space
  line = line.replace(/\s+/g, " ");
  return line;
}

export interface CaptionResult {
  line: string;
  voice: CaptionVoice;
  generated: boolean; // true = written from the photo; false = curated fallback
}

/**
 * Generate one car one-liner from a pet photo. Never throws — falls back to a
 * curated line when the key is missing or generation fails.
 */
export async function generatePetCaption(
  base64: string,
  mediaType: CaptionMedia,
  voice: CaptionVoice = "funny",
  petName?: string,
): Promise<CaptionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { line: fallbackLine(voice), voice, generated: false };

  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 25_000 });

  // Cache the big base prompt (identical every call); the per-request voice
  // direction rides along uncached.
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ];
  const modifier = VOICE_MODIFIERS[voice];
  if (modifier) {
    system.push({ type: "text", text: `VOICE DIRECTION for this line: ${modifier}` });
  }

  const nameHint = petName
    ? ` The pet's name is ${petName} — you may use it, but don't force it.`
    : "";
  const userText = `Write ONE short bumper line (the pet's "thought") for this photo.${nameHint} Return ONLY the JSON object {"line":"..."}, nothing else.`;

  async function attempt(): Promise<string> {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 64,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: userText },
          ],
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("No text from model");

    let raw = block.text.trim();
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) raw = fence[1];
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Bad JSON");
    }
    const lineRaw = (parsed as { line?: unknown }).line;
    const line = typeof lineRaw === "string" ? cleanLine(lineRaw) : "";
    if (line.length < 2 || line.length > MAX_LINE) throw new Error("Line out of range");
    return line;
  }

  // Try once; retry once only on a fast failure (parse/length), not on timeouts.
  const t0 = Date.now();
  try {
    return { line: await attempt(), voice, generated: true };
  } catch {
    if (Date.now() - t0 < 12_000) {
      try {
        return { line: await attempt(), voice, generated: true };
      } catch {
        /* fall through */
      }
    }
    return { line: fallbackLine(voice), voice, generated: false };
  }
}
