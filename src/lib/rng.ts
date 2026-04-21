export interface RNG {
  next: () => number;              // [0, 1)
  nextInt: (min: number, max: number) => number; // [min, max]
  nextBool: (probability?: number) => boolean;
  pick: <T>(arr: T[]) => T;
}

export function makeRng(seed: number): RNG {
  let s = seed >>> 0;

  const step = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };

  return {
    next: step,
    nextInt: (min, max) => min + Math.floor(step() * (max - min + 1)),
    nextBool: (p = 0.5) => step() < p,
    pick: <T>(arr: T[]) => arr[Math.floor(step() * arr.length)],
  };
}
