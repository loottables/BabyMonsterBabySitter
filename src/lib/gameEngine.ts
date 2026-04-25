import type { Monster, RPGStats, Poop, TrainingType } from "@/types/game";
import type { ItemId } from "@/types/items";
import {
  GAME_DAY_MS,
  REAL_DAY_MS,
  DIGESTION_MS,
  MAX_POOPS,
  HUNGER_DECAY_PER_MIN,
  HAPPINESS_DECAY_PER_MIN,
  HAPPINESS_DECAY_ACTIVE_PER_MIN,
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
  STR_HP_MULTIPLIER,
  TRAINING_EXERCISES,
  EGG_HATCH_MS,
  SHINY_CHANCE,
  INJURY_HEAL_MS,
  AUTOSLEEP_HOUR,
  AUTOSLEEP_WAKE_HOUR,
  SPA_HAPPINESS_GAIN,
  SPA_ENERGY_GAIN,
} from "./constants";

// Max energy a monster can hold: base 5 + 1 per 5 END points.
// Used by StatsPanel.tsx (display), applyDecay (regen cap), and startAdventure (cost check).
export function calcMaxEnergy(end: number): number {
  return 5 + Math.floor(end / 5);
}

// ── helpers ────────────────────────────────────────────────────────────────

// Keeps a stat within [lo, hi]; defaults to the 0–100 care stat range.
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// Generates a short random ID string — used for monster IDs and poop IDs.
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

const LEVEL_STATS = ["str", "atk", "def", "agi", "spd", "end"] as const;

export type LevelStatKey = typeof LEVEL_STATS[number];

export interface LevelUpData {
  newLevel: number;
  gains: Partial<Record<LevelStatKey, number>>;
}

// Randomly spreads `points` across all 6 stats. STR gains also increase maxHp.
function distributeStatPoints(rpg: RPGStats, points: number, rand = Math.random): RPGStats {
  const r = { ...rpg };
  for (let i = 0; i < points; i++) {
    const stat = LEVEL_STATS[Math.floor(rand() * LEVEL_STATS.length)];
    r[stat] += 1;
    if (stat === "str") r.maxHp += STR_HP_MULTIPLIER;
  }
  return r;
}

interface LevelResult {
  rpg:      RPGStats;
  leveled:  boolean;
  newLevel: number;
  gains:    Partial<Record<LevelStatKey, number>>;
}

// Called by grantExp and trainMonster whenever exp is added.
// Loops until all accumulated exp is consumed, so multiple level-ups can happen at once.
function levelUp(rpg: RPGStats): LevelResult {
  let r = { ...rpg };
  const gains: Partial<Record<LevelStatKey, number>> = {};
  let leveled = false;
  while (r.exp >= r.expToNext) {
    r.exp      -= r.expToNext;
    r.level    += 1;
    r.expToNext = Math.round(r.expToNext * EXP_SCALE);
    leveled = true;
    const before = { ...r };
    r = distributeStatPoints(r, 6);
    r.hp = r.maxHp;
    for (const stat of LEVEL_STATS) {
      const diff = r[stat] - before[stat];
      if (diff > 0) gains[stat] = (gains[stat] ?? 0) + diff;
    }
  }
  return { rpg: r, leveled, newLevel: r.level, gains };
}

// ── creation ───────────────────────────────────────────────────────────────

