// Monster canvas background scenes.
// drawTownBackground is the current default.
// drawMoonBackground is kept for future use as an unlockable background.

const PIXEL = 5;
const SIZE  = 64 * PIXEL; // 320 CSS px

// ── Moon background ───────────────────────────────────────────────────────────

let moonBgCache: HTMLCanvasElement | null = null;

function buildMoonBg(): HTMLCanvasElement {
  const oc = document.createElement("canvas");
  oc.width = oc.height = SIZE;
  const ctx = oc.getContext("2d")!;

  const K       = 3 / (32 * 32);
  const surfRow = (c: number) => Math.round(32 + K * (c - 32) ** 2);

  for (let col = 0; col < 64; col++) {
    const top = surfRow(col);
    for (let row = top; row < 64; row++) {
      const t = (row - 32) / 32;
      const v = Math.round(186 - t * 13);
      ctx.fillStyle = `rgb(${v},${v - 2},${v + 10})`;
      ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
    }
  }

  const lMag = Math.hypot(0.6, 1.0);
  const lx = -0.6 / lMag, ly = -1.0 / lMag;

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
          const depth = 1 - dist / r;
          const face  = nx * lx + ny * ly;
          v = Math.round(160 + face * 16 - depth * 24);
        } else {
          const face = -(nx * lx + ny * ly);
          v = Math.round(174 + face * 42);
        }
        v = Math.max(90, Math.min(225, v));
        ctx.fillStyle = `rgb(${v},${v - 2},${v + 10})`;
        ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
      }
    }
  }

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
      if (col < 0 || col >= 64 || row < 0 || row >= 64 || row < surfRow(col)) continue;
      const v = dr < 0 ? 195 : 158;
      ctx.fillStyle = `rgb(${v},${v - 2},${v + 10})`;
      ctx.fillRect(col * PIXEL, row * PIXEL, PIXEL, PIXEL);
    }
    const shadowCol = gc + Math.max(...pixels.map(([dc]) => dc)) + 1;
    if (shadowCol < 64 && gr < 64 && gr >= surfRow(shadowCol)) {
      ctx.fillStyle = "rgb(108,106,122)";
      ctx.fillRect(shadowCol * PIXEL, gr * PIXEL, PIXEL, PIXEL);
    }
  }

  return oc;
}

export function drawMoonBackground(ctx: CanvasRenderingContext2D): void {
  if (!moonBgCache) moonBgCache = buildMoonBg();
  ctx.drawImage(moonBgCache, 0, 0);
}

// ── Town background (default) ─────────────────────────────────────────────────

let townBgCache: HTMLCanvasElement | null = null;

