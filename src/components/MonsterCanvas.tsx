"use client";

import { useEffect, useRef, useMemo } from "react";
import type { Monster, AnimationState } from "@/types/game";
import { generateMonster, generateEgg, POOP_SPRITE, type PixelGrid } from "@/lib/monsterGenerator";

const PIXEL = 5;          // CSS px per grid pixel
const SIZE  = 64 * PIXEL; // 320 CSS px

// ── helpers ────────────────────────────────────────────────────────────────

function buildOffscreen(grid: PixelGrid): HTMLCanvasElement {
  const oc  = document.createElement("canvas");
  oc.width  = 64;
  oc.height = 64;
  const ctx = oc.getContext("2d")!;
  const img = ctx.createImageData(64, 64);
  for (let i = 0; i < 64 * 64; i++) {
    const v = grid[i];
    if (v === 0) { img.data[i * 4 + 3] = 0; continue; }
    const g = v - 1;
    img.data[i * 4]     = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return oc;
}

function drawPoop(ctx: CanvasRenderingContext2D, px: number, py: number) {
  for (const [dx, dy, v] of POOP_SPRITE) {
    const g = v - 1;
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect((px + dx) * PIXEL, (py + dy) * PIXEL, PIXEL, PIXEL);
  }
}

interface StarData {
  gx: number; gy: number; size: number; speed: number; phase: number;
}

function generateStars(seed: number): StarData[] {
  let s = seed >>> 0;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 0x100000000; };

  const stars: StarData[] = [];

  // 4×3 grid with jitter for even coverage (12 stars)
  const cols = 4, rows = 3;
  const cellW = 60 / cols, cellH = 60 / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      stars.push({
        gx:    2 + Math.floor(col * cellW + rng() * cellW),
        gy:    2 + Math.floor(row * cellH + rng() * cellH),
        size:  1 + Math.floor(rng() * 3),
        speed: 0.4 + rng() * 1.8,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  // 3–4 extra random stars for organic feel
  const extra = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < extra; i++) {
    stars.push({
      gx:    2 + Math.floor(rng() * 60),
      gy:    2 + Math.floor(rng() * 60),
      size:  1 + Math.floor(rng() * 3),
      speed: 0.4 + rng() * 1.8,
      phase: rng() * Math.PI * 2,
    });
  }

  return stars; // 15–16 total
}

function drawStar(ctx: CanvasRenderingContext2D, gx: number, gy: number, size: number) {
  const cx = gx * PIXEL, cy = gy * PIXEL;
  ctx.fillRect(cx, cy, PIXEL, PIXEL);
  if (size >= 2) {
    ctx.fillRect(cx - PIXEL, cy, PIXEL, PIXEL);
    ctx.fillRect(cx + PIXEL, cy, PIXEL, PIXEL);
    ctx.fillRect(cx, cy - PIXEL, PIXEL, PIXEL);
    ctx.fillRect(cx, cy + PIXEL, PIXEL, PIXEL);
  }
  if (size >= 3) {
    ctx.fillRect(cx - 2 * PIXEL, cy, PIXEL, PIXEL);
    ctx.fillRect(cx + 2 * PIXEL, cy, PIXEL, PIXEL);
    ctx.fillRect(cx, cy - 2 * PIXEL, PIXEL, PIXEL);
    ctx.fillRect(cx, cy + 2 * PIXEL, PIXEL, PIXEL);
  }
}

function crackCountFromProgress(p: number): number {
  if (p < 0.50) return 0;
  if (p < 0.70) return 1;
  if (p < 0.85) return 2;
  if (p < 0.95) return 4;
  return 6;
}

// ── backgrounds ───────────────────────────────────────────────────────────

let moonBgCache: HTMLCanvasElement | null = null;

function buildMoonBg(): HTMLCanvasElement {
  const oc = document.createElement("canvas");
  oc.width = oc.height = SIZE;
  const ctx = oc.getContext("2d")!;

  // Horizon curves down from the center outward (~3 grid-rows of drop at the edges)
  const K = 3 / (32 * 32);
  const surfRow = (c: number) => Math.round(32 + K * (c - 32) ** 2);

  // Surface — column-by-column so each column clips to the curved horizon
  for (let col = 0; col < 64; col++) {
    const top = surfRow(col);
    for (let row = top; row < 64; row++) {
      const t = (row - 32) / 32; // 0 = horizon, 1 = bottom
      const v = Math.round(186 - t * 13);
      ctx.fillStyle = `rgb(${v},${v - 2},${v + 10})`;
      ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
    }
  }

  // Light direction: upper-left, normalised
  const lMag = Math.hypot(0.6, 1.0);
  const lx = -0.6 / lMag, ly = -1.0 / lMag;

  // Craters — radial normal shading so highlights/shadows curve with the rim
  const craters = [
    { cx: 10, cy: 43, r: 3.5 },
    { cx: 27, cy: 51, r: 5.5 },
    { cx: 50, cy: 41, r: 4.0 },
    { cx: 14, cy: 58, r: 2.5 },
    { cx: 54, cy: 57, r: 3.0 },
  ];

  for (const { cx, cy, r } of craters) {
    for (let row = Math.floor(cy - r - 1); row <= Math.ceil(cy + r + 1); row++) {
      for (let col = Math.floor(cx - r - 1); col <= Math.ceil(cx + r + 1); col++) {
        if (col < 0 || col >= 64 || row < surfRow(col) || row >= 64) continue;
        const dx = col - cx, dy = row - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r + 0.7) continue;
        const nx = dist > 0.01 ? dx / dist : 0;
        const ny = dist > 0.01 ? dy / dist : 0;
        let v: number;
        if (dist < r - 0.5) {
          // Bowl interior: deeper = darker; wall facing light is brighter
          const depth = 1 - dist / r;
          const face  = nx * lx + ny * ly;
          v = Math.round(160 + face * 16 - depth * 24);
        } else {
          // Raised rim: lit where the outward normal points toward the light
          const face = -(nx * lx + ny * ly);
          v = Math.round(174 + face * 42);
        }
        v = Math.max(90, Math.min(225, v));
        ctx.fillStyle = `rgb(${v},${v - 2},${v + 10})`;
        ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
      }
    }
  }

  // Small rocks — irregular pixel clusters with a top highlight and right shadow
  const rocks: { gc: number; gr: number; pixels: [number, number][] }[] = [
    { gc: 5,  gr: 38, pixels: [[0,0],[1,0],[0,-1]] },
    { gc: 19, gr: 45, pixels: [[0,0],[1,0],[2,0],[1,-1]] },
    { gc: 37, gr: 40, pixels: [[0,0],[1,0]] },
    { gc: 42, gr: 54, pixels: [[0,0],[1,0],[0,-1]] },
    { gc: 58, gr: 47, pixels: [[0,0],[1,0],[2,0]] },
    { gc: 8,  gr: 57, pixels: [[0,0],[1,0]] },
    { gc: 46, gr: 61, pixels: [[0,0],[1,0]] },
    { gc: 31, gr: 36, pixels: [[0,0]] },
    { gc: 21, gr: 60, pixels: [[0,0],[1,0],[0,-1]] },
  ];

  for (const { gc, gr, pixels } of rocks) {
    if (gr < surfRow(gc)) continue;
    for (const [dc, dr] of pixels) {
      const col = gc + dc, row = gr + dr;
      if (col < 0 || col >= 64 || row < 0 || row >= 64) continue;
      if (row < surfRow(col)) continue;
      const v = dr < 0 ? 195 : 158; // top face lighter
      ctx.fillStyle = `rgb(${v},${v - 2},${v + 10})`;
      ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
    }
    // Shadow pixel to the right
    const shadowCol = gc + Math.max(...pixels.map(([dc]) => dc)) + 1;
    if (shadowCol < 64 && gr < 64 && gr >= surfRow(shadowCol)) {
      ctx.fillStyle = "rgb(108,106,122)";
      ctx.fillRect(shadowCol * PIXEL, gr * PIXEL, PIXEL, PIXEL);
    }
  }

  return oc;
}

