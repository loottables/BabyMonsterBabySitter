"use client";

import { useEffect, useRef } from "react";
import type { Monster } from "@/types/game";
import { SPA_COST } from "@/lib/constants";

const PX = 5;
const W  = 64;
const H  = 28;

function drawSpa(ctx: CanvasRenderingContext2D) {
  // Checker floor
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "rgb(38,36,42)" : "rgb(32,30,36)";
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }

  // Pool outer edge
  ctx.fillStyle = "rgb(95,93,100)";
  for (let c = 6; c <= 57; c++) {
    ctx.fillRect(c * PX,  4 * PX, PX, PX);
    ctx.fillRect(c * PX, 23 * PX, PX, PX);
  }
  for (let r = 5; r <= 22; r++) {
    ctx.fillRect( 6 * PX, r * PX, PX, PX);
    ctx.fillRect(57 * PX, r * PX, PX, PX);
  }

  // Pool corners (slightly darker)
  ctx.fillStyle = "rgb(75,73,80)";
  for (const [r, c] of [[4,6],[4,57],[23,6],[23,57]] as const) {
    ctx.fillRect(c * PX, r * PX, PX, PX);
  }

  // Water
  ctx.fillStyle = "rgb(45,80,110)";
  for (let r = 5; r <= 22; r++) {
    for (let c = 7; c <= 56; c++) {
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }

  // Ripple highlights
  ctx.fillStyle = "rgb(75,115,145)";
  for (const [r, c] of [[7,15],[7,30],[7,44],[12,20],[12,38],[12,52],[18,10],[18,28],[18,46],[21,16],[21,42]] as const) {
    ctx.fillRect( c      * PX, r * PX, PX, PX);
    ctx.fillRect((c + 1) * PX, r * PX, PX, PX);
  }

  // Steam wisps
  ctx.fillStyle = "rgb(150,150,155)";
  for (const [r, c] of [[1,16],[2,17],[1,25],[2,26],[2,24],[1,33],[2,33],[2,34],[1,41],[2,42],[1,50],[2,49]] as const) {
    ctx.fillRect(c * PX, r * PX, PX, PX);
  }

  // Left candle body
  ctx.fillStyle = "rgb(165,160,140)";
  for (let r = 9; r <= 17; r++) ctx.fillRect(2 * PX, r * PX, PX, PX);
  // Left candle flame
  ctx.fillStyle = "rgb(200,120,30)";
  ctx.fillRect(2 * PX, 8 * PX, PX, PX);

  // Right candle body
  ctx.fillStyle = "rgb(165,160,140)";
  for (let r = 9; r <= 17; r++) ctx.fillRect(61 * PX, r * PX, PX, PX);
  // Right candle flame
  ctx.fillStyle = "rgb(200,120,30)";
  ctx.fillRect(61 * PX, 8 * PX, PX, PX);
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