function randomStarterRpg(): RPGStats {
  // str + atk + def + agi + spd + end = 30, each ≥ 1
  // Broken-stick: 5 cut points over [0, 24] divide the bonus pool
  const pool = 24; // 30 total − 6 base (1 each)
  const cuts = [
    Math.floor(Math.random() * (pool + 1)),
    Math.floor(Math.random() * (pool + 1)),
    Math.floor(Math.random() * (pool + 1)),
    Math.floor(Math.random() * (pool + 1)),
    Math.floor(Math.random() * (pool + 1)),
  ].sort((a, b) => a - b);
  const str    = 1 + cuts[0];
  const baseHp = 18 + Math.floor(Math.random() * 8); // 18–25
  const maxHp  = baseHp + str * STR_HP_MULTIPLIER;
  return {
    hp: maxHp, maxHp,
    str,
    atk: 1 + (cuts[1] - cuts[0]),
    def: 1 + (cuts[2] - cuts[1]),
    agi: 1 + (cuts[3] - cuts[2]),
    spd: 1 + (cuts[4] - cuts[3]),
    end: 1 + (pool - cuts[4]),
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
  const rpg = randomStarterRpg();
  return {
    id:              uid(),
    name:            MONSTER_NAMES[Math.floor(Math.random() * MONSTER_NAMES.length)],
    seed:            Math.floor(Math.random() * 2 ** 31),
    rpg,
    care: {
      hunger:      100,
      happiness:   100,
      cleanliness: 100,
      energy:      calcMaxEnergy(rpg.end),
    },
    age:              0,
    birthday:         t,
    lastUpdated:      t,
    trainingsToday:   0,
    lastTrainingDay:  0,
    mealsPending:     0,
    nextPoopTime:     null,
    poops:            [],
    isShiny:          Math.random() < SHINY_CHANCE,
    hasBeenRenamed:   false,
    isDead:           false,
    neglectStart:           null,
    sadStart:               null,
    isSick:                 false,
    sickStart:              null,
    dirtyStart:             null,
    lastPetTime:            null,
    isHatched:        EGG_HATCH_MS === 0,
    hatchTime:        t + EGG_HATCH_MS,
    isAdventuring:     false,
    adventureStart:    null,
    adventureDuration: null,
    isAtSpa:          false,
    spaStart:         null,
    isInjured:        false,
    injuredHealStart: null,
    isSleeping:       false,
  };
}

// Adds exp to the monster and triggers level-up(s) if the threshold is crossed.
// Called by useGameState after adventures (non-battle) and battle completions.
export function grantExp(monster: Monster, exp: number): { monster: Monster; levelUpData: LevelUpData | null } {
  const prevLevel = monster.rpg.level;
  const rpg0 = { ...monster.rpg, exp: monster.rpg.exp + exp };
  const { rpg, leveled, newLevel, gains } = levelUp(rpg0);
  let care = monster.care;
  if (rpg.level > prevLevel) {
    const maxEnergy = calcMaxEnergy(rpg.end);
    care = { ...care, energy: care.energy < maxEnergy / 2 ? maxEnergy / 2 : maxEnergy };
  }
  return {
    monster: { ...monster, rpg, care },
    levelUpData: leveled ? { newLevel, gains } : null,
  };
}

export function startAdventure(monster: Monster): ActionResult {
  if (!monster.isHatched) return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead)     return { ok: false, message: "Monster is dead." };
  if (monster.isAdventuring) return { ok: false, message: `${monster.name} is already adventuring!` };
  if (monster.isSick)     return { ok: false, message: `${monster.name} is too sick to adventure!` };
  if (Math.round(monster.care.energy) < 1) return { ok: false, message: "Not enough energy!" };
  const m: Monster = {
    ...monster,
    isAdventuring:     true,
    adventureStart:    now(),
    adventureDuration: Math.floor(Math.random() * 21 + 5) * 1000,
    isSleeping:        false,
    care: { ...monster.care, energy: clamp(monster.care.energy - 1) },
  };
  return { ok: true, monster: m, message: `${m.name} sets out on an adventure!` };
}

export function enterSpa(monster: Monster): ActionResult {
  if (!monster.isHatched)    return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead)        return { ok: false, message: "Monster is dead." };
  if (monster.isAdventuring) return { ok: false, message: `${monster.name} is away adventuring!` };
  if (monster.isSleeping)    return { ok: false, message: `${monster.name} is sleeping.` };
  if (monster.isAtSpa)       return { ok: false, message: `${monster.name} is already at the spa.` };
  return { ok: true, monster: { ...monster, isAtSpa: true, spaStart: now() }, message: `${monster.name} heads to the spa!` };
}

