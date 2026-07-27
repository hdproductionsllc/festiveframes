"use client";

import { useDesignStore } from "@/stores/design-store";
import { usePaletteStore } from "@/stores/palette-store";
import { useUIStore } from "@/stores/ui-store";
import { getSetPieces, resolveSurfacedSetId } from "@/data/sets";
import { playSound, type SoundName } from "@/lib/utils/sound";

interface QuickActionsProps {
  /**
   * Which sets this builder surfaces. When set (school builder), Fill All / Random
   * draw from the same set the palette shows. Omitted (/build) keeps the exact
   * prior behavior: the raw global active set.
   */
  surfacedSetIds?: readonly string[];
}

export function QuickActions({ surfacedSetIds }: QuickActionsProps = {}) {
  const selectedPieceId = usePaletteStore((s) => s.selectedPieceId);
  const activeSetId = usePaletteStore((s) => s.activeSetId);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const { fillAll, randomFill, mirrorTopSlots, clearAll, undo, redo, canUndo, canRedo } =
    useDesignStore();

  const pieces = getSetPieces(
    surfacedSetIds ? resolveSurfacedSetId(activeSetId, surfacedSetIds) : activeSetId
  );
  // Artwork is back in the pool. It was excluded while Fill All wrote single cells,
  // because filling with it produced exactly the unreadable 1x1 badges the floor
  // exists to prevent — but that was a workaround for the missing algorithm, not a
  // rule. `blockFill` lays real footprints now, so a badge that needs 2x2 gets 2x2.
  //
  // Only `spanRequired` pieces stay out: their footprint is one exact non-square
  // size (the calibration tiles), which a uniform block grid cannot honour.
  const fillablePieces = pieces.filter((p) => !p.spanRequired);

  const sfx = (name: SoundName) => { if (soundEnabled) playSound(name); };

  const handleFillAll = () => {
    // Prefer the user's selected tile. A piece that REQUIRES an exact footprint
    // can't tile a uniform grid, so fall back to the first fillable piece and always
    // do something obvious instead of squishing it.
    const selected = selectedPieceId ? pieces.find((p) => p.id === selectedPieceId) : null;
    const selectedFills = selected ? fillablePieces.includes(selected) : false;
    const pieceId = (selectedFills ? selected!.id : fillablePieces[0]?.id) ?? null;
    if (!pieceId) return;
    const setId = pieceId.split(":")[0];
    fillAll(pieceId, setId);
    sfx("cascade");
  };

  const handleRandomFill = () => {
    if (fillablePieces.length === 0) return;
    const pieceData = fillablePieces.map((p) => ({ pieceId: p.id, setId: p.setId }));
    randomFill(pieceData);
    sfx("rattle");
  };

  // `iconClass` is INERT EVERYWHERE EXCEPT /lab/school. This component is shared
  // with the live /build storefront, whose sticker skin keeps the emoji; the school
  // page re-skins to a line-icon set, and an emoji sitting inside a JS string
  // literal is unreachable from CSS — you cannot select a text node. So each glyph
  // gets a class that `school-skin.css` uses to collapse the emoji to zero size and
  // paint an SVG mask in its place. On /build these class names match no rule in the
  // codebase, so the span renders the emoji exactly as it did before.
  const actions = [
    {
      label: "Fill All",
      icon: "🪣",
      iconClass: "ff-i-fill",
      color: "bsk-blue",
      onClick: handleFillAll,
      // Enabled as long as the set has tiles — uses your selected tile, or the
      // set's first tile if you haven't picked one yet.
      disabled: fillablePieces.length === 0,
      title: selectedPieceId
        ? "Fill every slot with your selected tile"
        : "Fill every slot with this set's first tile (tap a tile to choose)",
    },
    {
      label: "Random",
      icon: "🎲",
      iconClass: "ff-i-shuffle",
      color: "bsk-purple",
      onClick: handleRandomFill,
      disabled: fillablePieces.length === 0,
      title: "Random fill from current set",
    },
    {
      label: "Mirror",
      icon: "🪞",
      iconClass: "ff-i-mirror",
      color: "bsk-pink",
      onClick: () => { mirrorTopSlots(); sfx("shimmer"); },
      disabled: false,
      title: "Mirror left side to right (all rails + wings)",
    },
    {
      label: "Clear",
      icon: "🗑️",
      iconClass: "ff-i-trash",
      color: "bsk-red",
      onClick: () => { clearAll(); sfx("whoosh"); },
      disabled: false,
      title: "Remove all tiles",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
            className={`bsk-btn ${action.color} flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-bold
              disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className={`ff-icon ${action.iconClass}`}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => { undo(); sfx("rewind"); }}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
            bsk-btn bsk-cream disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {/* ONE wrapper span, deliberately. The four buttons above already render
              their glyph and label as two flex children, so adding a class there
              changes nothing. These two are a single text node, and splitting
              "↩ Undo" into an icon span plus a bare label would make it TWO flex
              children — at which point the button's own `gap-1` inserts 4px that
              /build never had. Wrapping keeps it one flex item and one text run. */}
          <span className="ff-glyph-wrap"><span className="ff-icon ff-i-undo">↩</span> Undo</span>
        </button>
        <button
          onClick={() => { redo(); sfx("forward"); }}
          disabled={!canRedo()}
          title="Redo (Ctrl+Shift+Z)"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
            bsk-btn bsk-cream disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="ff-glyph-wrap"><span className="ff-icon ff-i-redo">↪</span> Redo</span>
        </button>
      </div>
    </div>
  );
}
