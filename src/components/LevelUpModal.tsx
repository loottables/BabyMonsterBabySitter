"use client";

import type { LevelUpData } from "@/lib/gameEngine";
import { STR_HP_MULTIPLIER } from "@/lib/constants";

const STAT_LABELS: Record<string, string> = {
  str: "STR",
  atk: "ATK",
  def: "DEF",
  agi: "AGI",
  spd: "SPD",
  end: "END",
};

const STAT_ORDER = ["str", "atk", "def", "agi", "spd", "end"] as const;

interface Props {
  data:    LevelUpData;
  onClose: () => void;
}

export default function LevelUpModal({ data, onClose }: Props) {
  const { newLevel, gains } = data;
  const statRows = STAT_ORDER.filter(s => (gains[s] ?? 0) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="border-2 border-monster-border bg-monster-bg flex flex-col items-center gap-5 p-8 min-w-52">

        <div className="flex flex-col items-center gap-1">
          <p style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-widest animate-pulse">
            Level Up!
          </p>
          <p style={{ fontSize: "22px" }} className="text-monster-text font-bold tabular-nums">
            Lv. {newLevel}
          </p>
        </div>

        {statRows.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            {statRows.map(stat => {
              const n = gains[stat]!;
              const hpNote = stat === "str" ? ` (+${n * STR_HP_MULTIPLIER} HP)` : "";
              return (
                <div key={stat} className="flex justify-between gap-8">
                  <span style={{ fontSize: "8px" }} className="text-monster-muted uppercase tracking-wider">
                    {STAT_LABELS[stat]}
                  </span>
                  <span style={{ fontSize: "8px" }} className="text-monster-text">
                    +{n}{hpNote}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          style={{ fontSize: "8px" }}
          className="px-8 py-2 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
        >
          OK
        </button>
      </div>
    </div>
  );
}
