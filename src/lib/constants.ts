import type { TrainingExercise } from "@/types/game";

// ── Egg hatch time ─────────────────────────────────────────────────────────
// Set to 0 for instant hatch (testing). Change to 10 * 60 * 1000 for production.
export const EGG_HATCH_MS = 0;

export const SHINY_CHANCE    = 1 / 500;
export const STARTING_COINS  = 100;

export const GAME_DAY_MS = 24 * 60 * 1000;    // 24 real minutes = 1 in-game day (1 min = 1 in-game hour)
export const MAX_POOPS = 4;
export const MAX_TRAININGS_PER_DAY = 4;

// Digestion: each meal produces a poop after this delay
export const DIGESTION_MS = 10 * 60 * 1000;   // 10 real minutes after eating → poop

// Decay per real minute
export const HUNGER_DECAY_PER_MIN = 100 / 120; // empties in 2 real hours
export const HAPPINESS_DECAY_PER_MIN = 1.5;
export const CLEANLINESS_DECAY_PER_MIN = 0.3;
export const ENERGY_REGEN_PER_MIN  = 1 / 15;  // +1 energy per 15 real minutes
export const HP_REGEN_PCT_PER_MIN  = 0.02;    // 1% of maxHp per 30 s (= 2% per min); paused when sick or injured

// Each uncleaned poop drags happiness down (applied on tick)
export const POOP_HAPPINESS_DRAIN_PER_MIN = 0.5;

// Death timers — total time from full hunger to death = 2h + 22h = 24h
export const SICK_FROM_POOP_MS   = 15 * 60 * 1000;    // 15 min with 3+ poops → sick
export const SICK_FROM_HUNGER_MS = 30 * 60 * 1000;    // 30 min at 0 hunger → sick
export const SICK_HAPPINESS_DRAIN_PER_MIN    = 2.0;    // extra happiness drain while sick
export const INJURED_HAPPINESS_DRAIN_PER_MIN = 1.5;    // extra happiness drain while injured
export const NEGLECT_DEATH_MS = 22 * 60 * 60 * 1000;  // 22h at 0 hunger → death
export const SADNESS_DEATH_MS = 12 * 60 * 60 * 1000;  // 12h at 0 happiness → death
export const HUNGER_ENERGY_DRAIN_MS = 5 * 60 * 1000; // drain 1 energy per 5 min while starving

// Feed / clean values
export const ADVENTURE_DURATION_MS  = 5 * 1000; // TESTING: 5 seconds (production: 10 * 60 * 1000)

export const PET_HAPPINESS_GAIN = 10;
export const PET_COOLDOWN_MS    = 5 * 60 * 1000;  // 5 real minutes between pets

export const FEED_HUNGER_GAIN = 30;
export const FEED_HAPPINESS_GAIN = 5;
export const TREAT_HAPPINESS_GAIN = 40;
export const TREAT_HUNGER_GAIN = 5;
export const CLEAN_CLEANLINESS_GAIN = 25;
export const CLEAN_HAPPINESS_GAIN = 8;

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
    statLabel: "ATK +2 / EXP 1%",
    energyCost: 1,
    hungerCost: 10,
    statGain: 2,
    expPct: 0.01,
  },
  {
    id: "situps",
    name: "Sit-Ups",
    description: "Hardens the body",
    statLabel: "DEF +2 / EXP 1%",
    energyCost: 1,
    hungerCost: 10,
    statGain: 2,
    expPct: 0.01,
  },
  {
    id: "sprint",
    name: "Sprint",
    description: "Sharpens reflexes",
    statLabel: "AGI +2 / SPD +1 / EXP 1%",
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