export function completeSpa(monster: Monster): Monster {
  const maxEnergy = calcMaxEnergy(monster.rpg.end);
  return {
    ...monster,
    isAtSpa:  false,
    spaStart: null,
    care: {
      ...monster.care,
      cleanliness: 100,
      happiness:   clamp(monster.care.happiness + SPA_HAPPINESS_GAIN),
      energy:      clamp(monster.care.energy    + SPA_ENERGY_GAIN, 0, maxEnergy),
    },
    rpg: { ...monster.rpg, hp: monster.rpg.maxHp },
  };
}

export function sleepMonster(monster: Monster): ActionResult {
  if (!monster.isHatched)    return { ok: false, message: "The egg hasn't hatched yet!" };
  if (monster.isDead)        return { ok: false, message: "Monster is dead." };
  if (monster.isAdventuring) return { ok: false, message: `${monster.name} is away adventuring!` };
  if (monster.isSleeping)    return { ok: false, message: `${monster.name} is already sleeping.` };
  return { ok: true, monster: { ...monster, isSleeping: true }, message: `${monster.name} falls asleep.` };
}

export function wakeMonster(monster: Monster): ActionResult {
  if (!monster.isSleeping) return { ok: false, message: `${monster.name} is already awake.` };
  return { ok: true, monster: { ...monster, isSleeping: false }, message: `${monster.name} wakes up!` };
}

// ── offline + tick decay ───────────────────────────────────────────────────

// The main simulation step. Advances all time-based stats from monster.lastUpdated to toTime.
// Called every second by the TICK action in useGameState, and also on page load (via migrateMonster)
// to catch up on any time that passed while the app was closed.
// isActive: true when the player has the tab open and visible — halves the happiness drain rate.
export function applyDecay(monster: Monster, toTime: number, isActive = false): Monster {
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

  // Hunger always decays; energy regens only while hunger > 0 (paused when starving)
  m.care.hunger = clamp(m.care.hunger - HUNGER_DECAY_PER_MIN * minutes);
  const maxEnergy = 5 + Math.floor(m.rpg.end / 5);
  if (m.care.hunger > 0) {
    m.care.energy = clamp(m.care.energy + ENERGY_REGEN_PER_MIN * minutes, 0, maxEnergy);
  }

  if (!m.isSleeping) {
    // Happiness + cleanliness only decay while awake
    const happDecay = isActive ? HAPPINESS_DECAY_ACTIVE_PER_MIN : HAPPINESS_DECAY_PER_MIN;
    m.care.happiness   = clamp(m.care.happiness   - happDecay * minutes);
    m.care.cleanliness = clamp(m.care.cleanliness - CLEANLINESS_DECAY_PER_MIN * minutes);

    // Poop happiness drain only while awake
    if (m.poops.length > 0) {
      m.care.happiness = clamp(
        m.care.happiness - POOP_HAPPINESS_DRAIN_PER_MIN * m.poops.length * minutes
      );
    }
  }

  // Digestion: paused while sleeping (advance timer to prevent backlog on wake)
  if (m.nextPoopTime !== null) {
    if (m.isSleeping) {
      m.nextPoopTime += ms;
    } else {
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
  }

  // Training day reset — resets every 24 real minutes (GAME_DAY_MS)
  const trainingDay = Math.floor((toTime - m.birthday) / GAME_DAY_MS);
  if (trainingDay > m.lastTrainingDay) {
    m.trainingsToday  = 0;
    m.lastTrainingDay = trainingDay;
  }

  // Age — real calendar days elapsed since birthday
  m.age = Math.floor((toTime - m.birthday) / REAL_DAY_MS);

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

  // Sickness and injury happiness drains — frozen while sleeping
  if (!m.isSleeping) {
    if (m.isSick && !m.isDead) {
      m.care.happiness = clamp(m.care.happiness - SICK_HAPPINESS_DRAIN_PER_MIN * minutes);
    }
    if (m.isInjured && !m.isDead) {
      m.care.happiness = clamp(m.care.happiness - INJURED_HAPPINESS_DRAIN_PER_MIN * minutes);
    }
  }

  // HP regeneration — paused while sick or sleeping; doubled when happy + clean + hunger ≥ 50
  if (!m.isDead && !m.isSick && !m.isSleeping && m.rpg.hp < m.rpg.maxHp) {
    const wellCared   = m.care.happiness >= 50 && m.care.cleanliness >= 50 && m.care.hunger >= 50;
    const regenPerMin = m.rpg.maxHp * HP_REGEN_PCT_PER_MIN * (wellCared ? 2 : 1);
    m.rpg.hp = Math.min(m.rpg.maxHp, m.rpg.hp + regenPerMin * minutes);
  }

  // Injury auto-heal: 30 min at full HP clears the injured status
  if (!m.isDead && m.isInjured) {
    if (m.rpg.hp >= m.rpg.maxHp) {
      if (m.injuredHealStart === null) {
        m.injuredHealStart = toTime;
      } else if (toTime - m.injuredHealStart >= INJURY_HEAL_MS) {
        m.isInjured        = false;
        m.injuredHealStart = null;
      }
    } else {
      m.injuredHealStart = null;
    }
  }

  // Reset dirtyStart if poops cleared (and not sick from it already)
  if (m.poops.length < 3 && !m.isSick) m.dirtyStart = null;

  m.lastUpdated = toTime;
  return m;
}

// ── offline catch-up with auto-sleep ──────────────────────────────────────

// Returns the timestamp when the monster should auto-sleep offline.
// If lastUpdated is already in the sleep window (8 PM–8 AM), sleep starts immediately.
// Otherwise returns the next 8 PM.
function offlineSleepStart(ts: number): number {
  const h = new Date(ts).getHours();
  if (h >= AUTOSLEEP_HOUR || h < AUTOSLEEP_WAKE_HOUR) return ts;
  const d    = new Date(ts);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), AUTOSLEEP_HOUR, 0, 0, 0);
  return next.getTime();
}

