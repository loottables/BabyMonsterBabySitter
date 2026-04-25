import type { TrainingExercise } from "@/types/game";

// ── Egg ────────────────────────────────────────────────────────────────────
// Set to 0 for instant hatch during testing; use 10 * 60 * 1000 for production.
export const EGG_HATCH_MS = 5 * 1000;

export const SHINY_CHANCE   = 1 / 500;  // 0.2% chance — cosmetic only, no stat effect
export const STARTING_COINS = 100;      // coins a brand-new account begins with

// ── Time ───────────────────────────────────────────────────────────────────
// Used for training resets (max trainings per day resets every 24 real minutes)
export const GAME_DAY_MS = 24 * 60 * 1000;
// Used for the monster's displayed age (increments once per real calendar day)
export const REAL_DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_POOPS             = 4;  // display cap; sickness triggers at 2+ poops for 15 min
export const MAX_TRAININGS_PER_DAY = 4;  // resets each in-game day (every 24 real minutes)

// Digestion: each meal produces a poop after this delay
export const DIGESTION_MS = 10 * 60 * 1000;  // 10 real minutes after eating → poop

// ── Stat decay / regen (per real minute) ──────────────────────────────────
export const HUNGER_DECAY_PER_MIN             = 100 / 240; // empties in 4 real hours
export const HAPPINESS_DECAY_PER_MIN          = 100 / 120; // empties in 2 real hours (tab closed / offline)
export const HAPPINESS_DECAY_ACTIVE_PER_MIN   = 100 / 240; // empties in 4 real hours (tab open and visible)
export const CLEANLINESS_DECAY_PER_MIN = 0.3;         // empties in ~333 real minutes
export const ENERGY_REGEN_PER_MIN      = 1 / 15;     // +1 energy per 15 real minutes
export const HP_REGEN_PCT_PER_MIN      = 0.02;        // 2% of maxHp per minute; paused when sick or injured

// Each uncleaned poop drags happiness down (applied on tick)
export const POOP_HAPPINESS_DRAIN_PER_MIN = 0.5;

// ── Timers ─────────────────────────────────────────────────────────────────
export const SICK_FROM_POOP_MS   = 15 * 60 * 1000;  // 15 min with 3+ poops → sick
export const SICK_FROM_HUNGER_MS = 30 * 60 * 1000;  // 30 min at 0 hunger → sick
export const NEGLECT_DEATH_MS    = 22 * 60 * 60 * 1000;  // 22h at 0 hunger → death
export const SADNESS_DEATH_MS    = 12 * 60 * 60 * 1000;  // 12h at 0 happiness → death
// Full HP must be held for this long to clear the injured status
export const INJURY_HEAL_MS      = 30 * 60 * 1000;

export const SICK_HAPPINESS_DRAIN_PER_MIN    = 2.0;  // extra happiness drain while sick
export const INJURED_HAPPINESS_DRAIN_PER_MIN = 1.5;  // extra happiness drain while injured

// ── Actions ────────────────────────────────────────────────────────────────
export const ADVENTURE_DURATION_MS  = 15 * 1000;  // fallback for saves without adventureDuration
export const SPA_COST               = 100;
export const SPA_DURATION_MS        = 60 * 1000;  // 1 real minute
export const SPA_HAPPINESS_GAIN     = 20;
export const SPA_ENERGY_GAIN        = 1;
export const AUTOSLEEP_INACTIVE_MS  = 15 * 60 * 1000; // 15 min of inactivity → real-time auto-sleep
export const AUTOSLEEP_HOUR         = 20;              // 8 PM local time — monsters auto-sleep
export const AUTOSLEEP_WAKE_HOUR    = 8;               // 8 AM local time — monsters auto-wake

export const PET_HAPPINESS_GAIN = 10;
export const PET_COOLDOWN_MS    = 5 * 60 * 1000;  // 5 real minutes between pets

export const FEED_HUNGER_GAIN    = 30;
export const FEED_HAPPINESS_GAIN = 5;
export const TREAT_HAPPINESS_GAIN = 40;
export const TREAT_HUNGER_GAIN    = 5;
export const CLEAN_CLEANLINESS_GAIN = 25;
export const CLEAN_HAPPINESS_GAIN   = 8;

// ── Levelling ──────────────────────────────────────────────────────────────
export const BASE_EXP_TO_NEXT = 60;   // EXP required to reach level 2
export const EXP_SCALE        = 1.4;  // each level requires 1.4× more EXP than the last

// ── RPG stats ──────────────────────────────────────────────────────────────
export const STR_HP_MULTIPLIER = 3;  // each STR point adds 3 to maxHp

// Fallback / migration only — new monsters use randomStarterRpg()
export const STARTER_RPG = {
  hp: 20, maxHp: 20,
  atk: 5, def: 5, agi: 5, spd: 5, str: 5, end: 5,
  level: 1, exp: 0, expToNext: BASE_EXP_TO_NEXT,
};

// ── Training ───────────────────────────────────────────────────────────────
export const TRAINING_EXERCISES: TrainingExercise[] = [
  {
    id: "pushups",
    name: "Push-Ups",
    description: "Builds raw power",
    statLabel: "ATK +2 / EXP 1%",
    energyCost: 1,
    hungerCost: 7,
    statGain: 2,
    expPct: 0.01,
  },
  {
    id: "situps",
    name: "Sit-Ups",
    description: "Hardens the body",
    statLabel: "DEF +2 / EXP 1%",
    energyCost: 1,
    hungerCost: 7,
    statGain: 2,
    expPct: 0.01,
  },
  {
    id: "sprint",
    name: "Sprint",
    description: "Sharpens reflexes",
    statLabel: "AGI +2 / SPD +1 / EXP 1%",
    energyCost: 1,
    hungerCost: 13,
    statGain: 2,
    expPct: 0.01,
  },
  {
    id: "weights",
    name: "Weightlifting",
    description: "Builds raw mass and toughness",
    statLabel: "STR +2 / Max HP +6",
    energyCost: 1,
    hungerCost: 15,
    statGain: 2,
    expPct: 0.01,
  },
  {
    id: "endurance",
    name: "Endurance Run",
    description: "Expands energy pool",
    statLabel: "END +1",
    energyCost: 1,
    hungerCost: 20,
    statGain: 1,
    expPct: 0,
  },
];
