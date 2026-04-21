import { makeRng, type RNG } from "./rng";

// 64×64 grid: 0 = transparent, 1–255 = grayscale (1≈black, 255=white)
export type PixelGrid = Uint8Array;

const W = 64;

// ── low-level pixel helpers ────────────────────────────────────────────────

function set(g: PixelGrid, x: number, y: number, v: number) {
  if (x < 0 || x >= W || y < 0 || y >= W) return;
  g[y * W + x] = v;
}

function get(g: PixelGrid, x: number, y: number): number {
  if (x < 0 || x >= W || y < 0 || y >= W) return 0;
  return g[y * W + x];
}

function fillRect(g: PixelGrid, x: number, y: number, w: number, h: number, v: number) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      set(g, x + dx, y + dy, v);
}

function fillCircle(g: PixelGrid, cx: number, cy: number, r: number, v: number) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
        set(g, x, y, v);
}

function fillEllipse(g: PixelGrid, cx: number, cy: number, rx: number, ry: number, v: number) {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++)
      if ((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1)
        set(g, x, y, v);
}

function fillDiamond(g: PixelGrid, cx: number, cy: number, half: number, v: number) {
  for (let y = cy - half; y <= cy + half; y++)
    for (let x = cx - half; x <= cx + half; x++)
      if (Math.abs(x - cx) + Math.abs(y - cy) <= half)
        set(g, x, y, v);
}

function drawLine(
  g: PixelGrid, x0: number, y0: number, x1: number, y1: number, v: number
) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    set(g, x, y, v);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx)  { err += dx; y += sy; }
  }
}

// ── shaded body fills ──────────────────────────────────────────────────────

function shadedCircle(g: PixelGrid, cx: number, cy: number, r: number, base: number) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        const shade = Math.round((-( x - cx) - (y - cy)) / (2.2 * r) * 18);
        set(g, x, y, Math.max(2, Math.min(252, base + shade)));
      }
}

function shadedRect(g: PixelGrid, x: number, y: number, w: number, h: number, base: number) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) {
      const shade = Math.round((-dx - dy) / (w + h) * 18);
      set(g, x + dx, y + dy, Math.max(2, Math.min(252, base + shade)));
    }
}

function shadedEllipse(g: PixelGrid, cx: number, cy: number, rx: number, ry: number, base: number) {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++)
      if ((x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1) {
        const shade = Math.round((-(x - cx) - (y - cy)) / (rx + ry) * 18);
        set(g, x, y, Math.max(2, Math.min(252, base + shade)));
      }
}

function shadedDiamond(g: PixelGrid, cx: number, cy: number, half: number, base: number) {
  for (let y = cy - half; y <= cy + half; y++)
    for (let x = cx - half; x <= cx + half; x++)
      if (Math.abs(x - cx) + Math.abs(y - cy) <= half) {
        const shade = Math.round((-(x - cx) - (y - cy)) / (half * 2) * 18);
        set(g, x, y, Math.max(2, Math.min(252, base + shade)));
      }
}

// ── filled triangle (scanline) ─────────────────────────────────────────────

function fillTriangle(
  g: PixelGrid,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  v: number,
) {
  const minY = Math.max(0,  Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(63, Math.ceil (Math.max(ay, by, cy)));
  const edges = [[ax,ay,bx,by],[bx,by,cx,cy],[cx,cy,ax,ay]] as const;

  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (const [x1,y1,x2,y2] of edges) {
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y))
        xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i += 2) {
      const lx = Math.max(0,  Math.round(xs[i]));
      const rx = Math.min(63, Math.round(xs[i + 1]));
      for (let x = lx; x <= rx; x++) set(g, x, y, v);
    }
  }
}

// ── satellite body shapes ──────────────────────────────────────────────────
// Small secondary shapes attached to the body border, rendered BEFORE outline
// so they fuse with the body silhouette.

type SatZone = "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "midLeft" | "midRight";
type SatShape = "circle" | "rect" | "oval" | "diamond" | "triangle";

// Direction vector outward from body for each zone
const SAT_DIR: Record<SatZone, [number, number]> = {
  topLeft:     [-0.707, -0.707],
  topRight:    [ 0.707, -0.707],
  bottomLeft:  [-0.707,  0.707],
  bottomRight: [ 0.707,  0.707],
  midLeft:     [-1,      0    ],
  midRight:    [ 1,      0    ],
};

