"use client";

import type { Monster } from "@/types/game";

interface Props {
  monster:    Monster;
  onReset:    () => void;
  onSettings: () => void;
}

function Grave({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      {/* headstone */}
      <div
        className="flex flex-col items-center justify-center border-2 border-monster-border bg-monster-bg"
        style={{ width: 72, height: 80, borderRadius: "36px 36px 0 0" }}
      >
        <span style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-widest leading-loose">
          R.I.P.
        </span>
        <span
          style={{ fontSize: "6px", maxWidth: 56 }}
          className="text-monster-text uppercase tracking-wider leading-loose text-center break-words"
        >
          {name}
        </span>
        {/* cross detail */}
        <div className="mt-1 flex flex-col items-center gap-0" style={{ opacity: 0.35 }}>
          <div style={{ width: 2, height: 8, background: "currentColor" }} className="text-monster-border bg-monster-muted" />
          <div style={{ width: 12, height: 2, marginTop: -5, background: "currentColor" }} className="bg-monster-muted" />
        </div>
      </div>
      {/* base */}
      <div
        className="border-2 border-t-0 border-monster-border bg-monster-border"
        style={{ width: 90, height: 8 }}
      />
      {/* dirt mound */}
      <div
        className="bg-monster-border"
        style={{ width: 100, height: 5, clipPath: "ellipse(50% 100% at 50% 0%)" }}
      />
    </div>
  );
}

export default function DeathScreen({ monster, onReset, onSettings }: Props) {
  const survived = monster.age;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)" }}>
      {/* Settings button — always accessible */}
      <button
        onClick={onSettings}
        style={{ fontSize: "6px" }}
        className="fixed bottom-16 right-4 px-3 py-2 border border-monster-border bg-monster-panel text-monster-muted hover:text-monster-text uppercase tracking-widest transition-colors z-60"
      >
        [Settings]
      </button>

      {/* Floating modal */}
      <div className="bg-monster-panel border border-monster-border p-8 w-80 flex flex-col items-center gap-5 text-center shadow-2xl">

        <Grave name={monster.name} />

        <div className="flex flex-col gap-2">
          <h2 style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest leading-loose">
            {monster.name} has passed
          </h2>
          <p style={{ fontSize: "7px" }} className="text-monster-muted leading-loose">
            {survived} day{survived !== 1 ? "s" : ""} survived &nbsp;·&nbsp; Level {monster.rpg.level}
          </p>
        </div>

        {/* Final stats */}
        <div className="w-full grid grid-cols-6 gap-2 text-center border border-monster-border p-3">
          {[
            { label: "ATK", value: monster.rpg.atk   },
            { label: "DEF", value: monster.rpg.def   },
            { label: "AGI", value: monster.rpg.agi   },
            { label: "SPD", value: monster.rpg.spd   },
            { label: "END", value: monster.rpg.end   },
            { label: "HP",  value: monster.rpg.maxHp },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: "5px" }} className="text-monster-muted">{s.label}</span>
              <span style={{ fontSize: "9px" }} className="text-monster-text">{s.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onReset}
          style={{ fontSize: "8px" }}
          className="w-full py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
        >
          Hatch a New Egg
        </button>
      </div>
    </div>
  );
}
