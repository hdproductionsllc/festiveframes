"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { getPiece } from "@/data/sets";
import { PlacedTileView } from "@/components/frame/PlacedTileView";
import { playSound } from "@/lib/utils/sound";

interface DndProviderProps {
  children: React.ReactNode;
  onOverSlotChange: (slotId: string | null) => void;
}

export function DndProvider({ children, onOverSlotChange }: DndProviderProps) {
  const [dragPieceId, setDragPieceId] = useState<string | null>(null);
  const placeTile = useDesignStore((s) => s.placeTile);
  const soundEnabled = useUIStore((s) => s.soundEnabled);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const pieceId = event.active.data.current?.pieceId as string | undefined;
    setDragPieceId(pieceId ?? null);
    if (soundEnabled) playSound("pickup");
  }, [soundEnabled]);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id as string | undefined;
      onOverSlotChange(overId?.startsWith("frame:") ? overId : null);
    },
    [onOverSlotChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragPieceId(null);
      onOverSlotChange(null);

      const overId = event.over?.id as string | undefined;
      const pieceId = event.active.data.current?.pieceId as string | undefined;

      if (overId?.startsWith("frame:") && pieceId) {
        const setId = pieceId.split(":")[0];
        placeTile(overId, pieceId, setId);
        if (soundEnabled) {
          playSound("snap");
        }
      }
    },
    [placeTile, soundEnabled, onOverSlotChange]
  );

  const handleDragCancel = useCallback(() => {
    setDragPieceId(null);
    onOverSlotChange(null);
  }, [onOverSlotChange]);

  const piece = dragPieceId ? getPiece(dragPieceId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={false}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {piece && (
          <div className="opacity-90 pointer-events-none">
            <PlacedTileView pieceId={piece.id} width={48} height={48} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