function addSatelliteShape(
  g: PixelGrid,
  attach: Pt,
  zone: SatZone,
  shape: SatShape,
  size: number,
  base: number,
) {
  const [dx, dy] = SAT_DIR[zone];
  // Centre the satellite so it overlaps the body by ~35% of its size
  const overlap = size * 0.65;
  const scx = Math.round(attach.x + dx * overlap);
  const scy = Math.round(attach.y + dy * overlap);

  switch (shape) {
    case "circle":
      shadedCircle(g, scx, scy, size, base);
      break;
    case "rect":
      shadedRect(g, scx - size, scy - size, size * 2, size * 2, base);
      break;
    case "oval": {
      // Stretch the oval along the outward direction
      const isHoriz = Math.abs(dx) > Math.abs(dy);
      const rx = isHoriz ? size + 2 : size;
      const ry = isHoriz ? size     : size + 2;
      shadedEllipse(g, scx, scy, rx, ry, base);
      break;
    }
    case "diamond":
      shadedDiamond(g, scx, scy, size, base);
      break;
    case "triangle": {
      // Tip points outward; base straddles the attachment point
      const perpX = -dy, perpY = dx; // 90° rotation of direction
      const spread = size * 0.8;
      const tipX = Math.round(attach.x + dx * size * 1.4);
      const tipY = Math.round(attach.y + dy * size * 1.4);
      const b1x  = Math.round(attach.x + perpX * spread);
      const b1y  = Math.round(attach.y + perpY * spread);
      const b2x  = Math.round(attach.x - perpX * spread);
      const b2y  = Math.round(attach.y - perpY * spread);
      // Use body base color with slight variation
      const col = Math.max(2, Math.min(252, base));
      fillTriangle(g, tipX, tipY, b1x, b1y, b2x, b2y, col);
      break;
    }
  }
}

function addSatelliteShapes(
  g: PixelGrid,
  attach: Attach,
  base: number,
  hw: number,
  hh: number,
  rng: RNG,
) {
  // ~55% chance to skip entirely
  if (rng.next() > 0.55) return;

  const satShapes: SatShape[] = ["circle", "rect", "oval", "diamond", "triangle"];
  const shape = rng.pick(satShapes);

  // Size: 25–45% of smallest body half-dimension, clamped 3–7
  const maxSize = Math.round(Math.min(hw, hh) * 0.45);
  const size    = Math.max(3, Math.min(7, rng.nextInt(3, maxSize)));

  // Pick a pair of zones (symmetric looks best) or one solo shape
  type ZonePair = [SatZone, SatZone];
  const pairs: ZonePair[] = [
    ["topLeft",    "topRight"   ],
    ["bottomLeft", "bottomRight"],
    ["midLeft",    "midRight"   ],
  ];

  const useSymmetric = rng.nextBool(0.75);

  if (useSymmetric) {
    const [zoneA, zoneB] = rng.pick(pairs);
    addSatelliteShape(g, attach[zoneA], zoneA, shape, size, base);
    addSatelliteShape(g, attach[zoneB], zoneB, shape, size, base);
  } else {
    // Single asymmetric satellite
    const soloZones: SatZone[] = ["topLeft","topRight","bottomLeft","bottomRight","midLeft","midRight"];
    const zone = rng.pick(soloZones);
    addSatelliteShape(g, attach[zone], zone, shape, size, base);
  }
}

// ── outline pass ───────────────────────────────────────────────────────────

function outlineBody(g: PixelGrid, dark: number) {
  const snap = new Uint8Array(g);
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const v = snap[y * W + x];
      if (v === 0) continue;
      const border =
        (x === 0 || snap[y * W + x - 1] === 0) ||
        (x === W - 1 || snap[y * W + x + 1] === 0) ||
        (y === 0 || snap[(y - 1) * W + x] === 0) ||
        (y === W - 1 || snap[(y + 1) * W + x] === 0);
      if (border) set(g, x, y, dark);
    }
}

// ── attachment point type ──────────────────────────────────────────────────

interface Pt { x: number; y: number }
interface Attach {
  top: Pt; topLeft: Pt; topRight: Pt;
  midLeft: Pt; midRight: Pt;
  bottomLeft: Pt; bottomRight: Pt;
  bottom: Pt;
}

// ── body shape renderers ───────────────────────────────────────────────────

type Shape = "circle" | "square" | "rect_tall" | "oval" | "diamond" | "ghost" | "blob" | "cloud" | "star4" | "mushroom";

interface BodyResult { cx: number; cy: number; hw: number; hh: number; attach: Attach }

