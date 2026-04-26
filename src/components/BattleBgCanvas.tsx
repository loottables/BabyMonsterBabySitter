"use client";

import { useEffect, useRef } from "react";

// Natural canvas size: 400 × 175 px (80 × 35 grid @ 5 px/cell)
// When used in the 320px encounter panel, overflow:hidden clips ~40px per side.
const W  = 80;
const H  = 35;
const PX = 5;

function drawBg(ctx: CanvasRenderingContext2D) {
  function px(c: number, r: number, v: number) {
    if (c < 0 || c >= W || r < 0 || r >= H) return;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(c * PX, r * PX, PX, PX);
  }

  const groundRow = Math.round(H * 2 / 3); // row 23 — lower 1/3 is ground

  // ── Sky ──────────────────────────────────────────────────────────────────
  for (let r = 0; r < groundRow; r++) {
    for (let c = 0; c < W; c++) {
      const v = 13 + Math.round(r * (28 / groundRow));
      ctx.fillStyle = `rgb(${v},${v},${Math.round(v * 1.07)})`;
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }

  // Stars
  for (const [r, c0] of [[0,7],[0,18],[1,30],[0,44],[1,59],[0,69],[2,38],[1,13],[0,54]] as const)
    px(Math.round(c0 * W / 80), r, 168);

  // Clouds
  for (const [r, cs0, len0] of [[5,8,10],[6,11,6],[4,52,9],[5,55,5]] as const) {
    const cs  = Math.round(cs0  * W / 80);
    const len = Math.max(1, Math.round(len0 * W / 80));
    for (let c = cs; c < cs + len && c < W; c++) px(c, r, 34);
  }

  // ── Distant hill silhouettes ─────────────────────────────────────────────
  for (const [lc0, rc0, pk0] of [
    [0,16,18],[10,28,21],[22,38,19],
    [50,66,20],[60,76,18],[72,80,22],
  ] as const) {
    const lc  = Math.round(lc0 * W / 80);
    const rc  = Math.round(rc0 * W / 80);
    const pk  = Math.round(pk0 * groundRow / 28);
    const mid = (lc + rc) / 2;
    for (let c = lc; c < rc && c < W; c++) {
      const t    = Math.abs(c - mid) / ((rc - lc) / 2);
      const topR = Math.round(pk + t * t * (groundRow - 1 - pk));
      for (let r = topR; r < groundRow; r++) px(c, r, 26);
    }
  }

  // ── Japanese city silhouette ──────────────────────────────────────────────
  for (const [c0, topR0, w0] of [
    [4,23,3],[8,20,2],[12,22,3],
    [57,22,2],[61,24,3],[65,20,2],[69,22,3],[73,23,2],
  ] as const) {
    const c    = Math.round(c0 * W / 80);
    const w    = Math.max(1, Math.round(w0 * W / 80));
    const topR = Math.round(topR0 * groundRow / 28);
    for (let r = topR; r < groundRow - 1; r++)
      for (let dc = 0; dc < w; dc++) px(c + dc, r, 33);
  }

  // ── Pagoda (3-tier, center) ───────────────────────────────────────────────
  for (const [r0, lc0, rc0] of [
    [9,39,39],[10,38,40],[11,36,42],[12,38,40],[13,36,42],
    [14,34,44],[15,33,45],[16,36,42],[17,36,42],
    [18,31,47],[19,30,48],
    [20,34,44],[21,34,44],[22,34,44],[23,34,44],
    [24,33,45],[25,33,45],[26,33,45],
  ] as const) {
    const r  = Math.round(r0  * groundRow / 28);
    const lc = Math.round(lc0 * W / 80);
    const rc = Math.round(rc0 * W / 80);
    for (let c = lc; c <= rc; c++) px(c, r, 35);
  }

  // ── Tree line ────────────────────────────────────────────────────────────
  function drawTree(tc0: number, topR0: number, rad0: number) {
    const tc   = Math.round(tc0  * W / 80);
    const topR = Math.round(topR0 * groundRow / 28);
    const rad  = Math.max(2, Math.round(rad0 * W / 80));
    for (let r = topR; r < topR + rad * 2; r++) {
      for (let c = tc - rad; c <= tc + rad; c++) {
        const dy = r - (topR + rad * 0.65), dx = c - tc;
        if (dy * dy / (rad * rad * 0.95) + dx * dx / (rad * rad) <= 1) px(c, r, 30);
      }
    }
    for (let r = topR + rad; r < groundRow; r++) px(tc, r, 27);
  }
  drawTree(2,21,4); drawTree(9,23,3); drawTree(24,22,3);
  drawTree(55,21,4); drawTree(71,20,5); drawTree(77,23,3);

  // ── Ground (lower 1/3) ───────────────────────────────────────────────────
  for (let r = groundRow; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const n = (c * 7 + r * 11) % 19;
      px(c, r, n < 5 ? 24 + n * 2 : 36 + (c * 3 + r * 7) % 14);
    }
  }
  for (let r = groundRow + 1; r < H - 1; r++) {
    for (let c = 0; c < W; c++) {
      if ((c * 11 + r * 13) % 17 === 0) px(c, r, 58);
      if ((c * 17 + r *  9) % 23 === 0) px(c, r, 50);
    }
  }

  // ── Tall grass belt (Pokémon style, 3 rows) ──────────────────────────────
  const g1 = groundRow + 3, g2 = groundRow + 7, g3 = groundRow + 12;

  // Back row (shortest)
  for (let c = 0; c < W; c++) {
    if ((c * 3) % 5 >= 2) continue;
    const h = 3 + c % 3;
    for (let r = g1 - h; r <= g1; r++) px(c, r, 46 + Math.round(((r - (g1 - h)) / h) * 12));
    px(c + (c % 2 === 0 ? -1 : 1), g1 - h - 1, 54);
  }

  // Mid row
  for (let c = 0; c < W; c++) {
    if ((c * 7 + 3) % 5 >= 3) continue;
    const h = 5 + c % 3;
    for (let r = g2 - h; r <= g2; r++) px(c, r, 54 + Math.round(((r - (g2 - h)) / h) * 16));
    px(c + (c % 3 === 0 ? -1 : 1), g2 - h - 1, 64);
  }

  // Front row (tallest, forked tips)
  for (let c = 0; c < W; c += 2) {
    const h = 7 + (c * 5) % 3;
    for (let r = g3 - h; r <= g3; r++) {
      const v = 64 + Math.round(((r - (g3 - h)) / h) * 18);
      px(c, r, v);
      if (c + 1 < W) px(c + 1, r, v - 8);
    }
    const lean = c % 4 < 2 ? -1 : 1;
    px(c + lean, g3 - h - 1, 76);
    px(c - lean, g3 - h - 1, 70);
  }
}

export default function BattleBgCanvas({ style }: { style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawBg(ctx);
  }, []);
  return (
    <canvas
      ref={ref}
      width={W * PX}
      height={H * PX}
      style={{ imageRendering: "pixelated", display: "block", ...style }}
    />
  );
}