function buildTownBg(): HTMLCanvasElement {
  const oc = document.createElement("canvas");
  oc.width = oc.height = SIZE;
  const ctx = oc.getContext("2d")!;

  const W = 64, H = 64, PX = PIXEL;
  const horizonRow = 48;
  const TC = 32, TV = 52, TP = 7;
  const pathL = TC - 5, pathR = TC + 5;

  function px(c: number, r: number, v: number) {
    if (c < 0 || c >= W || r < 0 || r >= H) return;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(c * PX, r * PX, PX, PX);
  }

  // ── Sky (daytime) ───────────────────────────────────────────────────────────
  for (let r = 0; r < horizonRow; r++) {
    for (let c = 0; c < W; c++) {
      const v = 70 + Math.round(r * 14 / horizonRow);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }

  // Fluffy clouds
  for (const [r, l, re] of [
    [7,5,15],[8,4,17],[9,3,18],[10,4,17],[11,5,15],[12,7,13],
  ] as const) {
    for (let c = l; c <= re && c < W; c++) {
      const v = 94 + Math.round((1 - Math.abs(r - 9) / 5) * 12);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }
  for (const [r, l, re] of [
    [13,41,51],[14,39,53],[15,38,54],[16,39,53],[17,41,51],[18,43,49],
  ] as const) {
    for (let c = l; c <= re && c < W; c++) {
      const v = 92 + Math.round((1 - Math.abs(r - 15) / 4) * 12);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }
  for (const [r, l, re] of [[4,49,57],[5,48,58],[6,49,57]] as const) {
    for (let c = l; c <= re && c < W; c++) {
      ctx.fillStyle = "rgb(91,91,91)";
      ctx.fillRect(c * PX, r * PX, PX, PX);
    }
  }

  // ── Distant hills ───────────────────────────────────────────────────────────
  for (const [lc, rc, pk] of [
    [0,20,30],[14,32,28],[28,46,26],[42,58,29],[54,64,32],
  ] as const) {
    const mid = (lc + rc) / 2;
    for (let c = lc; c < rc && c < W; c++) {
      const t    = Math.abs(c - mid) / ((rc - lc) / 2);
      const topR = Math.round(pk + t * t * (horizonRow - 1 - pk));
      for (let r = topR; r < horizonRow; r++) px(c, r, 60);
    }
  }

  // ── Distant city clusters ───────────────────────────────────────────────────
  for (const [c, topR, w] of [
    [1,32,2],[4,29,2],[7,33,2],[10,30,2],
    [53,33,2],[56,30,2],[59,34,2],
  ] as const) {
    for (let r = topR; r < horizonRow - 1; r++)
      for (let dc = 0; dc < w; dc++) px(c + dc, r, 50);
  }

  // ── Distant pagoda (right background) ──────────────────────────────────────
  for (const [r, lc, rc] of [
    [16,49,49],[17,48,50],[18,46,52],[19,48,50],[20,48,50],[21,44,54],
    [22,46,52],[23,46,52],[24,42,56],[25,44,54],[26,44,54],[27,44,54],
    [28,40,58],[29,42,56],[30,43,55],[31,43,55],[32,43,55],[33,43,55],
    [34,43,55],[35,42,56],
  ] as const) {
    for (let c = lc; c <= rc; c++) px(c, r, 52);
  }

  // ── Trees ───────────────────────────────────────────────────────────────────
  function drawTree(tc: number, topR: number, rad: number, v: number) {
    for (let r = topR; r < topR + rad * 2; r++) {
      for (let c = tc - rad; c <= tc + rad; c++) {
        const dy = r - (topR + rad * 0.65), dx = c - tc;
        if (dy * dy / (rad * rad * 0.95) + dx * dx / (rad * rad) <= 1) px(c, r, v);
      }
    }
    for (let r = topR + rad; r <= horizonRow; r++) px(tc, r, v - 5);
  }
  drawTree(11, 33, 5, 54);
  drawTree(53, 31, 6, 52);
  drawTree(20, 40, 3, 55);
  drawTree(44, 39, 3, 53);

  // ── Modern buildings ────────────────────────────────────────────────────────
  function drawBuilding(left: number, top: number, right: number, fill: number, win: number) {
    for (let r = top; r < horizonRow; r++)
      for (let c = left; c <= right; c++) px(c, r, fill);
    for (let c = left; c <= right; c++) px(c, top, fill + 7);
    for (let r = top + 3; r < horizonRow - 2; r += 4)
      for (let c = left + 2; c + 1 <= right - 1; c += 4) {
        px(c, r, win); px(c + 1, r, win);
        if (r + 1 < horizonRow - 2) { px(c, r + 1, win); px(c + 1, r + 1, win); }
      }
  }

  function roofDetails(c: number, topRow: number, fill: number) {
    px(c,     topRow - 2, fill + 4); px(c + 1, topRow - 2, fill + 4);
    px(c,     topRow - 1, fill + 4); px(c + 1, topRow - 1, fill + 4);
    px(c,     topRow - 3, fill + 2);
  }

  // Left cluster
  drawBuilding(0, 23, 8, 44, 63);   roofDetails(2, 23, 44);
  drawBuilding(9, 35, 22, 47, 66);  roofDetails(13, 35, 47);
  drawBuilding(0, 41, 7, 50, 68);
  for (let c = 1; c <= 6; c++) { px(c, 44, 70); px(c, 45, 70); px(c, 46, 70); }

  // Right cluster
  drawBuilding(55, 21, 63, 43, 62); roofDetails(58, 21, 43);
  drawBuilding(41, 33, 54, 46, 65); roofDetails(44, 33, 46);
  drawBuilding(56, 40, 63, 50, 68);
  for (let c = 57; c <= 62; c++) { px(c, 43, 70); px(c, 44, 70); px(c, 45, 70); }

  // ── Torii gate (center) ─────────────────────────────────────────────────────
  for (let c = TC - TP - 4; c <= TC + TP + 4; c++) {
    const dist = Math.abs(c - TC);
    px(c, dist >= TP + 3 ? 34 : dist >= TP + 2 ? 35 : 36, TV);
  }
  for (let c = TC - TP - 2; c <= TC + TP + 2; c++) px(c, 38, TV);
  for (let r = 37; r < horizonRow; r++) {
    px(TC - TP,     r, TV); px(TC - TP - 1, r, TV);
    px(TC + TP,     r, TV); px(TC + TP + 1, r, TV);
  }
  for (let c = TC - TP - 2; c <= TC + TP + 2; c++) px(c, 42, TV);

  // ── Stone lanterns flanking gate ────────────────────────────────────────────
  for (const lc of [TC - TP - 5, TC + TP + 4] as const) {
    const LV = 54;
    px(lc, 43, LV); px(lc + 1, 43, LV);
    px(lc - 1, 44, LV); px(lc, 44, LV); px(lc + 1, 44, LV); px(lc + 2, 44, LV);
    px(lc, 45, LV); px(lc + 1, 45, LV);
    for (let c = lc - 1; c <= lc + 2; c++) px(c, 46, 82);
    px(lc, 47, LV); px(lc + 1, 47, LV);
    px(lc - 1, 47, LV); px(lc + 2, 47, LV);
  }

  // ── Ground ──────────────────────────────────────────────────────────────────
  for (let r = horizonRow; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const depth = (r - horizonRow) / (H - horizonRow);
      const base  = Math.round(68 + depth * 55);
      const n     = (c * 7 + r * 11) % 13;
      const noise = n < 2 ? -14 : n < 5 ? -7 : n < 9 ? 0 : 7;
      px(c, r, Math.max(50, Math.min(145, base + noise)));
    }
  }

  // Stone path (center, through torii)
  for (let r = horizonRow; r < H; r++) {
    const depth = (r - horizonRow) / (H - horizonRow);
    for (let c = pathL; c <= pathR; c++) {
      const n = (c * 5 + r * 7) % 9;
      px(c, r, Math.round(98 + depth * 28) + (n < 3 ? 10 : 0));
    }
  }

  // Ground grass tufts
  for (let r = horizonRow + 1; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (c >= pathL - 1 && c <= pathR + 1) continue;
      const depth = (r - horizonRow) / (H - horizonRow);
      if ((c * 11 + r * 13) % 23 === 0)
        px(c, r, Math.round(88 + depth * 22));
    }
  }

  // ── Tall grass at horizon (drawn last, in front of everything) ──────────────
  // Back row (sparse, full width except path)
  for (let c = 0; c < W; c++) {
    if (c >= pathL - 2 && c <= pathR + 2) continue;
    if ((c * 7 + 3) % 5 >= 3) continue;
    const h = 3 + c % 3, base = horizonRow + 1;
    for (let r = base - h; r <= base; r++)
      px(c, r, 58 + Math.round(((r - (base - h)) / h) * 10));
    px(c + (c % 2 === 0 ? -1 : 1), base - h - 1, 64);
  }

  // Front row (denser, building zones only)
  for (let c = 0; c < W; c += 2) {
    if (c > 22 && c < 42) continue;
    if (c >= pathL - 2 && c <= pathR + 2) continue;
    const h = 5 + (c * 3) % 3, base = horizonRow + 2;
    for (let r = base - h; r <= base; r++) {
      const v = 62 + Math.round(((r - (base - h)) / h) * 14);
      px(c, r, v);
      if (c + 1 < W) px(c + 1, r, v - 6);
    }
    const lean = c % 4 < 2 ? -1 : 1;
    px(c + lean, base - h - 1, 70);
    px(c - lean, base - h - 1, 64);
  }

  return oc;
}

export function drawTownBackground(ctx: CanvasRenderingContext2D): void {
  if (!townBgCache) townBgCache = buildTownBg();
  ctx.drawImage(townBgCache, 0, 0);
}
