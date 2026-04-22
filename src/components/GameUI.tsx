"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StatsPanel from "./StatsPanel";
import ActionPanel from "./ActionPanel";
import BagView from "./BagView";
import SettingsPanel from "./SettingsPanel";
import TrainingModal from "./TrainingModal";
import DeathScreen from "./DeathScreen";
import { useGameState } from "@/hooks/useGameState";

const MonsterCanvas = dynamic(() => import("./MonsterCanvas"), { ssr: false });

function EggCountdown({ hatchTime }: { hatchTime: number }) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, hatchTime - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setMsLeft(Math.max(0, hatchTime - Date.now())), 500);
    return () => clearInterval(id);
  }, [hatchTime]);

  const totalSec = Math.ceil(msLeft / 1000);
  const mins     = Math.floor(totalSec / 60);
  const secs     = totalSec % 60;

  if (msLeft === 0) return (
    <span style={{ fontSize: "9px" }} className="text-monster-text animate-pulse uppercase tracking-widest">
      Hatching...
    </span>
  );

  return (
    <span style={{ fontSize: "14px" }} className="text-monster-text tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

export default function GameUI() {
  const {
    monster, inventory, anim, message, isLoading, showTrain,
    spawnMonster, useItem, deleteItem, clean, train, toggleTrain, wipeAll,
  } = useGameState();
  const [showBag,      setShowBag]      = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span style={{ fontSize: "8px" }} className="text-monster-muted uppercase animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  const settingsBtn = (
    <button
      onClick={() => setShowSettings(true)}
      style={{ fontSize: "6px" }}
      className="fixed bottom-16 right-4 px-3 py-2 border border-monster-border bg-monster-panel text-monster-muted hover:text-monster-text uppercase tracking-widest transition-colors"
    >
      [Settings]
    </button>
  );

  // ── no monster ────────────────────────────────────────────────────────────
  if (!monster) {
    return (
      <div className="flex flex-col items-center gap-8 py-16 px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 style={{ fontSize: "12px" }} className="text-monster-text uppercase tracking-widest leading-loose">
            New Game
          </h2>
          <p style={{ fontSize: "7px" }} className="text-monster-muted max-w-xs leading-loose">
            An egg will incubate before hatching. Abandoning restarts the timer.
          </p>
        </div>
        <button
          onClick={spawnMonster}
          style={{ fontSize: "8px" }}
          className="px-8 py-4 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
        >
          Place Egg
        </button>
      {settingsBtn}
      {showSettings && (
        <SettingsPanel
          hasMonster={false}
          onAbandon={spawnMonster}
          onWipeAll={wipeAll}
          onClose={() => setShowSettings(false)}
        />
      )}
      </div>
    );
  }

  // ── egg hatching ──────────────────────────────────────────────────────────
  if (!monster.isHatched) {
    const progress = monster.hatchTime > monster.birthday
      ? Math.min(1, (Date.now() - monster.birthday) / (monster.hatchTime - monster.birthday))
      : 0;
    const stage =
      progress < 0.50 ? "Resting quietly..."
      : progress < 0.70 ? "Something stirs..."
      : progress < 0.90 ? "The egg is cracking!"
      : "About to burst!";

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest">
            Egg Incubating
          </h2>
          <p style={{ fontSize: "7px" }} className="text-monster-muted">{stage}</p>
        </div>

        <MonsterCanvas monster={monster} anim="idle" />

        <div className="flex flex-col items-center gap-2">
          <p style={{ fontSize: "6px" }} className="text-monster-muted uppercase tracking-widest">Hatches in</p>
          <EggCountdown hatchTime={monster.hatchTime} />
        </div>

        <div className="w-full h-2 bg-monster-border overflow-hidden">
          <div
            className="h-full bg-monster-text transition-all duration-1000"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

      {settingsBtn}
      {showSettings && (
        <SettingsPanel
          hasMonster={true}
          onAbandon={spawnMonster}
          onWipeAll={wipeAll}
          onClose={() => setShowSettings(false)}
        />
      )}
      </div>
    );
  }

  // ── bag view ──────────────────────────────────────────────────────────────
  if (showBag) {
    return (
      <BagView
        inventory={inventory}
        monster={monster}
        message={message}
        onUse={useItem}
        onDelete={deleteItem}
        onClose={() => setShowBag(false)}
      />
    );
  }

  // ── active monster ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-wide">
            {monster.name}
          </h2>
          <p style={{ fontSize: "6px" }} className="text-monster-muted flex gap-3">
            <span>Day {monster.age}</span>
            <span>Lv.{monster.rpg.level}</span>
            {monster.care.hunger <= 20    && <span className="animate-pulse">! Hungry</span>}
            {monster.care.happiness <= 20 && <span className="animate-pulse">! Sad</span>}
            {monster.poops.length >= 3    && <span className="animate-pulse">! Dirty</span>}
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 justify-center">
        <div className="w-full lg:w-56 shrink-0">
          <StatsPanel monster={monster} />
        </div>

        <div className="flex flex-col items-center gap-3 shrink-0">
          <MonsterCanvas monster={monster} anim={anim} />
          {monster.poops.length > 0 && (
            <p style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide">
              {"[*]".repeat(monster.poops.length)} Needs cleaning
            </p>
          )}
        </div>

        <div className="w-full lg:w-56 shrink-0 lg:block hidden" />
      </div>

      <ActionPanel
        monster={monster}
        onBag={() => setShowBag(true)}
        onClean={clean}
        onTrain={toggleTrain}
        message={message}
      />

      {showTrain && (
        <TrainingModal monster={monster} onTrain={train} onClose={toggleTrain} />
      )}

      {monster.isDead && (
        <DeathScreen monster={monster} onReset={spawnMonster} />
      )}

      {settingsBtn}

      {showSettings && (
        <SettingsPanel
          hasMonster={!monster.isDead}
          onAbandon={spawnMonster}
          onWipeAll={wipeAll}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
