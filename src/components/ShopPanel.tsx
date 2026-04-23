"use client";

import { useState } from "react";
import type { ItemId, Inventory } from "@/types/items";
import { ITEM_DEFS, SHOP_ITEMS, SHOP_ITEMS_EXTENDED } from "@/types/items";

interface Anchor { cx: number; top: number; bottom: number; }

interface Props {
  coins:          number;
  hasBeenRenamed: boolean;
  inventory:      Inventory;
  onBuy:          (itemId: ItemId, price: number) => void;
  onSell:         (slotIndex: number) => void;
  onClose:        () => void;
}

const BUY_GRID_SIZE  = 16;
const SELL_GRID_COLS = 3;

export default function ShopPanel({ coins, hasBeenRenamed, inventory, onBuy, onSell, onClose }: Props) {
  const [mode, setMode] = useState<"buy" | "sell">("buy");

  // ── shared popup state ────────────────────────────────────────────────────
  const [selectedId,    setSelectedId]    = useState<ItemId | null>(null);
  const [selectedSlot,  setSelectedSlot]  = useState<number | null>(null);
  const [anchor,        setAnchor]        = useState<Anchor | null>(null);
  const [qtyInput,      setQtyInput]      = useState<string>("1");

  function dismiss() {
    setSelectedId(null);
    setSelectedSlot(null);
    setAnchor(null);
    setQtyInput("1");
  }

  function switchMode(next: "buy" | "sell") {
    dismiss();
    setMode(next);
  }

  // ── buy helpers ───────────────────────────────────────────────────────────
  const activeItems  = hasBeenRenamed ? SHOP_ITEMS_EXTENDED : SHOP_ITEMS;
  const buyGridSlots: (ItemId | null)[] = [
    ...activeItems,
    ...Array(BUY_GRID_SIZE - activeItems.length).fill(null),
  ];

  function handleBuySlotClick(id: ItemId | null, e: React.MouseEvent<HTMLDivElement>) {
    if (!id) return;
    if (selectedId === id && mode === "buy") { dismiss(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
    setSelectedId(id);
    setSelectedSlot(null);
    setQtyInput("1");
  }

  function handleQty(raw: string) {
    if (raw === "") { setQtyInput(""); return; }
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1) setQtyInput(String(n));
  }

  function adjustQty(delta: number) {
    const next = Math.max(1, (parseInt(qtyInput, 10) || 1) + delta);
    setQtyInput(String(next));
  }

  function handleBuy() {
    if (!selectedId) return;
    const def = ITEM_DEFS[selectedId];
    const qty = Math.max(1, parseInt(qtyInput, 10) || 1);
    for (let i = 0; i < qty; i++) onBuy(selectedId, def.price);
    dismiss();
  }

  // ── sell helpers ──────────────────────────────────────────────────────────
  function handleSellSlotClick(slotIdx: number, id: ItemId | null, e: React.MouseEvent<HTMLDivElement>) {
    if (!id) return;
    if (selectedSlot === slotIdx && mode === "sell") { dismiss(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
    setSelectedId(id);
    setSelectedSlot(slotIdx);
    setQtyInput("1");
  }

  function handleSell() {
    if (selectedSlot === null) return;
    onSell(selectedSlot);
    dismiss();
  }

  // ── popup positioning ─────────────────────────────────────────────────────
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

  const selDef     = selectedId ? ITEM_DEFS[selectedId] : null;
  const buyQty     = Math.max(1, parseInt(qtyInput, 10) || 1);
  const buyTotal   = selDef && mode === "buy" ? selDef.price * buyQty : 0;
  const canAfford  = selDef ? coins >= buyTotal : false;
  const sellPrice  = selDef ? Math.floor(selDef.price / 2) : 0;

  return (
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

          {/* Buy / Sell tabs */}
          <div className="flex border border-monster-border">
            {(["buy", "sell"] as const).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{ fontSize: "7px" }}
                className={`flex-1 py-2 uppercase tracking-widest transition-colors
                  ${mode === m
                    ? "bg-monster-border text-monster-text"
                    : "bg-monster-panel text-monster-muted hover:bg-monster-border"
                  }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* ── Buy grid ── */}
          {mode === "buy" && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {buyGridSlots.map((id, i) => {
                  const def        = id ? ITEM_DEFS[id] : null;
                  const isEmpty    = id === null;
                  const isSelected = selectedId === id && mode === "buy";
                  return (
                    <div
                      key={i}
                      onClick={e => handleBuySlotClick(id, e)}
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
              <p style={{ fontSize: "6px" }} className="text-monster-muted text-center leading-loose">
                Click an item to view details
              </p>
            </>
          )}

          {/* ── Sell grid ── */}
          {mode === "sell" && (
            <>
              <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${SELL_GRID_COLS}, 1fr)` }}>
                {inventory.map((slot, i) => {
                  const def        = slot ? ITEM_DEFS[slot.itemId] : null;
                  const isEmpty    = slot === null;
                  const isSelected = selectedSlot === i && mode === "sell";
                  return (
                    <div
                      key={i}
                      onClick={e => handleSellSlotClick(i, slot?.itemId ?? null, e)}
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
                      {def && slot ? (
                        <>
                          <span className="text-monster-text uppercase text-center leading-loose px-0.5">
                            {def.name}
                          </span>
                          {slot.quantity > 1 && (
                            <span className="text-monster-muted tabular-nums">×{slot.quantity}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-monster-border">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: "6px" }} className="text-monster-muted text-center leading-loose">
                Click an item to sell it
              </p>
            </>
          )}

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
            {/* Item name + price */}
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest">
                {selDef.name}
              </p>
              <span style={{ fontSize: "7px" }} className="text-monster-muted tabular-nums">
                {mode === "buy" ? `${selDef.price} coins each` : `Sell for ${sellPrice} coins`}
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

            {/* Buy: quantity selector */}
            {mode === "buy" && (
              <>
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
                    style={{ fontSize: "8px" }}
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
                    = {buyTotal} coins
                  </span>
                </div>
                <button
                  onClick={handleBuy}
                  disabled={!canAfford}
                  style={{ fontSize: "7px" }}
                  className="px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {canAfford ? `Buy${buyQty > 1 ? ` ×${buyQty}` : ""}` : "Not enough coins"}
                </button>
              </>
            )}

            {/* Sell: single sell button */}
            {mode === "sell" && (
              <button
                onClick={handleSell}
                style={{ fontSize: "7px" }}
                className="px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
              >
                Sell for {sellPrice} coins
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
