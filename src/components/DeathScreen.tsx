"use client";

import type { Monster } from "@/types/game";

interface Props {
  monster: Monster;
  onReset: () => void;
}

export default function DeathScreen({ monster, onReset }: Props) {
  const survived = monster.age;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-monster-panel border border-monster-border rounded-none p-8 w-96 flex flex-col items-center gap-6 shadow-2xl text-center font-mono">
        <div className="text-6xl animate-pulse">💀</div>

        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-monster-text">
            {monster.name} has passed away
          </h2>
          <p className="text-monster-muted text-sm">
            Survived <span className="text-monster-text font-semibold">{survived} day{survived !== 1 ? "s" : ""}</span> · reached <span className="text-monster-text font-semibold">Level {monster.rpg.level}</span>
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
            <div key={s.label} className="flex flex-col items-center gap-0.5">
              <span className="text-xs text-monster-muted">{s.label}</span>
              <span className="text-lg font-bold text-monster-text">{s.value}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-monster-muted italic">
          A new egg awaits — but it won&apos;t hatch right away.
        </p>

        <button
          onClick={onReset}
          className="
            w-full py-3 rounded-none font-bold text-sm tracking-widest uppercase
            bg-monster-panel border border-monster-border
            text-monster-text hover:bg-monster-border transition-all active:scale-95
          "
        >
          Begin Again
        </button>
      </div>
    </div>
  );
}
