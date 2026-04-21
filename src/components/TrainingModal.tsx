"use client";

import type { TrainingType } from "@/types/game";
import { TRAINING_EXERCISES } from "@/lib/constants";
import type { Monster } from "@/types/game";

interface Props {
  monster:  Monster;
  onTrain:  (type: TrainingType) => void;
  onClose:  () => void;
}

const STAT_ICONS: Record<string, string> = {
  atk: "⚔️",
  def: "🛡️",
  agi: "🌀",
  end: "💨",
};

export default function TrainingModal({ monster, onTrain, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-monster-panel border border-monster-border rounded-none p-6 w-80 flex flex-col gap-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-monster-text font-mono">Choose Training</h2>
          <button
            onClick={onClose}
            className="text-monster-muted hover:text-monster-text transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-monster-muted font-mono">
          {Math.round(monster.care.energy)} / {5 + Math.floor(monster.rpg.end / 5)} energy
        </p>

        <div className="flex flex-col gap-2">
          {TRAINING_EXERCISES.map(ex => {
            const canAfford = Math.floor(monster.care.energy) >= 1;
            return (
              <button
                key={ex.id}
                onClick={() => canAfford && onTrain(ex.id)}
                disabled={!canAfford}
                className={`
                  flex items-center justify-between p-3 rounded-none border transition-all font-mono
                  ${canAfford
                    ? "border-monster-border hover:bg-monster-border cursor-pointer"
                    : "border-monster-border opacity-30 cursor-not-allowed"
                  }
                `}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold text-monster-text">
                    {STAT_ICONS[ex.id === "pushups" ? "atk"
                                : ex.id === "situps" ? "def"
                                : ex.id === "sprint" ? "agi"
                                : "end"]}{" "}
                    {ex.name}
                  </span>
                  <span className="text-xs text-monster-muted">{ex.description}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-xs">
                  <span className="text-monster-text font-bold">{ex.statLabel}</span>
                  <span className="text-monster-muted">⚡ -1 · 🍖 -{ex.hungerCost}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
