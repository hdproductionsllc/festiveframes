let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Individual sound synthesizers ────────────────────────────

/** Tile snaps into a slot — satisfying click-snap */
function snap() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.1);
}

/** Tile erased — quick descending pop */
function pop() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.12);
}

/** Fill all — rising cascade sparkle */
function cascade() {
  const c = ctx();
  const t = c.currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    const offset = i * 0.06;
    gain.gain.setValueAtTime(0, t + offset);
    gain.gain.linearRampToValueAtTime(0.1, t + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);
    osc.start(t + offset);
    osc.stop(t + offset + 0.15);
  });
}

/** Random fill — playful dice-roll rattle */
function rattle() {
  const c = ctx();
  const t = c.currentTime;
  for (let i = 0; i < 6; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(300 + Math.random() * 500, t + i * 0.035);
    gain.gain.setValueAtTime(0.06, t + i * 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.035 + 0.04);
    osc.start(t + i * 0.035);
    osc.stop(t + i * 0.035 + 0.04);
  }
}

/** Mirror — shimmery reflection sweep */
function shimmer() {
  const c = ctx();
  const t = c.currentTime;
  [880, 1100, 880].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    const offset = i * 0.07;
    osc.frequency.setValueAtTime(freq, t + offset);
    gain.gain.setValueAtTime(0, t + offset);
    gain.gain.linearRampToValueAtTime(0.08, t + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);
    osc.start(t + offset);
    osc.stop(t + offset + 0.12);
  });
}

/** Clear all — whoosh sweep away */
function whoosh() {
  const c = ctx();
  const t = c.currentTime;
  // Noise-like effect using detuned oscillators
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(c.destination);
  osc1.type = "sawtooth";
  osc2.type = "sawtooth";
  osc1.frequency.setValueAtTime(800, t);
  osc1.frequency.exponentialRampToValueAtTime(100, t + 0.25);
  osc2.frequency.setValueAtTime(803, t);
  osc2.frequency.exponentialRampToValueAtTime(98, t + 0.25);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.25);
  osc2.stop(t + 0.25);
}

/** Undo — quick rewind blip */
function rewind() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.08);
}

/** Redo — quick forward blip */
function forward() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(500, t + 0.08);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.08);
}

/** Apply preset — satisfying stamp thud */
function stamp() {
  const c = ctx();
  const t = c.currentTime;
  // Low thud
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.connect(gain1);
  gain1.connect(c.destination);
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(150, t);
  osc1.frequency.exponentialRampToValueAtTime(60, t + 0.15);
  gain1.gain.setValueAtTime(0.2, t);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc1.start(t);
  osc1.stop(t + 0.15);
  // High click on top
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.connect(gain2);
  gain2.connect(c.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1200, t);
  gain2.gain.setValueAtTime(0.08, t);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc2.start(t);
  osc2.stop(t + 0.05);
}

/** Export success — cheerful two-note chime */
function chime() {
  const c = ctx();
  const t = c.currentTime;
  [784, 1047].forEach((freq, i) => { // G5, C6
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = "sine";
    const offset = i * 0.12;
    osc.frequency.setValueAtTime(freq, t + offset);
    gain.gain.setValueAtTime(0.12, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.3);
    osc.start(t + offset);
    osc.stop(t + offset + 0.3);
  });
}

/** Export error — sad descending bwah */
function sad() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.3);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.start(t);
  osc.stop(t + 0.3);
}

/** Select tile from palette — soft click */
function click() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(1000, t);
  gain.gain.setValueAtTime(0.07, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.start(t);
  osc.stop(t + 0.04);
}

/** Switch tool — toggle tick */
function tick() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(800, t);
  gain.gain.setValueAtTime(0.05, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  osc.start(t);
  osc.stop(t + 0.03);
}

/** Drag start — light pickup */
function pickup() {
  const c = ctx();
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.06);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.start(t);
  osc.stop(t + 0.06);
}

// ─── Sound registry ──────────────────────────────────────────

const sounds = {
  snap,
  pop,
  cascade,
  rattle,
  shimmer,
  whoosh,
  rewind,
  forward,
  stamp,
  chime,
  sad,
  click,
  tick,
  pickup,
} as const;

export type SoundName = keyof typeof sounds;

/** Play a named sound effect. Silently ignores errors (e.g. no audio). */
export function playSound(name: SoundName) {
  try {
    sounds[name]();
  } catch {
    // Audio not available — silently ignore
  }
}

// Keep backward compat for any existing import
export const playSnapSound = snap;