// Offline catch-up that auto-sleeps the monster at 8 PM if the app was closed.
// The monster stays sleeping until the player manually wakes it — there is no auto-wake.
// Manually-sleeping or adventuring monsters decay straight through without splitting.
export function applyOfflineDecay(monster: Monster, toTime: number): Monster {
  if (monster.isSleeping || monster.isAdventuring || monster.isAtSpa || monster.isDead || !monster.isHatched) {
    return applyDecay(monster, toTime, false);
  }

  const sleepAt = offlineSleepStart(monster.lastUpdated);

  if (sleepAt >= toTime) {
    // Never reached 8 PM during offline period — decay fully awake
    return applyDecay(monster, toTime, false);
  }

  // Decay awake up to 8 PM, then sleeping the rest of the way
  const afterAwake = applyDecay(monster, sleepAt, false);
  return applyDecay({ ...afterAwake, isSleeping: true }, toTime, false);
}

// ── actions ────────────────────────────────────────────────────────────────

// Return type for all player action functions (feed, pet, train, etc.).
// If ok is true, monster holds the updated state. If ok is false, message explains why it failed.
// levelUpData is set when the action triggered a level-up (training only currently).
export type ActionResult =
  | { ok: true;  monster: Monster; message: string; levelUpData?: LevelUpData | null }
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
      if (monster.isSleeping) return { ok: false, message: `${monster.name} is asleep!` };
      return feedMonster(monster);

    case "treat": {
      if (monster.isSleeping) return { ok: false, message: `${monster.name} is asleep!` };
      if (monster.care.happiness >= 98)
        return { ok: false, message: `${monster.name} is already happy!` };
      const maxEnergy = calcMaxEnergy(monster.rpg.end);
      const m = { ...monster, care: { ...monster.care,
        happiness: clamp(monster.care.happiness + TREAT_HAPPINESS_GAIN),
        hunger:    clamp(monster.care.hunger    + TREAT_HUNGER_GAIN),
        energy:    clamp(monster.care.energy + 1, 0, maxEnergy),
      }};
      return { ok: true, monster: m, message: `${m.name} loved the treat!` };
    }

    case "energy_drink": {
      const maxEnergy = calcMaxEnergy(monster.rpg.end);
      if (monster.care.energy >= maxEnergy)
        return { ok: false, message: `${monster.name} is already full of energy!` };
      const m = { ...monster, care: { ...monster.care, energy: maxEnergy } };
      return { ok: true, monster: m, message: `${m.name} feels energized!` };
    }

    case "potion": {
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

    case "bandaid": {
      if (monster.rpg.hp >= monster.rpg.maxHp)
        return { ok: false, message: `${monster.name} is already at full HP!` };
      const newHp = Math.min(monster.rpg.maxHp, monster.rpg.hp + 20);
      const m = { ...monster, rpg: { ...monster.rpg, hp: newHp } };
      return { ok: true, monster: m, message: `${m.name} recovered 20 HP!` };
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
    case "weights": {
      const hpGain = exercise.statGain * STR_HP_MULTIPLIER;
      rpg.str   += exercise.statGain;
      rpg.maxHp += hpGain;
      rpg.hp     = Math.min(rpg.hp + hpGain, rpg.maxHp);
      break;
    }
  }

  const expGained = Math.ceil(rpg.expToNext * exercise.expPct);
  rpg.exp += expGained;
  const { rpg: leveledRpg, leveled, newLevel: lvl, gains } = levelUp(rpg);
  rpg = leveledRpg;

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
    levelUpData: leveled ? { newLevel: lvl, gains } : null,
  };
}

