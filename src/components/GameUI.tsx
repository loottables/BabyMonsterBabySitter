"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import StatsPanel from "./StatsPanel";
import ActionPanel from "./ActionPanel";
import BagView from "./BagView";
import ShopPanel from "./ShopPanel";
import SettingsPanel from "./SettingsPanel";
import TrainingModal from "./TrainingModal";
import DeathScreen from "./DeathScreen";
import AdventureResultModal from "./AdventureResultModal";
import LevelUpModal from "./LevelUpModal";
import SpaPanel from "./SpaPanel";
import WildBattleEncounter from "./WildBattleEncounter";
import BattleView from "./BattleView";
import { useGameState } from "@/hooks/useGameState";
import { checkName } from "@/lib/nameFilter";
import { ADVENTURE_DURATION_MS, SPA_DURATION_MS } from "@/lib/constants";
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

// Pixel-art hand sprite — upright, palm facing viewer, thumb on right.
// Cols: 0-1 pinky | gap | 3-4 ring | gap | 6-7 middle | gap | 9-10 index | 11 thumb (palm only)
// Finger heights: middle tallest, ring+index mid, pinky shortest — gives natural stagger.
// "0" = transparent  "1" = main fill  "3" = darker detail (knuckles / crease)
const HAND_ROWS = [
  "000000130000",  // middle fingertip only (col 7 darker)
  "000000110000",
  "000130110130",  // ring (cols 3-4) + index (cols 9-10) tips, darker tip pixel
  "000110110110",
  "130110110110",  // pinky (cols 0-1) joins, darker tip
  "110110110110",
  "110110110110",
  "110110110110",
  "110110110110",
  "111111111110",  // fingers merge into upper palm
  "111133111110",  // palm crease detail
  "111111111111",  // thumb appears (col 11)
  "111111111111",
  "011111111111",
  "011111111110",  // thumb ends
  "001111111100",  // wrist
  "001111111100",
];
const HAND_PX      = 5;   // CSS px per grid pixel
const HAND_W       = 12;  // grid columns
const HAND_H       = 17;  // grid rows
const HAND_PAD     = 1;   // 1 grid pixel of padding so the outer outline has room
const C_FILL       = "rgb(175,175,175)";
const C_DETAIL     = "rgb(100,100,100)";
const C_OUTLINE    = "rgb(40,40,40)";

// 3 discrete positions, 2 passes — ~2/3 the travel distance of the original
const HAND_POSITIONS = [
  { left: "50%", top: "25%" },
  { left: "61%", top: "32%" },
  { left: "72%", top: "39%" },
] as const;
const HAND_STEP_MS   = 300; // ms per position
const HAND_STEPS     = HAND_POSITIONS.length * 2; // 2 passes

function PetHandOverlay() {
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const [alive, setAlive] = useState(true);
  const [step,  setStep]  = useState(0);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Pass 1 — outer outline
    ctx.fillStyle = C_OUTLINE;
    for (let row = 0; row < HAND_ROWS.length; row++) {
      for (let col = 0; col < HAND_ROWS[row].length; col++) {
        if (HAND_ROWS[row][col] === "0") continue;
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
          const nr = row + dr, nc = col + dc;
          if ((HAND_ROWS[nr]?.[nc] ?? "0") === "0") {
            ctx.fillRect((nc + HAND_PAD) * HAND_PX, (nr + HAND_PAD) * HAND_PX, HAND_PX, HAND_PX);
          }
        }
      }
    }

    // Pass 2 — fill
    for (let row = 0; row < HAND_ROWS.length; row++) {
      for (let col = 0; col < HAND_ROWS[row].length; col++) {
        const v = HAND_ROWS[row][col];
        if (v === "0") continue;
        ctx.fillStyle = v === "3" ? C_DETAIL : C_FILL;
        ctx.fillRect((col + HAND_PAD) * HAND_PX, (row + HAND_PAD) * HAND_PX, HAND_PX, HAND_PX);
      }
    }
  }, []);

  // Advance one step at a time — no interpolation, pure jump
  useEffect(() => {
    if (step >= HAND_STEPS - 1) return;
    const t = setTimeout(() => setStep(s => s + 1), HAND_STEP_MS);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const t = setTimeout(() => setAlive(false), HAND_STEP_MS * HAND_STEPS + 200);
    return () => clearTimeout(t);
  }, []);

  if (!alive) return null;

  const pos     = HAND_POSITIONS[step % HAND_POSITIONS.length];
  const canvasW = (HAND_W + 2 * HAND_PAD) * HAND_PX; // 70 px
  const canvasH = (HAND_H + 2 * HAND_PAD) * HAND_PX; // 95 px

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      className="absolute pointer-events-none select-none"
      style={{ imageRendering: "pixelated", transform: "translate(-50%, -50%)", zIndex: 10, left: pos.left, top: pos.top }}
    />
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