function drawMoonBackground(ctx: CanvasRenderingContext2D) {
  if (!moonBgCache) moonBgCache = buildMoonBg();
  ctx.drawImage(moonBgCache, 0, 0);
}

// ── component ─────────────────────────────────────────────────────────────

interface Props {
  monster: Monster;
  anim:    AnimationState;
  bare?:   boolean;
}

const FRAME_MS = 1000 / 5; // ~5 fps

export default function MonsterCanvas({ monster, anim, bare }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const startRef     = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const animRef      = useRef<AnimationState>(anim);
  const monsterRef   = useRef<Monster>(monster);

  // Egg offscreen cache: only rebuilt when crackCount threshold changes
  const eggCacheRef = useRef<{ count: number; oc: HTMLCanvasElement } | null>(null);

  // Monster sprite: regenerated only when seed changes
  const grid  = useMemo(() => generateMonster(monster.seed), [monster.seed]);
  const stars = useMemo(() => generateStars(monster.seed),   [monster.seed]);
  const starsRef = useRef<StarData[]>(stars);
  useEffect(() => { starsRef.current = stars; }, [stars]);

  useEffect(() => { animRef.current    = anim;    }, [anim]);
  useEffect(() => { monsterRef.current = monster; }, [monster]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const monsterOC = buildOffscreen(grid);
    startRef.current = performance.now();

    function frame(ts: number) {
      if (ts - lastFrameRef.current < FRAME_MS) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      lastFrameRef.current = ts;

      const elapsed = ts - startRef.current;
      const m       = monsterRef.current;
      const curAnim = animRef.current;

      ctx.clearRect(0, 0, SIZE, SIZE);
      drawMoonBackground(ctx);

      // ── EGG branch ─────────────────────────────────────────────────────
      if (!m.isHatched) {
        const totalMs   = m.hatchTime - m.birthday;
        const progress  = totalMs > 0
          ? Math.min(1, (Date.now() - m.birthday) / totalMs)
          : 0;
        const cracks    = crackCountFromProgress(progress);

        // Rebuild egg offscreen only when crack threshold changes
        if (!eggCacheRef.current || eggCacheRef.current.count !== cracks) {
          eggCacheRef.current = { count: cracks, oc: buildOffscreen(generateEgg(m.seed, cracks)) };
        }
        const eggOC = eggCacheRef.current.oc;

        // Wobble increases with progress; gentle bob otherwise
        const wobbleStrength = progress > 0.70 ? (progress - 0.70) / 0.30 : 0;
        const xOff = wobbleStrength > 0
          ? Math.sin(elapsed / 130) * wobbleStrength * 4
          : 0;
        const yOff = wobbleStrength > 0
          ? -Math.abs(Math.sin(elapsed / 200)) * wobbleStrength * 3
          : Math.sin(elapsed / 700) * 1;

        ctx.save();
        ctx.translate(SIZE / 2 + xOff * PIXEL, SIZE / 2 + yOff * PIXEL);
        ctx.translate(-SIZE / 2, -SIZE / 2);
        ctx.drawImage(eggOC, 0, 0, SIZE, SIZE);
        ctx.restore();

        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      // ── MONSTER branch ──────────────────────────────────────────────────
      let yOff = 0, xScale = 1, yScale = 1, alpha = 1;

      if (curAnim === "idle") {
        yOff = Math.sin(elapsed / 520) * 2.5;
      } else if (curAnim === "eating") {
        const t = (elapsed % 700) / 700;
        yScale = 1 + Math.sin(t * Math.PI) * 0.14;
        xScale = 1 - Math.sin(t * Math.PI) * 0.07;
      } else if (curAnim === "training") {
        yOff = -Math.abs(Math.sin(elapsed / 220)) * 9;
      } else if (curAnim === "cleaning") {
        xScale = 1 + Math.sin(elapsed / 120) * 0.05;
      } else if (curAnim === "happy") {
        yOff   = Math.sin(elapsed / 200) * 4;
        xScale = 1 + Math.sin(elapsed / 180) * 0.04;
      } else if (curAnim === "dead") {
        yOff  = Math.min(30, elapsed / 80);
        alpha = Math.max(0, 1 - elapsed / 2500);
      }

      // Draw shiny stars behind monster (fixed position, not affected by monster animation)
      if (m.isShiny) {
        ctx.fillStyle = "rgb(255,255,255)";
        for (const star of starsRef.current) {
          const flicker = (Math.sin(elapsed / 400 * star.speed + star.phase) + 1) / 2;
          ctx.globalAlpha = 0.1 + flicker * 0.9;
          drawStar(ctx, star.gx, star.gy, star.size);
        }
        ctx.globalAlpha = 1;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      const cx = SIZE / 2, cy = SIZE / 2;
      ctx.translate(cx, cy + yOff * PIXEL);
      ctx.scale(xScale, yScale);
      ctx.translate(-cx, -cy);
      ctx.drawImage(monsterOC, 0, 0, SIZE, SIZE);
      ctx.restore();

      for (const poop of m.poops) {
        const px = Math.round(poop.x * 54);
        const py = Math.round(poop.y * 54) + 4;
        drawPoop(ctx, px, py);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [grid]);

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className={bare ? "" : "rounded-xl border-2 border-monster-border bg-monster-bg"}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
