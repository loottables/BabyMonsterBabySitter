"use client";

import { useEffect, useState } from "react";
import type { Monster } from "@/types/game";
import { PET_COOLDOWN_MS } from "@/lib/constants";

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

interface PetBtnProps {
  lastPetTime: number | null;
  onPet:       () => void;
  canAct:      boolean; // false when dead / sleeping / adventuring
  name:        string;
}

function PetBtn({ lastPetTime, onPet, canAct, name }: PetBtnProps) {
  const [msLeft, setMsLeft] = useState(() =>
    lastPetTime ? Math.max(0, PET_COOLDOWN_MS - (Date.now() - lastPetTime)) : 0
  );

  useEffect(() => {
    if (!lastPetTime) { setMsLeft(0); return; }
    const tick = () => setMsLeft(Math.max(0, PET_COOLDOWN_MS - (Date.now() - lastPetTime)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastPetTime]);

  const onCooldown = msLeft > 0;
  const secsLeft   = Math.ceil(msLeft / 1000);
  const timeStr    = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`;

  return (
    <button
      onClick={onPet}
      disabled={!canAct || onCooldown}
      title={onCooldown ? `You recently petted ${name}` : "Pet your monster"}
      style={{ fontSize: "8px" }}
      className={`
        px-4 py-3 border uppercase tracking-widest
        border-monster-border bg-monster-panel text-monster-text
        hover:bg-monster-border disabled:cursor-not-allowed
        active:scale-95 select-none transition-all duration-100
        ${onCooldown ? "opacity-50" : !canAct ? "opacity-30" : ""}
      `}
    >
      {onCooldown ? timeStr : "Pet"}
    </button>
  );
}

interface Props {
  monster:     Monster;
  onBag:       () => void;
  onShop:      () => void;
  onSpa:       () => void;
  onPet:       () => void;
  onClean:     () => void;
  onTrain:     () => void;
  onAdventure: () => void;
  onSleep:     () => void;
  onWake:      () => void;
  message:     string;
}

export default function ActionPanel({ monster, onBag, onShop, onSpa, onPet, onClean, onTrain, onAdventure, onSleep, onWake, message }: Props) {
  const { care, poops, isDead, lastPetTime, name, isAdventuring, isAtSpa, isSick, isInjured, isSleeping } = monster;

  const canClean     = !isDead && poops.length > 0;
  const canTrain     = !isDead && !isSick && !isInjured && Math.round(care.energy) >= 1 && !isAdventuring && !isAtSpa && !isSleeping;
  const canPetAct    = !isDead && !isAdventuring && !isAtSpa && !isSleeping;
  const canAdventure = !isDead && !isSick && Math.round(care.energy) >= 1 && !isAdventuring && !isAtSpa && !isSleeping;
  const canSpa       = !isDead && !isAdventuring && !isAtSpa && !isSleeping;
  const canSleep     = !isDead && !isAdventuring && !isAtSpa && !isSleeping;
  const canWake      = !isDead && isSleeping;

  const trainTitle = isSick       ? `${name} is too sick to train`
                   : isInjured    ? `${name} is injured — use a First Aid Kit first`
                   : !canTrain    ? "No energy"
                   : "Train your monster";

  const adventureTitle = isAdventuring
    ? `${name} is away on an adventure`
    : isSick
    ? `${name} is too sick to adventure`
    : Math.round(care.energy) < 1
    ? "No energy"
    : "Send on an adventure (costs 1 energy)";

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-[20px] text-center">
        {message && (
          <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide px-2">
            {message}
          </p>
        )}
      </div>

      <div className="flex justify-center gap-3 flex-wrap">
        <ActionBtn label="Bag"   onClick={onBag}   title="Open bag" />
        <ActionBtn label="Shop"  onClick={onShop}  title="Visit the shop" />
        <ActionBtn
          label={isAtSpa ? "At Spa..." : "Spa"}
          onClick={onSpa}
          disabled={!canSpa}
          title={isAtSpa ? `${name} is at the spa` : canSpa ? "Visit the spa (100 coins)" : "Can't visit the spa right now"}
        />
        <PetBtn lastPetTime={lastPetTime} onPet={onPet} canAct={canPetAct} name={name} />
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
          title={trainTitle}
        />
        <ActionBtn
          label={isAdventuring ? "Adventuring..." : "Adventure"}
          onClick={onAdventure}
          disabled={!canAdventure}
          title={adventureTitle}
        />
        {isSleeping ? (
          <ActionBtn
            label="Wake"
            onClick={onWake}
            disabled={!canWake}
            title="Wake your monster up"
          />
        ) : (
          <ActionBtn
            label="Sleep"
            onClick={onSleep}
            disabled={!canSleep}
            title="Put your monster to sleep — pauses poops, happiness, and cleanliness decay"
          />
        )}
      </div>

    </div>
  );
}
