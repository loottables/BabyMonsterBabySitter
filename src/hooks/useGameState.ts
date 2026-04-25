"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Monster, TrainingType, AnimationState } from "@/types/game";
import type { Inventory, ItemId } from "@/types/items";
import {
  createMonster, migrateMonster,
  cleanPoop, trainMonster, petMonster, applyDecay, applyItem,
  grantExp, startAdventure as doStartAdventure,
  sleepMonster as doSleep, wakeMonster as doWake,
  enterSpa as doEnterSpa, completeSpa,
  type LevelUpData,
} from "@/lib/gameEngine";
import { resolveAdventure, type AdventureResultData } from "@/lib/adventureEngine";
import type { WildMonster, BattleResult } from "@/lib/battleEngine";
import {
  consumeSlot, deleteSlot, createDefaultInventory, addToInventory,
} from "@/lib/inventory";
import { ITEM_DEFS } from "@/types/items";
import { STARTING_COINS, ADVENTURE_DURATION_MS, AUTOSLEEP_INACTIVE_MS, AUTOSLEEP_HOUR, SPA_COST, SPA_DURATION_MS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

// ── state ──────────────────────────────────────────────────────────────────

export interface PendingEncounter {
  wildMonster:  WildMonster;
  battleResult: BattleResult;
  location:     string;
}

interface State {
  monster:          Monster | null;
  inventory:        Inventory;
  coins:            number;
  anim:             AnimationState;
  message:          string;
  isLoading:        boolean;
  showTrain:        boolean;
  showSpa:          boolean;
  adventureResult:  AdventureResultData | null;
  levelUpData:      LevelUpData | null;
  // pendingEncounter: the "fight or flee" decision screen (WildBattleEncounter.tsx)
  pendingEncounter: PendingEncounter | null;
  // activeBattle: the actual animated battle in progress (BattleView.tsx);
  // set when the player chooses to fight, cleared when the battle ends
  activeBattle:     PendingEncounter | null;
}

// ── actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOAD";                   monster: Monster | null; inventory: Inventory; coins: number; pendingEncounter: PendingEncounter | null }
  | { type: "NEW_MONSTER";            monster: Monster }
  | { type: "TICK"; isActive: boolean; autoSleep: boolean }
  | { type: "USE_ITEM";               slotIndex: number }
  | { type: "DELETE_ITEM";            slotIndex: number }
  | { type: "BUY_ITEM";               itemId: ItemId; price: number }
  | { type: "RENAME";                 name: string }
  | { type: "PET" }
  | { type: "CLEAN" }
  | { type: "TRAIN";                  exercise: TrainingType }
  | { type: "TOGGLE_TRAIN_MODAL" }
  | { type: "TOGGLE_SPA_PANEL" }
  | { type: "ENTER_SPA";  monster: Monster }
  | { type: "START_ADVENTURE"; monster: Monster; message: string }
  | { type: "DISMISS_ADVENTURE_RESULT" }
  | { type: "DISMISS_LEVEL_UP" }
  | { type: "RUN_FROM_BATTLE" }
  | { type: "ACCEPT_BATTLE";    useFirstAidKit: boolean }
  | { type: "COMPLETE_BATTLE" }
  | { type: "SELL_ITEM";              slotIndex: number }
  | { type: "SLEEP"; monster: Monster; message: string }
  | { type: "WAKE";  monster: Monster; message: string }
  | { type: "RESET" }
  | { type: "WIPE_ALL" }
  | { type: "SET_ANIM";               anim: AnimationState }
  | { type: "SET_MSG";                message: string };

// ── adventure resolution ───────────────────────────────────────────────────

// Called when the adventure timer finishes (in both LOAD and TICK cases).
// Hands off to resolveAdventure which uses adventureStart as the RNG seed,
// then either routes to the encounter screen (wild battle) or applies rewards directly.
function applyAdventureResult(state: State, monster: Monster): State {
  const seed    = monster.adventureStart!;
  const outcome = resolveAdventure(monster.name, seed, monster.rpg.level, monster.rpg);

  const m = { ...monster, isAdventuring: false, adventureStart: null };

  // Wild battle: defer to the encounter screen
  if (outcome.wildBattle) {
    return {
      ...state,
      monster: m,
      pendingEncounter: {
        wildMonster:  outcome.wildBattle.wildMonster,
        battleResult: outcome.wildBattle.battleResult,
        location:     outcome.wildBattle.location,
      },
    };
  }

  const { monster: rewarded, levelUpData } = grantExp(m, outcome.expGained);
  let inv = state.inventory;
  let itemObtained = false;
  if (outcome.itemFound) {
    const newInv = addToInventory(inv, outcome.itemFound);
    if (newInv) { inv = newInv; itemObtained = true; }
  }

  const result: AdventureResultData = { ...outcome, itemObtained };
  return { ...state, monster: rewarded, inventory: inv, coins: state.coins + outcome.coinsFound, adventureResult: result, levelUpData: levelUpData ?? state.levelUpData, anim: "happy" };
}

// ── reducer ────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD": {
      let m = action.monster;
      let s: State = { ...state, monster: m, inventory: action.inventory, coins: action.coins, pendingEncounter: action.pendingEncounter, isLoading: false };
      if (m) {
        if (m.isAdventuring && m.adventureStart !== null) {
          const dur = m.adventureDuration ?? ADVENTURE_DURATION_MS;
          if (Date.now() - m.adventureStart >= dur) s = applyAdventureResult({ ...s, monster: m }, m);
        }
        m = s.monster!;
        if (m.isAtSpa && m.spaStart !== null && Date.now() - m.spaStart >= SPA_DURATION_MS) {
          const done = completeSpa(m);
          s = { ...s, monster: done, anim: "happy", message: `${done.name} feels refreshed!` };
        }
      }
      return s;
    }

    case "NEW_MONSTER":
      return { ...state, monster: action.monster, anim: "idle", message: "" };

    case "TICK": {
      if (!state.monster || state.monster.isDead) return state;
      let m = applyDecay(state.monster, Date.now(), action.isActive);

      // Auto-sleep: player inactive 15+ min and local time is 8 PM or later
      if (action.autoSleep && !m.isSleeping && !m.isAdventuring && !m.isAtSpa && m.isHatched && !m.isDead) {
        m = { ...m, isSleeping: true };
      }

      // Adventure completion check
      if (m.isAdventuring && m.adventureStart !== null) {
        const dur = m.adventureDuration ?? ADVENTURE_DURATION_MS;
        if (Date.now() - m.adventureStart >= dur) {
          return applyAdventureResult(state, m);
        }
      }

      // Spa completion check
      if (m.isAtSpa && m.spaStart !== null && Date.now() - m.spaStart >= SPA_DURATION_MS) {
        const done = completeSpa(m);
        return { ...state, monster: done, anim: "happy", message: `${done.name} feels refreshed!` };
      }

      return { ...state, monster: m, anim: m.isDead ? "dead" : state.anim };
    }

    case "USE_ITEM": {
      if (!state.monster) return { ...state, message: "No monster!" };
      const result = consumeSlot(state.inventory, action.slotIndex);
      if (!result) return state;
      const itemResult = applyItem(state.monster, result.itemId);
      if (!itemResult.ok) return { ...state, message: itemResult.message };
      const anim = result.itemId === "kibble" ? "eating" : "happy";
      return {
        ...state,
        monster:   itemResult.monster,
        inventory: result.inv,
        anim,
        message:   itemResult.message,
      };
    }

    case "BUY_ITEM": {
      if (state.coins < action.price) return { ...state, message: "Not enough coins!" };
      const inv = addToInventory(state.inventory, action.itemId);
      if (!inv) return { ...state, message: "Bag is full!" };
      return { ...state, inventory: inv, coins: state.coins - action.price };
    }

    case "RENAME": {
      if (!state.monster) return state;
      if (!state.monster.hasBeenRenamed) {
        // First rename is free
        const m = { ...state.monster, name: action.name, hasBeenRenamed: true };
        return { ...state, monster: m, message: `Renamed to ${action.name}!` };
      }
      // Subsequent renames consume a name_change item
      const slotIdx = state.inventory.findIndex(s => s?.itemId === "name_change");
      if (slotIdx === -1) return { ...state, message: "You need a Name Change item from the shop!" };
      const result = consumeSlot(state.inventory, slotIdx);
      if (!result) return state;
      const m = { ...state.monster, name: action.name };
      return { ...state, monster: m, inventory: result.inv, message: `Renamed to ${action.name}!` };
    }

    case "DELETE_ITEM": {
      const inv = deleteSlot(state.inventory, action.slotIndex);
      return { ...state, inventory: inv };
    }

    case "PET": {
      if (!state.monster) return state;
      const result = petMonster(state.monster);
      if (!result.ok) return { ...state, message: result.message };
      return { ...state, monster: result.monster, anim: "happy", message: result.message };
    }

    case "CLEAN": {
      if (!state.monster) return state;
      const result = cleanPoop(state.monster);
      if (!result.ok) return { ...state, message: result.message };
      return { ...state, monster: result.monster, anim: "cleaning", message: result.message };
    }

    case "TRAIN": {
      if (!state.monster) return state;
      const result = trainMonster(state.monster, action.exercise);
      if (!result.ok) return { ...state, message: result.message, showTrain: false };
      return { ...state, monster: result.monster, anim: "training", message: result.message, showTrain: false, levelUpData: result.levelUpData ?? state.levelUpData };
    }

    case "TOGGLE_TRAIN_MODAL":
      return { ...state, showTrain: !state.showTrain };

    case "TOGGLE_SPA_PANEL":
      return { ...state, showSpa: !state.showSpa };

    case "ENTER_SPA":
      return { ...state, monster: action.monster, coins: state.coins - SPA_COST, showSpa: false, message: action.monster.name + " heads to the spa!" };

    case "START_ADVENTURE":
      return { ...state, monster: action.monster, message: action.message };

    case "DISMISS_ADVENTURE_RESULT":
      return { ...state, adventureResult: null };

    case "DISMISS_LEVEL_UP":
      return { ...state, levelUpData: null };

    case "RUN_FROM_BATTLE":
      return { ...state, pendingEncounter: null, message: "You ran away safely." };

    case "ACCEPT_BATTLE": {
      if (!state.pendingEncounter) return state;
      let m = state.monster!;
      let inv = state.inventory;
      if (action.useFirstAidKit) {
        const slotIdx = inv.findIndex(s => s?.itemId === "first_aid_kit");
        const result  = consumeSlot(inv, slotIdx);
        if (result) { inv = result.inv; }
        m = { ...m, isInjured: false };
      }
      return {
        ...state,
        monster:         m,
        inventory:       inv,
        pendingEncounter: null,
        activeBattle:    state.pendingEncounter,
      };
    }

    case "COMPLETE_BATTLE": {
      if (!state.activeBattle || !state.monster) return state;
      const { battleResult } = state.activeBattle;
      let m = { ...state.monster, rpg: { ...state.monster.rpg, hp: battleResult.finalPlayerHp } };
      let levelUpData = state.levelUpData;
      if (battleResult.winner === "player") {
        const granted = grantExp(m, battleResult.expGained);
        m = granted.monster;
        levelUpData = granted.levelUpData ?? levelUpData;
      } else {
        m = { ...m, rpg: { ...m.rpg, hp: 1 }, isInjured: true };
      }
      return {
        ...state,
        monster:      m,
        coins:        state.coins + (battleResult.winner === "player" ? battleResult.coinsGained : 0),
        activeBattle: null,
        levelUpData,
      };
    }

    case "SELL_ITEM": {
      const slot = state.inventory[action.slotIndex];
      if (!slot) return state;
      const sellPrice = Math.floor(ITEM_DEFS[slot.itemId].price / 2);
      const inv = deleteSlot(state.inventory, action.slotIndex);
      return { ...state, inventory: inv, coins: state.coins + sellPrice };
    }

    case "SLEEP":
      return { ...state, monster: action.monster, message: action.message };

    case "WAKE":
      return { ...state, monster: action.monster, anim: "happy", message: action.message };

    case "RESET": {
      return { ...state, monster: null, anim: "idle", message: "", showTrain: false };
    }

    case "WIPE_ALL": {
      const freshInv = createDefaultInventory();
      return { ...state, monster: null, inventory: freshInv, coins: STARTING_COINS, anim: "idle", message: "", showTrain: false };
    }

    case "SET_ANIM":
      return { ...state, anim: action.anim };

    case "SET_MSG":
      return { ...state, message: action.message };

    default:
      return state;
  }
}

