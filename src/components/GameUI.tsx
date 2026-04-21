"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import StatsPanel from "./StatsPanel";
import ActionPanel from "./ActionPanel";
import TrainingModal from "./TrainingModal";
import DeathScreen from "./DeathScreen";
import { useGameState } from "@/hooks/useGameState";

const MonsterCanvas = dynamic(() => import("./MonsterCanvas"), { ssr: false });

// ── countdown display (live, updates every second) ─────────────────────────

function EggCountdown({ hatchTime }: { hatchTime: number }) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, hatchTime - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, hatchTime - Date.now());
      setMsLeft(remaining);
    }, 500);
    return () => clearInterval(id);
  }, [hatchTime]);

  const totalSec = Math.ceil(msLeft / 1000);
  const mins     = Math.floor(totalSec / 60);
  const secs     = totalSec % 60;

  if (msLeft === 0) return <span className="text-green-400 font-bold animate-pulse">Hatching…</span>;

  return (
    <span className="font-mono text-yellow-300 text-lg font-bold tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

// ── main UI ────────────────────────────────────────────────────────────────

export default function GameUI() {
  const {
    monster, anim, message, isLoading, showTrain,
    spawnMonster, feed, clean, train, toggleTrain, reset,
  } = useGameState();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-monster-muted text-sm animate-pulse">
        Loading…
      </div>
    );
  }

  // ── no egg / no monster ───────────────────────────────────────────────────
  if (!monster) {
    return (
      <div className="flex flex-col items-center gap-8 py-16 px-4">
        <div className="text-6xl animate-bounce">🥚</div>
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-bold text-monster-text tracking-tight">
            Ready to hatch?
          </h2>
          <p className="text-monster-muted max-w-xs text-sm leading-relaxed">
            Your egg will incubate before revealing its monster. Once you start,
            you&apos;re committed — abandoning comes at a cost.
          </p>
        </div>
        <button
          onClick={spawnMonster}
          className="
            px-8 py-4 rounded-2xl font-bold text-lg tracking-wide
            bg-indigo-600 hover:bg-indigo-500 border border-indigo-400
            text-white transition-all hover:scale-105 active:scale-95
          "
        >
          Place an Egg
        </button>
      </div>
    );
  }

  // ── egg hatching ──────────────────────────────────────────────────────────
  if (!monster.isHatched) {
    const progress = monster.hatchTime > monster.birthday
      ? Math.min(1, (Date.now() - monster.birthday) / (monster.hatchTime - monster.birthday))
      : 0;
    const stage =
      progress < 0.50 ? "Resting quietly…"
      : progress < 0.70 ? "Something is stirring inside…"
      : progress < 0.90 ? "The egg is cracking!"
      : "It's about to burst!";

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-xl font-bold text-monster-text">An egg is incubating</h2>
          <p className="text-sm text-monster-muted">{stage}</p>
        </div>

        <MonsterCanvas monster={monster} anim="idle" />

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-monster-muted">Hatches in</p>
          <EggCountdown hatchTime={monster.hatchTime} />
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-monster-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all duration-1000"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <button
          onClick={() => {
            if (confirm("Abandon this egg? A new egg will start its timer from scratch.")) {
              spawnMonster();
            }
          }}
          className="text-xs text-monster-muted hover:text-red-400 transition-colors mt-2"
        >
          Abandon egg
        </button>
      </div>
    );
  }

  // ── active monster ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-monster-text">{monster.name}</h2>
          <p className="text-xs text-monster-muted">
            Day {monster.age} · Level {monster.rpg.level}
            {monster.care.hunger <= 20 && (
              <span className="ml-2 text-orange-400 animate-pulse">⚠ Hungry!</span>
            )}
            {monster.care.happiness <= 20 && (
              <span className="ml-2 text-pink-400 animate-pulse">⚠ Sad!</span>
            )}
            {monster.poops.length >= 3 && (
              <span className="ml-2 text-yellow-500 animate-pulse">⚠ Dirty!</span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm(`Abandon ${monster.name}? You'll receive a new egg with a full hatch timer.`)) {
              spawnMonster();
            }
          }}
          className="text-xs text-monster-muted hover:text-red-400 transition-colors px-2 py-1"
        >
          Abandon
        </button>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 justify-center">
        <div className="w-full lg:w-56 shrink-0">
          <StatsPanel monster={monster} />
        </div>

        <div className="flex flex-col items-center gap-3 shrink-0">
          <MonsterCanvas monster={monster} anim={anim} />
          {monster.poops.length > 0 && (
            <p className="text-xs text-yellow-500">
              {"💩".repeat(monster.poops.length)} needs cleaning
            </p>
          )}
        </div>

        <div className="w-full lg:w-56 shrink-0 lg:block hidden" />
      </div>

      <ActionPanel
        monster={monster}
        onFeed={feed}
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
    </div>
  );
}
