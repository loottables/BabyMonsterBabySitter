import type { ItemId } from "@/types/items";
import type { RPGStats } from "@/types/game";
import { generateWildMonster, simulateBattle, type WildMonster, type BattleResult } from "./battleEngine";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdventureResultData {
  narrative:    string;
  itemFound:    ItemId | null;
  itemObtained: boolean;   // false if bag was full
  expGained:    number;
  coinsFound:   number;
  wildBattle: {
    wildMonster:   WildMonster;
    battleResult:  BattleResult;
    location:      string;        // flavour text for the encounter screen
  } | null;
}

// ── Scenario library ───────────────────────────────────────────────────────

interface Scenario {
  location:       string;
  bothEvents:     string[];   // item + exp — {name} placeholder
  expEvents:      string[];
  treasureEvents: string[];   // coins only
  coinsExpEvents: string[];   // coins + exp
  quietEvents:    string[];
  closings:       string[];
}

const SCENARIOS: Scenario[] = [
  {
    location: "along an ancient mountain trail",
    bothEvents: [
      "{name} crossed a crumbling rope bridge and on the other side found a forgotten supply cache.",
    ],
    expEvents: [
      "{name} trained hard against the biting mountain wind, growing stronger with every step.",
      "{name} scaled a sheer rock face, muscles burning, determination unyielding.",
    ],
    treasureEvents: [
      "{name} discovered a weathered chest half-buried beneath a cairn, packed with glinting coins.",
    ],
    coinsExpEvents: [
      "{name} found a traveler's scattered coin purse along the trail and trained hard on the trek home.",
    ],
    quietEvents: [
      "{name} reached the summit and gazed out over a vast, snow-dusted landscape in silence.",
    ],
    closings: [
      "The mountain air carried {name} home, tired but fulfilled.",
      "{name} descended just as the last light faded from the peaks.",
    ],
  },
  {
    location: "into the depths of the whispering forest",
    bothEvents: [
      "{name} found an abandoned forester's camp and explored it thoroughly, pocketing a useful find.",
    ],
    expEvents: [
      "{name} navigated a labyrinth of twisted roots and low branches, reflexes sharpening with every dodge.",
      "{name} tracked a shadow through the underbrush for hours, learning patience and precision.",
    ],
    treasureEvents: [
      "{name} unearthed an old tin buried between the roots of an ancient tree, filled with glinting coins.",
    ],
    coinsExpEvents: [
      "{name} found coins left at a moss-covered forest shrine and meditated there before returning stronger.",
    ],
    quietEvents: [
      "{name} sat beneath an ancient oak and listened to the forest breathe until dusk.",
    ],
    closings: [
      "The forest parted and {name} stepped back into the open world, changed somehow.",
      "{name} emerged from the treeline just as the moon rose overhead.",
    ],
  },
  {
    location: "to the windswept seaside cliffs",
    bothEvents: [
      "{name} explored a sea cave exposed by low tide and found both challenge and reward inside.",
    ],
    expEvents: [
      "{name} leapt between rocky outcroppings above the crashing surf, building agility with each jump.",
      "{name} braced against the ocean gale for hours, letting the resistance forge stronger footing.",
    ],
    treasureEvents: [
      "{name} pried a rusted lockbox from the cliff face, heavy with old seafaring coin.",
    ],
    coinsExpEvents: [
      "{name} found coins scattered among the tide pools and hauled them back after a grueling climb.",
    ],
    quietEvents: [
      "{name} watched a distant storm roll across the horizon, mesmerized by the waves below.",
    ],
    closings: [
      "Salt air followed {name} the whole way home.",
      "{name} turned from the sea as the tide came rolling back in.",
    ],
  },
  {
    location: "through a long-forgotten village",
    bothEvents: [
      "{name} discovered the village well still worked, and nearby found a bundle wrapped in oilcloth.",
    ],
    expEvents: [
      "{name} explored every crumbling alley and overgrown courtyard, learning the layout of the land.",
      "{name} sparred with their own shadow in an empty cobblestone square for what felt like hours.",
    ],
    treasureEvents: [
      "{name} discovered a hidden cache of coins beneath the floorboards of an abandoned cottage.",
    ],
    coinsExpEvents: [
      "{name} found a merchant's forgotten coin purse in the ruins and spent the walk home practicing footwork.",
    ],
    quietEvents: [
      "{name} found an old well with a strange inscription and spent the afternoon pondering its meaning.",
    ],
    closings: [
      "{name} left the village quieter than they arrived.",
      "The overgrown path back home felt shorter somehow.",
    ],
  },
  {
    location: "across the smoldering volcanic fields",
    bothEvents: [
      "{name} navigated a maze of lava tubes and found both a test of endurance and an unexpected reward.",
    ],
    expEvents: [
      "{name} endured scorching heat and unstable footing, emerging from the fields tougher than before.",
      "{name} practiced quick footwork to avoid the hot patches, each step faster than the last.",
    ],
    treasureEvents: [
      "{name} uncovered a fireproof strongbox near a cooled lava flow, heavy with heat-warped coins.",
    ],
    coinsExpEvents: [
      "{name} found coins near an abandoned campsite and pushed hard through the scorching heat on the way back.",
    ],
    quietEvents: [
      "{name} watched a distant eruption paint the sky orange and stood in stunned awe.",
    ],
    closings: [
      "The heat faded behind {name} as they trekked back toward home.",
      "{name} cooled off for a long while before the journey home.",
    ],
  },
  {
    location: "up into the frozen snowy peaks",
    bothEvents: [
      "{name} found a climber's shelter partway up the peak — and inside it, both rest and supplies.",
    ],
    expEvents: [
      "{name} pushed through knee-deep snow, each grueling step building extraordinary endurance.",
      "{name} trained in the blistering cold, moving slowly at first and then faster, always faster.",
    ],
    treasureEvents: [
      "{name} chipped a sealed metal box out of the ice near the summit, filled with frost-covered coins.",
    ],
    coinsExpEvents: [
      "{name} found a climber's coin pouch frozen into the snow and trained relentlessly on the long descent.",
    ],
    quietEvents: [
      "{name} carved a small windbreak from the snow and waited out a blizzard in quiet calm.",
    ],
    closings: [
      "{name} descended the peak as the snowfall gentled into something almost peaceful.",
      "Frost clung to {name} long after the journey home was finished.",
    ],
  },
  {
    location: "into the shimmering crystal caverns",
    bothEvents: [
      "{name} crossed an underground lake on a series of crystal platforms and found treasure on the far bank.",
    ],
    expEvents: [
      "{name} navigated treacherous crystal formations in the dark, honing their instincts with every near-miss.",
      "{name} practised moving silently through the cavern, learning stillness and precision.",
    ],
    treasureEvents: [
      "{name} found a hidden alcove deep in the cavern containing a chest brimming with coins.",
    ],
    coinsExpEvents: [
      "{name} collected scattered coins from the cavern floor and sharpened their reflexes navigating back out.",
    ],
    quietEvents: [
      "{name} gazed at their own reflection fractured across a thousand crystal faces, lost in thought.",
    ],
    closings: [
      "{name} blinked in the sunlight for a long moment after emerging from the cavern.",
      "The crystals rang softly behind {name} as they stepped back outside.",
    ],
  },
  {
    location: "through the foggy misty swamps",
    bothEvents: [
      "{name} stumbled onto a raised platform deep in the swamp where past travelers had left both supplies and markings.",
    ],
    expEvents: [
      "{name} waded through thick mud and tangled roots, every step a challenge and a lesson.",
      "{name} practiced balance on a series of half-submerged logs stretching across the murky water.",
    ],
    treasureEvents: [
      "{name} pulled a waterlogged strongbox from the murk, coins clinking heavily inside.",
    ],
    coinsExpEvents: [
      "{name} fished a coin-filled satchel from the reeds and balanced carefully through the mud on the way home.",
    ],
    quietEvents: [
      "{name} watched a rare bioluminescent creature drift silently through the water and simply marveled.",
    ],
    closings: [
      "{name} emerged from the fog still dripping but undeniably sharper.",
      "The mist thinned as {name} found the path home.",
    ],
  },
  {
    location: "to the crumbling ancient ruins",
    bothEvents: [
      "{name} cracked open a sealed inner chamber and found both an ancient sparring dummy and leftover supplies.",
    ],
    expEvents: [
      "{name} studied battle carvings etched into the walls and absorbed ancient combat wisdom.",
      "{name} climbed and descended every remaining tower, building strength and studying the structure.",
    ],
    treasureEvents: [
      "{name} prised open a sealed vault in the deepest chamber, uncovering a trove of ancient coins.",
    ],
    coinsExpEvents: [
      "{name} found coins scattered around an old offering stone and sparred with the ruins' shadows on the way out.",
    ],
    quietEvents: [
      "{name} deciphered a faded map on the crumbling wall and made careful note of where it pointed.",
    ],
    closings: [
      "{name} left the ruins a little wiser about what came before.",
      "Dust settled behind {name} as they stepped back into the present.",
    ],
  },
  {
    location: "across the endless desert dunes",
    bothEvents: [
      "{name} found a sheltered dune hollow with evidence of a camp — and supplies still left behind.",
    ],
    expEvents: [
      "{name} endured the relentless sun and shifting sands, hardening their resolve with every mile.",
      "{name} practiced long-distance sprints across the dunes until the heat itself felt manageable.",
    ],
    treasureEvents: [
      "{name} dug up a buried strongbox at the base of a dune, packed with sun-bleached coins.",
    ],
    coinsExpEvents: [
      "{name} found a merchant's buried coin stash and sprinted hard through the dunes on the way home.",
    ],
    quietEvents: [
      "{name} reached a small oasis at dusk and rested beneath the stars before turning home.",
    ],
    closings: [
      "Sand shook loose from {name} all the way home.",
      "{name} returned sun-kissed and steadier than before.",
    ],
  },
  {
    location: "out across the vast thunderstorm plains",
    bothEvents: [
      "{name} sheltered under a lone tree as the storm peaked — and found a traveler's bundle stashed in its roots.",
    ],
    expEvents: [
      "{name} ran through the open fields as lightning crackled overhead, faster and faster until the storm felt slow.",
      "{name} trained in the pouring rain, each thunder crack sharpening their focus.",
    ],
    treasureEvents: [
      "{name} found a coin-filled saddlebag half-buried in the storm-churned mud.",
    ],
    coinsExpEvents: [
      "{name} recovered scattered coins from the storm debris and trained hard in the rain on the long walk back.",
    ],
    quietEvents: [
      "{name} stood at the center of the plains as rain poured down, completely unbothered and at peace.",
    ],
    closings: [
      "{name} arrived home soaked but buzzing with energy.",
      "The storm rolled on as {name} headed back, calmer than the sky.",
    ],
  },
  {
    location: "into the softly glowing enchanted grove",
    bothEvents: [
      "{name} earned the trust of a grove guardian who shared both a challenge and a parting gift.",
    ],
    expEvents: [
      "{name} sparred with the shadow creatures of the grove, each one faster and craftier than the last.",
      "{name} meditated in the grove's hum for hours, emerging with heightened instincts.",
    ],
    treasureEvents: [
      "{name} was led by a glowing creature to a mossy chest filled with shimmering coins.",
    ],
    coinsExpEvents: [
      "{name} found coins left at a sacred grove stone and meditated there, returning home sharper for it.",
    ],
    quietEvents: [
      "{name} made friends with a curious glowing creature that followed them all the way to the grove's edge.",
    ],
    closings: [
      "The grove's glow faded slowly behind {name} as they headed home.",
      "{name} looked back once and swore the trees waved goodbye.",
    ],
  },
];

