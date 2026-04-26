"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Monster } from "@/types/game";
import type { PendingEncounter } from "@/hooks/useGameState";
import { wildToDisplayMonster } from "@/lib/battleEngine";
import BattleBgCanvas from "./BattleBgCanvas";

const MonsterCanvas = dynamic(() => import("./MonsterCanvas"), { ssr: false });

// MonsterCanvas always renders at 320×320 CSS px; scale it down for battle
const SCALE  = 0.5;
const VISUAL = 320 * SCALE; // 160px
const SHIFT  = 70;          // px the sprite lunges toward the opponent

// Background canvas natural width (80 columns × 5 px/cell)
const BG_W = 80 * 5; // 400px

// ── HP bar ─────────────────────────────────────────────────────────────────

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  const color = pct > 50 ? "#a8d8a8" : pct > 25 ? "#d8d8a8" : "#d8a8a8";
  return (
    <div className="w-full flex flex-col gap-1">
      <div className="w-full h-2 bg-monster-border overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p style={{ fontSize: "6px" }} className="text-monster-muted tabular-nums text-right">
        {current} / {max}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  encounter:     PendingEncounter;
  playerMonster: Monster;
  onComplete:    () => void;
}

export default function BattleView({ encounter, playerMonster, onComplete }: Props) {
  const { wildMonster, battleResult } = encounter;
  const { rounds, winner }            = battleResult;
  const wildDisplay                   = wildToDisplayMonster(wildMonster);

  const initPlayerHp = playerMonster.rpg.hp;
  const initWildHp   = wildMonster.rpg.hp;

  const [roundIdx,   setRoundIdx]   = useState(-1);
  const [attacking,  setAttacking]  = useState<"player" | "wild" | null>(null);
  const [playerHp,   setPlayerHp]   = useState(initPlayerHp);
  const [wildHp,     setWildHp]     = useState(initWildHp);
  const [battleDone, setBattleDone] = useState(false);
  const [statusMsg,  setStatusMsg]  = useState("Battle start!");

  const skipRef   = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function addTimer(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  }

  function finishBattle() {
    setPlayerHp(Math.max(1, battleResult.finalPlayerHp));
    setWildHp(winner === "player" ? 0 : wildMonster.rpg.hp);
    setAttacking(null);
    setRoundIdx(rounds.length);
    setBattleDone(true);
    setStatusMsg(winner === "player" ? "You win!" : "You lose!");
  }

  function animateRound(idx: number) {
    if (skipRef.current || idx >= rounds.length) {
      finishBattle();
      return;
    }

    const round   = rounds[idx];
    const atkName = round.attacker === "player" ? playerMonster.name : wildMonster.name;
    const defName = round.attacker === "player" ? wildMonster.name   : playerMonster.name;
    setRoundIdx(idx);
    setStatusMsg(
      round.dodged ? `${defName} dodged!`
      : round.hit  ? `${atkName} attacks!${round.damage > 0 ? ` (-${round.damage})` : ""}`
      :              `${atkName} missed!`
    );
    setAttacking(round.attacker);

    addTimer(() => {
      if (skipRef.current) { finishBattle(); return; }
      setAttacking(null);
      setPlayerHp(round.playerHpAfter);
      setWildHp(round.wildHpAfter);

      addTimer(() => {
        if (skipRef.current) { finishBattle(); return; }
        animateRound(idx + 1);
      }, 500);
    }, 350);
  }

  useEffect(() => {
    const t = setTimeout(() => animateRound(0), 800);
    return () => { clearTimers(); clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSkip() {
    skipRef.current = true;
    clearTimers();
    finishBattle();
  }

  const progress = rounds.length > 0
    ? Math.min(100, Math.round((Math.max(0, roundIdx) / rounds.length) * 100))
    : 0;

  const playerShift = attacking === "player" ?  SHIFT : 0;
  const wildShift   = attacking === "wild"   ? -SHIFT : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
    >
      {/* Scene: background canvas with sprites overlaid at ground level */}
      <div style={{ position: "relative", width: BG_W, flexShrink: 0 }}>
        <BattleBgCanvas />
        <div
          className="flex items-end justify-center gap-12"
          style={{ position: "absolute", bottom: 4, left: 0, right: 0 }}
        >
          {/* Player sprite */}
          <div style={{ width: VISUAL, height: VISUAL, position: "relative", flexShrink: 0 }}>
            <div
              style={{
                position:   "absolute",
                top:        0,
                left:       0,
                transform:  `translateX(${playerShift}px)`,
                transition: "transform 250ms ease-out",
              }}
            >
              <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 320, height: 320 }}>
                <MonsterCanvas monster={playerMonster} anim="idle" bare />
              </div>
            </div>
          </div>

          {/* Wild sprite */}
          <div style={{ width: VISUAL, height: VISUAL, position: "relative", flexShrink: 0 }}>
            <div
              style={{
                position:   "absolute",
                top:        0,
                left:       0,
                transform:  `translateX(${wildShift}px)`,
                transition: "transform 250ms ease-out",
              }}
            >
              <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 320, height: 320 }}>
                <MonsterCanvas monster={wildDisplay} anim="idle" bare />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Names + HP bars below the scene */}
      <div className="flex justify-center gap-12" style={{ width: BG_W }}>
        <div className="flex flex-col items-center gap-2" style={{ width: VISUAL }}>
          <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide text-center">
            {playerMonster.name} <span className="text-monster-muted">Lv.{playerMonster.rpg.level}</span>
          </p>
          <HpBar current={playerHp} max={playerMonster.rpg.maxHp} />
        </div>
        <div className="flex flex-col items-center gap-2" style={{ width: VISUAL }}>
          <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide text-center">
            {wildMonster.name} <span className="text-monster-muted">Lv.{wildMonster.level}</span>
          </p>
          <HpBar current={wildHp} max={wildMonster.rpg.maxHp} />
        </div>
      </div>

      {/* Status message */}
      <div className="w-full max-w-xs border border-monster-border bg-monster-panel px-4 py-3 text-center min-h-[32px]">
        <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide">
          {statusMsg}
        </p>
      </div>

      {/* Progress bar */}
      {!battleDone && (
        <div className="w-full max-w-xs h-1 bg-monster-border overflow-hidden">
          <div
            className="h-full bg-monster-text transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Skip button */}
      {!battleDone && (
        <button
          onClick={handleSkip}
          style={{ fontSize: "7px" }}
          className="px-6 py-3 border border-monster-border bg-monster-panel text-monster-muted uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
        >
          Skip
        </button>
      )}

      {/* Win / Lose overlay */}
      {battleDone && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center gap-6"
          style={{ backgroundColor: "rgba(0,0,0,0.70)", zIndex: 60 }}
        >
          <p
            style={{ fontSize: "28px" }}
            className={`uppercase tracking-widest font-bold ${winner === "player" ? "text-monster-text" : "text-red-400"}`}
          >
            {winner === "player" ? "Win!" : "Lose!"}
          </p>
          {winner === "player" && (
            <div className="flex flex-col items-center gap-1">
              {battleResult.expGained > 0 && (
                <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide">
                  + {battleResult.expGained} EXP
                </p>
              )}
              {battleResult.coinsGained > 0 && (
                <p style={{ fontSize: "7px" }} className="text-monster-text uppercase tracking-wide">
                  + {battleResult.coinsGained} coins
                </p>
              )}
            </div>
          )}
          {winner === "wild" && (
            <p style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide">
              {playerMonster.name} is injured.
            </p>
          )}
          <button
            onClick={onComplete}
            style={{ fontSize: "7px" }}
            className="px-6 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
