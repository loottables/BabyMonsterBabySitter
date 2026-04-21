import type { Monster, RPGStats, Poop, TrainingType } from "@/types/game";
import {
  GAME_DAY_MS,
  POOP_INTERVAL_MS,
  MAX_POOPS,
  HUNGER_DECAY_PER_MIN,
  HAPPINESS_DECAY_PER_MIN,
  CLEANLINESS_DECAY_PER_MIN,
  ENERGY_REGEN_PER_MIN,
  POOP_HAPPINESS_DRAIN_PER_MIN,
  NEGLECT_DEATH_MS,
  SADNESS_DEATH_MS,
  FEED_HUNGER_GAIN,
  FEED_HAPPINESS_GAIN,
  CLEAN_CLEANLINESS_GAIN,
  CLEAN_HAPPINESS_GAIN,
  POOP_FEED_CHANCE,
  BASE_EXP_TO_NEXT,
  EXP_SCALE,
  TRAINING_EXERCISES,
  EGG_HATCH_MS,
} from "./constants";

// ── helpers ────────────────────────────────────────────────────────────────

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const uid   = () => Math.random().toString(36).slice(2, 9);
const now   = () => Date.now();

function randomPoopPos(): Poop {
  // Place in lower portion of the display (y 0.6–0.9, x 0.1–0.9)
  return {
    id:  uid(),
    x: 0.1 + Math.random() * 0.8,
    y: 0.6 + Math.random() * 0.3,
  };
}

function levelUp(rpg: RPGStats): RPGStats {
  let r = { ...rpg };
  while (r.exp >= r.expToNext) {
    r.exp      -= r.expToNext;
    r.level    += 1;
    r.expToNext = Math.round(r.expToNext * EXP_SCALE);
    // Bonus stats on level up
    r.maxHp += 5;
    r.hp     = r.maxHp; // heal on level up
    r.atk   += 1;
    r.def   += 1;
    r.agi   += 1;
    r.spd   += 1;
  }
  return r;
}

// ── creation ───────────────────────────────────────────────────────────────

function randomStarterRpg(): RPGStats {
  // atk + def + agi + spd + end = 25, each ≥ 1
  // Broken-stick: 4 cut points over [0, 20] divide the bonus pool
  const pool = 20; // 25 total − 5 base (1 each)
  const cuts = [
    Math.floor(Math.random() * (pool + 1)),
    Math.floor(Math.random() * (pool + 1)),
    Math.floor(Math.random() * (pool + 1)),
    Math.floor(Math.random() * (pool + 1)),
  ].sort((a, b) => a - b);
  const maxHp = 18 + Math.floor(Math.random() * 8); // 18–25
  return {
    hp: maxHp, maxHp,
    atk: 1 + cuts[0],
    def: 1 + (cuts[1] - cuts[0]),
    agi: 1 + (cuts[2] - cuts[1]),
    spd: 1 + (cuts[3] - cuts[2]),
    end: 1 + (pool - cuts[3]),
    level: 1, exp: 0, expToNext: BASE_EXP_TO_NEXT,
  };
}

const MONSTER_NAMES = [
  "Glorp","Sniv","Blobby","Munch","Grumble","Fizzle","Lurk","Squig",
  "Vex","Nibble","Crunch","Wobble","Zap","Snarl","Pudge","Thorn",
  "Drizzle","Krak","Smudge","Fluff","Gnash","Burble","Ooze","Spike",
];

export function createMonster(): Monster {
  const t = now();
  const currentDay = Math.floor((t - t) / GAME_DAY_MS); // day 0
  return {
    id:              uid(),
    name:            MONSTER_NAMES[Math.floor(Math.random() * MONSTER_NAMES.length)],
    seed:            Math.floor(Math.random() * 2 ** 31),
    rpg:             randomStarterRpg(),
    care: {
      hunger:       80,
      happiness:    80,
      cleanliness: 100,
      energy:       5,
    },
    age:              0,
    birthday:         t,
    lastUpdated:      t,
    trainingsToday:   0,
    lastTrainingDay:  currentDay,
    lastPoopTime:     t,
    poops:            [],
    isDead:           false,
    neglectStart:     null,
    sadStart:         null,
    isHatched:        EGG_HATCH_MS === 0,
    hatchTime:        t + EGG_HATCH_MS,
  };
}

// ── offline + tick decay ───────────────────────────────────────────────────