// Items that can be found on adventures (weighted)
const ADVENTURE_ITEM_POOL: { id: ItemId; weight: number }[] = [
  { id: "kibble",       weight: 40 },
  { id: "treat",        weight: 30 },
  { id: "energy_drink", weight: 20 },
  { id: "medicine",     weight: 10 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

function pickWeighted<T>(rng: () => number, pool: { id: T; weight: number }[]): T {
  const total = pool.reduce((n, p) => n + p.weight, 0);
  let roll = rng() * total;
  for (const p of pool) {
    roll -= p.weight;
    if (roll <= 0) return p.id;
  }
  return pool[pool.length - 1].id;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Resolution ─────────────────────────────────────────────────────────────

type EventType = "both" | "exp" | "treasure" | "coins_exp" | "wild_battle" | "quiet";

const EVENT_WEIGHTS: { id: EventType; weight: number }[] = [
  { id: "both",        weight: 22 },
  { id: "exp",         weight: 27 },
  { id: "treasure",    weight: 9  },
  { id: "coins_exp",   weight: 12 },
  { id: "wild_battle", weight: 19 },
  { id: "quiet",       weight: 11 },
];

export function resolveAdventure(
  monsterName:  string,
  seed:         number,
  monsterExp:   number,
  playerLevel:  number,
  playerRpg:    RPGStats,
): AdventureResultData {
  const rng      = seededRandom(seed);
  const scenario = pick(rng, SCENARIOS);
  const event    = pickWeighted(rng, EVENT_WEIGHTS);

  // ── Wild battle: pre-calculate the full battle and defer UI to encounter screen
  if (event === "wild_battle") {
    const wildMonster  = generateWildMonster(playerLevel, rng);
    const battleResult = simulateBattle(
      playerRpg, wildMonster.rpg,
      playerLevel, wildMonster.level,
      monsterExp, rng,
    );
    return {
      narrative:   "",
      itemFound:   null,
      itemObtained: false,
      expGained:   0,
      coinsFound:  0,
      wildBattle:  { wildMonster, battleResult, location: scenario.location },
    };
  }

  const itemFound = event === "both" ? pickWeighted(rng, ADVENTURE_ITEM_POOL) : null;

  // Item + exp:  10 flat + 1–5% of current exp
  // Exp only:    8–18% of current exp
  // Treasure:    1–100 coins, no exp
  // Coins + exp: 1–35 coins + 1–5% of current exp
  // Quiet:       nothing
  let expGained  = 0;
  let coinsFound = 0;
  if (event === "both") {
    expGained = 10 + Math.floor(monsterExp * (rng() * 0.04 + 0.01));
  } else if (event === "exp") {
    expGained = Math.floor(monsterExp * (rng() * 0.10 + 0.08));
  } else if (event === "treasure") {
    coinsFound = Math.floor(rng() * 100) + 1;
  } else if (event === "coins_exp") {
    coinsFound = Math.floor(rng() * 35) + 1;
    expGained  = Math.floor(monsterExp * (rng() * 0.04 + 0.01));
  }

  // Build narrative
  let eventLine: string;
  switch (event) {
    case "exp":       eventLine = pick(rng, scenario.expEvents);       break;
    case "both":      eventLine = pick(rng, scenario.bothEvents);      break;
    case "treasure":  eventLine = pick(rng, scenario.treasureEvents);  break;
    case "coins_exp": eventLine = pick(rng, scenario.coinsExpEvents);  break;
    default:          eventLine = pick(rng, scenario.quietEvents);
  }

  const closing   = pick(rng, scenario.closings);
  const narrative =
    `You send ${monsterName} on an adventure ${scenario.location}. ` +
    `${eventLine.replace(/{name}/g, monsterName)} ` +
    `${closing.replace(/{name}/g, monsterName)}`;

  return { narrative, itemFound, itemObtained: true, expGained, coinsFound, wildBattle: null };
}
