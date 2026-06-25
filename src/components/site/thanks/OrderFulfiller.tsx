"use client";

import { useEffect, useRef, useState } from "react";

// Client relay for a custom builder order. After Stripe redirects back to
// /thanks, this reads the design + artifacts stashed in localStorage and
// POSTs them to /api/order/fulfill, which verifies the session is paid before
// emailing the production packet + the customer's proof. It survives the
// Stripe redirect (same-origin localStorage) and a server restart. The server
// also fulfills from its in-memory draft via the webhook, and fulfillment is
// idempotent, so this never double-sends.

interface PendingOrder {
  orderId: string;
  parts?: unknown;
  artifacts?: unknown;
}

export function OrderFulfiller({ orderId, sessionId }: { orderId: string; sessionId: string }) {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let pending: PendingOrder | null = null;
    try {
      const raw = localStorage.getItem("ff:pending-order");
      if (raw) pending = JSON.parse(raw) as PendingOrder;
    } catch {
      pending = null;
    }

    const body =
      pending && pending.orderId === orderId
        ? { orderId, sessionId, parts: pending.parts, artifacts: pending.artifacts }
        : { orderId, sessionId };

    fetch("/api/order/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        try { localStorage.removeItem("ff:pending-order"); } catch {}
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [orderId, sessionId]);

  return (
    <div
      className="mt-6 rounded-[18px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-6 py-5"
      style={{ boxShadow: "5px 5px 0 #1e1b17" }}
    >
      {status === "working" && (
        <p className="text-base font-semibold text-[#3a352c]">Preparing your proof and sending it to your inbox…</p>
      )}
      {status === "done" && (
        <p className="text-base font-bold text-[#1e1b17]">
          ✓ Your proof is on its way to your email, and your frame is now in our production queue.
        </p>
      )}
      {status === "error" && (
        <p className="text-base font-semibold text-[#3a352c]">
          Your order is confirmed. If your proof email doesn&apos;t arrive shortly, reply to your
          receipt or email hello@festiveframes.co and we&apos;ll send it right over.
        </p>
      )}
    </div>
  );
}