const INITIAL: State = {
  monster:          null,
  inventory:        Array(9).fill(null),
  coins:            STARTING_COINS,
  anim:             "idle",
  message:          "",
  isLoading:        true,
  showTrain:        false,
  showSpa:          false,
  adventureResult:  null,
  levelUpData:      null,
  pendingEncounter: null,
  activeBattle:     null,
};

// ── hook ───────────────────────────────────────────────────────────────────

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const animTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null); // tracks the running animation reset timer so it can be cancelled when a new action fires
  const saveTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null); // tracks the debounced Supabase save timer so it can be cancelled before a new one starts
  const lastActivityRef  = useRef(Date.now()); // updated on any user interaction; used for auto-sleep

  // stateRef always holds the latest state value. Needed because spawnMonster is async —
  // by the time the Supabase call completes, the React state closure would be stale.
  // The useEffect below keeps stateRef in sync on every render.
  const stateRef     = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Track user activity for auto-sleep. Resets on any interaction or when tab regains focus.
  useEffect(() => {
    const onActivity   = () => { lastActivityRef.current = Date.now(); };
    const onVisibility = () => { if (!document.hidden) lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove",   onActivity);
    window.addEventListener("keydown",     onActivity);
    window.addEventListener("click",       onActivity);
    window.addEventListener("touchstart",  onActivity);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("mousemove",  onActivity);
      window.removeEventListener("keydown",    onActivity);
      window.removeEventListener("click",      onActivity);
      window.removeEventListener("touchstart", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // On mount: load from Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("game_saves")
        .select("monster, inventory, coins, pending_encounter")
        .eq("user_id", user.id)
        .single();
      if (cancelled) return;
      const m   = data?.monster   ? migrateMonster(data.monster)   : null;
      const inv = data?.inventory ?? createDefaultInventory();
      const c   = data?.coins     ?? STARTING_COINS;
      const pe  = (data as { pending_encounter?: PendingEncounter | null })?.pending_encounter ?? null;
      dispatch({ type: "LOAD", monster: m, inventory: inv, coins: c, pendingEncounter: pe });
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced save to Supabase on any state change
  useEffect(() => {
    if (state.isLoading) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("game_saves").upsert(
        { user_id: user.id, monster: state.monster, inventory: state.inventory, coins: state.coins, pending_encounter: state.pendingEncounter },
        { onConflict: "user_id" }
      );
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state.monster, state.inventory, state.coins, state.pendingEncounter, state.isLoading]);

  // 1-second decay tick
  // monsterId and monsterDead are extracted so the interval only restarts when those
  // values actually change — not on every render (which would create a new interval each time).
  const monsterId   = state.monster?.id;
  const monsterDead = state.monster?.isDead;
  useEffect(() => {
    if (!monsterId || monsterDead) return;
    const id = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current >= AUTOSLEEP_INACTIVE_MS;
      const lateNight = new Date().getHours() >= AUTOSLEEP_HOUR;
      dispatch({ type: "TICK", isActive: !document.hidden, autoSleep: inactive && lateNight });
    }, 1000);
    return () => clearInterval(id);
  }, [monsterId, monsterDead]);

  // Auto-reset animation back to idle
  useEffect(() => {
    if (state.anim === "idle" || state.anim === "dead") return;
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    const duration = state.anim === "eating" ? 1200 : state.anim === "training" ? 1500 : 800;
    animTimerRef.current = setTimeout(() => dispatch({ type: "SET_ANIM", anim: "idle" }), duration);
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, [state.anim]);

  // Auto-clear message after 3 s
  useEffect(() => {
    if (!state.message) return;
    const id = setTimeout(() => dispatch({ type: "SET_MSG", message: "" }), 3000);
    return () => clearTimeout(id);
  }, [state.message]);

  // ── public actions ────────────────────────────────────────────────────────

  // Creates a new monster and saves it to Supabase immediately (bypassing the normal debounce).
  // The debounced save gets cancelled on component unmount, so if the user abandons and
  // refreshes fast the save would never fire. spawnMonster skips the debounce to avoid that.
  const spawnMonster = useCallback(async () => {
    const m = createMonster();
    dispatch({ type: "NEW_MONSTER", monster: m });
    // Clear any pending debounced save so it doesn't race with this immediate one
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("game_saves").upsert(
      { user_id: user.id, monster: m, inventory: stateRef.current.inventory, coins: stateRef.current.coins },
      { onConflict: "user_id" }
    );
  }, []);

  const useItem    = useCallback((i: number) => dispatch({ type: "USE_ITEM",    slotIndex: i }), []);
  const deleteItem = useCallback((i: number) => dispatch({ type: "DELETE_ITEM", slotIndex: i }), []);
  const buyItem    = useCallback((itemId: ItemId, price: number) => dispatch({ type: "BUY_ITEM", itemId, price }), []);
  const sellItem   = useCallback((i: number) => dispatch({ type: "SELL_ITEM",   slotIndex: i }), []);
  const rename     = useCallback((name: string) => dispatch({ type: "RENAME", name }), []);
  const pet        = useCallback(() => dispatch({ type: "PET" }), []);
  const clean      = useCallback(() => dispatch({ type: "CLEAN" }), []);
  const train      = useCallback((ex: TrainingType) => dispatch({ type: "TRAIN", exercise: ex }), []);
  const toggleTrain = useCallback(() => dispatch({ type: "TOGGLE_TRAIN_MODAL" }), []);
  const sleep = useCallback(async () => {
    const current = stateRef.current;
    if (!current.monster) return;
    const result = doSleep(current.monster);
    if (!result.ok) { dispatch({ type: "SET_MSG", message: result.message }); return; }
    dispatch({ type: "SLEEP", monster: result.monster, message: result.message });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("game_saves").upsert(
      { user_id: user.id, monster: result.monster, inventory: current.inventory, coins: current.coins },
      { onConflict: "user_id" }
    );
  }, []);

  const wake = useCallback(async () => {
    const current = stateRef.current;
    if (!current.monster) return;
    const result = doWake(current.monster);
    if (!result.ok) { dispatch({ type: "SET_MSG", message: result.message }); return; }
    dispatch({ type: "WAKE", monster: result.monster, message: result.message });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("game_saves").upsert(
      { user_id: user.id, monster: result.monster, inventory: current.inventory, coins: current.coins },
      { onConflict: "user_id" }
    );
  }, []);
  // Starts an adventure and immediately persists to Supabase (same bypass pattern as spawnMonster).
  // The debounced save gets cancelled on tab close, so without this the adventure state is lost
  // if the user navigates away right after sending their monster out.
  const adventure = useCallback(async () => {
    const current = stateRef.current;
    if (!current.monster) return;
    const result = doStartAdventure(current.monster);
    if (!result.ok) {
      dispatch({ type: "SET_MSG", message: result.message });
      return;
    }
    dispatch({ type: "START_ADVENTURE", monster: result.monster, message: result.message });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("game_saves").upsert(
      { user_id: user.id, monster: result.monster, inventory: current.inventory, coins: current.coins },
      { onConflict: "user_id" }
    );
  }, []);
  const toggleSpa = useCallback(() => dispatch({ type: "TOGGLE_SPA_PANEL" }), []);
  const visitSpa  = useCallback(async () => {
    const current = stateRef.current;
    if (!current.monster) return;
    if (current.coins < SPA_COST) { dispatch({ type: "SET_MSG", message: "Not enough coins!" }); return; }
    const result = doEnterSpa(current.monster);
    if (!result.ok) { dispatch({ type: "SET_MSG", message: result.message }); return; }
    dispatch({ type: "ENTER_SPA", monster: result.monster });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("game_saves").upsert(
      { user_id: user.id, monster: result.monster, inventory: current.inventory, coins: current.coins - SPA_COST, pending_encounter: current.pendingEncounter },
      { onConflict: "user_id" }
    );
  }, []);

  const dismissAdventureResult = useCallback(() => dispatch({ type: "DISMISS_ADVENTURE_RESULT" }), []);
  const dismissLevelUp         = useCallback(() => dispatch({ type: "DISMISS_LEVEL_UP" }),         []);
  const runFromBattle          = useCallback(() => dispatch({ type: "RUN_FROM_BATTLE" }), []);
  const acceptBattle           = useCallback((useFirstAidKit: boolean) => dispatch({ type: "ACCEPT_BATTLE", useFirstAidKit }), []);
  const completeBattle         = useCallback(() => dispatch({ type: "COMPLETE_BATTLE" }), []);
  const reset      = useCallback(() => dispatch({ type: "RESET" }), []);
  const wipeAll    = useCallback(() => dispatch({ type: "WIPE_ALL" }), []);

  return {
    monster:         state.monster,
    inventory:       state.inventory,
    coins:           state.coins,
    anim:            state.anim,
    message:         state.message,
    isLoading:       state.isLoading,
    showTrain:       state.showTrain,
    adventureResult: state.adventureResult,
    levelUpData:     state.levelUpData,
    spawnMonster,
    useItem,
    deleteItem,
    buyItem,
    sellItem,
    rename,
    pet,
    clean,
    train,
    toggleTrain,
    sleep,
    wake,
    adventure,
    dismissAdventureResult,
    dismissLevelUp,
    runFromBattle,
    acceptBattle,
    completeBattle,
    reset,
    wipeAll,
    pendingEncounter: state.pendingEncounter,
    activeBattle:     state.activeBattle,
    showSpa:          state.showSpa,
    toggleSpa,
    visitSpa,
  };
}
