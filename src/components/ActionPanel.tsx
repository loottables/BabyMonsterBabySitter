"use client";

import type { Monster } from "@/types/game";

interface BtnProps {
  label:    string;
  icon:     string;
  onClick:  () => void;
  disabled?: boolean;
  title?:   string;
}

function ActionBtn({ label, icon, onClick, disabled, title }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex flex-col items-center gap-1 px-4 py-3 rounded-none border
        text-sm font-semibold transition-all duration-150 font-mono
        border-monster-border bg-monster-panel
        hover:bg-monster-border
        disabled:opacity-30 disabled:cursor-not-allowed
        active:scale-95 select-none text-monster-text
      `}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

interface Props {
  monster:  Monster;
  onFeed:   () => void;
  onClean:  () => void;
  onTrain:  () => void;
  message:  string;
}

export default function ActionPanel({ monster, onFeed, onClean, onTrain, message }: Props) {
  const { care, poops, isDead } = monster;

  const canFeed  = !isDead && care.hunger < 98;
  const canClean = !isDead && poops.length > 0;
  const canTrain = !isDead && Math.floor(care.energy) >= 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Message toast */}
      <div className="min-h-[24px] text-center">
        {message && (
          <p className="text-sm text-monster-text font-mono px-2">{message}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <ActionBtn
          icon="🍖"
          label="Feed"
          onClick={onFeed}
          disabled={!canFeed}
          title={canFeed ? "Feed your monster" : "Already full!"}
        />
        <ActionBtn
          icon="🧹"
          label={`Clean${poops.length > 0 ? ` (${poops.length})` : ""}`}
          onClick={onClean}
          disabled={!canClean}
          title={canClean ? "Clean up poop" : "Nothing to clean"}
        />
        <ActionBtn
          icon="💪"
          label="Train"
          onClick={onTrain}
          disabled={!canTrain}
          title={canTrain ? "Train your monster" : "Not enough energy"}
        />
      </div>
    </div>
  );
}