function renderBody(g: PixelGrid, shape: Shape, base: number): BodyResult {
  const cx = 32, cy = 30;

  switch (shape) {
    case "circle": {
      const r = 14;
      shadedCircle(g, cx, cy, r, base);
      return {
        cx, cy, hw: r, hh: r,
        attach: {
          top:         { x: cx,       y: cy - r },
          topLeft:     { x: cx - 10,  y: cy - 10 },
          topRight:    { x: cx + 10,  y: cy - 10 },
          midLeft:     { x: cx - r,   y: cy },
          midRight:    { x: cx + r,   y: cy },
          bottomLeft:  { x: cx - 10,  y: cy + 10 },
          bottomRight: { x: cx + 10,  y: cy + 10 },
          bottom:      { x: cx,       y: cy + r },
        },
      };
    }

    case "square": {
      const hw = 11, hh = 11;
      shadedRect(g, cx - hw, cy - hh, hw * 2, hh * 2, base);
      return {
        cx, cy, hw, hh,
        attach: {
          top:         { x: cx,       y: cy - hh },
          topLeft:     { x: cx - hw,  y: cy - hh },
          topRight:    { x: cx + hw,  y: cy - hh },
          midLeft:     { x: cx - hw,  y: cy },
          midRight:    { x: cx + hw,  y: cy },
          bottomLeft:  { x: cx - hw,  y: cy + hh },
          bottomRight: { x: cx + hw,  y: cy + hh },
          bottom:      { x: cx,       y: cy + hh },
        },
      };
    }

    case "rect_tall": {
      const hw = 9, hh = 13;
      shadedRect(g, cx - hw, cy - hh, hw * 2, hh * 2, base);
      return {
        cx, cy, hw, hh,
        attach: {
          top:         { x: cx,       y: cy - hh },
          topLeft:     { x: cx - hw,  y: cy - hh },
          topRight:    { x: cx + hw,  y: cy - hh },
          midLeft:     { x: cx - hw,  y: cy },
          midRight:    { x: cx + hw,  y: cy },
          bottomLeft:  { x: cx - hw,  y: cy + hh },
          bottomRight: { x: cx + hw,  y: cy + hh },
          bottom:      { x: cx,       y: cy + hh },
        },
      };
    }

    case "oval": {
      const rx = 15, ry = 11;
      shadedEllipse(g, cx, cy, rx, ry, base);
      return {
        cx, cy, hw: rx, hh: ry,
        attach: {
          top:         { x: cx,       y: cy - ry },
          topLeft:     { x: cx - 11,  y: cy - 8 },
          topRight:    { x: cx + 11,  y: cy - 8 },
          midLeft:     { x: cx - rx,  y: cy },
          midRight:    { x: cx + rx,  y: cy },
          bottomLeft:  { x: cx - 11,  y: cy + 8 },
          bottomRight: { x: cx + 11,  y: cy + 8 },
          bottom:      { x: cx,       y: cy + ry },
        },
      };
    }

    case "diamond": {
      const half = 12;
      shadedDiamond(g, cx, cy, half, base);
      return {
        cx, cy, hw: half, hh: half,
        attach: {
          top:         { x: cx,            y: cy - half },
          topLeft:     { x: cx - half / 2, y: cy - half / 2 },
          topRight:    { x: cx + half / 2, y: cy - half / 2 },
          midLeft:     { x: cx - half,     y: cy },
          midRight:    { x: cx + half,     y: cy },
          bottomLeft:  { x: cx - half / 2, y: cy + half / 2 },
          bottomRight: { x: cx + half / 2, y: cy + half / 2 },
          bottom:      { x: cx,            y: cy + half },
        },
      };
    }

    case "ghost": {
      // Pacman ghost: round head + rectangular body + 3 scalloped bottom bumps
      const headR = 11, headCy = cy - 2;
      shadedCircle(g, cx, headCy, headR, base);
      shadedRect(g, cx - headR, headCy, headR * 2 + 1, 10, base);
      const bumpY = headCy + 10;
      shadedCircle(g, cx - 7, bumpY, 4, base);
      shadedCircle(g, cx,     bumpY, 4, base);
      shadedCircle(g, cx + 7, bumpY, 4, base);
      return {
        cx, cy: headCy, hw: headR, hh: headR,
        attach: {
          top:         { x: cx,          y: headCy - headR },
          topLeft:     { x: cx - 8,      y: headCy - 8 },
          topRight:    { x: cx + 8,      y: headCy - 8 },
          midLeft:     { x: cx - headR,  y: headCy + 2 },
          midRight:    { x: cx + headR,  y: headCy + 2 },
          bottomLeft:  { x: cx - 7,      y: bumpY + 4 },
          bottomRight: { x: cx + 7,      y: bumpY + 4 },
          bottom:      { x: cx,          y: bumpY + 4 },
        },
      };
    }

    case "blob": {
      // Organic blob: center circle + 4 surrounding bulges
      shadedCircle(g, cx,     cy,     9, base);
      shadedCircle(g, cx - 7, cy - 5, 6, base);
      shadedCircle(g, cx + 7, cy - 5, 6, base);
      shadedCircle(g, cx - 8, cy + 5, 6, base);
      shadedCircle(g, cx + 8, cy + 5, 6, base);
      return {
        cx, cy, hw: 14, hh: 11,
        attach: {
          top:         { x: cx,       y: cy - 11 },
          topLeft:     { x: cx - 11,  y: cy - 8 },
          topRight:    { x: cx + 11,  y: cy - 8 },
          midLeft:     { x: cx - 14,  y: cy },
          midRight:    { x: cx + 14,  y: cy },
          bottomLeft:  { x: cx - 11,  y: cy + 9 },
          bottomRight: { x: cx + 11,  y: cy + 9 },
          bottom:      { x: cx,       y: cy + 11 },
        },
      };
    }

    case "cloud": {
      // Cloud: bumpy top (3 circles) + flat rectangular base
      const baseTop = cy - 2;
      shadedRect(g, cx - 13, baseTop, 27, 7, base);
      shadedCircle(g, cx - 8, baseTop,     6, base);
      shadedCircle(g, cx,     baseTop - 4, 8, base);
      shadedCircle(g, cx + 8, baseTop,     6, base);
      return {
        cx, cy: baseTop - 1, hw: 14, hh: 11,
        attach: {
          top:         { x: cx,       y: baseTop - 12 },
          topLeft:     { x: cx - 12,  y: baseTop - 4 },
          topRight:    { x: cx + 12,  y: baseTop - 4 },
          midLeft:     { x: cx - 13,  y: baseTop },
          midRight:    { x: cx + 13,  y: baseTop },
          bottomLeft:  { x: cx - 9,   y: baseTop + 5 },
          bottomRight: { x: cx + 9,   y: baseTop + 5 },
          bottom:      { x: cx,       y: baseTop + 5 },
        },
      };
    }

    case "star4": {
      // 4-pointed star: union of horizontal + vertical ellipses
      shadedEllipse(g, cx, cy, 14,  5, base);
      shadedEllipse(g, cx, cy,  5, 14, base);
      return {
        cx, cy, hw: 7, hh: 7,
        attach: {
          top:         { x: cx,      y: cy - 14 },
          topLeft:     { x: cx - 4,  y: cy - 6 },
          topRight:    { x: cx + 4,  y: cy - 6 },
          midLeft:     { x: cx - 14, y: cy },
          midRight:    { x: cx + 14, y: cy },
          bottomLeft:  { x: cx - 4,  y: cy + 6 },
          bottomRight: { x: cx + 4,  y: cy + 6 },
          bottom:      { x: cx,      y: cy + 14 },
        },
      };
    }

    case "mushroom": {
      // Mushroom: wide ellipse cap + narrow rectangular stem
      const capRx = 14, capRy = 9, capCy = cy - 4;
      shadedEllipse(g, cx, capCy, capRx, capRy, base);
      shadedRect(g, cx - 3, cy + 5, 7, 9, base);
      return {
        cx, cy: capCy + 1, hw: capRx, hh: capRy,
        attach: {
          top:         { x: cx,         y: capCy - capRy },
          topLeft:     { x: cx - 10,    y: capCy - 6 },
          topRight:    { x: cx + 10,    y: capCy - 6 },
          midLeft:     { x: cx - capRx, y: capCy },
          midRight:    { x: cx + capRx, y: capCy },
          bottomLeft:  { x: cx - 3,     y: cy + 14 },
          bottomRight: { x: cx + 3,     y: cy + 14 },
          bottom:      { x: cx,         y: cy + 14 },
        },
      };
    }
  }
}

