"use client";

import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/stores/cart-store";

// Client relay for a paid builder order. After Stripe redirects back to /thanks,
// this POSTs to /api/order/fulfill, which verifies the session is paid before
// emailing the production packet(s) + the customer's proof. It survives the
// Stripe redirect and a server restart. The server ALSO fulfills via the webhook,
// and fulfillment is idempotent, so this never double-sends.
//
// Two shapes:
//   • Single custom frame — carries the design + artifacts in localStorage as a
//     resilience backup to the server draft.
//   • Cart (one or more designs) — the server-side cart draft is authoritative,
//     so the relay only needs the cartId; on success the local cart is cleared.

interface PendingOrder {
  orderId: string;
  parts?: unknown;
  artifacts?: unknown;
}

export function OrderFulfiller({
  orderId,
  cartId,
  sessionId,
}: {
  orderId?: string;
  cartId?: string;
  sessionId: string;
}) {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const ran = useRef(false);
  const clearCart = useCartStore((s) => s.clear);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let body: Record<string, unknown>;
    if (cartId) {
      body = { cartId, sessionId };
    } else {
      let pending: PendingOrder | null = null;
      try {
        const raw = localStorage.getItem("ff:pending-order");
        if (raw) pending = JSON.parse(raw) as PendingOrder;
      } catch {
        pending = null;
      }
      body =
        pending && pending.orderId === orderId
          ? { orderId, sessionId, parts: pending.parts, artifacts: pending.artifacts }
          : { orderId, sessionId };
    }

    fetch("/api/order/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        // Success: a cart order is now placed — empty the local cart so a refresh
        // or "design another" starts clean. Also clear the single-order relay.
        if (cartId) clearCart();
        try { localStorage.removeItem("ff:pending-order"); } catch {}
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [orderId, cartId, sessionId, clearCart]);

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
