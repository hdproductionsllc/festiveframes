"use client";

import { useEffect, useState } from "react";
import { season } from "@/config/season";

// Client island. Shipping-cutoff messaging driven entirely by season dates:
//   - before orderByDate (2026-06-28): "Order by June 28..." + live countdown
//   - orderByDate .. eventDate (inclusive day): last-call shipping message
//   - after the event: hidden
// Renders nothing until mounted so server and first client paint agree (the
// live clock is client-only).

const ORDER_BY = new Date(`${season.orderByDate}T23:59:59-05:00`);
// Last-call window runs through the end of the event day.
const EVENT_END = new Date(`${season.eventDate}T23:59:59-05:00`);

type Phase = "preorder" | "lastcall" | "ended";

function phaseFor(now: Date): Phase {
  if (now <= ORDER_BY) return "preorder";
  if (now <= EVENT_END) return "lastcall";
  return "ended";
}

function breakdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function Countdown() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Tick once on the next frame (avoids a synchronous setState in the effect
    // body) and then every second. The first frame happens immediately enough
    // that there is no visible delay.
    const tick = () => setNow(new Date());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  if (!now) return null;

  const phase = phaseFor(now);
  if (phase === "ended") return null;

  if (phase === "lastcall") {
    return (
      <section aria-label="Last call" className="bg-brand-navy text-brand-cream">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm font-semibold uppercase tracking-wide sm:px-6">
          Last call for the Fourth &mdash; order now and we&rsquo;ll ship it fast.
        </div>
      </section>
    );
  }

  const { days, hours, minutes, seconds } = breakdown(ORDER_BY.getTime() - now.getTime());
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section aria-label="Shipping cutoff countdown" className="bg-brand-navy text-brand-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 py-4 text-center sm:flex-row sm:gap-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide">
          Order by June 28 for the best chance to arrive before the Fourth
        </p>
        <p
          className="font-mkt-display text-base font-bold tabular-nums tracking-wide text-brand-gold"
          aria-live="off"
        >
          {days}d {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </p>
      </div>
    </section>
  );
}
