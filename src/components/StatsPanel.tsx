"use client";

import { useState } from "react";
import type { Monster } from "@/types/game";
import { HP_REGEN_PCT_PER_MIN, INJURY_HEAL_MS } from "@/lib/constants";
import { calcMaxEnergy } from "@/lib/gameEngine";

function formatTime(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const STAT_DETAILS: Record<string, { title: string; body: string }> = {
  Hunger: {
    title: "Hunger",
    body:  "Drains fully in 4 hours. Feed your monster to keep it up. Energy stops regenerating at 0. If hunger stays at 0 for 22 hours, your monster dies.",
  },
  Happy: {
    title: "Happiness",
    body:  "Drains in 2 hours while you're away, 4 hours while the app is open. Pet your monster or give it treats to cheer it up. Uncleaned poops drain it faster. At 0 for 12 hours → death.",
  },
  Clean: {
    title: "Cleanliness",
    body:  "Drains slowly over time. 3 or more uncleaned poops for 15 minutes → your monster gets sick.",
  },
  Energy: {
    title: "Energy",
    body:  "Required to train. Regenerates +1 every 15 minutes — but only while Hunger is above 0. Maximum energy = 5 + floor(END ÷ 5). Higher END means more training sessions per day.",
  },
  HP: {
    title: "HP — Health Points",
    body:  "Your monster's life in battle. Regenerates over time; speed doubles when Hunger, Happiness, and Cleanliness are all above 50%. Regen is paused while sick or injured.",
  },
  STR: {
    title: "STR — Strength",
    body:  "Each STR point adds 3 to Max HP. Raised by Weightlifting. More STR means your monster can take far more hits before going down.",
  },
  ATK: {
    title: "ATK — Attack",
    body:  "How much damage your monster deals per hit in battle. Raised by Push-Ups.",
  },
  DEF: {
    title: "DEF — Defense",
    body:  "Reduces damage taken per hit in battle. Raised by Sit-Ups.",
  },
  AGI: {
    title: "AGI — Agility",
    body:  "Increases the chance to dodge incoming attacks and land critical hits in battle. Raised by Sprint.",
  },
  SPD: {
    title: "SPD — Speed",
    body:  "Higher SPD acts first in battle. On a tie, the attacker goes first. Raised by Sprint.",
  },
  END: {
    title: "END — Endurance",
    body:  "Every 5 END adds +1 to your maximum Energy. Raised by Endurance Run. Example: END 10 → max energy 7; END 15 → max energy 8.",
  },
  EXP: {
    title: "EXP — Experience",
    body:  "Earned by training. Fill the bar to level up. On level-up, one random battle stat (ATK, DEF, AGI, or SPD) gains +1.",
  },
};

interface Anchor { cx: number; top: number; bottom: number; }

interface BarProps {
  label:        string;
  statKey:      string;
  value:        number;
  max?:         number;
  onLabelClick: (key: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

function StatBar({ label, statKey, value, max = 100, onLabelClick }: BarProps) {
  const pct = Math.round((value / max) * 100);
  const low = pct <= 25;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between" style={{ fontSize: "7px" }}>
        <button
          onClick={e => onLabelClick(statKey, e)}
          style={{ fontSize: "7px" }}
          className="text-monster-muted uppercase tracking-wider underline cursor-pointer hover:text-monster-text transition-colors bg-transparent border-none p-0"
        >
          {label}
        </button>
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
  label:        string;
  statKey:      string;
  value:        number;
  onLabelClick: (key: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

function RPGRow({ label, statKey, value, onLabelClick }: RPGRowProps) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: "7px" }}>
      <button
        onClick={e => onLabelClick(statKey, e)}
        style={{ fontSize: "7px" }}
        className="text-monster-muted w-10 uppercase underline cursor-pointer hover:text-monster-text transition-colors bg-transparent border-none p-0 text-left"
      >
        {label}
      </button>
      <span className="text-monster-text">{value}</span>
    </div>
  );
}

interface Props {
  monster: Monster;
}

export default function StatsPanel({ monster }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [anchor,   setAnchor]   = useState<Anchor | null>(null);

  const { care, rpg } = monster;
  const maxEnergy  = calcMaxEnergy(rpg.end);
  const expPct     = Math.round((rpg.exp / rpg.expToNext) * 100);

  const hpDisplay  = Math.min(rpg.maxHp, Math.round(rpg.hp));
  const hpPct      = Math.round((rpg.hp / rpg.maxHp) * 100);
  const hpLow      = hpPct <= 25;
  const hpColor    = hpPct > 50 ? undefined : hpPct > 25 ? "#d8d8a8" : "#d8a8a8";
  // Matches the engine: HP regen is paused when sick or sleeping, NOT when injured.
  // (Injured monsters still regen HP naturally; the injury clears once they hold full HP for 30 min.)
  const canRegenHp = !monster.isSick && !monster.isSleeping;

  const wellCared     = care.happiness >= 50 && care.cleanliness >= 50 && care.hunger >= 50;
  const hpRegenPerMin = rpg.maxHp * HP_REGEN_PCT_PER_MIN * (wellCared ? 2 : 1);
  const secsToFull    = rpg.hp < rpg.maxHp
    ? Math.ceil((rpg.maxHp - rpg.hp) / hpRegenPerMin * 60)
    : 0;

  const energyFrac     = care.energy % 1;
  const energySecsLeft = care.energy < maxEnergy
    ? Math.max(1, Math.ceil((energyFrac === 0 ? 1 : 1 - energyFrac) * 900))
    : 0;

  const injurySecsLeft = monster.isInjured && hpDisplay >= rpg.maxHp && monster.injuredHealStart !== null
    ? Math.max(0, Math.ceil((INJURY_HEAL_MS - (Date.now() - monster.injuredHealStart)) / 1000))
    : null;

  function handleLabelClick(key: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (selected === key) { setSelected(null); setAnchor(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ cx: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
    setSelected(key);
  }

  function dismiss() { setSelected(null); setAnchor(null); }

  const detail = selected ? STAT_DETAILS[selected] : null;

  const POPUP_W = 260;
  const GAP     = 10;
  const FLIP_AT = 220;
  const popupLeft = anchor
    ? Math.min(window.innerWidth - POPUP_W - 8, Math.max(8, anchor.cx - POPUP_W / 2))
    : 0;
  const popupStyle = anchor
    ? anchor.top >= FLIP_AT
      ? { left: popupLeft, top: anchor.top - GAP, transform: "translateY(-100%)" }
      : { left: popupLeft, top: anchor.bottom + GAP }
    : {};

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Care stats */}
        <section className="bg-monster-panel border border-monster-border p-3 flex flex-col gap-2">
          <h3 style={{ fontSize: "6px" }} className="tracking-widest text-monster-muted uppercase mb-1">
            Vitals
          </h3>
          <StatBar label="Hunger"  statKey="Hunger"  value={care.hunger}                 onLabelClick={handleLabelClick} />
          <StatBar label="Happy"   statKey="Happy"   value={care.happiness}              onLabelClick={handleLabelClick} />
          <StatBar label="Clean"   statKey="Clean"   value={care.cleanliness}            onLabelClick={handleLabelClick} />
          <StatBar label="Energy"  statKey="Energy"  value={care.energy} max={maxEnergy} onLabelClick={handleLabelClick} />
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
              <button
                onClick={e => handleLabelClick("HP", e)}
                style={{ fontSize: "7px" }}
                className="text-monster-muted uppercase tracking-wider underline cursor-pointer hover:text-monster-text transition-colors bg-transparent border-none p-0"
              >
                HP
              </button>
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
                {canRegenHp ? `Full in ${formatTime(secsToFull)}` : monster.isSick ? "Paused — sick" : "Paused — sleeping"}
              </p>
            )}
            {injurySecsLeft !== null && (
              <p style={{ fontSize: "6px" }} className="text-monster-muted text-right animate-pulse">
                Injury heals in {formatTime(injurySecsLeft)}
              </p>
            )}
          </div>

          <RPGRow label="STR" statKey="STR" value={rpg.str} onLabelClick={handleLabelClick} />
          <RPGRow label="ATK" statKey="ATK" value={rpg.atk} onLabelClick={handleLabelClick} />
          <RPGRow label="DEF" statKey="DEF" value={rpg.def} onLabelClick={handleLabelClick} />
          <RPGRow label="AGI" statKey="AGI" value={rpg.agi} onLabelClick={handleLabelClick} />
          <RPGRow label="SPD" statKey="SPD" value={rpg.spd} onLabelClick={handleLabelClick} />
          <RPGRow label="END" statKey="END" value={rpg.end} onLabelClick={handleLabelClick} />

          {/* EXP bar */}
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex justify-between" style={{ fontSize: "6px" }}>
              <button
                onClick={e => handleLabelClick("EXP", e)}
                style={{ fontSize: "6px" }}
                className="text-monster-muted underline cursor-pointer hover:text-monster-text transition-colors bg-transparent border-none p-0"
              >
                EXP
              </button>
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

      {/* Stat detail popup — fixed so it escapes panel overflow */}
      {detail && anchor && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 60 }}
            onClick={dismiss}
          />
          <div
            className="fixed flex flex-col gap-3 border border-monster-border bg-monster-panel px-5 py-4"
            style={{ zIndex: 70, width: POPUP_W, ...popupStyle }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest">
              {detail.title}
            </p>
            <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
              {detail.body}
            </p>
          </div>
        </>
      )}
    </>
  );
}
