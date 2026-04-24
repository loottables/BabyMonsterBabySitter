"use client";

import type { Monster } from "@/types/game";
import { HP_REGEN_PCT_PER_MIN, INJURY_HEAL_MS } from "@/lib/constants";
import { calcMaxEnergy } from "@/lib/gameEngine";

// Formats a duration in total seconds as M:SS
function formatTime(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface BarProps {
  label: string;
  value: number;
  max?: number;
}

function StatBar({ label, value, max = 100 }: BarProps) {
  const pct = Math.round((value / max) * 100);
  const low = pct <= 25;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between" style={{ fontSize: "7px" }}>
        <span className="text-monster-muted uppercase tracking-wider">{label}</span>
        <span className={low ? "text-white" : "text-monster-muted"}>
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className="h-2 w-full bg-monster-border overflow-hidden">
        <div
          className="h-full bg-monster-text transition-all duration-300"
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
    <div className="flex items-center justify-between" style={{ fontSize: "7px" }}>
      <span className="text-monster-muted w-10 uppercase">{label}</span>
      <span className="text-monster-text">{value}</span>
    </div>
  );
}

interface Props {
  monster: Monster;
}

export default function StatsPanel({ monster }: Props) {
  const { care, rpg } = monster;
  const maxEnergy  = calcMaxEnergy(rpg.end);
  const expPct     = Math.round((rpg.exp / rpg.expToNext) * 100);

  const hpDisplay  = Math.min(rpg.maxHp, Math.round(rpg.hp));
  const hpPct      = Math.round((rpg.hp / rpg.maxHp) * 100);
  const hpLow      = hpPct <= 25;
  const hpColor    = hpPct > 50 ? undefined : hpPct > 25 ? "#d8d8a8" : "#d8a8a8";
  const canRegenHp = !monster.isSick && !monster.isInjured;

  // How long until HP is full, accounting for the well-cared bonus
  const wellCared    = care.happiness >= 50 && care.cleanliness >= 50 && care.hunger >= 50;
  const hpRegenPerMin = rpg.maxHp * HP_REGEN_PCT_PER_MIN * (wellCared ? 2 : 1);
  const secsToFull   = rpg.hp < rpg.maxHp
    ? Math.ceil((rpg.maxHp - rpg.hp) / hpRegenPerMin * 60)
    : 0;

  // Countdown to next +1 energy (progress through the current 15-min window)
  const energyFrac    = care.energy % 1;
  const energySecsLeft = care.energy < maxEnergy
    ? Math.max(1, Math.ceil((energyFrac === 0 ? 1 : 1 - energyFrac) * 900))
    : 0;

  // Countdown to injury clearing (requires full HP for INJURY_HEAL_MS)
  const injurySecsLeft = monster.isInjured && hpDisplay >= rpg.maxHp && monster.injuredHealStart !== null
    ? Math.max(0, Math.ceil((INJURY_HEAL_MS - (Date.now() - monster.injuredHealStart)) / 1000))
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Care stats */}
      <section className="bg-monster-panel border border-monster-border p-3 flex flex-col gap-2">
        <h3 style={{ fontSize: "6px" }} className="tracking-widest text-monster-muted uppercase mb-1">
          Vitals
        </h3>
        <StatBar label="Hunger"  value={care.hunger}      />
        <StatBar label="Happy"   value={care.happiness}   />
        <StatBar label="Clean"   value={care.cleanliness} />
        <StatBar label="Energy"  value={care.energy} max={maxEnergy} />
        {energySecsLeft > 0 && (
          <p style={{ fontSize: "6px" }} className="text-monster-muted text-right">
            +1 in {formatTime(energySecsLeft)}
          </p>
        )}
      </section>

      {/* RPG stats */}
      <section className="bg-monster-panel border border-monster-border p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between mb-1">
          <h3 style={{ fontSize: "6px" }} className="tracking-widest text-monster-muted uppercase">
            Stats
          </h3>
          <span style={{ fontSize: "6px" }} className="text-monster-text">
            LV.{rpg.level}
          </span>
        </div>

        {/* HP bar */}
        <div className="flex flex-col gap-1 mb-0.5">
          <div className="flex items-center justify-between" style={{ fontSize: "7px" }}>
            <span className="text-monster-muted uppercase tracking-wider">HP</span>
            <span className={hpLow ? "text-white" : "text-monster-muted"}>
              {hpDisplay}/{rpg.maxHp}
            </span>
          </div>
          <div className="h-2 w-full bg-monster-border overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${hpPct}%`,
                backgroundColor: hpColor ?? "var(--color-monster-text, #c8c8c8)",
                opacity: hpLow ? 0.5 : 1,
              }}
            />
          </div>
          {rpg.hp < rpg.maxHp && (
            <p style={{ fontSize: "6px" }} className="text-monster-muted text-right">
              {canRegenHp ? `Full in ${formatTime(secsToFull)}` : "Paused — sick"}
            </p>
          )}
          {injurySecsLeft !== null && (
            <p style={{ fontSize: "6px" }} className="text-monster-muted text-right animate-pulse">
              Injury heals in {formatTime(injurySecsLeft)}
            </p>
          )}
        </div>

        <RPGRow label="STR" value={rpg.str} />
        <RPGRow label="ATK" value={rpg.atk} />
        <RPGRow label="DEF" value={rpg.def} />
        <RPGRow label="AGI" value={rpg.agi} />
        <RPGRow label="SPD" value={rpg.spd} />
        <RPGRow label="END" value={rpg.end} />

        {/* EXP bar */}
        <div className="mt-1 flex flex-col gap-1">
          <div className="flex justify-between" style={{ fontSize: "6px" }}>
            <span className="text-monster-muted">EXP</span>
            <span className="text-monster-muted">{rpg.exp}/{rpg.expToNext}</span>
          </div>
          <div className="h-1.5 w-full bg-monster-border overflow-hidden">
            <div
              className="h-full bg-monster-text transition-all duration-500"
              style={{ width: `${expPct}%` }}
            />
          </div>
        </div>
      </section>

    </div>
  );
}
