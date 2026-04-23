"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Monster, TrainingType, AnimationState } from "@/types/game";
import type { Inventory, ItemId } from "@/types/items";
import {
  createMonster, loadMonster, saveMonster, clearMonster,
  cleanPoop, trainMonster, petMonster, applyDecay, applyItem,
  grantExp, startAdventure as doStartAdventure,
} from "@/lib/gameEngine";
import { resolveAdventure, type AdventureResultData } from "@/lib/adventureEngine";
import {
  loadInventory, saveInventory, consumeSlot, deleteSlot,
  clearInventory, createDefaultInventory, addToInventory,
} from "@/lib/inventory";
import { loadCoins, saveCoins, clearCoins } from "@/lib/coins";
import { STARTING_COINS, ADVENTURE_DURATION_MS } from "@/lib/constants";

// ── state ──────────────────────────────────────────────────────────────────

interface State {
  monster:         Monster | null;
  inventory:       Inventory;
  coins:           number;
  anim:            AnimationState;
  message:         string;
  isLoading:       boolean;
  showTrain:       boolean;
  adventureResult: AdventureResultData | null;
}

// ── actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOAD";                   monster: Monster | null; inventory: Inventory; coins: number }
  | { type: "NEW_MONSTER";            monster: Monster }
  | { type: "TICK" }
  | { type: "USE_ITEM";               slotIndex: number }
  | { type: "DELETE_ITEM";            slotIndex: number }
  | { type: "BUY_ITEM";               itemId: ItemId; price: number }
  | { type: "RENAME";                 name: string }
  | { type: "PET" }
  | { type: "CLEAN" }
  | { type: "TRAIN";                  exercise: TrainingType }
  | { type: "TOGGLE_TRAIN_MODAL" }
  | { type: "START_ADVENTURE" }
  | { type: "DISMISS_ADVENTURE_RESULT" }
  | { type: "RESET" }
  | { type: "WIPE_ALL" }
  | { type: "SET_ANIM";               anim: AnimationState }
  | { type: "SET_MSG";                message: string };

// ── adventure resolution ───────────────────────────────────────────────────

function applyAdventureResult(state: State, monster: Monster): State {
  const seed    = monster.adventureStart!;
  const outcome = resolveAdventure(monster.name, seed, monster.rpg.exp);

  let m = grantExp(monster, outcome.expGained);
  m = { ...m, isAdventuring: false, adventureStart: null };

  let inv = state.inventory;
  let itemObtained = false;
  if (outcome.itemFound) {
    const newInv = addToInventory(inv, outcome.itemFound);
    if (newInv) { inv = newInv; itemObtained = true; saveInventory(inv); }
  }

  const result: AdventureResultData = { ...outcome, itemObtained };
  return { ...state, monster: m, inventory: inv, coins: state.coins + outcome.coinsFound, adventureResult: result, anim: "happy" };
}

