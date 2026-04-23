import type { ItemId } from "@/types/items";
import { ADVENTURE_EXP_BASE, ADVENTURE_EXP_PERCENT } from "./constants";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdventureResultData {
  narrative:    string;
  itemFound:    ItemId | null;
  itemObtained: boolean;   // false if bag was full
  expGained:    number;
}

// ── Scenario library ───────────────────────────────────────────────────────

interface Scenario {
  location:    string;
  itemEvents:  string[];   // {name} placeholder
  expEvents:   string[];
  bothEvents:  string[];   // item + exp
  quietEvents: string[];   // uneventful flavour
  closings:    string[];
}

const SCENARIOS: Scenario[] = [
  {
    location: "along an ancient mountain trail",
    itemEvents: [
      "{name} stumbled upon a traveler's pack half-buried beneath the snow.",
      "{name} found a small bundle wedged between two boulders near a frozen stream.",
    ],
    expEvents: [
      "{name} trained hard against the biting mountain wind, growing stronger with every step.",
      "{name} scaled a sheer rock face, muscles burning, determination unyielding.",
    ],
    bothEvents: [
      "{name} crossed a crumbling rope bridge and on the other side found a forgotten supply cache.",
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
    itemEvents: [
      "{name} discovered a hollow tree stump with a curious bundle tucked inside.",
      "{name} followed a glowing trail of fireflies to a small clearing where something had been left behind.",
    ],
    expEvents: [
      "{name} navigated a labyrinth of twisted roots and low branches, reflexes sharpening with every dodge.",
      "{name} tracked a shadow through the underbrush for hours, learning patience and precision.",
    ],
    bothEvents: [
      "{name} found an abandoned forester's camp and explored it thoroughly, pocketing a useful find.",
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
    itemEvents: [
      "{name} found a washed-up crate tangled in seaweed at the base of the cliffs.",
      "{name} spotted something glinting in a tidal pool — clearly dropped by a passing traveler.",
    ],
    expEvents: [
      "{name} leapt between rocky outcroppings above the crashing surf, building agility with each jump.",
      "{name} braced against the ocean gale for hours, letting the resistance forge stronger footing.",
    ],
    bothEvents: [
      "{name} explored a sea cave exposed by low tide and found both challenge and reward inside.",
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
    itemEvents: [
      "{name} rummaged through an old cottage and found something useful left behind by its former residents.",
      "{name} pried open a dusty cellar door and discovered a small cache of supplies still intact.",
    ],
    expEvents: [
      "{name} explored every crumbling alley and overgrown courtyard, learning the layout of the land.",
      "{name} sparred with their own shadow in an empty cobblestone square for what felt like hours.",
    ],
    bothEvents: [
      "{name} discovered the village well still worked, and nearby found a bundle wrapped in oilcloth.",
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
    itemEvents: [
      "{name} noticed something glinting near a cooled lava pool — clearly dropped by someone in a hurry.",
      "{name} found a heat-resistant pouch resting on a hardened lava shelf.",
    ],
    expEvents: [
      "{name} endured scorching heat and unstable footing, emerging from the fields tougher than before.",
      "{name} practiced quick footwork to avoid the hot patches, each step faster than the last.",
    ],
    bothEvents: [
      "{name} navigated a maze of lava tubes and found both a test of endurance and an unexpected reward.",
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
    itemEvents: [
      "{name} dug through a snowdrift and uncovered an abandoned supply pouch.",
      "{name} followed strange tracks in the snow and found a bundle at the end of them.",
    ],
    expEvents: [
      "{name} pushed through knee-deep snow, each grueling step building extraordinary endurance.",
      "{name} trained in the blistering cold, moving slowly at first and then faster, always faster.",
    ],
    bothEvents: [
      "{name} found a climber's shelter partway up the peak — and inside it, both rest and supplies.",
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
    itemEvents: [
      "{name} followed a faint glow deeper into the cave and found something nestled between two crystals.",
      "{name} pried a small chest from a crystalline formation — clearly placed there intentionally.",
    ],
    expEvents: [
      "{name} navigated treacherous crystal formations in the dark, honing their instincts with every near-miss.",
      "{name} practised moving silently through the cavern, learning stillness and precision.",
    ],
    bothEvents: [
      "{name} crossed an underground lake on a series of crystal platforms and found treasure on the far bank.",
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
    itemEvents: [
      "{name} found a waterproof satchel floating near the reeds at the swamp's edge.",
      "{name} spotted a bundle tied to a post, just above the waterline — still dry.",
    ],
    expEvents: [
      "{name} waded through thick mud and tangled roots, every step a challenge and a lesson.",
      "{name} practiced balance on a series of half-submerged logs stretching across the murky water.",
    ],
    bothEvents: [
      "{name} stumbled onto a raised platform deep in the swamp where past travelers had left both supplies and markings.",
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
    itemEvents: [
      "{name} pried open a dusty chest hidden beneath a collapsed archway.",
      "{name} found a sealed container tucked into a niche in the ruins, untouched for years.",
    ],
    expEvents: [
      "{name} studied battle carvings etched into the walls and absorbed ancient combat wisdom.",
      "{name} climbed and descended every remaining tower, building strength and studying the structure.",
    ],
    bothEvents: [
      "{name} cracked open a sealed inner chamber and found both an ancient sparring dummy and leftover supplies.",
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
    itemEvents: [
      "{name} uncovered a bundle buried just beneath the surface, protected from the sand by thick cloth.",
      "{name} found a sealed canteen and pack near a dried-out oasis marker.",
    ],
    expEvents: [
      "{name} endured the relentless sun and shifting sands, hardening their resolve with every mile.",
      "{name} practiced long-distance sprints across the dunes until the heat itself felt manageable.",
    ],
    bothEvents: [
      "{name} found a sheltered dune hollow with evidence of a camp — and supplies still left behind.",
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
    itemEvents: [
      "{name} spotted something metallic half-buried in the mud left behind by the storm.",
      "{name} found a rain-soaked pack snagged on a fence post in the middle of the open fields.",
    ],
    expEvents: [
      "{name} ran through the open fields as lightning crackled overhead, faster and faster until the storm felt slow.",
      "{name} trained in the pouring rain, each thunder crack sharpening their focus.",
    ],
    bothEvents: [
      "{name} sheltered under a lone tree as the storm peaked — and found a traveler's bundle stashed in its roots.",
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
    itemEvents: [
      "{name} found a small wrapped parcel resting at the base of an ancient glowing tree.",
      "{name} followed a trail of luminous petals to a clearing where something had been carefully left.",
    ],
    expEvents: [
      "{name} sparred with the shadow creatures of the grove, each one faster and craftier than the last.",
      "{name} meditated in the grove's hum for hours, emerging with heightened instincts.",
    ],
    bothEvents: [
      "{name} earned the trust of a grove guardian who shared both a challenge and a parting gift.",
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

type EventType = "item" | "exp" | "both" | "quiet";

const EVENT_WEIGHTS: { id: EventType; weight: number }[] = [
  { id: "both",  weight: 15 },
  { id: "item",  weight: 25 },
  { id: "exp",   weight: 50 },
  { id: "quiet", weight: 10 },
];

export function resolveAdventure(monsterName: string, seed: number, monsterExp: number): AdventureResultData {
  const rng      = seededRandom(seed);
  const scenario = pick(rng, SCENARIOS);
  const event    = pickWeighted(rng, EVENT_WEIGHTS);

  const giveItem = event === "item" || event === "both";
  const giveExp  = event === "exp"  || event === "both";

  const itemFound = giveItem ? pickWeighted(rng, ADVENTURE_ITEM_POOL) : null;
  const expGained = giveExp
    ? ADVENTURE_EXP_BASE + Math.floor(monsterExp * ADVENTURE_EXP_PERCENT)
    : 0;

  // Build narrative
  let eventLine: string;
  switch (event) {
    case "item":  eventLine = pick(rng, scenario.itemEvents); break;
    case "exp":   eventLine = pick(rng, scenario.expEvents);  break;
    case "both":  eventLine = pick(rng, scenario.bothEvents); break;
    default:      eventLine = pick(rng, scenario.quietEvents);
  }

  const closing   = pick(rng, scenario.closings);
  const narrative =
    `You send ${monsterName} on an adventure ${scenario.location}. ` +
    `${eventLine.replace(/{name}/g, monsterName)} ` +
    `${closing.replace(/{name}/g, monsterName)}`;

  return { narrative, itemFound, itemObtained: true, expGained };
}
