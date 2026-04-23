import type { Monster, RPGStats, Poop, TrainingType } from "@/types/game";
import type { ItemId } from "@/types/items";
import {
  GAME_DAY_MS,
  DIGESTION_MS,
  MAX_POOPS,
  HUNGER_DECAY_PER_MIN,
  HAPPINESS_DECAY_PER_MIN,
  CLEANLINESS_DECAY_PER_MIN,
  ENERGY_REGEN_PER_MIN,
  HP_REGEN_PCT_PER_MIN,
  POOP_HAPPINESS_DRAIN_PER_MIN,
  SICK_FROM_POOP_MS,
  SICK_FROM_HUNGER_MS,
  SICK_HAPPINESS_DRAIN_PER_MIN,
  INJURED_HAPPINESS_DRAIN_PER_MIN,
  NEGLECT_DEATH_MS,
  SADNESS_DEATH_MS,
  HUNGER_ENERGY_DRAIN_MS,
  FEED_HUNGER_GAIN,
  FEED_HAPPINESS_GAIN,
  TREAT_HAPPINESS_GAIN,
  TREAT_HUNGER_GAIN,
  PET_HAPPINESS_GAIN,
  PET_COOLDOWN_MS,
  CLEAN_CLEANLINESS_GAIN,
  CLEAN_HAPPINESS_GAIN,
  BASE_EXP_TO_NEXT,
  EXP_SCALE,
  TRAINING_EXERCISES,
  EGG_HATCH_MS,
  SHINY_CHANCE,
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
    mealsPending:     0,
    nextPoopTime:     null,
    poops:            [],
    isShiny:          Math.random() < SHINY_CHANCE,
    hasBeenRenamed:   false,
    isDead:           false,
    neglectStart:           null,
    sadStart:               null,
    lastHungerEnergyDrain:  null,
    isSick:                 false,
    sickStart:              null,
    dirtyStart:             null,
    lastPetTime:            null,
    isHatched:        EGG_HATCH_MS === 0,
    hatchTime:        t + EGG_HATCH_MS,
    isAdventuring:    false,
    adventureStart:   null,
    isInjured:        false,
  };
}

export function grantExp(monster: Monster, exp: number): Monster {
  const prevLevel = monster.rpg.level;
  let rpg = { ...monster.rpg, exp: monster.rpg.exp + exp };
  rpg = levelUp(rpg);
  let care = monster.care;
  if (rpg.level > prevLevel) {
    const maxEnergy = 5 + Math.floor(rpg.end / 5);
    care = { ...care, energy: care.energy < maxEnergy / 2 ? maxEnergy / 2 : maxEnergy };
  }
  return { ...monster, rpg, care };
}

