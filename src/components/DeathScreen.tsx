"use client";

import type { Monster } from "@/types/game";

interface Props {
  monster: Monster;
  onReset: () => void;
}

export default function DeathScreen({ monster, onReset }: Props) {
  const survived = monster.age;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="bg-monster-panel border border-monster-border p-8 w-96 flex flex-col items-center gap-6 text-center">

        <p style={{ fontSize: "20px" }} className="text-monster-text">
          x_x
        </p>

        <div className="flex flex-col gap-3">
          <h2 style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest leading-loose">
            {monster.name} has fallen
          </h2>
          <p style={{ fontSize: "7px" }} className="text-monster-muted leading-loose">
            {survived} day{survived !== 1 ? "s" : ""} survived
            <br />
            Level {monster.rpg.level} reached
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

        <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
          A new egg awaits...
        </p>

        <button
          onClick={onReset}
          style={{ fontSize: "8px" }}
          className="w-full py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
        >
          Begin Again
        </button>
      </div>
    </div>
  );
}
