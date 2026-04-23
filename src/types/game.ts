export type TrainingType = "pushups" | "situps" | "sprint" | "endurance";

export interface RPGStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  agi: number;
  spd: number;
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
  seed: number;
  rpg: RPGStats;
  care: CareStats;
  age: number;            // in-game days elapsed
  birthday: number;       // unix ms
  lastUpdated: number;    // unix ms — for offline decay
  trainingsToday: number;
  lastTrainingDay: number; // in-game day index
  mealsPending: number;          // meals eaten that haven't produced a poop yet
  nextPoopTime: number | null;   // unix ms when the next digested poop appears
  poops: Poop[];
  isShiny: boolean;
  hasBeenRenamed: boolean;
  isDead: boolean;
  deathTime?: number;
  neglectStart: number | null;
  sadStart: number | null;
  lastHungerEnergyDrain: number | null;
  isSick: boolean;
  sickStart: number | null;
  dirtyStart: number | null;
  lastPetTime: number | null;
  isAdventuring: boolean;
  adventureStart: number | null;
  isSleeping: boolean;
  isInjured: boolean;
  injuredHealStart: number | null;  // when full HP while injured — clears injury after 30 min
  // Egg hatching
  isHatched: boolean;
  hatchTime: number;      // unix ms when the egg hatches
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
