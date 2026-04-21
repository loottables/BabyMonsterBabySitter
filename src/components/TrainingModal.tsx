"use client";

import type { TrainingType } from "@/types/game";
import { TRAINING_EXERCISES } from "@/lib/constants";
import type { Monster } from "@/types/game";

interface Props {
  monster:  Monster;
  onTrain:  (type: TrainingType) => void;
  onClose:  () => void;
}

export default function TrainingModal({ monster, onTrain, onClose }: Props) {
  const maxEnergy = 5 + Math.floor(monster.rpg.end / 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-monster-panel border border-monster-border p-6 w-80 flex flex-col gap-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-wide">
            Training
          </h2>
          <button
            onClick={onClose}
            style={{ fontSize: "8px" }}
            className="text-monster-muted hover:text-monster-text"
          >
            [X]
          </button>
        </div>

        <p style={{ fontSize: "7px" }} className="text-monster-muted">
          NRG: {Math.round(monster.care.energy)}/{maxEnergy}
        </p>

        <div className="flex flex-col gap-2">
          {TRAINING_EXERCISES.map(ex => {
            const canAfford = Math.round(monster.care.energy) >= 1;
            return (
              <button
                key={ex.id}
                onClick={() => canAfford && onTrain(ex.id)}
                disabled={!canAfford}
                className={`
                  flex items-center justify-between p-3 border transition-all
                  ${canAfford
                    ? "border-monster-border hover:bg-monster-border cursor-pointer"
                    : "border-monster-border opacity-30 cursor-not-allowed"
                  }
                `}
              >
                <div className="flex flex-col items-start gap-1.5">
                  <span style={{ fontSize: "7px" }} className="text-monster-text uppercase">
                    {ex.name}
                  </span>
                  <span style={{ fontSize: "6px" }} className="text-monster-muted">{ex.description}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span style={{ fontSize: "7px" }} className="text-monster-text">{ex.statLabel}</span>
                  <span style={{ fontSize: "6px" }} className="text-monster-muted">
                    NRG-1 / HGR-{ex.hungerCost}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
