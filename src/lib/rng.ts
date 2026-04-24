// Seeded pseudo-random number generator using the LCG (Linear Congruential Generator) algorithm.
// The same seed always produces the same sequence of numbers, so monster visuals and adventure
// outcomes are deterministic and reproducible.
//
// Used by:
//   - monsterGenerator.ts  (visual appearance — same seed = same monster every render)
//   - adventureEngine.ts   (adventure outcomes — adventureStart timestamp is the seed)

export interface RNG {
  next: () => number;              // [0, 1)
  nextInt: (min: number, max: number) => number; // [min, max] inclusive
  nextBool: (probability?: number) => boolean;
  pick: <T>(arr: T[]) => T;       // picks one item from an array at random
}

export function makeRng(seed: number): RNG {
  // s is the current generator state; >>> 0 converts to an unsigned 32-bit integer
  let s = seed >>> 0;

  // Each call advances the state and returns a value in [0, 1)
  const step = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;  // LCG formula; | 0 keeps it 32-bit
    return (s >>> 0) / 4294967296;                  // 4294967296 = 2^32, normalizes to [0, 1)
  };

  return {
    next: step,
    nextInt: (min, max) => min + Math.floor(step() * (max - min + 1)),
    nextBool: (p = 0.5) => step() < p,
    pick: <T>(arr: T[]) => arr[Math.floor(step() * arr.length)],
  };
}
