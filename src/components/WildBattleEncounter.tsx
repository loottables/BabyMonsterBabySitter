"use client";

import dynamic from "next/dynamic";
import type { Monster } from "@/types/game";
import type { Inventory } from "@/types/items";
import type { PendingEncounter } from "@/hooks/useGameState";
import { wildToDisplayMonster } from "@/lib/battleEngine";

const MonsterCanvas = dynamic(() => import("./MonsterCanvas"), { ssr: false });

interface Props {
  encounter:    PendingEncounter;
  playerName:   string;
  isInjured:    boolean;
  inventory:    Inventory;
  onRun:        () => void;
  onAccept:     (useFirstAidKit: boolean) => void;
}

export default function WildBattleEncounter({
  encounter, playerName, isInjured, inventory, onRun, onAccept,
}: Props) {
  const { wildMonster, location } = encounter;
  const displayMonster: Monster   = wildToDisplayMonster(wildMonster);
  const hasFirstAidKit            = inventory.some(s => s?.itemId === "first_aid_kit");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.80)" }}
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-xs border border-monster-border bg-monster-panel px-8 py-8">

        {/* Location flavour */}
        <p style={{ fontSize: "6px" }} className="text-monster-muted uppercase tracking-widest text-center">
          While adventuring {location}...
        </p>

        {/* Wild monster appeared */}
        <p style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest text-center">
          A wild {wildMonster.name} appeared!
        </p>

        {/* Wild monster sprite */}
        <div className="flex flex-col items-center gap-2">
          <MonsterCanvas monster={displayMonster} anim="idle" />
          <p style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide">
            Lv. {wildMonster.level}
          </p>
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
  );
}
