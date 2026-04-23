import type { RPGStats, Monster } from "@/types/game";

// ── Types ──────────────────────────────────────────────────────────────────

export interface WildMonsterRpg {
  hp:    number;
  maxHp: number;
  atk:   number;
  def:   number;
  agi:   number;
  spd:   number;
}

export interface WildMonster {
  name:  string;
  level: number;
  seed:  number;
  rpg:   WildMonsterRpg;
}

export interface BattleRound {
  attacker:      "player" | "wild";
  hit:           boolean;
  damage:        number;
  playerHpAfter: number;
  wildHpAfter:   number;
}

export interface BattleResult {
  rounds:        BattleRound[];
  winner:        "player" | "wild";
  finalPlayerHp: number;
  expGained:     number;
  coinsGained:   number;
}

// ── Wild monster pool ──────────────────────────────────────────────────────

const WILD_NAMES = [
  "Grawl","Snarix","Vortix","Creep","Skrix","Murk","Dread","Fang",
  "Claws","Howl","Shade","Razz","Brute","Venom","Prowl","Gnash",
  "Slash","Lurk","Snarl","Feral","Crag","Maw","Spite","Rend",
];

// ── Generation ─────────────────────────────────────────────────────────────

export function generateWildMonster(playerLevel: number, rng: () => number): WildMonster {
  const level   = Math.floor(rng() * (playerLevel + 2)) + 1;  // 1 to playerLevel+2
  const seed    = Math.floor(rng() * 2 ** 31);
  const name    = WILD_NAMES[Math.floor(rng() * WILD_NAMES.length)];

  const stat    = () => 4 + level * 2 + Math.floor(rng() * 5);
  const maxHp   = 15 + level * 6 + Math.floor(rng() * 10);

  return {
    name, level, seed,
    rpg: { hp: maxHp, maxHp, atk: stat(), def: stat(), agi: stat(), spd: stat() },
  };
}

// ── Simulation ─────────────────────────────────────────────────────────────

export function simulateBattle(
  playerRpg:  RPGStats,
  wildRpg:    WildMonsterRpg,
  playerLevel: number,
  wildLevel:   number,
  expToNext:   number,
  rng: () => number,
): BattleResult {
  let pHp = playerRpg.hp;
  let wHp = wildRpg.hp;
  const rounds: BattleRound[] = [];

  function calcDamage(atk: number, def: number): number {
    const divisor = Math.max(1, def * 2 + atk);
    const base    = Math.floor((atk / divisor) * 20);
    return Math.max(1, Math.floor(base * (0.85 + rng() * 0.30)));
  }

  function hitChance(agi: number, defAgi: number): number {
    return Math.min(0.97, Math.max(0.55, 0.85 + (agi - defAgi) * 0.015));
  }

  while (pHp > 0 && wHp > 0 && rounds.length < 100) {
    // Higher SPD goes first; tie = random
    const playerFirst = playerRpg.spd > wildRpg.spd ||
      (playerRpg.spd === wildRpg.spd && rng() < 0.5);
    const order: ("player" | "wild")[] = playerFirst
      ? ["player", "wild"]
      : ["wild", "player"];

    for (const attacker of order) {
      if (pHp <= 0 || wHp <= 0) break;

      const isPlayer  = attacker === "player";
      const atkStats  = isPlayer ? playerRpg : wildRpg;
      const defStats  = isPlayer ? wildRpg   : playerRpg;

      const hit    = rng() < hitChance(atkStats.agi, defStats.agi);
      const damage = hit ? calcDamage(atkStats.atk, defStats.def) : 0;

      if (isPlayer) wHp = Math.max(0, wHp - damage);
      else          pHp = Math.max(0, pHp - damage);

      rounds.push({ attacker, hit, damage, playerHpAfter: pHp, wildHpAfter: wHp });
    }
  }

  const winner: "player" | "wild" = pHp > 0 ? "player" : "wild";

  let expGained   = 0;
  let coinsGained = 0;

  if (winner === "player") {
    const levelDiff = playerLevel - wildLevel;
    if (wildLevel === 1) {
      expGained = 10;
    } else if (levelDiff >= 3) {
      expGained = Math.floor(rng() * 10) + 11;   // 11–20
    } else {
      expGained = Math.floor(rng() * 36) + 25;   // 25–60
    }
    coinsGained = Math.floor(wildLevel * (rng() * 6 + 3));  // level × 3–9 coins
  }

  return { rounds, winner, finalPlayerHp: Math.max(1, pHp), expGained, coinsGained };
}

// ── Display shim ───────────────────────────────────────────────────────────
// Creates a minimal Monster object so MonsterCanvas can render a wild monster.

export function wildToDisplayMonster(wild: WildMonster): Monster {
  const t = Date.now();
  return {
    id:                    `wild_${wild.seed}`,
    name:                  wild.name,
    seed:                  wild.seed,
    isShiny:               false,
    isDead:                false,
    isHatched:             true,
    hatchTime:             t,
    rpg: {
      hp: wild.rpg.hp, maxHp: wild.rpg.maxHp,
      atk: wild.rpg.atk, def: wild.rpg.def,
      agi: wild.rpg.agi, spd: wild.rpg.spd,
      end: 5, level: wild.level, exp: 0, expToNext: 60,
    },
    care:                  { hunger: 100, happiness: 100, cleanliness: 100, energy: 5 },
    age:                   0,
    birthday:              t,
    lastUpdated:           t,
    trainingsToday:        0,
    lastTrainingDay:       0,
    mealsPending:          0,
    nextPoopTime:          null,
    poops:                 [],
    hasBeenRenamed:        false,
    neglectStart:          null,
    sadStart:              null,
    lastHungerEnergyDrain: null,
    isSick:                false,
    sickStart:             null,
    dirtyStart:            null,
    lastPetTime:           null,
    isAdventuring:         false,
    adventureStart:        null,
    isInjured:             false,
  };
}
