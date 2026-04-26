"use client";

import dynamic from "next/dynamic";
import type { Monster, RPGStats } from "@/types/game";
import type { Inventory } from "@/types/items";
import type { PendingEncounter } from "@/hooks/useGameState";
import { wildToDisplayMonster } from "@/lib/battleEngine";
import BattleBgCanvas from "./BattleBgCanvas";

const MonsterCanvas = dynamic(() => import("./MonsterCanvas"), { ssr: false });

const SCALE  = 0.5;
const VISUAL = 320 * SCALE; // 160px

interface Props {
  encounter:    PendingEncounter;
  playerName:   string;
  playerRpg:    RPGStats;
  isInjured:    boolean;
  inventory:    Inventory;
  onRun:        () => void;
  onAccept:     (useFirstAidKit: boolean) => void;
}

function StatRow({ label, playerVal, wildVal }: { label: string; playerVal: number; wildVal: number }) {
  const playerWins = playerVal > wildVal;
  const wildWins   = wildVal   > playerVal;
  return (
    <div className="grid grid-cols-3 items-center" style={{ fontSize: "7px" }}>
      <span className={`text-right pr-3 tabular-nums ${playerWins ? "text-monster-text" : "text-monster-muted"}`}>
        {playerVal}
      </span>
      <span className="text-monster-muted uppercase tracking-widest text-center">{label}</span>
      <span className={`text-left pl-3 tabular-nums ${wildWins ? "text-monster-text" : "text-monster-muted"}`}>
        {wildVal}
      </span>
    </div>
  );
}

export default function WildBattleEncounter({
  encounter, playerName, playerRpg, isInjured, inventory, onRun, onAccept,
}: Props) {
  const { wildMonster, location } = encounter;
  const displayMonster: Monster   = wildToDisplayMonster(wildMonster);
  const hasFirstAidKit            = inventory.some(s => s?.itemId === "first_aid_kit");
  const w                         = wildMonster.rpg;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.80)" }}
    >
      <div className="flex flex-col w-full max-w-xs border border-monster-border bg-monster-panel">

        {/* Scene: battle background + wild monster sprite overlaid */}
        {/* Canvas is 400px wide; overflow:hidden clips ~40px per side inside 320px panel */}
        <div
          className="w-full border-b border-monster-border shrink-0 overflow-hidden"
          style={{ height: 175, position: "relative" }}
        >
          <BattleBgCanvas style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }} />
          <div
            style={{
              position:  "absolute",
              bottom:    8,
              left:      "50%",
              transform: "translateX(-50%)",
              width:     VISUAL,
              height:    VISUAL,
              overflow:  "hidden",
            }}
          >
            <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 320, height: 320 }}>
              <MonsterCanvas monster={displayMonster} anim="idle" bare />
            </div>
          </div>
          <p
            style={{ fontSize: "7px", position: "absolute", bottom: 8, right: 12 }}
            className="text-monster-muted uppercase tracking-wide"
          >
            Lv. {wildMonster.level}
          </p>
        </div>

        <div className="flex flex-col items-center gap-5 px-8 pt-5 pb-8 w-full">

          {/* Location flavour */}
          <p style={{ fontSize: "6px" }} className="text-monster-muted uppercase tracking-widest text-center">
            While adventuring {location}...
          </p>

          {/* Wild monster appeared */}
          <p style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest text-center">
            A wild {wildMonster.name} appeared!
          </p>

          {/* Stat comparison table */}
          <div className="w-full flex flex-col gap-1 border-t border-monster-border pt-3">
            <div className="grid grid-cols-3 mb-1" style={{ fontSize: "6px" }}>
              <span className="text-monster-muted uppercase tracking-widest text-right pr-3">{playerName}</span>
              <span />
              <span className="text-monster-muted uppercase tracking-widest text-left pl-3">{wildMonster.name}</span>
            </div>
            <StatRow label="ATK" playerVal={playerRpg.atk}   wildVal={w.atk}   />
            <StatRow label="DEF" playerVal={playerRpg.def}   wildVal={w.def}   />
            <StatRow label="AGI" playerVal={playerRpg.agi}   wildVal={w.agi}   />
            <StatRow label="SPD" playerVal={playerRpg.spd}   wildVal={w.spd}   />
            <StatRow label="HP"  playerVal={playerRpg.maxHp} wildVal={w.maxHp} />
          </div>

          {/* Injured notice */}
          {isInjured && (
            <p style={{ fontSize: "6px" }} className="text-red-400 uppercase tracking-wide text-center">
              {playerName} is injured and cannot battle.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 w-full">
            {!isInjured && (
              <button
                onClick={() => onAccept(false)}
                style={{ fontSize: "7px" }}
                className="w-full px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
              >
                Battle!
              </button>
            )}
            {isInjured && hasFirstAidKit && (
              <button
                onClick={() => onAccept(true)}
                style={{ fontSize: "7px" }}
                className="w-full px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
              >
                Use First Aid Kit &amp; Battle
              </button>
            )}
            <button
              onClick={onRun}
              style={{ fontSize: "7px" }}
              className="w-full px-4 py-3 border border-monster-border bg-monster-panel text-monster-muted uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
            >
              Run
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