export function startAdventure(monster: Monster): ActionResult {
  if (!monster.isHatched) return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead)     return { ok: false, message: "Monster is dead." };
  if (monster.isAdventuring) return { ok: false, message: `${monster.name} is already adventuring!` };
  if (monster.isSick)     return { ok: false, message: `${monster.name} is too sick to adventure!` };
  if (Math.round(monster.care.energy) < 1) return { ok: false, message: "Not enough energy!" };
  const m: Monster = {
    ...monster,
    isAdventuring:  true,
    adventureStart: now(),
    care: { ...monster.care, energy: clamp(monster.care.energy - 1) },
  };
  return { ok: true, monster: m, message: `${m.name} sets out on an adventure!` };
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

  // Digestion: produce poops from queued meals
  if (m.nextPoopTime !== null) {
    const newPoops = [...m.poops];
    let pending = m.mealsPending;
    let nextPoop = m.nextPoopTime;
    while (pending > 0 && nextPoop <= toTime) {
      if (newPoops.length < MAX_POOPS) newPoops.push(randomPoopPos());
      pending--;
      nextPoop = pending > 0 ? nextPoop + DIGESTION_MS : 0;
    }
    m.poops        = newPoops;
    m.mealsPending = pending;
    m.nextPoopTime = pending > 0 ? nextPoop : null;
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

    // Energy drain while starving: 1 immediately, then 1 per 5 min
    const drainStart = m.neglectStart;
    if (m.lastHungerEnergyDrain === null) {
      // First drain — immediate when hunger hits 0
      if (m.care.energy > 0) m.care.energy = Math.max(0, m.care.energy - 1);
      m.lastHungerEnergyDrain = drainStart;
    } else {
      const drainsDue = Math.floor((toTime - m.lastHungerEnergyDrain) / HUNGER_ENERGY_DRAIN_MS);
      if (drainsDue > 0) {
        if (m.care.energy > 0) m.care.energy = Math.max(0, m.care.energy - drainsDue);
        m.lastHungerEnergyDrain += drainsDue * HUNGER_ENERGY_DRAIN_MS;
      }
    }
  } else {
    m.neglectStart           = null;
    m.lastHungerEnergyDrain  = null;
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

  // Sickness triggers
  if (!m.isDead && !m.isSick) {
    // Dirty too long (3+ poops)
    if (m.poops.length >= 3) {
      if (m.dirtyStart === null) m.dirtyStart = toTime;
      if (toTime - m.dirtyStart >= SICK_FROM_POOP_MS) m.isSick = true;
    } else {
      m.dirtyStart = null;
    }
    // Starving too long
    if (m.neglectStart !== null && toTime - m.neglectStart >= SICK_FROM_HUNGER_MS) {
      m.isSick = true;
    }
    if (m.isSick) m.sickStart = toTime;
  }

  // Sickness drains happiness faster
  if (m.isSick && !m.isDead) {
    m.care.happiness = clamp(m.care.happiness - SICK_HAPPINESS_DRAIN_PER_MIN * minutes);
  }

  // Injury also drains happiness
  if (m.isInjured && !m.isDead) {
    m.care.happiness = clamp(m.care.happiness - INJURED_HAPPINESS_DRAIN_PER_MIN * minutes);
  }

  // HP regeneration — paused while sick or injured
  if (!m.isDead && !m.isSick && !m.isInjured && m.rpg.hp < m.rpg.maxHp) {
    const regenPerMin = m.rpg.maxHp * HP_REGEN_PCT_PER_MIN;
    m.rpg.hp = Math.min(m.rpg.maxHp, m.rpg.hp + regenPerMin * minutes);
  }

  // Reset dirtyStart if poops cleared (and not sick from it already)
  if (m.poops.length < 3 && !m.isSick) m.dirtyStart = null;

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

  const t = now();
  const m = {
    ...monster,
    care: {
      ...monster.care,
      hunger:    clamp(monster.care.hunger    + FEED_HUNGER_GAIN),
      happiness: clamp(monster.care.happiness + FEED_HAPPINESS_GAIN),
    },
    mealsPending: monster.mealsPending + 1,
    nextPoopTime: monster.nextPoopTime ?? t + DIGESTION_MS,
  };

  return { ok: true, monster: m, message: `${m.name} munches happily!` };
}

export function applyItem(monster: Monster, itemId: ItemId): ActionResult {
  if (!monster.isHatched) return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead)     return { ok: false, message: "Monster is dead." };

  switch (itemId) {
    case "kibble":
      return feedMonster(monster);

    case "treat": {
      if (monster.care.happiness >= 98)
        return { ok: false, message: `${monster.name} is already happy!` };
      const m = { ...monster, care: { ...monster.care,
        happiness: clamp(monster.care.happiness + TREAT_HAPPINESS_GAIN),
        hunger:    clamp(monster.care.hunger    + TREAT_HUNGER_GAIN),
      }};
      return { ok: true, monster: m, message: `${m.name} loved the treat!` };
    }

    case "energy_drink": {
      const maxEnergy = 5 + Math.floor(monster.rpg.end / 5);
      if (monster.care.energy >= maxEnergy)
        return { ok: false, message: `${monster.name} is already full of energy!` };
      const m = { ...monster, care: { ...monster.care, energy: maxEnergy } };
      return { ok: true, monster: m, message: `${m.name} feels energized!` };
    }

    case "medicine": {
      if (monster.rpg.hp >= monster.rpg.maxHp)
        return { ok: false, message: `${monster.name} is already at full HP!` };
      const m = { ...monster, rpg: { ...monster.rpg, hp: monster.rpg.maxHp } };
      return { ok: true, monster: m, message: `${m.name} recovered fully!` };
    }

    case "vaccine": {
      if (!monster.isSick)
        return { ok: false, message: `${monster.name} isn't sick!` };
      const m = { ...monster, isSick: false, sickStart: null };
      return { ok: true, monster: m, message: `${m.name} is cured!` };
    }

    case "first_aid_kit": {
      if (!monster.isInjured)
        return { ok: false, message: `${monster.name} isn't injured!` };
      const m = { ...monster, isInjured: false };
      return { ok: true, monster: m, message: `${m.name}'s injuries are treated!` };
    }

    case "name_change":
      return { ok: false, message: "Click your monster's name to rename!" };
  }
}

