"use client";

import type { Monster } from "@/types/game";

interface BtnProps {
  label:    string;
  onClick:  () => void;
  disabled?: boolean;
  title?:   string;
}

function ActionBtn({ label, onClick, disabled, title }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ fontSize: "8px" }}
      className={`
        px-4 py-3 border uppercase tracking-widest
        border-monster-border bg-monster-panel text-monster-text
        hover:bg-monster-border
        disabled:opacity-30 disabled:cursor-not-allowed
        active:scale-95 select-none transition-all duration-100
      `}
    >
      {label}
    </button>
  );
}

interface Props {
  monster:  Monster;
  onBag:    () => void;
  onClean:  () => void;
  onTrain:  () => void;
  message:  string;
}

export default function ActionPanel({ monster, onBag, onClean, onTrain, message }: Props) {
  const { care, poops, isDead } = monster;

  const canClean = !isDead && poops.length > 0;
  const canTrain = !isDead && Math.round(care.energy) >= 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-[20px] text-center">
        {message && (
          <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide px-2">
            {message}
          </p>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <ActionBtn
          label="Bag"
          onClick={onBag}
          title="Open bag"
        />
        <ActionBtn
          label={`Clean${poops.length > 0 ? ` (${poops.length})` : ""}`}
          onClick={onClean}
          disabled={!canClean}
          title={canClean ? "Clean up" : "Nothing to clean"}
        />
        <ActionBtn
          label="Train"
          onClick={onTrain}
          disabled={!canTrain}
          title={canTrain ? "Train your monster" : "No energy"}
        />
      </div>
    </div>
  );
}