// ── anime-style eyes ───────────────────────────────────────────────────────
// Each eye uses: white sclera → dark iris ring → darker pupil → sparkle.

type EyeStyle = "round" | "oval" | "wide" | "angry" | "happy" | "sleepy" | "sparkly";

// Fill an ellipse with v only where the current pixel is part of the "base"
// (i.e. inside the body). We don't mask here — just write unconditionally since
// eyes are drawn after the body fill.
function eyeEllipse(g: PixelGrid, cx: number, cy: number, rx: number, ry: number, v: number) {
  const rx2 = rx * rx, ry2 = ry * ry;
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if (dx * dx * ry2 + dy * dy * rx2 <= rx2 * ry2)
        set(g, cx + dx, cy + dy, v);
}

function drawEyelid(g: PixelGrid, ex: number, ey: number, rx: number, ry: number) {
  // Thick dark eyelid line across the top arc of the eye
  const topY = ey - ry;
  for (let dx = -rx; dx <= rx; dx++) {
    set(g, ex + dx, topY,     18);
    set(g, ex + dx, topY + 1, 18);
  }
}

function drawSparkle(g: PixelGrid, ex: number, ey: number, r: number) {
  // White highlight — upper-right quadrant of iris
  const sx = ex + Math.max(1, Math.floor(r * 0.35));
  const sy = ey - Math.max(1, Math.floor(r * 0.35));
  set(g, sx,     sy,     250);
  set(g, sx + 1, sy,     250);
  set(g, sx,     sy - 1, 250);
}