function SpaOverlay({ spaStart }: { spaStart: number }) {
  const end = spaStart + SPA_DURATION_MS;
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
        Visiting the Spa...
      </span>
      <span style={{ fontSize: "11px" }} className="text-monster-text tabular-nums">
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

function AdventureOverlay({ adventureStart, adventureDuration }: { adventureStart: number; adventureDuration: number | null }) {
  const end = adventureStart + (adventureDuration ?? ADVENTURE_DURATION_MS);
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
    monster, inventory, coins, anim, message, isLoading, showTrain, showSpa,
    adventureResult, levelUpData, pendingEncounter, activeBattle,
    spawnMonster, useItem, deleteItem, buyItem, sellItem, pet, clean, train, toggleTrain,
    sleep, wake, adventure, dismissAdventureResult, dismissLevelUp, runFromBattle, acceptBattle, completeBattle,
    rename, wipeAll, toggleSpa, visitSpa,
  } = useGameState();
  const [showBag,      setShowBag]      = useState(false);
  const [showShop,     setShowShop]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [renaming,     setRenaming]     = useState(false);
  const [nameInput,    setNameInput]    = useState("");
  const [nameError,    setNameError]    = useState("");
  const [petKey,       setPetKey]       = useState(0);
  const [username,     setUsername]     = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("username").eq("id", user.id).single()
        .then(({ data }) => { if (data?.username) setUsername(data.username); });
    });
  }, []);

  function handlePet() { pet(); setPetKey(k => k + 1); }

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
      <div className="grid grid-cols-3 items-center">
        <div className="flex flex-col gap-1">
          {username && (
            <p style={{ fontSize: "20px" }} className="text-monster-text uppercase tracking-wide leading-none">
              {username}
            </p>
          )}
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
        <div className="flex flex-col items-center gap-0.5">
          <span style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide">Coins</span>
          <span style={{ fontSize: "9px" }} className="font-bold text-monster-text tabular-nums">{coins.toLocaleString()}</span>
        </div>
        <div />
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 justify-center">
        <div className="w-full lg:w-56 shrink-0">
          <StatsPanel monster={monster} />
        </div>

        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="relative overflow-hidden">
            <MonsterCanvas monster={monster} anim={anim} />

            {/* Level + status overlay — top of the canvas window */}
            <div className="absolute top-0 left-0 right-0 flex flex-col items-center gap-1 pt-2 pointer-events-none">
              <span style={{ fontSize: "6px", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }} className="text-white uppercase tracking-widest">
                Lv.{monster.rpg.level}
              </span>
              {(monster.isSick || monster.isInjured || monster.care.hunger <= 20 || monster.care.happiness <= 20 || monster.poops.length >= 3) && (
                <div style={{ fontSize: "6px", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }} className="flex gap-2 text-white uppercase tracking-widest">
                  {monster.isSick                && <span className="animate-pulse">! Sick</span>}
                  {monster.isInjured             && <span className="animate-pulse cursor-help" title="Use a First Aid Kit or keep your monster at full HP for 30 minutes to recover.">! Injured</span>}
                  {monster.care.hunger <= 20     && <span className="animate-pulse">! Hungry</span>}
                  {monster.care.happiness <= 20  && <span className="animate-pulse">! Sad</span>}
                  {monster.poops.length >= 2     && <span className="animate-pulse">! Dirty</span>}
                </div>
              )}
            </div>

            {petKey > 0 && <PetHandOverlay key={petKey} />}
            {monster.isSleeping && <SleepOverlay />}
            {monster.isAtSpa && monster.spaStart !== null && (
              <SpaOverlay spaStart={monster.spaStart} />
            )}
            {monster.isAdventuring && monster.adventureStart !== null && (
              <AdventureOverlay adventureStart={monster.adventureStart} adventureDuration={monster.adventureDuration} />
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
        onSpa={toggleSpa}
        onPet={handlePet}
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

      {showSpa && (
        <SpaPanel
          coins={coins}
          monster={monster}
          onEnter={visitSpa}
          onClose={toggleSpa}
        />
      )}

      {adventureResult && (
        <AdventureResultModal result={adventureResult} onClose={dismissAdventureResult} />
      )}

      {levelUpData && (
        <LevelUpModal data={levelUpData} onClose={dismissLevelUp} />
      )}

      {pendingEncounter && (
        <WildBattleEncounter
          encounter={pendingEncounter}
          playerName={monster.name}
          playerRpg={monster.rpg}
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
