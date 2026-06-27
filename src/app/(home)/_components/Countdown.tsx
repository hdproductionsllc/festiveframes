"use client";

import { useEffect, useState } from "react";
import { season } from "@/config/season";

// Sticker-styled shipping-cutoff countdown. Same date logic as the classic
// Countdown (driven entirely by config/season), restyled as a yellow sticker
// strip with an ink hard border:
//   - before orderByDate: "Order by June 28…" + a live ticking clock
//   - orderByDate .. eventDate: last-call message
//   - after the event: renders nothing
// Renders nothing until mounted so server and first client paint agree.
const ORDER_BY = new Date(`${season.orderByDate}T23:59:59-05:00`);
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
      <div className="border-b-[3px] border-[#1e1b17] bg-[#f8c53b] px-4 py-2.5 text-center text-sm font-extrabold tracking-[0.3px] text-[#1e1b17]">
        ★ Last call for the Fourth — order now and we&apos;ll ship it fast.
      </div>
    );
  }

  const { days, hours, minutes, seconds } = breakdown(ORDER_BY.getTime() - now.getTime());
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b-[3px] border-[#1e1b17] bg-[#f8c53b] px-4 py-2.5 text-center text-sm font-extrabold tracking-[0.3px] text-[#1e1b17]"
      aria-label="Shipping cutoff countdown"
    >
      <span>★ Order by June 28 for the best chance to arrive before the Fourth</span>
      <span className="s-display rounded-full border-2 border-[#1e1b17] bg-[#fff9ec] px-3 py-0.5 tabular-nums" aria-live="off">
        {days}d {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
