import type { TrainingExercise } from "@/types/game";

// ── Egg hatch time ─────────────────────────────────────────────────────────
// Set to 0 for instant hatch (testing). Change to 10 * 60 * 1000 for production.
export const EGG_HATCH_MS = 0;

export const GAME_DAY_MS = 24 * 60 * 1000;    // 24 real minutes = 1 in-game day (1 min = 1 in-game hour)
export const POOP_INTERVAL_MS = GAME_DAY_MS;   // 1 poop per in-game day
export const MAX_POOPS = 4;
export const MAX_TRAININGS_PER_DAY = 4;

// Decay per real minute
export const HUNGER_DECAY_PER_MIN = 2;
export const HAPPINESS_DECAY_PER_MIN = 1.5;
export const CLEANLINESS_DECAY_PER_MIN = 0.3;
export const ENERGY_REGEN_PER_MIN = 1 / 30;  // +1 energy per 30 real minutes

// Each uncleaned poop drags happiness down (applied on tick)
export const POOP_HAPPINESS_DRAIN_PER_MIN = 0.5;

// Death timers
export const NEGLECT_DEATH_MS = 3 * 60 * 1000;    // 3 min at 0 hunger → death
export const SADNESS_DEATH_MS = 5 * 60 * 1000;    // 5 min at 0 happiness → death
export const HUNGER_ENERGY_DRAIN_MS = 5 * 60 * 1000; // drain 1 energy per 5 min while starving

// Feed / clean values
export const FEED_HUNGER_GAIN = 30;
export const FEED_HAPPINESS_GAIN = 5;
export const CLEAN_CLEANLINESS_GAIN = 25;
export const CLEAN_HAPPINESS_GAIN = 8;
export const POOP_FEED_CHANCE = 0.4;

// Levelling
export const BASE_EXP_TO_NEXT = 60;
export const EXP_SCALE = 1.4;

// Starter RPG stats (fallback / migration only — new monsters use randomStarterRpg)
export const STARTER_RPG = {
  hp: 20,
  maxHp: 20,
  atk: 5,
  def: 5,
  agi: 5,
  spd: 5,
  end: 5,
  level: 1,
  exp: 0,
  expToNext: BASE_EXP_TO_NEXT,
};

export const TRAINING_EXERCISES: TrainingExercise[] = [
  {
    id: "pushups",
    name: "Push-Ups",
    description: "Builds raw power",
    statLabel: "ATK +2",
    energyCost: 1,
    hungerCost: 10,
    statGain: 2,
    expGain: 15,
  },
  {
    id: "situps",
    name: "Sit-Ups",
    description: "Hardens the body",
    statLabel: "DEF +2",
    energyCost: 1,
    hungerCost: 10,
    statGain: 2,
    expGain: 15,
  },
  {
    id: "sprint",
    name: "Sprint",
    description: "Sharpens reflexes",
    statLabel: "AGI +2 / SPD +1",
    energyCost: 1,
    hungerCost: 15,
    statGain: 2,
    expGain: 15,
  },
  {
    id: "endurance",
    name: "Endurance Run",
    description: "Expands energy pool",
    statLabel: "END +1",
    energyCost: 1,
    hungerCost: 20,
    statGain: 1,
    expGain: 20,
  },
];
