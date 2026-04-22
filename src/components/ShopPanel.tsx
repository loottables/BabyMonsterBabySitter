"use client";

import { useState } from "react";
import type { ItemId } from "@/types/items";
import { ITEM_DEFS, SHOP_ITEMS } from "@/types/items";

interface Anchor { cx: number; top: number; bottom: number; }

interface Props {
  coins:   number;
  onBuy:   (itemId: ItemId, price: number) => void;
  onClose: () => void;
}

const GRID_SIZE = 16;
const gridSlots: (ItemId | null)[] = [
  ...SHOP_ITEMS,
  ...Array(GRID_SIZE - SHOP_ITEMS.length).fill(null),
];

export default function ShopPanel({ coins, onBuy, onClose }: Props) {
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [anchor,   setAnchor]   = useState<Anchor | null>(null);
  const [qtyInput, setQtyInput] = useState<string>("1");

  function dismiss() {
    setSelected(null);
    setAnchor(null);
    setQtyInput("1");
  }

  function handleSlotClick(id: ItemId | null, e: React.MouseEvent<HTMLDivElement>) {
    if (!id) return;
    if (selected === id) { dismiss(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
    setSelected(id);
    setQtyInput("1");
  }

  function handleQty(raw: string) {
    // allow empty while typing
    if (raw === "") { setQtyInput(""); return; }
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1) setQtyInput(String(n));
  }

  function adjustQty(delta: number) {
    const current = parseInt(qtyInput, 10) || 1;
    const next    = Math.max(1, current + delta);
    setQtyInput(String(next));
  }

  function handleBuy() {
    if (!selected) return;
    const def = ITEM_DEFS[selected];
    const qty = Math.max(1, parseInt(qtyInput, 10) || 1);
    for (let i = 0; i < qty; i++) onBuy(selected, def.price);
    dismiss();
  }

  const selDef   = selected ? ITEM_DEFS[selected] : null;
  const qty      = Math.max(1, parseInt(qtyInput, 10) || 1);
  const total    = selDef ? selDef.price * qty : 0;
  const canAfford = selDef ? coins >= total : false;

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
        className="flex flex-col gap-6 w-full max-w-sm border border-monster-border bg-monster-panel max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >

        {/* Shop owner placeholder */}
        <div
          className="w-full border-b border-monster-border flex items-center justify-center shrink-0"
          style={{ height: 140 }}
        >
          <p style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-widest">
            [ Shop Owner ]
          </p>
        </div>

        <div className="flex flex-col gap-5 px-6 pb-8">

          {/* Header */}
          <div className="grid grid-cols-3 items-center">
            <h2 style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest">
              Shop
            </h2>
            <span style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide tabular-nums text-center">
              {coins} coins
            </span>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                style={{ fontSize: "18px" }}
                className="text-monster-muted hover:text-monster-text transition-colors leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* 4×4 grid */}
          <div className="grid grid-cols-4 gap-2">
            {gridSlots.map((id, i) => {
              const def        = id ? ITEM_DEFS[id] : null;
              const isEmpty    = id === null;
              const isSelected = selected === id;

              return (
                <div
                  key={i}
                  onClick={e => handleSlotClick(id, e)}
                  style={{ fontSize: "6px" }}
                  className={`
                    border bg-monster-panel flex flex-col items-center justify-center gap-1
                    aspect-square select-none transition-colors
                    ${isEmpty
                      ? "border-monster-border opacity-30 cursor-default"
                      : isSelected
                        ? "border-monster-text bg-monster-border cursor-pointer"
                        : "border-monster-border hover:bg-monster-border cursor-pointer"
                    }
                  `}
                >
                  {def ? (
                    <>
                      <span className="text-monster-text uppercase text-center leading-loose px-0.5">
                        {def.name}
                      </span>
                      <span className="text-monster-muted tabular-nums">
                        {def.price}¢
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
            Click an item to view details
          </p>

        </div>
      </div>

      {/* Item detail popup */}
      {selDef && anchor && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 60, backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={e => { e.stopPropagation(); dismiss(); }}
          />
          <div
            className="fixed flex flex-col gap-4 border border-monster-border bg-monster-panel px-5 py-5"
            style={{ zIndex: 70, width: POPUP_W, ...popupStyle }}
            onClick={e => e.stopPropagation()}
          >
            {/* Item name + unit price */}
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest">
                {selDef.name}
              </p>
              <span style={{ fontSize: "7px" }} className="text-monster-muted tabular-nums">
                {selDef.price} coins each
              </span>
            </div>

            {/* Description */}
            <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
              {selDef.description}
            </p>

            {/* Stats */}
            <ul className="flex flex-col gap-1">
              {selDef.stats.map(s => (
                <li key={s} style={{ fontSize: "6px" }} className="text-monster-text uppercase tracking-wide">
                  + {s}
                </li>
              ))}
            </ul>

            {/* Quantity selector */}
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "6px" }} className="text-monster-muted uppercase tracking-wide">
                Qty
              </span>
              <button
                onClick={() => adjustQty(-1)}
                style={{ fontSize: "10px" }}
                className="w-7 h-7 border border-monster-border bg-monster-panel text-monster-text hover:bg-monster-border active:scale-95 transition-all flex items-center justify-center"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={qtyInput}
                onChange={e => handleQty(e.target.value)}
                onBlur={() => { if (!qtyInput) setQtyInput("1"); }}
                style={{ fontSize: "8px", MozAppearance: "textfield" }}
                className="w-12 text-center border border-monster-border bg-monster-panel text-monster-text py-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => adjustQty(1)}
                style={{ fontSize: "10px" }}
                className="w-7 h-7 border border-monster-border bg-monster-panel text-monster-text hover:bg-monster-border active:scale-95 transition-all flex items-center justify-center"
              >
                +
              </button>
              <span style={{ fontSize: "7px" }} className="text-monster-muted tabular-nums ml-auto">
                = {total} coins
              </span>
            </div>

            {/* Buy button */}
            <button
              onClick={handleBuy}
              disabled={!canAfford}
              style={{ fontSize: "7px" }}
              className="px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {canAfford ? `Buy ${qty > 1 ? `×${qty}` : ""}` : "Not enough coins"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
