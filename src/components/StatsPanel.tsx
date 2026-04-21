"use client";

import type { Monster } from "@/types/game";

interface BarProps {
  label: string;
  value: number;
  max?: number;
  icon: string;
}

function StatBar({ label, value, max = 100, icon }: BarProps) {
  const pct = Math.round((value / max) * 100);
  const low = pct <= 25;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-monster-muted">
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        <span className={`font-mono font-semibold ${low ? "text-white" : "text-monster-muted"}`}>
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-none bg-monster-border overflow-hidden">
        <div
          className="h-full transition-all duration-300 bg-monster-text"
          style={{ width: `${pct}%`, opacity: low ? 0.5 : 1 }}
        />
      </div>
    </div>
  );
}

interface RPGRowProps {
  label: string;
  value: number;
}

function RPGRow({ label, value }: RPGRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-monster-muted w-14">{label}</span>
      <span className="font-mono font-bold text-monster-text">{value}</span>
    </div>
  );
}

interface Props {
  monster: Monster;
}

export default function StatsPanel({ monster }: Props) {
  const { care, rpg } = monster;
  const expPct    = Math.round((rpg.exp / rpg.expToNext) * 100);
  const maxEnergy = 5 + Math.floor(rpg.end / 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Care stats */}
      <section className="bg-monster-panel border border-monster-border rounded-none p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold tracking-widest text-monster-muted uppercase">
          Vitals
        </h3>
        <StatBar label="Hunger"      value={care.hunger}      icon="🍖" />
        <StatBar label="Happiness"   value={care.happiness}   icon="💖" />
        <StatBar label="Cleanliness" value={care.cleanliness} icon="✨" />
        <StatBar label="Energy"      value={care.energy}      max={maxEnergy} icon="⚡" />
      </section>

      {/* RPG stats */}
      <section className="bg-monster-panel border border-monster-border rounded-none p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold tracking-widest text-monster-muted uppercase">
            Battle Stats
          </h3>
          <span className="text-xs font-mono text-monster-text">
            Lv.{rpg.level}
          </span>
        </div>

        <RPGRow label="HP"  value={rpg.hp}  />
        <RPGRow label="ATK" value={rpg.atk} />
        <RPGRow label="DEF" value={rpg.def} />
        <RPGRow label="AGI" value={rpg.agi} />
        <RPGRow label="SPD" value={rpg.spd} />
        <RPGRow label="END" value={rpg.end} />

        {/* EXP bar */}
        <div className="mt-2 flex flex-col gap-0.5">
          <div className="flex justify-between text-xs text-monster-muted">
            <span>EXP</span>
            <span className="font-mono">{rpg.exp}/{rpg.expToNext}</span>
          </div>
          <div className="h-1.5 w-full rounded-none bg-monster-border overflow-hidden">
            <div
              className="h-full bg-monster-text transition-all duration-500"
              style={{ width: `${expPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Age */}
      <div className="text-center text-xs text-monster-muted">
        Day {monster.age} · {monster.name}
      </div>
    </div>
  );
}
