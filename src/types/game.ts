export type TrainingType = "pushups" | "situps" | "sprint" | "endurance" | "weights";

export interface RPGStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  agi: number;
  spd: number;
  str: number;  // strength  — each pt adds STR_HP_MULTIPLIER to maxHp
  end: number;  // endurance — each 5 pts adds 1 to max energy
  level: number;
  exp: number;
  expToNext: number;
}

export interface CareStats {
  hunger: number;      // 0–100
  happiness: number;  // 0–100
  cleanliness: number; // 0–100
  energy: number;     // 0–maxEnergy (5 + floor(end/5))
}

export interface Poop {
  id: string;
  x: number; // canvas-fraction 0–1
  y: number;
}

export interface Monster {
  id: string;
  name: string;
  seed: number;        // used by monsterGenerator.ts to draw this monster's unique appearance
  rpg: RPGStats;
  care: CareStats;
  age: number;         // real calendar days elapsed since birthday
  birthday: number;    // unix ms
  lastUpdated: number; // unix ms — used by applyDecay to calculate how much time has passed

  trainingsToday: number;   // increments each time the player trains; resets every in-game day (24 real min)
  lastTrainingDay: number;  // the in-game day index when trainingsToday was last reset

  mealsPending: number;        // meals eaten that haven't digested into a poop yet
  nextPoopTime: number | null; // unix ms when the next pending meal will produce a poop; null if no meals pending
  poops: Poop[];               // list of active poops currently on screen

  isShiny: boolean;       // cosmetic-only; MonsterCanvas tints the sprite differently — no stat effect
  hasBeenRenamed: boolean; // first rename is free; subsequent renames require a Name Change item

  isDead: boolean;
  deathTime?: number;

  // Timer: if hunger stays at 0 for NEGLECT_DEATH_MS (22h), the monster dies.
  neglectStart: number | null;          // timestamp when hunger first hit 0; null when hunger > 0

  // Timer: if happiness stays at 0 for SADNESS_DEATH_MS (12h), the monster dies.
  sadStart: number | null;              // timestamp when happiness first hit 0; null when happiness > 0

  isSick: boolean;           // pauses HP regen; causes extra happiness drain; cured by vaccine item
  sickStart: number | null;  // timestamp when sickness began; used to track how long they've been sick

  // Timer: if 3+ poops accumulate for SICK_FROM_POOP_MS (15 min), the monster gets sick.
  dirtyStart: number | null; // timestamp when 3+ poops were first present; null if fewer than 3 poops

  lastPetTime: number | null; // unix ms of last pet action; enforces PET_COOLDOWN_MS between pets

  isAdventuring: boolean;
  adventureStart: number | null;      // unix ms when the adventure began; also used as the RNG seed for outcome
  adventureDuration: number | null;   // randomized ms duration set when starting the adventure (5–25 seconds)

  isAtSpa:  boolean;
  spaStart: number | null;  // unix ms when the spa visit began

  isSleeping: boolean;    // while sleeping: happiness/cleanliness don't decay, digestion is paused

  isInjured: boolean;
  // Timer: injury clears automatically after holding full HP for INJURY_HEAL_MS (30 min).
  injuredHealStart: number | null;  // timestamp when the monster first reached full HP while injured; null otherwise

  // Egg hatching
  isHatched: boolean;
  hatchTime: number;      // unix ms when the egg becomes a monster; checked in applyDecay on every tick
}

export interface TrainingExercise {
  id: TrainingType;
  name: string;
  description: string;
  statLabel: string;
  energyCost: number;
  hungerCost: number;
  statGain: number;
  expPct: number;     // fixed exp gain as fraction of expToNext (0 = no exp)
}

export type AnimationState =
  | "idle"
  | "eating"
  | "training"
  | "happy"
  | "cleaning"
  | "dead";
