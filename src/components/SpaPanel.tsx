"use client";

import { useEffect, useRef } from "react";
import type { Monster } from "@/types/game";
import { SPA_COST } from "@/lib/constants";

const PX = 5;
const W  = 64;
const H  = 28;

function px(ctx: CanvasRenderingContext2D, c: number, r: number, v: number) {
  ctx.fillStyle = `rgb(${v},${v},${v})`;
  ctx.fillRect(c * PX, r * PX, PX, PX);
}

function drawSpa(ctx: CanvasRenderingContext2D) {
  // ── Sky ──────────────────────────────────────────────────────────────
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const v = 16 + Math.min(r * 2, 18); // subtle top-to-horizon gradient
      ctx.fillStyle = `rgb(${v},${Math.round(v * 0.95)},${v + 5})`;
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }

  // Stars
  for (const [r, c] of [[0,7],[1,18],[0,29],[1,38],[0,50],[1,58],[2,12],[0,44]] as const)
    px(ctx, c, r, 175);

  // ── Ground ───────────────────────────────────────────────────────────
  for (let r = 18; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const v = 36 + ((c * 5 + r * 7) % 6);
      px(ctx, c, r, v);
    }
  }
  // Stone path (center)
  for (let r = 18; r < H; r++) {
    for (let c = 25; c <= 39; c++) {
      const v = 55 + ((c * 3 + r * 9) % 9);
      px(ctx, c, r, v);
    }
  }

  // ── Mountain silhouettes ─────────────────────────────────────────────
  const leftPeaks  = [12,11,10,9,8,8,7,8,9,10,11,12,13,14,15,16,17];
  const rightPeaks = [17,16,15,14,13,12,11,10,9,8,8,7,8,9,10,11,12];
  for (let c = 0; c < 17; c++) {
    for (let r = leftPeaks[c]; r < 19; r++) px(ctx, c, r, 36);
  }
  for (let i = 0; i < 17; i++) {
    const c = 47 + i;
    for (let r = rightPeaks[i]; r < 19; r++) px(ctx, c, r, 36);
  }

  // ── Building walls ───────────────────────────────────────────────────
  for (let r = 8; r < 18; r++)
    for (let c = 17; c <= 47; c++) px(ctx, c, r, 60);

  // Paper screens (lit from inside) — grid lines give shoji look
  for (const [wl, wr] of [[19, 26], [38, 45]] as const) {
    for (let r = 9; r <= 14; r++) {
      for (let c = wl; c <= wr; c++) {
        const v = 148 + (r % 2 === 0 ? 8 : 0) + (c % 3 === 0 ? 12 : 0);
        px(ctx, c, r, v);
      }
    }
    // Frame
    ctx.fillStyle = "rgb(40,38,46)";
    for (let r = 9; r <= 14; r++) {
      ctx.fillRect((wl - 1) * PX, r * PX, PX, PX);
      ctx.fillRect((wr + 1) * PX, r * PX, PX, PX);
    }
    for (let c = wl - 1; c <= wr + 1; c++) {
      ctx.fillRect(c * PX, 8 * PX, PX, PX);
      ctx.fillRect(c * PX, 15 * PX, PX, PX);
    }
  }

  // Door
  for (let r = 13; r < 18; r++)
    for (let c = 29; c <= 35; c++) px(ctx, c, r, 28);

  // ── Roof (tiered Japanese style) ─────────────────────────────────────
  // Each level: [row, leftCol, rightCol]
  const roofLevels: [number, number, number][] = [
    [7, 13, 51], // eave (widest)
    [6, 17, 47],
    [5, 20, 44],
    [4, 23, 41],
    [3, 26, 38],
    [2, 28, 36],
    [1, 30, 34],
  ];
  for (const [row, lc, rc] of roofLevels) {
    const v = row <= 3 ? 82 : row <= 5 ? 68 : 56;
    for (let c = lc; c <= rc; c++) px(ctx, c, row, v);
  }
  // Upturned eave tips (most Japanese-distinctive feature)
  for (const [r, c, v] of [[7,12,56],[6,11,56],[5,10,56],[7,52,56],[6,53,56],[5,54,56]] as const)
    px(ctx, c, r, v);
  // Ridge finial
  for (const [r, c] of [[0,31],[0,32],[0,33]] as const) px(ctx, c, r, 90);

  // Hanging lanterns
  for (const lc of [21, 42] as const) {
    px(ctx, lc, 8, 62);
    px(ctx, lc, 9, 62);
    px(ctx, lc, 10, 68);  px(ctx, lc + 1, 10, 68);  // cap
    px(ctx, lc, 11, 168); px(ctx, lc + 1, 11, 168); // lit body
    px(ctx, lc, 12, 168); px(ctx, lc + 1, 12, 168);
    px(ctx, lc, 13, 62);  px(ctx, lc + 1, 13, 62);  // bottom
  }

  // ── Pool/onsen (foreground) ──────────────────────────────────────────
  const pCX = 32, pCY = 22, pA = 14, pB = 3;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const dx = (c - pCX) / pA, dy = (r - pCY) / pB;
      const d  = dx * dx + dy * dy;
      if (d <= 1) {
        const v = 48 + ((c * 3 + r * 5) % 8);
        px(ctx, c, r, v);
      } else if (d <= 1.7) {
        const n = (c * 7 + r * 3) % 6;
        px(ctx, c, r, n < 2 ? 70 : 88);
      }
    }
  }

  // Bubbles [col, row, size]
  for (const [bc, br, size] of [[27,22,2],[34,21,2],[31,23,1],[38,22,1],[25,22,1]] as const) {
    const dx = (bc - pCX) / pA, dy = (br - pCY) / pB;
    if (dx * dx + dy * dy > 0.72) continue;
    const v = 108 + size * 26, dim = Math.round(v * 0.72);
    px(ctx, bc, br, v);
    if (size >= 2) {
      for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]] as const)
        px(ctx, bc + dc, br + dr, dim);
    }
  }

  // Steam rising from pool
  for (const [r, c, v] of [
    [21,28,115],[20,29,105],[19,28,95],[18,30,85],[17,29,72],[16,30,60],
    [21,34,115],[20,33,105],[19,34,92],[18,33,80],[17,34,68],
    [21,38,110],[20,39,100],[19,38,88],[18,37,76],
  ] as const) px(ctx, c, r, v);

  // ── Bamboo (drawn last so it layers in front) ────────────────────────
  const leftStalks:  [number, number][] = [[3,4],[5,2],[8,5],[10,7],[12,3]];
  const rightStalks: [number, number][] = [[52,5],[54,2],[57,4],[59,7],[61,3]];
  for (const [bc, topR] of [...leftStalks, ...rightStalks]) {
    // Stalk
    for (let r = topR; r < 19; r++) px(ctx, bc, r, r % 5 === 1 ? 62 : 92);
    // Leaves (two diagonal pairs at top)
    const leafV = 112;
    px(ctx, bc - 1, topR,     leafV); px(ctx, bc - 2, topR - 1, leafV);
    px(ctx, bc + 1, topR,     leafV); px(ctx, bc + 2, topR - 1, leafV);
    px(ctx, bc,     topR - 1, leafV); px(ctx, bc - 1, topR - 2, leafV);
  }
}

function SpaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawSpa(ctx);
  }, []);
  return (
    <canvas
      ref={ref}
      width={W * PX}
      height={H * PX}
      style={{ imageRendering: "pixelated", width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

interface Props {
  coins:   number;
  monster: Monster;
  onEnter: () => void;
  onClose: () => void;
}

export default function SpaPanel({ coins, monster, onEnter, onClose }: Props) {
  const canAfford = coins >= SPA_COST;
  const canEnter  = !monster.isDead && !monster.isAdventuring && !monster.isSleeping && !monster.isAtSpa;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-6 w-full max-w-sm border border-monster-border bg-monster-panel max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Spa image */}
        <div className="w-full border-b border-monster-border shrink-0 overflow-hidden" style={{ height: 140 }}>
          <SpaCanvas />
        </div>

        <div className="flex flex-col gap-5 px-6 pb-8">
          {/* Header */}
          <div className="grid grid-cols-3 items-center">
            <h2 style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest">
              Spa
            </h2>
            <span style={{ fontSize: "7px" }} className="text-monster-muted uppercase tracking-wide tabular-nums text-center">
              {coins} coins
            </span>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                style={{ fontSize: "18px" }}
                className="text-monster-muted hover:text-monster-text transition-colors leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
            Let your monster enjoy time at the spa to get cleaned up and relax!
          </p>

          {/* Benefits */}
          <ul className="flex flex-col gap-1">
            {["Cleanliness: Full", "HP: Full", `Happiness: +${20}`, "Energy: +1"].map(s => (
              <li key={s} style={{ fontSize: "6px" }} className="text-monster-text uppercase tracking-wide">
                + {s}
              </li>
            ))}
          </ul>

          <p style={{ fontSize: "6px" }} className="text-monster-muted">
            Takes 1 minute. Costs {SPA_COST} coins.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              style={{ fontSize: "7px" }}
              className="flex-1 px-4 py-3 border border-monster-border bg-monster-panel text-monster-muted uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
            >
              Leave
            </button>
            <button
              onClick={onEnter}
              disabled={!canAfford || !canEnter}
              title={!canAfford ? "Not enough coins" : !canEnter ? "Monster can't visit the spa right now" : undefined}
              style={{ fontSize: "7px" }}
              className="flex-1 px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {canAfford ? `Enter (${SPA_COST}¢)` : "Not enough coins"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
