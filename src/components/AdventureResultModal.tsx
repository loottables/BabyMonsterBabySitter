"use client";

import type { AdventureResultData } from "@/lib/adventureEngine";
import { ITEM_DEFS } from "@/types/items";

interface Props {
  result:  AdventureResultData;
  onClose: () => void;
}

export default function AdventureResultModal({ result, onClose }: Props) {
  const { narrative, itemFound, itemObtained, expGained, coinsFound } = result;
  const itemDef = itemFound ? ITEM_DEFS[itemFound] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-5 w-full max-w-sm border border-monster-border bg-monster-panel px-7 py-7"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest">
            Adventure Complete
          </h2>
          <button
            onClick={onClose}
            style={{ fontSize: "18px" }}
            className="text-monster-muted hover:text-monster-text transition-colors leading-none"
          >
            ×
          </button>
        </div>

        {/* Narrative */}
        <p style={{ fontSize: "7px" }} className="text-monster-muted leading-loose">
          {narrative}
        </p>

        {/* Rewards */}
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: "6px" }} className="text-monster-text uppercase tracking-widest">
            Rewards
          </p>
          {expGained > 0 && (
            <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide">
              + {expGained} EXP
            </p>
          )}
          {itemFound && itemDef && (
            <p style={{ fontSize: "7px" }} className={itemObtained ? "text-monster-text uppercase tracking-wide" : "text-monster-muted uppercase tracking-wide line-through"}>
              + {itemDef.name}{!itemObtained && " (bag full)"}
            </p>
          )}
          {coinsFound > 0 && (
            <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide">
              + {coinsFound} coins
            </p>
          )}
          {expGained === 0 && !itemFound && coinsFound === 0 && (
            <p style={{ fontSize: "7px" }} className="text-monster-muted">
              Nothing this time.
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          style={{ fontSize: "7px" }}
          className="px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