export function applyDecay(monster: Monster, toTime: number): Monster {
  if (monster.isDead) return monster;

  const ms = toTime - monster.lastUpdated;
  if (ms <= 0) return { ...monster, lastUpdated: toTime };

  let m = { ...monster, care: { ...monster.care }, rpg: { ...monster.rpg } };

  // Egg: just check for hatching, no stat decay yet
  if (!m.isHatched) {
    if (toTime >= m.hatchTime) m = { ...m, isHatched: true };
    return { ...m, lastUpdated: toTime };
  }

  const minutes = ms / 60000;

  // Stat decay
  m.care.hunger      = clamp(m.care.hunger      - HUNGER_DECAY_PER_MIN      * minutes);
  m.care.happiness   = clamp(m.care.happiness   - HAPPINESS_DECAY_PER_MIN   * minutes);
  m.care.cleanliness = clamp(m.care.cleanliness - CLEANLINESS_DECAY_PER_MIN * minutes);
  const maxEnergy = 5 + Math.floor(m.rpg.end / 5);
  m.care.energy = clamp(m.care.energy + ENERGY_REGEN_PER_MIN * minutes, 0, maxEnergy);

  // Each poop drains happiness
  if (m.poops.length > 0) {
    m.care.happiness = clamp(
      m.care.happiness - POOP_HAPPINESS_DRAIN_PER_MIN * m.poops.length * minutes
    );
  }

  // Automatic poop accumulation
  const poopsEarned = Math.floor((toTime - m.lastPoopTime) / POOP_INTERVAL_MS);
  if (poopsEarned > 0 && m.poops.length < MAX_POOPS) {
    const toAdd = Math.min(poopsEarned, MAX_POOPS - m.poops.length);
    const newPoops = [...m.poops];
    for (let i = 0; i < toAdd; i++) newPoops.push(randomPoopPos());
    m.poops        = newPoops;
    m.lastPoopTime = m.lastPoopTime + poopsEarned * POOP_INTERVAL_MS;
  }

  // Training day reset
  const currentDay = Math.floor((toTime - m.birthday) / GAME_DAY_MS);
  if (currentDay > m.lastTrainingDay) {
    m.trainingsToday   = 0;
    m.lastTrainingDay  = currentDay;
    m.age              = currentDay;
  }

  // Neglect timer (hunger)
  if (m.care.hunger <= 0) {
    if (m.neglectStart === null) {
      // Estimate when hunger hit zero during offline time
      const minutesToZero = monster.care.hunger / HUNGER_DECAY_PER_MIN;
      m.neglectStart = monster.lastUpdated + minutesToZero * 60000;
    }
    if (toTime - m.neglectStart >= NEGLECT_DEATH_MS) {
      m.isDead    = true;
      m.deathTime = m.neglectStart + NEGLECT_DEATH_MS;
    }
  } else {
    m.neglectStart = null;
  }

  // Sadness timer (happiness)
  if (!m.isDead) {
    if (m.care.happiness <= 0) {
      if (m.sadStart === null) {
        const minutesToZero = monster.care.happiness / HAPPINESS_DECAY_PER_MIN;
        m.sadStart = monster.lastUpdated + minutesToZero * 60000;
      }
      if (toTime - m.sadStart >= SADNESS_DEATH_MS) {
        m.isDead    = true;
        m.deathTime = m.sadStart + SADNESS_DEATH_MS;
      }
    } else {
      m.sadStart = null;
    }
  }

  m.lastUpdated = toTime;
  return m;
}

// ── actions ────────────────────────────────────────────────────────────────

export type ActionResult =
  | { ok: true;  monster: Monster; message: string }
  | { ok: false; message: string };

export function feedMonster(monster: Monster): ActionResult {
  if (!monster.isHatched) return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead) return { ok: false, message: "Monster is dead." };
  if (monster.care.hunger >= 98)
    return { ok: false, message: `${monster.name} is already full!` };

  let m = {
    ...monster,
    care: {
      ...monster.care,
      hunger:    clamp(monster.care.hunger    + FEED_HUNGER_GAIN),
      happiness: clamp(monster.care.happiness + FEED_HAPPINESS_GAIN),
    },
  };

  // Chance of poop
  if (m.poops.length < MAX_POOPS && Math.random() < POOP_FEED_CHANCE) {
    m = { ...m, poops: [...m.poops, randomPoopPos()] };
  }

  return { ok: true, monster: m, message: `${m.name} munches happily!` };
}

export function cleanPoop(monster: Monster): ActionResult {
  if (!monster.isHatched) return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead) return { ok: false, message: "Monster is dead." };
  if (monster.poops.length === 0)
    return { ok: false, message: "Nothing to clean!" };

  const newPoops = monster.poops.slice(1); // remove one poop
  const m = {
    ...monster,
    poops: newPoops,
    care: {
      ...monster.care,
      cleanliness: clamp(monster.care.cleanliness + CLEAN_CLEANLINESS_GAIN),
      happiness:   clamp(monster.care.happiness   + CLEAN_HAPPINESS_GAIN),
    },
  };
  return { ok: true, monster: m, message: "Cleaned up!" };
}

export function trainMonster(monster: Monster, type: TrainingType): ActionResult {
  if (!monster.isHatched) return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead) return { ok: false, message: "Monster is dead." };

  const exercise = TRAINING_EXERCISES.find(e => e.id === type);
  if (!exercise) return { ok: false, message: "Unknown exercise." };

  if (Math.floor(monster.care.energy) < 1)
    return { ok: false, message: `Not enough energy!` };

  let rpg = { ...monster.rpg };

  switch (type) {
    case "pushups":   rpg.atk   += exercise.statGain; break;
    case "situps":    rpg.def   += exercise.statGain; break;
    case "sprint":    rpg.agi   += exercise.statGain; rpg.spd += 1; break;
    case "endurance": rpg.end += exercise.statGain; break;
  }

  rpg.exp += exercise.expGain;
  rpg     = levelUp(rpg);

  const m: Monster = {
    ...monster,
    rpg,
    care: {
      ...monster.care,
      energy: clamp(monster.care.energy - exercise.energyCost),
      hunger: clamp(monster.care.hunger - exercise.hungerCost),
    },
    trainingsToday: monster.trainingsToday + 1,
  };

  return {
    ok: true,
    monster: m,
    message: `${m.name} trained hard! ${exercise.statLabel}`,
  };
}

// ── persistence ────────────────────────────────────────────────────────────

const KEY = "bmbs_monster_v1";

export function saveMonster(m: Monster) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(m));
}

export function loadMonster(): Monster | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Monster;
    // Migrate saves created before the egg system
    if (!m.hatchTime || isNaN(m.hatchTime)) {
      m.hatchTime = Date.now();
      m.isHatched = true;
    }
    if (m.isHatched === undefined) m.isHatched = true;
    // Migrate saves created before the endurance stat
    if (m.rpg.end === undefined) m.rpg.end = 5;
    // Apply offline decay before returning
    return applyDecay(m, Date.now());
  } catch {
    return null;
  }
}

export function clearMonster() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
