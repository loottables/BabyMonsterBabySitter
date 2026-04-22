"use client";

import { useState } from "react";
import type { Inventory } from "@/types/items";
import { ITEM_DEFS } from "@/types/items";
import type { Monster } from "@/types/game";

interface Props {
  inventory: Inventory;
  monster:   Monster | null;
  message:   string;
  onUse:     (slotIndex: number) => void;
  onDelete:  (slotIndex: number) => void;
  onClose:   () => void;
}

export default function BagView({ inventory, monster, message, onUse, onDelete, onClose }: Props) {
  const [dragging, setDragging]   = useState<number | null>(null);
  const [overDelete, setOverDelete] = useState(false);

  function handleDragStart(index: number) {
    if (inventory[index]) setDragging(index);
  }

  function handleDrop() {
    if (dragging !== null) {
      onDelete(dragging);
      setDragging(null);
      setOverDelete(false);
    }
  }

  function handleDragEnd() {
    setDragging(null);
    setOverDelete(false);
  }

  const canFeed = monster && !monster.isDead && monster.isHatched;

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest">
          Bag
        </h2>
        <button
          onClick={onClose}
          style={{ fontSize: "7px" }}
          className="text-monster-muted hover:text-monster-text uppercase tracking-widest transition-colors"
        >
          [Back]
        </button>
      </div>

      {/* Message */}
      <div className="min-h-[16px] text-center">
        {message && (
          <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide animate-pulse">
            {message}
          </p>
        )}
      </div>

      {/* 3×3 grid */}
      <div className="grid grid-cols-3 gap-2">
        {inventory.map((slot, i) => {
          const isEmpty = slot === null;
          const def     = slot ? ITEM_DEFS[slot.itemId] : null;
          const isDragged = dragging === i;

          return (
            <div
              key={i}
              draggable={!isEmpty}
              onDragStart={() => handleDragStart(i)}
              onDragEnd={handleDragEnd}
              onClick={() => !isEmpty && canFeed && onUse(i)}
              style={{ fontSize: "7px" }}
              className={`
                border bg-monster-panel flex flex-col items-center justify-center gap-1
                aspect-square select-none
                ${isEmpty
                  ? "border-monster-border opacity-30"
                  : canFeed
                    ? "border-monster-border hover:bg-monster-border cursor-pointer"
                    : "border-monster-border opacity-60 cursor-not-allowed"
                }
                ${isDragged ? "opacity-40" : ""}
              `}
            >
              {!isEmpty && def ? (
                <>
                  <span style={{ fontSize: "6px" }} className="text-monster-text uppercase text-center leading-loose px-1">
                    {def.name}
                  </span>
                  <span style={{ fontSize: "8px" }} className="text-monster-muted">
                    x{slot!.quantity}
                  </span>
                </>
              ) : (
                <span className="text-monster-border">—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <p style={{ fontSize: "6px" }} className="text-monster-muted text-center leading-loose">
        Click item to use &nbsp;/&nbsp; Drag to bin to delete
      </p>

      {/* Delete zone */}
      <div
        onDragOver={e => { e.preventDefault(); setOverDelete(true); }}
        onDragLeave={() => setOverDelete(false)}
        onDrop={handleDrop}
        style={{ fontSize: "7px" }}
        className={`
          border-2 border-dashed py-4 text-center uppercase tracking-widest transition-all
          ${overDelete
            ? "border-monster-text text-monster-text bg-monster-border"
            : "border-monster-border text-monster-muted"
          }
        `}
      >
        {overDelete ? "Release to delete" : "[ Bin ]"}
      </div>

    </div>
  );
}