function drawEyeCore(g: PixelGrid, ex: number, ey: number, rx: number, ry: number) {
  // sclera → iris → pupil → eyelid → sparkle
  eyeEllipse(g, ex, ey, rx, ry, 238);                              // white
  eyeEllipse(g, ex, ey + 1, Math.max(1, rx - 1), Math.max(1, ry - 1), 55);  // iris
  eyeEllipse(g, ex, ey + 1, Math.max(1, rx - 2), Math.max(1, ry - 2), 18);  // pupil
  drawEyelid(g, ex, ey, rx, ry);
  drawSparkle(g, ex, ey, Math.max(rx, ry));
}

function drawOneEye(
  g: PixelGrid,
  ex: number, ey: number,
  r: number,
  style: EyeStyle,
  side: "left" | "right",
) {
  const flip = side === "right" ? -1 : 1; // mirror angry slant

  switch (style) {
    case "round":
      drawEyeCore(g, ex, ey, r, r);
      break;

    case "oval":
      drawEyeCore(g, ex, ey, r, r + 2);
      break;

    case "wide":
      drawEyeCore(g, ex, ey, r + 2, Math.max(2, r - 1));
      break;

    case "angry": {
      // Full eye, then overdraw a diagonal eyelid cutting the inner-top corner
      drawEyeCore(g, ex, ey, r, r);
      // Angled lid: cover inner-top quadrant with dark pixels
      for (let dy = -r; dy <= 0; dy++)
        for (let dx = 0; dx <= r; dx++)
          if (dy + dx * flip < -r * 0.3) // diagonal cut
            set(g, ex + dx * flip, ey + dy, 18);
      break;
    }

    case "happy": {
      // Closed crescent — just a curved bottom arc ("^" shape)
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        const arcY = Math.round((dx * dx) / ((r + 1) * (r + 1)) * (r - 1)) - 1;
        set(g, ex + dx, ey + arcY,     18);
        set(g, ex + dx, ey + arcY + 1, 18);
      }
      break;
    }

    case "sleepy": {
      // Full eye fill, then heavy lid covering top 45%
      drawEyeCore(g, ex, ey, r, r);
      const lidBottom = ey - Math.round(r * 0.45);
      for (let dy = ey - r - 1; dy <= lidBottom; dy++)
        for (let dx = -r - 1; dx <= r + 1; dx++)
          set(g, ex + dx, dy, 18);
      break;
    }

    case "sparkly": {
      // Large eyes with extra sparkle dots scattered around
      drawEyeCore(g, ex, ey, r + 1, r + 1);
      // Extra small sparkle dots
      set(g, ex - Math.floor(r * 0.5), ey - Math.floor(r * 0.6), 245);
      set(g, ex + Math.floor(r * 0.6), ey - Math.floor(r * 0.2), 245);
      set(g, ex - Math.floor(r * 0.2), ey + Math.floor(r * 0.5), 245);
      break;
    }
  }
}

function addEyes(
  g: PixelGrid,
  cx: number, cy: number,
  hw: number, hh: number,
  style: EyeStyle,
) {
  // Radius scales with face size: 3–5 px
  const r      = Math.max(3, Math.min(5, Math.round(Math.min(hw, hh) * 0.30)));
  // Spread ensures a comfortable gap between the two eyes
  const spread = Math.max(r + 3, Math.round(hw * 0.42));
  const eyeY   = cy - Math.round(hh * 0.15);

  drawOneEye(g, cx - spread, eyeY, r, style, "left");
  drawOneEye(g, cx + spread, eyeY, r, style, "right");
}

// ── mouth templates ────────────────────────────────────────────────────────

type MouthStyle = "line" | "smile" | "frown" | "open" | "teeth" | "zigzag";

function addMouth(
  g: PixelGrid,
  cx: number, cy: number,
  hw: number, hh: number,
  style: MouthStyle,
  dark: number,
) {
  const mw   = Math.max(4, Math.round(hw * 0.55)); // half-width
  const my   = cy + Math.round(hh * 0.35);
  const dark2 = Math.min(40, dark);

  switch (style) {
    case "line":
      for (let dx = -mw; dx <= mw; dx++) set(g, cx + dx, my, dark2);
      break;

    case "smile":
      for (let dx = -mw; dx <= mw; dx++) {
        const dy = Math.round((dx * dx) / (mw * mw) * 2);
        set(g, cx + dx, my + dy, dark2);
      }
      break;

    case "frown":
      for (let dx = -mw; dx <= mw; dx++) {
        const dy = -Math.round((dx * dx) / (mw * mw) * 2);
        set(g, cx + dx, my + dy, dark2);
      }
      break;

    case "open": {
      // oval outline + dark interior
      fillEllipse(g, cx, my, mw - 1, 2, dark2);
      // dark interior
      for (let dx = -(mw - 2); dx <= mw - 2; dx++) set(g, cx + dx, my, 15);
      for (let dx = -(mw - 3); dx <= mw - 3; dx++) set(g, cx + dx, my + 1, 15);
      break;
    }

    case "teeth": {
      // smile base
      for (let dx = -mw; dx <= mw; dx++) {
        const dy = Math.round((dx * dx) / (mw * mw) * 2);
        set(g, cx + dx, my + dy, dark2);
      }
      // teeth (white rectangles at top of smile)
      for (let ti = 0; ti < 3; ti++) {
        const tx = cx - 2 + ti * 2;
        set(g, tx, my, 240);
        set(g, tx + 1, my, 240);
      }
      break;
    }

    case "zigzag":
      for (let i = 0; i < mw * 2; i++) {
        const zx = cx - mw + i;
        const zy = my + (i % 2 === 0 ? 0 : 1);
        set(g, zx, zy, dark2);
      }
      break;
  }
}

