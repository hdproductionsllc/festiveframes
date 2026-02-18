"use client";

type TextAlign = "left" | "center" | "right";

interface AlignmentSelectorProps {
  value: TextAlign;
  onChange: (value: TextAlign) => void;
}

const options: Array<{ value: TextAlign; icon: string }> = [
  { value: "left", icon: "⬅" },
  { value: "center", icon: "⬌" },
  { value: "right", icon: "➡" },
];

export function AlignmentSelector({ value, onChange }: AlignmentSelectorProps) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-surface-800 rounded-md">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={`Align ${opt.value}`}
          className={`
            flex-1 py-1 rounded text-xs transition-colors
            ${value === opt.value
              ? "bg-surface-600 text-surface-50"
              : "text-surface-400 hover:text-surface-200"
            }
          `}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
