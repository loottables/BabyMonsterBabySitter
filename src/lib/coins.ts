import { STARTING_COINS } from "./constants";

const KEY = "bmbs_coins_v1";
export const COINS_EVENT = "bmbs:coins";

export function loadCoins(): number {
  if (typeof window === "undefined") return STARTING_COINS;
  const raw = localStorage.getItem(KEY);
  if (!raw) return STARTING_COINS;
  const n = parseInt(raw, 10);
  return isNaN(n) ? STARTING_COINS : n;
}

export function saveCoins(n: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, String(n));
  window.dispatchEvent(new CustomEvent<number>(COINS_EVENT, { detail: n }));
}

export function clearCoins() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