// ── nose ──────────────────────────────────────────────────────────────────

function addNose(g: PixelGrid, cx: number, cy: number, hh: number, dark: number) {
  const ny = cy - Math.round(hh * 0.05);
  set(g, cx - 1, ny, dark);
  set(g, cx + 1, ny, dark);
}

// ── blush ─────────────────────────────────────────────────────────────────

function addBlush(g: PixelGrid, cx: number, cy: number, hw: number, hh: number, base: number) {
  const bx = Math.round(hw * 0.55);
  const by = cy + Math.round(hh * 0.1);
  const light = Math.min(252, base + 30);
  set(g, cx - bx,     by, light);
  set(g, cx - bx - 1, by, light);
  set(g, cx + bx,     by, light);
  set(g, cx + bx + 1, by, light);
}

// ── external feature helpers ───────────────────────────────────────────────

type EarStyle = "pointy" | "round" | "floppy";

function addEar(
  g: PixelGrid,
  p: Pt,
  side: "left" | "right",
  style: EarStyle,
  col: number,
) {
  const s = side === "left" ? -1 : 1;
  const dark = Math.max(2, col - 40);

  switch (style) {
    case "pointy":
      set(g, p.x, p.y - 1, col);
      set(g, p.x + s, p.y - 1, col);
      set(g, p.x, p.y - 2, col);
      set(g, p.x + s, p.y - 2, col);
      set(g, p.x, p.y - 3, col);
      set(g, p.x + s * 1, p.y - 4, dark);
      break;

    case "round":
      fillCircle(g, p.x + s * 2, p.y - 3, 3, col);
      break;

    case "floppy": {
      // droopy ear going sideways-down
      const ex = p.x + s * 2;
      fillRect(g, Math.min(ex, p.x), p.y, Math.abs(ex - p.x) + 2, 4, col);
      fillRect(g, ex, p.y + 2, 2, 4, col);
      break;
    }
  }
}

type AntennaStyle = "ball" | "fork" | "star";

function addAntenna(g: PixelGrid, p: Pt, style: AntennaStyle, col: number) {
  // Stem
  for (let i = 1; i <= 5; i++) set(g, p.x, p.y - i, col);

  switch (style) {
    case "ball":
      fillCircle(g, p.x, p.y - 7, 2, col);
      break;
    case "fork":
      drawLine(g, p.x, p.y - 5, p.x - 2, p.y - 8, col);
      drawLine(g, p.x, p.y - 5, p.x + 2, p.y - 8, col);
      break;
    case "star":
      set(g, p.x - 1, p.y - 6, col); set(g, p.x + 1, p.y - 6, col);
      set(g, p.x, p.y - 7, col);
      set(g, p.x - 1, p.y - 8, col); set(g, p.x + 1, p.y - 8, col);
      break;
  }
}

function addHorn(g: PixelGrid, p: Pt, side: "left" | "right", col: number) {
  const s = side === "left" ? -1 : 1;
  set(g, p.x,        p.y - 1, col);
  set(g, p.x + s,    p.y - 1, col);
  set(g, p.x,        p.y - 2, col);
  set(g, p.x + s,    p.y - 3, col);
}

type ArmStyle = "stubby" | "claw" | "long" | "wing";

function addArm(g: PixelGrid, p: Pt, side: "left" | "right", style: ArmStyle, col: number) {
  const s = side === "left" ? -1 : 1;
  const dark = Math.max(2, col - 35);

  switch (style) {
    case "stubby":
      fillRect(g, p.x + s, p.y - 1, s * 3 || 3, 3, col);
      break;

    case "claw":
      for (let i = 1; i <= 4; i++) set(g, p.x + s * i, p.y, col);
      set(g, p.x + s * 4, p.y - 1, dark);
      set(g, p.x + s * 5, p.y - 1, dark);
      set(g, p.x + s * 4, p.y + 1, dark);
      set(g, p.x + s * 5, p.y + 2, dark);
      break;

    case "long": {
      // upper arm
      for (let i = 1; i <= 3; i++) set(g, p.x + s * i, p.y - 1, col);
      // forearm going down
      for (let i = 0; i < 3; i++) set(g, p.x + s * 3, p.y + i, col);
      // hand
      for (let i = 0; i < 3; i++) set(g, p.x + s * (2 + i), p.y + 3, col);
      break;
    }

    case "wing": {
      // triangular wing shape
      for (let i = 0; i < 5; i++) {
        const wh = 4 - i;
        for (let j = 0; j < wh; j++)
          set(g, p.x + s * (i + 1), p.y - j, col);
      }
      break;
    }
  }
}

