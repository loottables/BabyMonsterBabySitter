"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Monster, TrainingType, AnimationState } from "@/types/game";
import {
  createMonster,
  loadMonster,
  saveMonster,
  clearMonster,
  feedMonster,
  cleanPoop,
  trainMonster,
  applyDecay,
} from "@/lib/gameEngine";

// ── state shape ────────────────────────────────────────────────────────────

interface State {
  monster:   Monster | null;
  anim:      AnimationState;
  message:   string;
  isLoading: boolean;
  showTrain: boolean;
}

// ── actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: "LOAD";        monster: Monster | null }
  | { type: "NEW_MONSTER"; monster: Monster }
  | { type: "TICK" }
  | { type: "FEED" }
  | { type: "CLEAN" }
  | { type: "TRAIN";       exercise: TrainingType }
  | { type: "TOGGLE_TRAIN_MODAL" }
  | { type: "RESET" }
  | { type: "SET_ANIM";    anim: AnimationState }
  | { type: "SET_MSG";     message: string };

// ── reducer ────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return { ...state, monster: action.monster, isLoading: false };

    case "NEW_MONSTER":
      return { ...state, monster: action.monster, anim: "idle", message: "" };

    case "TICK": {
      if (!state.monster || state.monster.isDead) return state;
      const m = applyDecay(state.monster, Date.now());
      return {
        ...state,
        monster: m,
        anim: m.isDead ? "dead" : state.anim,
      };
    }

    case "FEED": {
      if (!state.monster) return state;
      const result = feedMonster(state.monster);
      if (!result.ok) return { ...state, message: result.message };
      return {
        ...state,
        monster: result.monster,
        anim:    "eating",
        message: result.message,
      };
    }

    case "CLEAN": {
      if (!state.monster) return state;
      const result = cleanPoop(state.monster);
      if (!result.ok) return { ...state, message: result.message };
      return {
        ...state,
        monster: result.monster,
        anim:    "cleaning",
        message: result.message,
      };
    }

    case "TRAIN": {
      if (!state.monster) return state;
      const result = trainMonster(state.monster, action.exercise);
      if (!result.ok) return { ...state, message: result.message, showTrain: false };
      return {
        ...state,
        monster:   result.monster,
        anim:      "training",
        message:   result.message,
        showTrain: false,
      };
    }

    case "TOGGLE_TRAIN_MODAL":
      return { ...state, showTrain: !state.showTrain };

    case "RESET": {
      clearMonster();
      return { ...state, monster: null, anim: "idle", message: "", showTrain: false };
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
  monster:   null,
  anim:      "idle",
  message:   "",
  isLoading: true,
  showTrain: false,
};

// ── hook ───────────────────────────────────────────────────────────────────

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const animTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: load from localStorage
  useEffect(() => {
    const m = loadMonster();
    dispatch({ type: "LOAD", monster: m });
  }, []);

  // Persist whenever monster changes
  useEffect(() => {
    if (state.monster) saveMonster(state.monster);
  }, [state.monster]);

  // 1-second tick for decay
  const monsterId   = state.monster?.id;
  const monsterDead = state.monster?.isDead;
  useEffect(() => {
    if (!monsterId || monsterDead) return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [monsterId, monsterDead]);

  // Auto-reset animation back to idle after action finishes
  useEffect(() => {
    if (state.anim === "idle" || state.anim === "dead") return;
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    const duration = state.anim === "eating" ? 1200
                   : state.anim === "training" ? 1500
                   : 800;
    animTimerRef.current = setTimeout(() => {
      dispatch({ type: "SET_ANIM", anim: "idle" });
    }, duration);
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [state.anim]);

  // Auto-clear message after 3 s
  useEffect(() => {
    if (!state.message) return;
    const id = setTimeout(() => dispatch({ type: "SET_MSG", message: "" }), 3000);
    return () => clearTimeout(id);
  }, [state.message]);

  // ── public actions ─────────────────────────────────────────────────────

  const spawnMonster = useCallback(() => {
    const m = createMonster();
    saveMonster(m);
    dispatch({ type: "NEW_MONSTER", monster: m });
  }, []);

  const feed           = useCallback(() => dispatch({ type: "FEED" }),  []);
  const clean          = useCallback(() => dispatch({ type: "CLEAN" }), []);
  const train          = useCallback(
    (ex: TrainingType) => dispatch({ type: "TRAIN", exercise: ex }),
    []
  );
  const toggleTrain    = useCallback(() => dispatch({ type: "TOGGLE_TRAIN_MODAL" }), []);
  const reset          = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    monster:    state.monster,
    anim:       state.anim,
    message:    state.message,
    isLoading:  state.isLoading,
    showTrain:  state.showTrain,
    spawnMonster,
    feed,
    clean,
    train,
    toggleTrain,
    reset,
  };
}
