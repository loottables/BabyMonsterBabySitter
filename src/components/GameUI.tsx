"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StatsPanel from "./StatsPanel";
import ActionPanel from "./ActionPanel";
import BagView from "./BagView";
import ShopPanel from "./ShopPanel";
import SettingsPanel from "./SettingsPanel";
import TrainingModal from "./TrainingModal";
import DeathScreen from "./DeathScreen";
import AdventureResultModal from "./AdventureResultModal";
import WildBattleEncounter from "./WildBattleEncounter";
import BattleView from "./BattleView";
import { useGameState } from "@/hooks/useGameState";
import { checkName } from "@/lib/nameFilter";
import { ADVENTURE_DURATION_MS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const MonsterCanvas = dynamic(() => import("./MonsterCanvas"), { ssr: false });

function EggCountdown({ hatchTime }: { hatchTime: number }) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, hatchTime - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setMsLeft(Math.max(0, hatchTime - Date.now())), 500);
    return () => clearInterval(id);
  }, [hatchTime]);

  const totalSec = Math.ceil(msLeft / 1000);
  const mins     = Math.floor(totalSec / 60);
  const secs     = totalSec % 60;

  if (msLeft === 0) return (
    <span style={{ fontSize: "9px" }} className="text-monster-text animate-pulse uppercase tracking-widest">
      Hatching...
    </span>
  );

  return (
    <span style={{ fontSize: "14px" }} className="text-monster-text tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

function SleepOverlay() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-end justify-start pt-10 pr-8 pointer-events-none"
      style={{ backgroundColor: "rgba(0,0,20,0.45)" }}
    >
      <div className="flex flex-col items-center gap-1">
        <span style={{ fontSize: "18px", animationDelay: "0ms"   }} className="text-monster-text opacity-90 animate-bounce">Z</span>
        <span style={{ fontSize: "13px", animationDelay: "300ms" }} className="text-monster-text opacity-60 animate-bounce">z</span>
        <span style={{ fontSize: "9px",  animationDelay: "600ms" }} className="text-monster-text opacity-35 animate-bounce">z</span>
      </div>
    </div>
  );
}

function AdventureOverlay({ adventureStart }: { adventureStart: number }) {
  const end = adventureStart + ADVENTURE_DURATION_MS;
  const [msLeft, setMsLeft] = useState(() => Math.max(0, end - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setMsLeft(Math.max(0, end - Date.now())), 500);
    return () => clearInterval(id);
  }, [end]);

  const totalSec = Math.ceil(msLeft / 1000);
  const mins     = Math.floor(totalSec / 60);
  const secs     = totalSec % 60;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
    >
      <span style={{ fontSize: "8px" }} className="text-monster-text uppercase tracking-widest animate-pulse">
        Adventuring...
      </span>
      <span style={{ fontSize: "11px" }} className="text-monster-text tabular-nums">
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