type LegStyle = "stubby" | "long" | "paw";

function addLeg(g: PixelGrid, p: Pt, side: "left" | "right", style: LegStyle, col: number) {
  const s = side === "left" ? -1 : 1;
  const dark = Math.max(2, col - 35);

  switch (style) {
    case "stubby":
      set(g, p.x, p.y + 1, col);
      set(g, p.x, p.y + 2, col);
      set(g, p.x + s, p.y + 2, col);
      set(g, p.x - s, p.y + 2, col);
      break;

    case "long":
      for (let i = 1; i <= 5; i++) set(g, p.x, p.y + i, col);
      set(g, p.x - 1, p.y + 5, dark);
      set(g, p.x,     p.y + 5, dark);
      set(g, p.x + 1, p.y + 5, dark);
      set(g, p.x + s * 2, p.y + 4, dark);
      break;

    case "paw":
      for (let i = 1; i <= 3; i++) set(g, p.x, p.y + i, col);
      // toes
      set(g, p.x - 1, p.y + 4, col);
      set(g, p.x,     p.y + 4, col);
      set(g, p.x + 1, p.y + 4, col);
      break;
  }
}

function addTail(g: PixelGrid, p: Pt, col: number, rng: RNG) {
  const curl = rng.nextInt(0, 1);
  // base
  set(g, p.x + 1, p.y, col);
  set(g, p.x + 2, p.y - 1, col);
  set(g, p.x + 3, p.y - 2, col);
  if (curl === 0) {
    set(g, p.x + 4, p.y - 2, col);
    set(g, p.x + 4, p.y - 1, col);
    set(g, p.x + 3, p.y, col);
  } else {
    set(g, p.x + 4, p.y - 3, col);
    set(g, p.x + 5, p.y - 3, col);
  }
}

function addSpikes(g: PixelGrid, cx: number, cy: number, hh: number, count: number, col: number) {
  const dark = Math.max(2, col - 50);
  for (let i = 0; i < count; i++) {
    const sx = cx - 8 + i * 4;
    const sy = cy - hh;
    set(g, sx, sy - 1, dark);
    set(g, sx, sy - 2, dark);
    set(g, sx, sy - 3, dark);
  }
}

// ── main export ────────────────────────────────────────────────────────────

export function generateMonster(seed: number): PixelGrid {
  const g = new Uint8Array(W * W);
  const rng = makeRng(seed);

  const shapes: Shape[] = ["circle", "square", "rect_tall", "oval", "diamond", "ghost", "blob", "cloud", "star4", "mushroom"];
  const shape = rng.pick(shapes);

  // Body color: 90–185
  const base = 90 + rng.nextInt(0, 95);
  const dark = Math.max(15, base - 55);

  const { cx, cy, hw, hh, attach } = renderBody(g, shape, base);

  // Satellite shapes fuse with the body before outlining
  addSatelliteShapes(g, attach, base, hw, hh, rng);

  // Outline pass
  outlineBody(g, dark);

  // Snapshot the body silhouette — used to clip internal features so they
  // never bleed outside the body (important for curved/diamond shapes).
  const bodyMask = new Uint8Array(g);

  // ── eyes ──
  const eyeStyles: EyeStyle[] = ["round", "oval", "wide", "angry", "happy", "sleepy", "sparkly"];
  addEyes(g, cx, cy, hw, hh, rng.pick(eyeStyles));

  // ── mouth ──
  const mouthStyles: MouthStyle[] = ["line", "smile", "frown", "open", "teeth", "zigzag"];
  addMouth(g, cx, cy, hw, hh, rng.pick(mouthStyles), dark);

  // ── optional internal ──
  if (rng.nextBool(0.45)) addNose(g, cx, cy, hh, dark);
  if (rng.nextBool(0.35)) addBlush(g, cx, cy, hw, hh, base);

  // Clip every internal feature to the body silhouette.
  for (let i = 0; i < W * W; i++) {
    if (bodyMask[i] === 0) g[i] = 0;
  }

  // ── ears ──
  const earStyles: EarStyle[] = ["pointy", "round", "floppy"];
  const earStyle = rng.pick(earStyles);
  const hasEarL = rng.nextBool(0.65);
  const hasEarR = rng.nextBool(0.65);
  if (hasEarL) addEar(g, attach.topLeft,  "left",  earStyle, base);
  if (hasEarR) addEar(g, attach.topRight, "right", earStyle, base);

  // ── top accessories (antenna OR horns, not both) ──
  const topRoll = rng.next();
  if (topRoll < 0.30) {
    const antennaStyles: AntennaStyle[] = ["ball", "fork", "star"];
    addAntenna(g, attach.top, rng.pick(antennaStyles), base);
  } else if (topRoll < 0.52) {
    addHorn(g, attach.topLeft,  "left",  base);
    addHorn(g, attach.topRight, "right", base);
  }

  // ── arms ──
  const armStyles: ArmStyle[] = ["stubby", "claw", "long", "wing"];
  const armStyle = rng.pick(armStyles);
  addArm(g, attach.midLeft,  "left",  armStyle, base);
  addArm(g, attach.midRight, "right", armStyle, base);

  // ── legs ──
  const legStyles: LegStyle[] = ["stubby", "long", "paw"];
  const legStyle = rng.pick(legStyles);
  addLeg(g, attach.bottomLeft,  "left",  legStyle, base);
  addLeg(g, attach.bottomRight, "right", legStyle, base);

  // ── tail ──
  if (rng.nextBool(0.45)) addTail(g, attach.bottomRight, base, rng);

  // ── back spikes ──
  if (rng.nextBool(0.30)) {
    const cnt = rng.nextInt(2, 4);
    addSpikes(g, cx, cy, hh, cnt, base);
  }

  // Final outline to catch new features
  outlineBody(g, dark);

  return g;
}

