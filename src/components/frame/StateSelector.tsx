"use client";

import { useDesignStore } from "@/stores/design-store";
import { plateDesigns } from "@/data/plates";

interface StateSelectorProps {
  compact?: boolean;
}

export function StateSelector({ compact }: StateSelectorProps) {
  const plateState = useDesignStore((s) => s.plateState);
  const setPlateState = useDesignStore((s) => s.setPlateState);

  if (compact) {
    return (
      <select
        value={plateState}
        onChange={(e) => setPlateState(e.target.value)}
        className="px-2 py-1 rounded-md bg-surface-800 border border-surface-700
          text-surface-100 text-sm
          focus:outline-none focus:border-brand-gold/50 transition-colors
          cursor-pointer appearance-none
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236a6a6a%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]
          bg-no-repeat bg-[right_0.5rem_center] pr-6"
      >
        {plateDesigns.map((plate) => (
          <option key={plate.abbr} value={plate.abbr}>
            {plate.state}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-1">
      <span className="text-xs text-surface-400">Your State</span>
      <select
        value={plateState}
        onChange={(e) => setPlateState(e.target.value)}
        className="w-full px-3 py-2 rounded-md bg-surface-900 border border-surface-700
          text-surface-100 text-sm
          focus:outline-none focus:border-brand-gold/50 transition-colors
          cursor-pointer appearance-none
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236a6a6a%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]
          bg-no-repeat bg-[right_0.75rem_center]"
      >
        {plateDesigns.map((plate) => (
          <option key={plate.abbr} value={plate.abbr}>
            {plate.state}
          </option>
        ))}
      </select>
    </div>
  );
}