export default function GameUI() {
  const {
    monster, inventory, coins, anim, message, isLoading, showTrain,
    adventureResult, pendingEncounter, activeBattle,
    spawnMonster, useItem, deleteItem, buyItem, sellItem, pet, clean, train, toggleTrain,
    sleep, wake, adventure, dismissAdventureResult, runFromBattle, acceptBattle, completeBattle,
    rename, wipeAll,
  } = useGameState();
  const [showBag,      setShowBag]      = useState(false);
  const [showShop,     setShowShop]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [renaming,     setRenaming]     = useState(false);
  const [nameInput,    setNameInput]    = useState("");
  const [nameError,    setNameError]    = useState("");

  async function handleSignOut() {
    await createClient().auth.signOut();
  }

  function startRename() {
    if (!monster) return;
    setNameInput(monster.name);
    setNameError("");
    setRenaming(true);
  }

  function confirmRename() {
    if (!monster) return;
    const check = checkName(nameInput);
    if (!check.ok) { setNameError(check.reason!); return; }
    rename(nameInput.trim());
    setRenaming(false);
    setNameError("");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span style={{ fontSize: "8px" }} className="text-monster-muted uppercase animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  const settingsBtn = (
    <button
      onClick={() => setShowSettings(true)}
      style={{ fontSize: "6px" }}
      className="fixed bottom-16 right-4 px-3 py-2 border border-monster-border bg-monster-panel text-monster-muted hover:text-monster-text uppercase tracking-widest transition-colors"
    >
      [Settings]
    </button>
  );

  // ── no monster ────────────────────────────────────────────────────────────
  if (!monster) {
    return (
      <div className="flex flex-col items-center gap-8 py-16 px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 style={{ fontSize: "12px" }} className="text-monster-text uppercase tracking-widest leading-loose">
            New Game
          </h2>
          <p style={{ fontSize: "7px" }} className="text-monster-muted max-w-xs leading-loose">
            An egg will incubate before hatching. Abandoning restarts the timer.
          </p>
        </div>
        <button
          onClick={spawnMonster}
          style={{ fontSize: "8px" }}
          className="px-8 py-4 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
        >
          Place Egg
        </button>
      {settingsBtn}
      {showSettings && (
        <SettingsPanel
          hasMonster={false}
          onAbandon={spawnMonster}
          onWipeAll={wipeAll}
          onSignOut={handleSignOut}
          onClose={() => setShowSettings(false)}
        />
      )}
      </div>
    );
  }

  // ── egg hatching ──────────────────────────────────────────────────────────
  if (!monster.isHatched) {
    const progress = monster.hatchTime > monster.birthday
      ? Math.min(1, (Date.now() - monster.birthday) / (monster.hatchTime - monster.birthday))
      : 0;
    const stage =
      progress < 0.50 ? "Resting quietly..."
      : progress < 0.70 ? "Something stirs..."
      : progress < 0.90 ? "The egg is cracking!"
      : "About to burst!";

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 style={{ fontSize: "9px" }} className="text-monster-text uppercase tracking-widest">
            Egg Incubating
          </h2>
          <p style={{ fontSize: "7px" }} className="text-monster-muted">{stage}</p>
        </div>

        <MonsterCanvas monster={monster} anim="idle" />

        <div className="flex flex-col items-center gap-2">
          <p style={{ fontSize: "6px" }} className="text-monster-muted uppercase tracking-widest">Hatches in</p>
          <EggCountdown hatchTime={monster.hatchTime} />
        </div>

        <div className="w-full h-2 bg-monster-border overflow-hidden">
          <div
            className="h-full bg-monster-text transition-all duration-1000"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

      {settingsBtn}
      {showSettings && (
        <SettingsPanel
          hasMonster={true}
          onAbandon={spawnMonster}
          onWipeAll={wipeAll}
          onSignOut={handleSignOut}
          onClose={() => setShowSettings(false)}
        />
      )}
      </div>
    );
  }

  // ── active monster ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {renaming ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => { setNameInput(e.target.value); setNameError(""); }}
                  onKeyDown={e => {
                    if (e.key === "Enter") confirmRename();
                    if (e.key === "Escape") { setRenaming(false); setNameError(""); }
                  }}
                  maxLength={20}
                  style={{ fontSize: "10px" }}
                  className="bg-monster-panel border border-monster-border text-monster-text uppercase tracking-wide px-2 py-0.5 w-36 outline-none focus:border-monster-text"
                />
                <button onClick={confirmRename} style={{ fontSize: "10px" }} className="text-monster-text hover:text-white transition-colors">✓</button>
                <button onClick={() => { setRenaming(false); setNameError(""); }} style={{ fontSize: "10px" }} className="text-monster-muted hover:text-monster-text transition-colors">✗</button>
              </div>
              {nameError && <p style={{ fontSize: "6px" }} className="text-red-400">{nameError}</p>}
            </div>
          ) : (
            <h2
              style={{ fontSize: "10px" }}
              className={`text-monster-text uppercase tracking-wide ${!monster.isDead ? "cursor-pointer hover:opacity-70 transition-opacity" : ""}`}
              onClick={() => !monster.isDead && startRename()}
              title={!monster.isDead ? (monster.hasBeenRenamed ? "Rename (requires Name Change item)" : "Click to rename (free)") : undefined}
            >
              {monster.name}
            </h2>
          )}
          <p style={{ fontSize: "6px" }} className="text-monster-muted">
            Day {monster.age}
          </p>
        </div>
        <div className="flex items-center gap-2 border border-monster-border px-3 py-1.5">
          <span style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide">Coins</span>
          <span style={{ fontSize: "9px" }} className="font-bold text-monster-text tabular-nums">{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 justify-center">
        <div className="w-full lg:w-56 shrink-0">
          <StatsPanel monster={monster} />
        </div>

        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="relative">
            <MonsterCanvas monster={monster} anim={anim} />

            {/* Level + status overlay — top of the canvas window */}
            <div className="absolute top-0 left-0 right-0 flex flex-col items-center gap-1 pt-2 pointer-events-none">
              <span style={{ fontSize: "6px" }} className="text-monster-muted uppercase tracking-widest">
                Lv.{monster.rpg.level}
              </span>
              {(monster.isSick || monster.isInjured || monster.care.hunger <= 20 || monster.care.happiness <= 20 || monster.poops.length >= 3) && (
                <div style={{ fontSize: "6px" }} className="flex gap-2 text-monster-muted uppercase tracking-widest">
                  {monster.isSick                && <span className="animate-pulse">! Sick</span>}
                  {monster.isInjured             && <span className="animate-pulse cursor-help" title="Use a First Aid Kit or keep your monster at full HP for 30 minutes to recover.">! Injured</span>}
                  {monster.care.hunger <= 20     && <span className="animate-pulse">! Hungry</span>}
                  {monster.care.happiness <= 20  && <span className="animate-pulse">! Sad</span>}
                  {monster.poops.length >= 3     && <span className="animate-pulse">! Dirty</span>}
                </div>
              )}
            </div>

            {monster.isSleeping && <SleepOverlay />}
            {monster.isAdventuring && monster.adventureStart !== null && (
              <AdventureOverlay adventureStart={monster.adventureStart} />
            )}
          </div>
          {monster.poops.length > 0 && (
            <p style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide">
              {"[*]".repeat(monster.poops.length)} Needs cleaning
            </p>
          )}
        </div>

        <div className="w-full lg:w-56 shrink-0 lg:block hidden" />
      </div>

      <ActionPanel
        monster={monster}
        onBag={() => setShowBag(true)}
        onShop={() => setShowShop(true)}
        onPet={pet}
        onClean={clean}
        onTrain={toggleTrain}
        onSleep={sleep}
        onWake={wake}
        onAdventure={adventure}
        message={message}
      />

      {showTrain && (
        <TrainingModal monster={monster} onTrain={train} onClose={toggleTrain} />
      )}

      {monster.isDead && (
        <DeathScreen monster={monster} onReset={spawnMonster} onSettings={() => setShowSettings(true)} />
      )}

      {showShop && (
        <ShopPanel
          coins={coins}
          hasBeenRenamed={monster.hasBeenRenamed}
          inventory={inventory}
          onBuy={buyItem}
          onSell={sellItem}
          onClose={() => setShowShop(false)}
        />
      )}

      {showBag && (
        <BagView
          inventory={inventory}
          monster={monster}
          message={message}
          onUse={useItem}
          onDelete={deleteItem}
          onClose={() => setShowBag(false)}
        />
      )}

      {adventureResult && (
        <AdventureResultModal result={adventureResult} onClose={dismissAdventureResult} />
      )}

      {pendingEncounter && (
        <WildBattleEncounter
          encounter={pendingEncounter}
          playerName={monster.name}
          isInjured={monster.isInjured}
          inventory={inventory}
          onRun={runFromBattle}
          onAccept={acceptBattle}
        />
      )}

      {activeBattle && (
        <BattleView
          encounter={activeBattle}
          playerMonster={monster}
          onComplete={completeBattle}
        />
      )}

      {settingsBtn}

      {showSettings && (
        <SettingsPanel
          hasMonster={!monster.isDead}
          onAbandon={spawnMonster}
          onWipeAll={wipeAll}
          onSignOut={handleSignOut}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
