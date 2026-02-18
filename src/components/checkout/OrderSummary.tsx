"use client";

import type { OrderSnapshot } from "@/stores/order-store";

interface OrderSummaryProps {
  order: OrderSnapshot;
}

export function OrderSummary({ order }: OrderSummaryProps) {
  const tileCount = Object.keys(order.slots).length;
  const uniqueSets = order.tileSetLineItems.map((item) => item.setName);

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 overflow-hidden">
      {/* Frame preview */}
      <div className="p-4 bg-surface-900/50">
        <img
          src={order.frameImageDataUrl}
          alt="Your frame design"
          className="w-full rounded-lg"
        />
      </div>

      {/* Design details */}
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-surface-100">
          {order.designName}
        </h3>
        {order.bottomBarText && (
          <p className="text-xs text-surface-400">
            <span className="text-surface-500">Bottom bar:</span>{" "}
            &ldquo;{order.bottomBarText}&rdquo;
          </p>
        )}
        <p className="text-xs text-surface-400">
          <span className="text-surface-500">Tiles placed:</span> {tileCount}
        </p>
        <p className="text-xs text-surface-400">
          <span className="text-surface-500">
            {uniqueSets.length === 1 ? "Tile set:" : "Tile sets:"}
          </span>{" "}
          {uniqueSets.join(", ")}
        </p>
      </div>
    </div>
  );
}
