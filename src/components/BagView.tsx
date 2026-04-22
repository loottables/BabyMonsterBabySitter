"use client";

import { useState } from "react";
import type { Inventory } from "@/types/items";
import { ITEM_DEFS } from "@/types/items";
import type { Monster } from "@/types/game";

interface Anchor { cx: number; top: number; bottom: number; }

interface Props {
  inventory: Inventory;
  monster:   Monster | null;
  message:   string;
  onUse:     (slotIndex: number) => void;
  onDelete:  (slotIndex: number) => void;
  onClose:   () => void;
}

export default function BagView({ inventory, monster, message, onUse, onDelete, onClose }: Props) {
  const [dragging,   setDragging]   = useState<number | null>(null);
  const [overDelete, setOverDelete] = useState(false);
  const [selected,   setSelected]   = useState<number | null>(null);
  const [anchor,     setAnchor]     = useState<Anchor | null>(null);

  function handleDragStart(index: number) {
    if (inventory[index]) { setDragging(index); dismissDetail(); }
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

  function dismissDetail() {
    setSelected(null);
    setAnchor(null);
  }

  function handleSlotClick(index: number, e: React.MouseEvent<HTMLDivElement>) {
    if (!inventory[index]) return;
    if (selected === index) { dismissDetail(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
    setSelected(index);
  }

  function handleUse() {
    if (selected === null) return;
    onUse(selected);
    dismissDetail();
  }

  const canAct  = monster && !monster.isDead && monster.isHatched;
  const selSlot = selected !== null ? inventory[selected] : null;
  const selDef  = selSlot ? ITEM_DEFS[selSlot.itemId] : null;

  const POPUP_W = 288;
  const GAP     = 12;
  const FLIP_AT = 220;
  const popupLeft = anchor
    ? Math.min(window.innerWidth - POPUP_W - 8, Math.max(8, anchor.cx - POPUP_W / 2))
    : 0;
  const popupStyle = anchor
    ? anchor.top >= FLIP_AT
      ? { left: popupLeft, top: anchor.top - GAP, transform: "translateY(-100%)" }
      : { left: popupLeft, top: anchor.bottom + GAP }
    : {};

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="flex flex-col gap-6 w-full max-w-sm border border-monster-border bg-monster-panel px-6 py-8 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest">
            Bag
          </h2>
          <button
            onClick={onClose}
            style={{ fontSize: "18px" }}
            className="text-monster-muted hover:text-monster-text transition-colors leading-none"
          >
            ×
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
            const isEmpty    = slot === null;
            const def        = slot ? ITEM_DEFS[slot.itemId] : null;
            const isDragged  = dragging === i;
            const isSelected = selected === i;

            return (
              <div
                key={i}
                draggable={!isEmpty}
                onDragStart={() => handleDragStart(i)}
                onDragEnd={handleDragEnd}
                onClick={e => handleSlotClick(i, e)}
                style={{ fontSize: "7px" }}
                className={`
                  border bg-monster-panel flex flex-col items-center justify-center gap-1
                  aspect-square select-none transition-colors
                  ${isEmpty
                    ? "border-monster-border opacity-30 cursor-default"
                    : isSelected
                      ? "border-monster-text bg-monster-border cursor-pointer"
                      : "border-monster-border hover:bg-monster-border cursor-pointer"
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

        {/* Hint */}
        <p style={{ fontSize: "6px" }} className="text-monster-muted text-center leading-loose">
          Click an item for details &nbsp;/&nbsp; Drag to bin to delete
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

      {/* Item detail popup — rendered outside the panel so it can escape overflow */}
      {selDef && selSlot && anchor && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 60, backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={e => { e.stopPropagation(); dismissDetail(); }}
          />
          <div
            className="fixed flex flex-col gap-3 border border-monster-border bg-monster-panel px-5 py-5"
            style={{ zIndex: 70, width: POPUP_W, ...popupStyle }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest">
                {selDef.name}
              </p>
              <span style={{ fontSize: "7px" }} className="text-monster-muted">
                x{selSlot.quantity}
              </span>
            </div>

            <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
              {selDef.description}
            </p>

            <ul className="flex flex-col gap-1">
              {selDef.stats.map(stat => (
                <li key={stat} style={{ fontSize: "6px" }} className="text-monster-text uppercase tracking-wide">
                  + {stat}
                </li>
              ))}
            </ul>

            {canAct ? (
              <button
                onClick={handleUse}
                style={{ fontSize: "7px" }}
                className="mt-1 px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
              >
                {selDef.actionLabel} {monster!.name}
              </button>
            ) : (
              <p style={{ fontSize: "6px" }} className="text-monster-muted italic">
                {!monster
                  ? "No monster to use this on."
                  : monster.isDead
                    ? `${monster.name} has passed.`
                    : "Egg hasn't hatched yet."}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