// ── egg sprite ────────────────────────────────────────────────────────────
// crackCount 0–6 controls how many crack lines appear (progress-based)

export function generateEgg(seed: number, crackCount: number): PixelGrid {
  const g = new Uint8Array(W * W);
  const rng = makeRng(seed);
  const cx = 32, cy = 29;
  const rx = 11, ry = 15;

  // Shaded egg body
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) {
        const shade = Math.round((-nx * 0.6 - ny * 0.8) * 22);
        set(g, x, y, Math.max(2, Math.min(252, 200 + shade)));
      }
    }

  // Seed-based spots (unique pattern per monster)
  const numSpots = rng.nextInt(4, 9);
  for (let i = 0; i < numSpots; i++) {
    const a  = rng.next() * Math.PI * 2;
    const d  = rng.next() * 0.60;
    const sx = Math.round(cx + Math.cos(a) * rx * d);
    const sy = Math.round(cy + Math.sin(a) * ry * d);
    const sr = rng.nextInt(1, 2);
    if (get(g, sx, sy) > 0)
      for (let dy = -sr; dy <= sr; dy++)
        for (let dx = -sr; dx <= sr; dx++)
          if (dx * dx + dy * dy <= sr * sr && get(g, sx + dx, sy + dy) > 0)
            set(g, sx + dx, sy + dy, 155 + rng.nextInt(-10, 10));
  }

  // Crack lines (jagged outward paths, deterministic from seed)
  const crackRng = makeRng(seed ^ 0xc0ffee);
  for (let c = 0; c < crackCount; c++) {
    const angle = (c / Math.max(1, crackCount)) * Math.PI * 2 + crackRng.next() * 1.2;
    let px = cx + Math.cos(angle) * rx * 0.15;
    let py = cy + Math.sin(angle) * ry * 0.15;
    for (let s = 0; s < 9; s++) {
      if (get(g, Math.round(px), Math.round(py)) > 0)
        set(g, Math.round(px), Math.round(py), 35);
      const jitter = crackRng.next() * 0.7 - 0.35;
      px += Math.cos(angle + jitter) * 1.6;
      py += Math.sin(angle + jitter) * 1.6;
    }
  }

  // Outline
  outlineBody(g, 130);
  return g;
}

// ── tiny poop sprite (12×12 region, relative) ─────────────────────────────

export const POOP_SPRITE: [number, number, number][] = [
  // base
  [0, 3, 60],[1, 3, 60],[2, 3, 60],[3, 3, 60],[4, 3, 60],[5, 3, 60],[6, 3, 60],
  [-1,4, 60],[0, 4, 60],[1, 4, 60],[2, 4, 60],[3, 4, 60],[4, 4, 60],[5, 4, 60],[6, 4, 60],[7, 4, 60],
  [-1,5, 60],[0, 5, 60],[1, 5, 60],[2, 5, 60],[3, 5, 60],[4, 5, 60],[5, 5, 60],[6, 5, 60],[7, 5, 60],
  // mid
  [0, 2, 70],[1, 2, 70],[2, 2, 70],[3, 2, 70],[4, 2, 70],[5, 2, 70],[6, 2, 70],
  [1, 1, 70],[2, 1, 70],[3, 1, 70],[4, 1, 70],[5, 1, 70],
  // top curl
  [2, 0, 70],[3, 0, 70],[4, 0, 70],
  [3,-1, 80],
  // eyes
  [1, 3, 200],[2, 3, 200],
  [4, 3, 200],[5, 3, 200],
];
