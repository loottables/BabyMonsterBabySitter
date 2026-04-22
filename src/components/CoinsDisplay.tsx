"use client";

import { useEffect, useState } from "react";
import { loadCoins, COINS_EVENT } from "@/lib/coins";

export default function CoinsDisplay() {
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    setCoins(loadCoins());
    const handler = (e: Event) => setCoins((e as CustomEvent<number>).detail);
    window.addEventListener(COINS_EVENT, handler);
    return () => window.removeEventListener(COINS_EVENT, handler);
  }, []);

  if (coins === null) return null;

  return (
    <div className="flex items-center gap-2 border border-monster-border px-3 py-1.5">
      <span className="text-xs text-monster-muted uppercase tracking-wide">Coins</span>
      <span className="text-sm font-bold text-monster-text tabular-nums">{coins.toLocaleString()}</span>
    </div>
  );
}