// ── persistence ────────────────────────────────────────────────────────────
// migrateMonster is called in useGameState.ts when loading a save from Supabase.
// It backfills any Monster fields that were added after the save was originally written
// (so old saves don't break), then runs applyDecay to catch up on offline time.

export function migrateMonster(raw: unknown): Monster {
  const m = raw as Monster;
  if (!m.hatchTime || isNaN(m.hatchTime)) { m.hatchTime = Date.now(); m.isHatched = true; }
  if (m.isHatched           === undefined) m.isHatched           = true;
  if (m.rpg.end             === undefined) m.rpg.end             = 5;
  if (m.rpg.str             === undefined) m.rpg.str             = 5;
  if ((m as unknown as Record<string, unknown>).lastPoopTime !== undefined)
    delete (m as unknown as Record<string, unknown>).lastPoopTime;
  if (m.mealsPending        === undefined) m.mealsPending        = 0;
  if (m.nextPoopTime        === undefined) m.nextPoopTime        = null;
  if ((m as unknown as Record<string, unknown>).isShiny === undefined) m.isShiny = false;
  if (m.isSick              === undefined) m.isSick              = false;
  if (m.sickStart           === undefined) m.sickStart           = null;
  if (m.dirtyStart          === undefined) m.dirtyStart          = null;
  if (m.lastPetTime         === undefined) m.lastPetTime         = null;
  if (m.hasBeenRenamed      === undefined) m.hasBeenRenamed      = false;
  if (m.isAdventuring        === undefined) m.isAdventuring        = false;
  if (m.adventureStart       === undefined) m.adventureStart       = null;
  if (m.adventureDuration    === undefined) m.adventureDuration    = null;
  if (m.isInjured           === undefined) m.isInjured           = false;
  if (m.injuredHealStart    === undefined) m.injuredHealStart    = null;
  if (m.isSleeping          === undefined) m.isSleeping          = false;
  if (m.isAtSpa             === undefined) m.isAtSpa             = false;
  if (m.spaStart            === undefined) m.spaStart            = null;
  return applyOfflineDecay(m, Date.now());
}