export function petMonster(monster: Monster): ActionResult {
  if (!monster.isHatched) return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead)     return { ok: false, message: "Monster is dead." };
  const t = now();
  if (monster.lastPetTime !== null && t - monster.lastPetTime < PET_COOLDOWN_MS)
    return { ok: false, message: `You recently petted ${monster.name}!` };
  const m = {
    ...monster,
    care: { ...monster.care, happiness: clamp(monster.care.happiness + PET_HAPPINESS_GAIN) },
    lastPetTime: t,
  };
  return { ok: true, monster: m, message: `${m.name} enjoyed the attention!` };
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

  if (monster.isSick)
    return { ok: false, message: `${monster.name} is too sick to train!` };
  if (monster.isInjured)
    return { ok: false, message: `${monster.name} is injured and needs a First Aid Kit before training!` };
  if (Math.round(monster.care.energy) < 1)
    return { ok: false, message: `Not enough energy!` };

  const prevLevel = monster.rpg.level;
  let rpg = { ...monster.rpg };

  switch (type) {
    case "pushups":   rpg.atk += exercise.statGain; break;
    case "situps":    rpg.def += exercise.statGain; break;
    case "sprint":    rpg.agi += exercise.statGain; rpg.spd += 1; break;
    case "endurance": rpg.end += exercise.statGain; break;
  }

  const pct    = Math.random() * (exercise.expPctMax - exercise.expPctMin) + exercise.expPctMin;
  const expRaw = Math.floor(monster.rpg.exp * pct);
  rpg.exp += Math.max(3, expRaw); // floor of 3 so early-game monsters always gain something
  rpg      = levelUp(rpg);

  const maxEnergy = 5 + Math.floor(rpg.end / 5);
  let newEnergy   = clamp(monster.care.energy - exercise.energyCost, 0, maxEnergy);
  if (rpg.level > prevLevel) {
    newEnergy = newEnergy < maxEnergy / 2 ? maxEnergy / 2 : maxEnergy;
  }

  const m: Monster = {
    ...monster,
    rpg,
    care: {
      ...monster.care,
      energy: newEnergy,
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
    // Migrate saves created before hunger energy drain tracking
    if (m.lastHungerEnergyDrain === undefined) m.lastHungerEnergyDrain = null;
    // Migrate saves that used lastPoopTime instead of digestion queue
    if ((m as unknown as Record<string, unknown>).lastPoopTime !== undefined) {
      delete (m as unknown as Record<string, unknown>).lastPoopTime;
    }
    if (m.mealsPending === undefined) m.mealsPending = 0;
    if (m.nextPoopTime === undefined) m.nextPoopTime = null;
    if ((m as unknown as Record<string, unknown>).isShiny === undefined) m.isShiny = false;
    if (m.isSick      === undefined) m.isSick      = false;
    if (m.sickStart   === undefined) m.sickStart   = null;
    if (m.dirtyStart  === undefined) m.dirtyStart  = null;
    if (m.lastPetTime      === undefined) m.lastPetTime      = null;
    if (m.hasBeenRenamed  === undefined) m.hasBeenRenamed   = false;
    if (m.isAdventuring   === undefined) m.isAdventuring    = false;
    if (m.adventureStart  === undefined) m.adventureStart   = null;
    if (m.isInjured       === undefined) m.isInjured        = false;
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