// ── reducer ────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD": {
      let s: State = { ...state, monster: action.monster, inventory: action.inventory, coins: action.coins, isLoading: false };
      const m = action.monster;
      if (m && m.isAdventuring && m.adventureStart !== null) {
        if (Date.now() - m.adventureStart >= ADVENTURE_DURATION_MS) {
          s = applyAdventureResult({ ...s, monster: m }, m);
        }
      }
      return s;
    }

    case "NEW_MONSTER":
      return { ...state, monster: action.monster, anim: "idle", message: "" };

    case "TICK": {
      if (!state.monster || state.monster.isDead) return state;
      let m = applyDecay(state.monster, Date.now());

      // Adventure completion check
      if (m.isAdventuring && m.adventureStart !== null) {
        if (Date.now() - m.adventureStart >= ADVENTURE_DURATION_MS) {
          return applyAdventureResult(state, m);
        }
      }

      return { ...state, monster: m, anim: m.isDead ? "dead" : state.anim };
    }

    case "USE_ITEM": {
      if (!state.monster) return { ...state, message: "No monster!" };
      const result = consumeSlot(state.inventory, action.slotIndex);
      if (!result) return state;
      const itemResult = applyItem(state.monster, result.itemId);
      if (!itemResult.ok) return { ...state, message: itemResult.message };
      saveInventory(result.inv);
      const anim = result.itemId === "kibble" ? "eating"
                 : result.itemId === "treat"   ? "happy"
                 : "happy";
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
      saveInventory(inv);
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
      saveInventory(result.inv);
      const m = { ...state.monster, name: action.name };
      return { ...state, monster: m, inventory: result.inv, message: `Renamed to ${action.name}!` };
    }

    case "DELETE_ITEM": {
      const inv = deleteSlot(state.inventory, action.slotIndex);
      saveInventory(inv);
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
      return { ...state, monster: result.monster, anim: "training", message: result.message, showTrain: false };
    }

    case "TOGGLE_TRAIN_MODAL":
      return { ...state, showTrain: !state.showTrain };

    case "START_ADVENTURE": {
      if (!state.monster) return state;
      const result = doStartAdventure(state.monster);
      if (!result.ok) return { ...state, message: result.message };
      return { ...state, monster: result.monster, message: result.message };
    }

    case "DISMISS_ADVENTURE_RESULT":
      return { ...state, adventureResult: null };

    case "RESET": {
      clearMonster();
      return { ...state, monster: null, anim: "idle", message: "", showTrain: false };
    }

    case "WIPE_ALL": {
      clearMonster();
      clearInventory();
      clearCoins();
      const freshInv = createDefaultInventory();
      saveInventory(freshInv);
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
  monster:         null,
  inventory:       Array(9).fill(null),
  coins:           STARTING_COINS,
  anim:            "idle",
  message:         "",
  isLoading:       true,
  showTrain:       false,
  adventureResult: null,
};

// ── hook ───────────────────────────────────────────────────────────────────

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const animTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: load monster + inventory + coins
  useEffect(() => {
    const m   = loadMonster();
    const inv = loadInventory();
    const c   = loadCoins();
    dispatch({ type: "LOAD", monster: m, inventory: inv, coins: c });
  }, []);

  // Persist monster whenever it changes
  useEffect(() => {
    if (state.monster) saveMonster(state.monster);
  }, [state.monster]);

  // Persist coins and broadcast to header display
  useEffect(() => {
    if (!state.isLoading) saveCoins(state.coins);
  }, [state.coins, state.isLoading]);

  // 1-second decay tick
  const monsterId   = state.monster?.id;
  const monsterDead = state.monster?.isDead;
  useEffect(() => {
    if (!monsterId || monsterDead) return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
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

  const spawnMonster = useCallback(() => {
    const m = createMonster();
    saveMonster(m);
    dispatch({ type: "NEW_MONSTER", monster: m });
  }, []);

  const useItem    = useCallback((i: number) => dispatch({ type: "USE_ITEM",    slotIndex: i }), []);
  const deleteItem = useCallback((i: number) => dispatch({ type: "DELETE_ITEM", slotIndex: i }), []);
  const buyItem    = useCallback((itemId: ItemId, price: number) => dispatch({ type: "BUY_ITEM", itemId, price }), []);
  const rename     = useCallback((name: string) => dispatch({ type: "RENAME", name }), []);
  const pet        = useCallback(() => dispatch({ type: "PET" }), []);
  const clean      = useCallback(() => dispatch({ type: "CLEAN" }), []);
  const train      = useCallback((ex: TrainingType) => dispatch({ type: "TRAIN", exercise: ex }), []);
  const toggleTrain = useCallback(() => dispatch({ type: "TOGGLE_TRAIN_MODAL" }), []);
  const adventure  = useCallback(() => dispatch({ type: "START_ADVENTURE" }), []);
  const dismissAdventureResult = useCallback(() => dispatch({ type: "DISMISS_ADVENTURE_RESULT" }), []);
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
    spawnMonster,
    useItem,
    deleteItem,
    buyItem,
    rename,
    pet,
    clean,
    train,
    toggleTrain,
    adventure,
    dismissAdventureResult,
    reset,
    wipeAll,
  };
}
