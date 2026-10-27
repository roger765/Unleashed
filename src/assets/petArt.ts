import Phaser from 'phaser';

/**
 * Polygon-based pet art for Rock, Nature, Wood, Water, Light and Shadow pets (48x48 canvas).
 * Every pet gets its own silhouette; evolved forms reuse the base pet's
 * shape plus gold trim and extra parts so they read as upgrades.
 */

type G = Phaser.GameObjects.Graphics;
type Pt = [number, number];

const GOLD = 0xffd700;
const PALE_GOLD = 0xffe082;

// ── helpers ───────────────────────────────────────────────────────

/** Render scale: art is authored on 48x48 and drawn K times larger for smooth edges. */
let K = 1;

const v = (p: Pt[]) => p.map(([x, y]) => ({ x: x * K, y: y * K }));

/** Chaikin corner-cutting: turns hard polygon corners into soft curves. */
function smooth(p: Pt[], closed: boolean, iter = 2, r = 0.22): Pt[] {
  let q = p;
  for (let it = 0; it < iter; it++) {
    const out: Pt[] = [];
    const n = q.length;
    const last = closed ? n : n - 1;
    if (!closed) out.push(q[0]);
    for (let i = 0; i < last; i++) {
      const a = q[i];
      const b = q[(i + 1) % n];
      out.push([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]);
      out.push([a[0] + (b[0] - a[0]) * (1 - r), a[1] + (b[1] - a[1]) * (1 - r)]);
    }
    if (!closed) out.push(q[n - 1]);
    q = out;
  }
  return q;
}

function P(g: G, color: number, p: Pt[], alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(v(smooth(p, true)), true);
}

function L(g: G, w: number, color: number, p: Pt[], close = true): void {
  g.lineStyle(w * K, color);
  g.strokePoints(v(smooth(p, close)), close);
}

function seg(g: G, w: number, color: number, x1: number, y1: number, x2: number, y2: number): void {
  g.lineStyle(w * K, color);
  g.lineBetween(x1 * K, y1 * K, x2 * K, y2 * K);
}

function rect(g: G, color: number, x: number, y: number, w: number, h: number, r = 0): void {
  g.fillStyle(color);
  g.fillRoundedRect(x * K, y * K, w * K, h * K, Math.min(Math.max(r, 4), w / 2, h / 2) * K);
}

function rr(g: G, lw: number, color: number, x: number, y: number, w: number, h: number, r = 4): void {
  g.lineStyle(lw * K, color);
  g.strokeRoundedRect(x * K, y * K, w * K, h * K, Math.min(r, w / 2, h / 2) * K);
}

function ngon(cx: number, cy: number, r: number, n: number, rot = -Math.PI / 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

function star(cx: number, cy: number, ro: number, ri: number, n: number, rot = -Math.PI / 2): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? ro : ri;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Leaf/petal anchored at its base (bx,by), pointing along `ang`. */
function leaf(bx: number, by: number, len: number, wid: number, ang: number): Pt[] {
  const local: Pt[] = [
    [0, 0], [len * 0.3, -wid], [len * 0.7, -wid * 0.8],
    [len, 0], [len * 0.7, wid * 0.8], [len * 0.3, wid],
  ];
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return local.map(([x, y]) => [bx + x * c - y * s, by + x * s + y * c] as Pt);
}

/** Heart with its tip at the origin pointing "down" before rotation. */
function heart(tx: number, ty: number, size: number, ang: number): Pt[] {
  const local: Pt[] = [
    [0, 0], [-1.1, -1.0], [-1.1, -1.8], [-0.55, -2.2], [0, -1.7],
    [0.55, -2.2], [1.1, -1.8], [1.1, -1.0],
  ];
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return local.map(([x, y]) => {
    const px = x * size;
    const py = y * size;
    return [tx + px * c - py * s, ty + px * s + py * c] as Pt;
  });
}

/** Teardrop with its tip at the top. */
function drop(cx: number, cy: number, r: number): Pt[] {
  const out: Pt[] = [[cx, cy - r * 2.1]];
  const a0 = -Math.PI / 2 + 1.0;
  const a1 = -Math.PI / 2 + Math.PI * 2 - 1.0;
  for (let i = 0; i <= 14; i++) {
    const a = a0 + ((a1 - a0) * i) / 14;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

function eyes(g: G, cx: number, cy: number, spacing = 10, size = 3): void {
  g.fillStyle(0xffffff);
  g.fillCircle((cx - spacing / 2) * K, cy * K, size * K);
  g.fillCircle((cx + spacing / 2) * K, cy * K, size * K);
  g.fillStyle(0x000000);
  g.fillCircle((cx - spacing / 2 + 1) * K, cy * K, size * 0.45 * K);
  g.fillCircle((cx + spacing / 2 + 1) * K, cy * K, size * 0.45 * K);
}

/** Small gold crown-style accent used on many evolutions. */
function gem(g: G, x: number, y: number, color = GOLD, r = 3): void {
  P(g, color, ngon(x, y, r, 4, 0));
}


function ellipse(cx: number, cy: number, rx: number, ry: number, n = 18): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
}

function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
}

/** Soft translucent aura behind a Light pet. */
function glow(g: G, cx: number, cy: number, r: number, color: number): void {
  for (let i = 3; i >= 1; i--) P(g, color, ellipse(cx, cy, (r * i) / 3, (r * i) / 3, 22), 0.13);
}

/** Glowing eyes for Shadow pets: dark socket, coloured glint, white catch-light. */
function glint(g: G, cx: number, cy: number, spacing: number, size: number, color: number): void {
  const xs = [cx - spacing / 2, cx + spacing / 2];
  g.fillStyle(0x05000d);
  for (const x of xs) g.fillCircle(x * K, cy * K, size * K);
  g.fillStyle(color);
  for (const x of xs) g.fillCircle(x * K, cy * K, size * 0.62 * K);
  g.fillStyle(0xffffff, 0.85);
  for (const x of xs) g.fillCircle((x - size * 0.25) * K, (cy - size * 0.25) * K, size * 0.2 * K);
}

// ── ROCK ─────────────────────────────────────────────────────────

const OCT = ngon(24, 26, 16, 8, Math.PI / 8);

const ROCK: Record<string, (g: G) => void> = {
  gravel: (g) => {
    P(g, 0x9e9e9e, [[7, 42], [9, 30], [18, 24], [30, 26], [41, 33], [41, 42]]);
    P(g, 0xbdbdbd, [[15, 26], [19, 14], [29, 12], [33, 24]]);
    P(g, 0x757575, [[33, 28], [40, 24], [45, 32], [42, 40], [34, 38]]);
    P(g, 0x616161, [[6, 34], [10, 30], [13, 38], [8, 42]]);
    eyes(g, 24, 33, 10, 3);
  },
  cobble: (g) => {
    rect(g, 0x8d6e63, 7, 10, 34, 30, 11);
    rect(g, 0xa1887f, 10, 13, 28, 22, 8);
    P(g, 0x6d4c41, [[14, 16], [20, 14], [21, 19], [15, 21]]);
    P(g, 0x6d4c41, [[30, 28], [35, 27], [34, 32], [30, 32]]);
    rect(g, 0x6d4c41, 11, 40, 10, 5, 2);
    rect(g, 0x6d4c41, 27, 40, 10, 5, 2);
    eyes(g, 24, 24, 10, 3);
  },
  slate: (g) => {
    P(g, 0x607d8b, [[14, 5], [41, 9], [35, 43], [7, 39]]);
    P(g, 0x78909c, [[17, 9], [36, 12], [32, 38], [11, 35]]);
    L(g, 1, 0x455a64, [[22, 12], [26, 24], [20, 36]], false);
    L(g, 1, 0x455a64, [[14, 5], [41, 9], [35, 43], [7, 39]]);
    eyes(g, 23, 22, 10, 3);
  },
  marble: (g) => {
    P(g, 0xe0e0e0, OCT);
    P(g, 0xbdbdbd, ngon(24, 26, 12, 8, Math.PI / 8));
    L(g, 2, 0x9e9e9e, [[14, 30], [20, 36], [28, 36], [34, 30]], false);
    L(g, 1, 0x757575, [[16, 22], [22, 17], [30, 18]], false);
    P(g, 0xffffff, [[14, 18], [20, 14], [22, 18], [16, 22]], 0.6);
    eyes(g, 24, 25, 10, 3);
  },
  obsidian: (g) => {
    P(g, 0x2d1b69, [[8, 41], [2, 24], [12, 13], [15, 30]]);
    P(g, 0x2d1b69, [[40, 41], [46, 22], [36, 11], [33, 30]]);
    P(g, 0x1a1a2e, [[24, 2], [34, 18], [41, 41], [7, 41], [14, 18]]);
    P(g, 0x6a1b9a, [[24, 12], [31, 26], [24, 39], [17, 26]], 0.7);
    seg(g, 1, 0xff1744, 24, 12, 18, 30);
    seg(g, 1, 0xff1744, 24, 12, 30, 30);
    seg(g, 1, 0xff1744, 20, 22, 28, 28);
    eyes(g, 24, 24, 10, 3);
  },
  chalk: (g) => {
    P(g, 0xf5f5f5, [[15, 42], [15, 14], [21, 7], [35, 9], [35, 42]]);
    P(g, 0xe0e0e0, [[19, 42], [19, 15], [23, 11], [31, 12], [31, 42]]);
    P(g, 0xffffff, [[21, 7], [27, 4], [35, 9]]);
    P(g, 0xbdbdbd, [[33, 40], [39, 42], [35, 46]]);
    rect(g, 0xffffff, 8, 38, 3, 3);
    rect(g, 0xffffff, 40, 20, 3, 3);
    eyes(g, 25, 24, 10, 3);
  },
  grit: (g) => {
    P(g, 0x6d4c41, [[8, 40], [10, 28], [20, 24], [26, 40]]);
    P(g, 0x8d6e63, [[22, 40], [24, 26], [34, 22], [42, 30], [40, 40]]);
    P(g, 0xa1887f, [[16, 26], [20, 14], [30, 12], [32, 24], [24, 28]]);
    rect(g, 0xd7ccc8, 6, 44, 3, 3);
    rect(g, 0xd7ccc8, 40, 42, 3, 3);
    eyes(g, 25, 22, 8, 2.5);
  },
  shale: (g) => {
    P(g, 0x546e7a, [[4, 42], [6, 34], [42, 32], [44, 42]]);
    P(g, 0x78909c, [[6, 34], [8, 26], [40, 24], [42, 32]]);
    P(g, 0x90a4ae, [[8, 26], [11, 17], [37, 15], [40, 24]]);
    seg(g, 1, 0x37474f, 6, 34, 42, 32);
    seg(g, 1, 0x37474f, 8, 26, 40, 24);
    eyes(g, 24, 22, 10, 3);
  },
  basalt: (g) => {
    P(g, 0x546e7a, [[12, 10], [24, 5], [36, 10], [24, 15]]);
    P(g, 0x37474f, [[12, 10], [24, 15], [24, 43], [12, 38]]);
    P(g, 0x455a64, [[24, 15], [36, 10], [36, 38], [24, 43]]);
    seg(g, 1, 0x263238, 24, 15, 24, 43);
    eyes(g, 24, 26, 12, 3);
  },
  limestone: (g) => {
    P(g, 0xd7ccc8, [[7, 30], [9, 18], [18, 9], [30, 9], [39, 18], [41, 30], [35, 42], [29, 33], [24, 45], [19, 33], [13, 42]]);
    P(g, 0xefebe9, [[13, 20], [19, 13], [25, 14], [18, 24]]);
    P(g, 0xa1887f, [[31, 22], [37, 24], [34, 30]], 0.7);
    eyes(g, 24, 23, 10, 3);
  },
  monolith: (g) => {
    rect(g, 0x616161, 6, 42, 36, 4, 1);
    P(g, 0x757575, [[24, 2], [33, 10], [35, 42], [13, 42], [15, 10]]);
    P(g, 0x9e9e9e, [[24, 6], [30, 12], [31, 40], [17, 40], [18, 12]]);
    L(g, 2, GOLD, [[24, 2], [33, 10], [35, 42], [13, 42], [15, 10]]);
    seg(g, 2, GOLD, 24, 8, 24, 14);
    eyes(g, 24, 24, 10, 3);
  },
  tumbler: (g) => {
    P(g, 0x8d6e63, ngon(24, 26, 18, 8, Math.PI / 8));
    P(g, 0xa1887f, ngon(24, 24, 13, 8, Math.PI / 8));
    L(g, 3, GOLD, ngon(24, 26, 21, 8, Math.PI / 8));
    P(g, 0x6d4c41, [[14, 18], [20, 16], [21, 21], [15, 23]]);
    rect(g, 0x6d4c41, 12, 42, 10, 5, 2);
    rect(g, 0x6d4c41, 26, 42, 10, 5, 2);
    eyes(g, 24, 24, 10, 3);
  },
  razorslate: (g) => {
    P(g, 0x455a64, [[6, 41], [1, 22], [13, 28]]);
    P(g, 0x455a64, [[42, 41], [47, 22], [35, 28]]);
    P(g, 0x546e7a, [[24, 2], [38, 22], [34, 44], [14, 44], [10, 22]]);
    P(g, 0x78909c, [[24, 10], [32, 24], [29, 38], [19, 38], [16, 24]]);
    L(g, 3, GOLD, [[24, 2], [38, 22], [34, 44], [14, 44], [10, 22]]);
    eyes(g, 24, 26, 10, 3);
  },
  marblemarch: (g) => {
    P(g, 0xeceff1, ngon(24, 27, 18, 8, Math.PI / 8));
    P(g, 0xb0bec5, ngon(24, 25, 13, 8, Math.PI / 8));
    L(g, 3, GOLD, ngon(24, 27, 21, 8, Math.PI / 8));
    P(g, GOLD, [[18, 8], [21, 1], [24, 7], [27, 1], [30, 8]]);
    rect(g, 0xb0bec5, 12, 43, 8, 4, 2);
    rect(g, 0xb0bec5, 28, 43, 8, 4, 2);
    eyes(g, 24, 24, 10, 3);
  },
  megalith: (g) => {
    rect(g, 0x616161, 16, 16, 16, 30);
    rect(g, 0x757575, 5, 14, 11, 32, 1);
    rect(g, 0x757575, 32, 14, 11, 32, 1);
    rect(g, 0x9e9e9e, 2, 4, 44, 13, 2);
    rr(g, 3, PALE_GOLD, 2, 4, 44, 13);
    seg(g, 2, GOLD, 10, 10, 38, 10);
    eyes(g, 24, 28, 10, 3);
  },
  rockslide: (g) => {
    P(g, 0x5d4037, [[4, 44], [6, 32], [16, 28], [24, 44]]);
    P(g, 0x6d4c41, [[22, 44], [26, 28], [38, 24], [46, 34], [44, 44]]);
    P(g, 0x8d6e63, [[12, 30], [16, 14], [28, 8], [38, 18], [36, 30], [22, 34]]);
    L(g, 3, PALE_GOLD, [[12, 30], [16, 14], [28, 8], [38, 18], [36, 30], [22, 34]]);
    P(g, 0xa1887f, [[30, 4], [36, 0], [40, 6], [34, 10]]);
    eyes(g, 25, 20, 10, 3);
  },
};

// ── NATURE ───────────────────────────────────────────────────────

function fronds(g: G, n: number, len: number, wid: number, base: Pt, colors: number[], gold = false): void {
  const span = Math.PI * 0.9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.95 + (i * span) / (n - 1);
    P(g, colors[i % colors.length], leaf(base[0], base[1], len, wid, a));
    if (gold) gem(g, base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len, GOLD, 2.5);
  }
}

const NATURE: Record<string, (g: G) => void> = {
  leaf: (g) => {
    P(g, 0x66bb6a, leaf(24, 45, 38, 15, -Math.PI / 2));
    P(g, 0x43a047, leaf(24, 45, 38, 15, -Math.PI / 2).slice(0, 4).concat([[24, 45]]));
    seg(g, 1, 0x2e7d32, 24, 45, 24, 10);
    seg(g, 1, 0x2e7d32, 24, 34, 15, 28);
    seg(g, 1, 0x2e7d32, 24, 34, 33, 28);
    seg(g, 1, 0x2e7d32, 24, 22, 17, 17);
    seg(g, 1, 0x2e7d32, 24, 22, 31, 17);
    eyes(g, 24, 28, 10, 3);
  },
  sprout: (g) => {
    P(g, 0x66bb6a, leaf(24, 24, 15, 6, -2.5));
    P(g, 0x66bb6a, leaf(24, 24, 15, 6, -0.64));
    rect(g, 0x4caf50, 22, 16, 4, 14);
    rect(g, 0x8d6e63, 12, 28, 24, 16, 7);
    rect(g, 0xa1887f, 15, 30, 18, 11, 5);
    eyes(g, 24, 36, 8, 2.5);
  },
  fern: (g) => {
    fronds(g, 5, 18, 5, [24, 36], [0x388e3c, 0x4caf50]);
    rect(g, 0x2e7d32, 15, 28, 18, 17, 6);
    eyes(g, 24, 35, 10, 3);
  },
  blossom: (g) => {
    const cols = [0xe91e63, 0xff5722, 0xff9800, 0xffeb3b, 0xf06292];
    for (let i = 0; i < 5; i++) {
      P(g, cols[i], leaf(24, 26, 19, 7.5, -Math.PI / 2 + (i / 5) * Math.PI * 2));
    }
    P(g, 0xfdd835, ngon(24, 26, 9, 8, 0));
    eyes(g, 24, 26, 8, 2.5);
  },
  flora: (g) => {
    P(g, 0x2e7d32, [[7, 28], [14, 21], [34, 21], [41, 28], [37, 45], [11, 45]]);
    seg(g, 3, 0x4caf50, 8, 28, 3, 40);
    seg(g, 3, 0x4caf50, 40, 28, 45, 40);
    P(g, 0x66bb6a, leaf(3, 40, 7, 3, -0.5));
    P(g, 0x66bb6a, leaf(45, 40, 7, 3, Math.PI + 0.5));
    P(g, 0xe91e63, star(12, 14, 7, 3, 5));
    P(g, 0xffeb3b, star(24, 8, 8, 3.5, 5));
    P(g, 0xe91e63, star(36, 14, 7, 3, 5));
    gem(g, 12, 14, 0xffeb3b, 2);
    gem(g, 36, 14, 0xffeb3b, 2);
    eyes(g, 24, 31, 12, 4);
  },
  moss: (g) => {
    P(g, 0x558b2f, [[3, 43], [5, 33], [11, 27], [16, 22], [22, 24], [27, 17], [33, 24], [39, 27], [45, 35], [45, 43]]);
    P(g, 0x7cb342, [[8, 30], [12, 22], [16, 28]]);
    P(g, 0x7cb342, [[27, 17], [30, 9], [34, 20]]);
    P(g, 0x7cb342, [[36, 28], [41, 22], [43, 32]]);
    eyes(g, 24, 33, 10, 2.5);
  },
  clover: (g) => {
    for (let k = 0; k < 4; k++) {
      P(g, k % 2 ? 0x2e7d32 : 0x43a047, heart(24, 27, 6.5, (k * Math.PI) / 2));
    }
    P(g, 0x8d6e63, ngon(24, 27, 6, 6, 0));
    eyes(g, 24, 27, 7, 2);
  },
  orchid: (g) => {
    P(g, 0xce93d8, leaf(24, 24, 20, 7, -Math.PI / 2));
    P(g, 0xce93d8, leaf(24, 24, 20, 7, -2.6));
    P(g, 0xce93d8, leaf(24, 24, 20, 7, -0.54));
    P(g, 0xab47bc, [[14, 28], [34, 28], [29, 44], [19, 44]]);
    P(g, 0xffd700, [[20, 28], [28, 28], [24, 36]]);
    eyes(g, 24, 32, 6, 2);
  },
  thistle: (g) => {
    rect(g, 0x558b2f, 22, 36, 4, 10);
    P(g, 0x558b2f, [[11, 28], [37, 28], [31, 43], [17, 43]]);
    P(g, 0x5e35b1, star(24, 20, 19, 9, 11));
    P(g, 0x9575cd, star(24, 20, 12, 7, 9, 0));
    eyes(g, 24, 22, 8, 2.5);
  },
  myrtle: (g) => {
    for (let i = 0; i < 8; i++) {
      P(g, i % 2 ? 0x1b5e20 : 0x2e7d32, leaf(24, 28, 17, 6, (i / 8) * Math.PI * 2));
    }
    P(g, 0xffffff, star(10, 14, 5, 2.2, 5));
    P(g, 0xffffff, star(38, 14, 5, 2.2, 5));
    P(g, 0xffeb3b, star(24, 8, 4.5, 2, 5));
    P(g, 0x1b5e20, ngon(24, 28, 10, 8, 0));
    eyes(g, 24, 28, 10, 3);
  },
  canopy: (g) => {
    rect(g, 0x6d4c41, 20, 30, 8, 15);
    P(g, 0x43a047, star(24, 22, 21, 16, 9));
    P(g, 0x66bb6a, star(24, 22, 14, 11, 9, -Math.PI / 2 + 0.2));
    L(g, 3, GOLD, star(24, 22, 21, 16, 9));
    seg(g, 1, 0x2e7d32, 24, 8, 24, 30);
    eyes(g, 24, 24, 10, 3);
  },
  thornthrall: (g) => {
    P(g, 0x2e7d32, leaf(24, 20, 16, 7, -Math.PI / 2));
    P(g, 0x2e7d32, leaf(24, 24, 14, 5, -2.4));
    P(g, 0x2e7d32, leaf(24, 24, 14, 5, -0.74));
    rect(g, 0x6d4c41, 13, 24, 22, 21, 6);
    P(g, GOLD, [[8, 26], [14, 30], [8, 34]]);
    P(g, GOLD, [[40, 26], [34, 30], [40, 34]]);
    P(g, GOLD, [[8, 38], [14, 41], [8, 44]]);
    P(g, GOLD, [[40, 38], [34, 41], [40, 44]]);
    eyes(g, 24, 34, 8, 2.5);
  },
  primeval: (g) => {
    fronds(g, 7, 21, 6, [24, 37], [0x1b5e20, 0x388e3c], true);
    P(g, 0x1b5e20, [[12, 30], [36, 30], [38, 45], [10, 45]]);
    L(g, 3, GOLD, [[12, 30], [36, 30], [38, 45], [10, 45]]);
    eyes(g, 24, 36, 10, 3);
  },
  fullbloom: (g) => {
    for (let i = 0; i < 8; i++) {
      P(g, i % 2 ? 0xffb74d : 0xf48fb1, leaf(24, 26, 21, 7, -Math.PI / 2 + (i / 8) * Math.PI * 2));
    }
    for (let i = 0; i < 8; i++) {
      P(g, 0xf8bbd0, leaf(24, 26, 14, 5, -Math.PI / 2 + ((i + 0.5) / 8) * Math.PI * 2));
    }
    P(g, 0xfdd835, star(24, 26, 10, 7, 8, 0));
    L(g, 2, GOLD, star(24, 26, 10, 7, 8, 0));
    eyes(g, 24, 26, 8, 2.5);
  },
  edenguard: (g) => {
    P(g, 0x2e7d32, [[5, 12], [43, 12], [43, 28], [24, 46], [5, 28]]);
    P(g, 0x43a047, [[9, 15], [39, 15], [39, 27], [24, 41], [9, 27]]);
    L(g, 3, PALE_GOLD, [[5, 12], [43, 12], [43, 28], [24, 46], [5, 28]]);
    P(g, 0xe91e63, star(11, 8, 7, 3, 5));
    P(g, 0xffeb3b, star(24, 5, 6, 2.5, 5));
    P(g, 0xe91e63, star(37, 8, 7, 3, 5));
    eyes(g, 24, 26, 12, 4);
  },
  skylarch: (g) => {
    P(g, 0x66bb6a, leaf(14, 24, 13, 6, Math.PI + 0.6));
    P(g, 0x66bb6a, leaf(34, 24, 13, 6, -0.6));
    rect(g, 0x5d4037, 21, 38, 6, 8);
    P(g, 0x1b5e20, [[24, 24], [6, 42], [42, 42]]);
    P(g, 0x2e7d32, [[24, 13], [9, 33], [39, 33]]);
    P(g, 0x388e3c, [[24, 2], [12, 22], [36, 22]]);
    L(g, 2, PALE_GOLD, [[24, 2], [12, 22], [36, 22]]);
    L(g, 2, PALE_GOLD, [[24, 13], [9, 33], [39, 33]]);
    eyes(g, 24, 22, 8, 2.5);
  },
  brambleking: (g) => {
    P(g, 0x4e342e, star(24, 32, 15, 10, 9));
    L(g, 3, GOLD, star(24, 32, 15, 10, 9));
    P(g, GOLD, [[9, 18], [11, 4], [18, 13], [24, 1], [30, 13], [37, 4], [39, 18]]);
    gem(g, 24, 10, 0xc62828, 2.5);
    gem(g, 15, 14, 0xc62828, 2);
    gem(g, 33, 14, 0xc62828, 2);
    eyes(g, 24, 32, 10, 3);
  },
};

// ── WOOD ─────────────────────────────────────────────────────────

const WOOD: Record<string, (g: G) => void> = {
  twig: (g) => {
    P(g, 0x6d4c41, [[19, 20], [7, 6], [11, 4], [23, 15]]);
    P(g, 0x6d4c41, [[29, 20], [41, 6], [37, 4], [25, 15]]);
    P(g, 0x66bb6a, leaf(8, 6, 7, 3, -2.3));
    P(g, 0x66bb6a, leaf(40, 6, 7, 3, -0.84));
    rect(g, 0x8d6e63, 18, 14, 12, 26, 3);
    rect(g, 0x8d6e63, 18, 38, 4, 8);
    rect(g, 0x8d6e63, 26, 38, 4, 8);
    eyes(g, 24, 22, 6, 2.5);
  },
  bark: (g) => {
    rect(g, 0x5d4037, 7, 8, 34, 34, 4);
    rect(g, 0x795548, 10, 10, 28, 30, 3);
    L(g, 2, 0x4e342e, [[15, 10], [13, 20], [16, 30], [14, 40]], false);
    L(g, 2, 0x4e342e, [[24, 10], [26, 20], [23, 30], [25, 40]], false);
    L(g, 2, 0x4e342e, [[34, 10], [32, 20], [35, 30], [33, 40]], false);
    P(g, 0x66bb6a, [[10, 10], [20, 10], [14, 16]]);
    P(g, 0x66bb6a, [[38, 10], [30, 10], [35, 15]]);
    rect(g, 0x5d4037, 9, 41, 10, 5, 2);
    rect(g, 0x5d4037, 29, 41, 10, 5, 2);
    eyes(g, 24, 22, 12, 3);
  },
  cedar: (g) => {
    rect(g, 0x6d4c41, 20, 36, 8, 10);
    P(g, 0x33691e, [[24, 18], [5, 40], [43, 40]]);
    P(g, 0x558b2f, [[24, 10], [9, 30], [39, 30]]);
    P(g, 0x7cb342, [[24, 2], [13, 20], [35, 20]]);
    eyes(g, 24, 28, 10, 3);
  },
  willow: (g) => {
    rect(g, 0x795548, 20, 16, 8, 28);
    for (const x of [8, 15, 33, 40]) {
      P(g, 0x558b2f, [[x - 2, 14], [x + 2, 14], [x + (x < 24 ? -2 : 2), 42]]);
      gem(g, x + (x < 24 ? -2 : 2), 42, 0x8bc34a, 2);
    }
    P(g, 0x7cb342, [[6, 18], [10, 8], [24, 3], [38, 8], [42, 18], [34, 14], [24, 17], [14, 14]]);
    eyes(g, 24, 26, 8, 2.5);
  },
  ironwood: (g) => {
    rect(g, 0x5d4037, 2, 18, 8, 6);
    rect(g, 0x5d4037, 38, 18, 8, 6);
    rect(g, 0x4e342e, 10, 12, 28, 32, 2);
    for (const [x, y] of [[12, 14], [26, 14], [12, 28], [26, 28]]) rect(g, 0x78909c, x, y, 10, 10, 2);
    P(g, 0xb0bec5, ngon(17, 19, 2, 4, 0));
    P(g, 0xb0bec5, ngon(31, 19, 2, 4, 0));
    P(g, 0xb0bec5, ngon(17, 33, 2, 4, 0));
    P(g, 0xb0bec5, ngon(31, 33, 2, 4, 0));
    P(g, 0x33691e, [[24, 0], [8, 14], [40, 14]]);
    eyes(g, 24, 22, 12, 3);
  },
  driftwood: (g) => {
    P(g, 0xa1887f, [[3, 33], [9, 24], [21, 21], [33, 24], [43, 16], [46, 22], [39, 33], [27, 37], [11, 40], [3, 38]]);
    P(g, 0xd7ccc8, [[10, 27], [20, 24], [30, 27], [20, 30]]);
    L(g, 1, 0x6d4c41, [[8, 36], [20, 33], [34, 30]], false);
    L(g, 2, 0x6d4c41, [[3, 33], [9, 24], [21, 21], [33, 24], [43, 16], [46, 22], [39, 33], [27, 37], [11, 40], [3, 38]]);
    eyes(g, 24, 29, 9, 2.5);
  },
  acorn: (g) => {
    rect(g, 0x6d4c41, 22, 3, 4, 7);
    P(g, 0x5d4037, [[9, 21], [10, 13], [24, 9], [38, 13], [39, 21]]);
    L(g, 1, 0x3e2723, [[14, 12], [18, 21]], false);
    L(g, 1, 0x3e2723, [[24, 10], [24, 21]], false);
    L(g, 1, 0x3e2723, [[34, 12], [30, 21]], false);
    P(g, 0xd7a86e, [[10, 22], [38, 22], [34, 36], [24, 45], [14, 36]]);
    P(g, 0xe8c08a, [[14, 24], [22, 24], [20, 36], [16, 34]]);
    eyes(g, 24, 31, 8, 2.5);
  },
  pine: (g) => {
    rect(g, 0x5d4037, 20, 36, 8, 10);
    P(g, 0x1b5e20, [[24, 20], [4, 40], [44, 40]]);
    P(g, 0x2e7d32, [[24, 11], [8, 30], [40, 30]]);
    P(g, 0x388e3c, [[24, 2], [12, 20], [36, 20]]);
    gem(g, 24, 3, 0xffeb3b, 2.5);
    eyes(g, 24, 24, 8, 2.5);
  },
  bamboo: (g) => {
    for (const [x, y, c] of [[11, 10, 0x689f38], [20, 5, 0x7cb342], [29, 8, 0x689f38]] as [number, number, number][]) {
      rect(g, c, x, y, 8, 40 - y + 6, 2);
      seg(g, 2, 0x33691e, x, y + 12, x + 8, y + 12);
      seg(g, 2, 0x33691e, x, y + 26, x + 8, y + 26);
    }
    P(g, 0x8bc34a, leaf(37, 14, 10, 3.5, -0.5));
    P(g, 0x8bc34a, leaf(11, 18, 9, 3, Math.PI + 0.4));
    eyes(g, 24, 22, 8, 2.5);
  },
  birch: (g) => {
    P(g, 0x8bc34a, leaf(24, 14, 14, 6, -2.5));
    P(g, 0x8bc34a, leaf(24, 14, 14, 6, -0.64));
    P(g, 0x8bc34a, leaf(24, 14, 12, 5, -Math.PI / 2));
    rect(g, 0xeceff1, 15, 12, 18, 33, 2);
    rect(g, 0x212121, 15, 18, 7, 3);
    rect(g, 0x212121, 27, 26, 6, 3);
    rect(g, 0x212121, 15, 36, 8, 3);
    eyes(g, 24, 26, 8, 2.5);
  },
  groveward: (g) => {
    P(g, 0x66bb6a, leaf(14, 14, 11, 5, Math.PI + 0.5));
    P(g, 0x66bb6a, leaf(34, 14, 11, 5, -0.5));
    rect(g, 0x6d4c41, 14, 6, 20, 38, 3);
    rect(g, 0x8d6e63, 17, 9, 14, 32, 2);
    rr(g, 3, GOLD, 14, 6, 20, 38, 3);
    seg(g, 2, GOLD, 24, 30, 24, 42);
    gem(g, 24, 33, 0x66bb6a, 3);
    eyes(g, 24, 16, 8, 2.5);
  },
  bulwark: (g) => {
    P(g, 0x5d4037, [[5, 6], [43, 6], [43, 30], [24, 46], [5, 30]]);
    P(g, 0x795548, [[9, 10], [39, 10], [39, 28], [24, 41], [9, 28]]);
    L(g, 3, GOLD, [[5, 6], [43, 6], [43, 30], [24, 46], [5, 30]]);
    P(g, 0x66bb6a, [[9, 10], [18, 10], [12, 17]]);
    P(g, 0x66bb6a, [[39, 10], [30, 10], [36, 17]]);
    L(g, 1, 0x4e342e, [[24, 10], [24, 41]], false);
    eyes(g, 24, 20, 12, 3);
  },
  sequoia: (g) => {
    rect(g, 0x5d4037, 19, 36, 10, 10);
    P(g, 0x1b5e20, [[24, 24], [3, 41], [45, 41]]);
    P(g, 0x2e7d32, [[24, 14], [7, 32], [41, 32]]);
    P(g, 0x33691e, [[24, 6], [10, 22], [38, 22]]);
    P(g, 0x388e3c, [[24, 0], [14, 12], [34, 12]]);
    L(g, 2, GOLD, [[24, 24], [3, 41], [45, 41]]);
    L(g, 2, GOLD, [[24, 6], [10, 22], [38, 22]]);
    eyes(g, 24, 30, 10, 3);
  },
  weepgiant: (g) => {
    rect(g, 0x6d4c41, 18, 16, 12, 30, 2);
    seg(g, 3, GOLD, 18, 36, 30, 36);
    for (const x of [5, 11, 17, 31, 37, 43]) {
      P(g, 0x558b2f, [[x - 2, 14], [x + 2, 14], [x + (x < 24 ? -1 : 1), 43]]);
      gem(g, x + (x < 24 ? -1 : 1), 43, 0x8bc34a, 2);
    }
    P(g, 0x7cb342, [[3, 20], [8, 8], [24, 2], [40, 8], [45, 20], [34, 14], [24, 17], [14, 14]]);
    L(g, 2, GOLD, [[3, 20], [8, 8], [24, 2], [40, 8], [45, 20], [34, 14], [24, 17], [14, 14]]);
    eyes(g, 24, 26, 8, 2.5);
  },
  adamantbark: (g) => {
    rect(g, 0x37474f, 7, 10, 34, 34, 3);
    rect(g, 0x546e7a, 10, 13, 28, 28, 2);
    rect(g, 0x78909c, 12, 15, 9, 9, 2);
    rect(g, 0x78909c, 27, 15, 9, 9, 2);
    rect(g, 0x78909c, 12, 28, 9, 9, 2);
    rect(g, 0x78909c, 27, 28, 9, 9, 2);
    rr(g, 3, PALE_GOLD, 7, 10, 34, 34, 3);
    P(g, 0x4dd0e1, [[14, 11], [18, 1], [24, 9], [30, 1], [34, 11]]);
    L(g, 2, 0x33691e, [[14, 11], [18, 1], [24, 9], [30, 1], [34, 11]]);
    eyes(g, 24, 22, 12, 3);
  },
  wildwood: (g) => {
    L(g, 3, 0x4e342e, [[18, 12], [10, 6], [6, 0]], false);
    L(g, 3, 0x4e342e, [[14, 8], [6, 8]], false);
    L(g, 3, 0x4e342e, [[30, 12], [38, 6], [42, 0]], false);
    L(g, 3, 0x4e342e, [[34, 8], [42, 8]], false);
    P(g, 0x66bb6a, leaf(4, 20, 9, 4, Math.PI * 0.9));
    P(g, 0x66bb6a, leaf(44, 20, 9, 4, Math.PI * 0.1));
    rect(g, 0x4e342e, 14, 10, 20, 34, 3);
    rect(g, 0x6d4c41, 17, 13, 14, 28, 2);
    rr(g, 3, PALE_GOLD, 14, 10, 20, 34, 3);
    eyes(g, 24, 20, 8, 2.5);
  },
  citadel: (g) => {
    P(g, 0x3e2723, [[3, 14], [3, 6], [9, 6], [9, 10], [15, 10], [15, 6], [21, 6], [21, 10], [27, 10], [27, 6], [33, 6], [33, 10], [39, 10], [39, 6], [45, 6], [45, 14], [45, 44], [3, 44]]);
    rect(g, 0x5d4037, 7, 14, 34, 26, 2);
    P(g, 0x212121, [[19, 44], [19, 36], [24, 32], [29, 36], [29, 44]]);
    L(g, 3, GOLD, [[3, 14], [3, 6], [9, 6], [9, 10], [15, 10], [15, 6], [21, 6], [21, 10], [27, 10], [27, 6], [33, 6], [33, 10], [39, 10], [39, 6], [45, 6], [45, 14], [45, 44], [3, 44]]);
    eyes(g, 24, 22, 12, 3);
  },
};

// ── WATER ────────────────────────────────────────────────────────

const CREST: Pt[] = [[3, 43], [5, 27], [13, 14], [25, 7], [36, 9], [43, 17], [34, 15], [28, 18], [31, 27], [45, 36], [45, 43]];

const WATER: Record<string, (g: G) => void> = {
  wave: (g) => {
    P(g, 0x42a5f5, CREST);
    P(g, 0x64b5f6, [[8, 38], [9, 28], [16, 19], [25, 14], [31, 22], [26, 30], [20, 38]]);
    P(g, 0xbbdefb, [[36, 9], [43, 17], [34, 15]]);
    P(g, 0xbbdefb, [[13, 14], [19, 10], [20, 16]]);
    eyes(g, 20, 30, 9, 3);
  },
  puddle: (g) => {
    P(g, 0x90caf9, [[3, 38], [8, 31], [16, 29], [21, 25], [29, 27], [35, 30], [42, 31], [45, 38], [38, 43], [9, 43]]);
    P(g, 0x64b5f6, [[9, 37], [14, 32], [24, 30], [35, 33], [40, 38], [32, 41], [14, 41]]);
    L(g, 1, 0x42a5f5, [[14, 40], [24, 41], [34, 40]], false);
    P(g, 0xffffff, ngon(34, 25, 3, 6, 0), 0.7);
    eyes(g, 24, 35, 8, 2.5);
  },
  brook: (g) => {
    P(g, 0x29b6f6, [[3, 30], [11, 21], [22, 25], [33, 16], [43, 20], [45, 29], [35, 36], [24, 33], [14, 41], [4, 38]]);
    P(g, 0x4fc3f7, [[8, 30], [13, 25], [22, 29], [32, 21], [38, 24], [32, 31], [23, 28], [14, 36]]);
    L(g, 1, 0x81d4fa, [[10, 34], [18, 29]], false);
    L(g, 1, 0x81d4fa, [[28, 24], [38, 28]], false);
    P(g, 0xb3e5fc, drop(40, 12, 3));
    P(g, 0xb3e5fc, drop(8, 20, 2));
    eyes(g, 24, 29, 9, 3);
  },
  reef: (g) => {
    const coral = (x: number, c: number) => {
      P(g, c, [[x - 2, 28], [x - 2, 12], [x - 6, 6], [x - 3, 5], [x, 9], [x + 3, 5], [x + 6, 6], [x + 2, 12], [x + 2, 28]]);
    };
    coral(11, 0xef5350);
    coral(24, 0xff7043);
    coral(37, 0xffa726);
    P(g, 0x1e88e5, [[4, 44], [6, 32], [16, 26], [32, 26], [42, 32], [44, 44]]);
    P(g, 0xffecb3, ngon(14, 40, 3.5, 5, 0));
    P(g, 0xffecb3, ngon(34, 41, 3, 5, 0));
    eyes(g, 24, 33, 10, 3);
  },
  tsunami: (g) => {
    P(g, 0x1565c0, [[1, 45], [2, 24], [10, 10], [24, 3], [38, 4], [47, 14], [36, 13], [30, 18], [34, 28], [47, 38], [47, 45]]);
    P(g, 0x1976d2, [[7, 40], [8, 26], [15, 15], [26, 10], [32, 20], [26, 30], [20, 40]]);
    P(g, 0xbbdefb, star(14, 11, 6, 3, 5));
    P(g, 0xbbdefb, star(30, 5, 5, 2.5, 5));
    P(g, 0xbbdefb, star(42, 13, 5, 2.5, 5));
    seg(g, 2, 0x0d47a1, 8, 36, 40, 36);
    seg(g, 2, 0x0d47a1, 8, 41, 44, 41);
    eyes(g, 21, 27, 12, 4);
  },
  droplet: (g) => {
    P(g, 0x29b6f6, drop(24, 30, 13));
    P(g, 0x81d4fa, drop(24, 30, 8));
    P(g, 0xffffff, [[16, 26], [20, 22], [22, 26]], 0.7);
    eyes(g, 24, 32, 7, 2.5);
  },
  mist: (g) => {
    P(g, 0xb3e5fc, [[5, 41], [3, 33], [9, 26], [14, 19], [22, 17], [26, 10], [34, 12], [38, 19], [44, 25], [45, 35], [40, 41]], 0.9);
    P(g, 0xe1f5fe, [[12, 36], [11, 30], [16, 25], [24, 23], [31, 22], [35, 28], [37, 36]], 0.7);
    seg(g, 2, 0xb3e5fc, 8, 45, 18, 45);
    seg(g, 2, 0xb3e5fc, 26, 46, 38, 46);
    eyes(g, 24, 30, 8, 2.5);
  },
  geyser: (g) => {
    P(g, 0xb3e5fc, [[24, 2], [32, 16], [36, 32], [12, 32], [16, 16]]);
    P(g, 0xe1f5fe, [[24, 8], [29, 18], [30, 30], [18, 30], [19, 18]]);
    P(g, 0xffffff, star(24, 4, 6, 2.5, 5), 0.8);
    P(g, 0xb3e5fc, drop(8, 16, 2));
    P(g, 0xb3e5fc, drop(40, 12, 2));
    P(g, 0x0277bd, [[4, 45], [9, 32], [39, 32], [44, 45]]);
    seg(g, 2, 0x01579b, 9, 32, 39, 32);
    eyes(g, 24, 38, 7, 2.5);
  },
  lagoon: (g) => {
    const fan: Pt[] = [[24, 44]];
    const n = 7;
    for (let i = 0; i <= n * 4; i++) {
      const a = Math.PI * 1.08 + (i / (n * 4)) * Math.PI * 0.84;
      const r = 28 + (i % 4 === 0 ? -3 : 0);
      fan.push([24 + Math.cos(a) * r, 44 + Math.sin(a) * r]);
    }
    P(g, 0x00838f, fan);
    P(g, 0x4dd0e1, [[24, 44], [10, 27], [16, 19], [32, 19], [38, 27]]);
    for (let i = 0; i <= 4; i++) seg(g, 1, 0x006064, 24, 44, 8 + i * 8, 14 + Math.abs(2 - i) * 3);
    P(g, 0xfff8e1, ngon(24, 44, 5, 6, 0));
    eyes(g, 24, 30, 10, 3);
  },
  riptide: (g) => {
    P(g, 0x01579b, [[3, 8], [45, 8], [36, 26], [28, 44], [20, 44], [12, 26]]);
    L(g, 3, 0x4fc3f7, [[7, 14], [30, 14], [22, 24]], false);
    L(g, 3, 0x4fc3f7, [[14, 28], [34, 20]], false);
    L(g, 3, 0x4fc3f7, [[19, 36], [29, 33]], false);
    P(g, 0xe1f5fe, ngon(10, 20, 2.5, 4, 0));
    P(g, 0xe1f5fe, ngon(38, 14, 2.5, 4, 0));
    eyes(g, 24, 26, 10, 3);
  },
  breaker: (g) => {
    P(g, 0x1976d2, CREST);
    P(g, 0x42a5f5, [[8, 38], [9, 28], [16, 19], [25, 14], [31, 22], [26, 30], [20, 38]]);
    L(g, 3, GOLD, CREST);
    P(g, 0xe3f2fd, [[36, 9], [43, 17], [34, 15]]);
    P(g, 0xe3f2fd, [[13, 14], [19, 10], [20, 16]]);
    rect(g, 0x1976d2, 10, 43, 9, 4, 2);
    rect(g, 0x1976d2, 28, 43, 9, 4, 2);
    eyes(g, 20, 30, 9, 3);
  },
  depthling: (g) => {
    L(g, 2, 0x0d47a1, [[22, 20], [24, 8], [32, 5]], false);
    P(g, 0xffeb3b, star(32, 5, 5, 2, 5));
    P(g, 0x1565c0, [[3, 33], [10, 20], [26, 18], [40, 24], [45, 34], [34, 44], [13, 43]]);
    P(g, 0x42a5f5, [[10, 33], [14, 25], [26, 23], [36, 28], [38, 35], [30, 40], [16, 39]]);
    L(g, 3, GOLD, [[3, 33], [10, 20], [26, 18], [40, 24], [45, 34], [34, 44], [13, 43]]);
    P(g, 0xffffff, [[16, 38], [18, 43], [21, 38]]);
    P(g, 0xffffff, [[23, 39], [25, 44], [28, 39]]);
    P(g, 0x0d47a1, [[3, 33], [-1, 26], [2, 40]]);
    eyes(g, 26, 30, 8, 2.5);
  },
  rapidsoul: (g) => {
    P(g, 0x0288d1, [[2, 30], [10, 18], [22, 23], [34, 12], [45, 16], [46, 28], [36, 37], [24, 32], [13, 43], [3, 40]]);
    P(g, 0x29b6f6, [[8, 30], [13, 23], [22, 28], [33, 19], [39, 22], [33, 30], [23, 26], [14, 36]]);
    L(g, 3, GOLD, [[2, 30], [10, 18], [22, 23], [34, 12], [45, 16], [46, 28], [36, 37], [24, 32], [13, 43], [3, 40]]);
    P(g, 0xb3e5fc, drop(40, 7, 3));
    P(g, 0xb3e5fc, drop(6, 14, 2.5));
    eyes(g, 24, 28, 10, 3);
  },
  atollward: (g) => {
    for (const x of [9, 39]) {
      P(g, 0xff7043, [[x - 3, 22], [x - 3, 8], [x, 3], [x + 3, 8], [x + 3, 22]]);
    }
    P(g, 0x1565c0, ngon(24, 29, 19, 10, 0));
    P(g, 0x4dd0e1, ngon(24, 29, 11, 10, 0));
    L(g, 3, GOLD, ngon(24, 29, 19, 10, 0));
    P(g, 0xffecb3, ngon(8, 38, 3, 5, 0));
    P(g, 0xffecb3, ngon(40, 38, 3, 5, 0));
    eyes(g, 24, 29, 9, 3);
  },
  deluge: (g) => {
    P(g, 0x0d47a1, [[1, 45], [2, 26], [9, 12], [20, 5], [30, 2], [40, 7], [47, 18], [38, 16], [32, 21], [36, 30], [47, 38], [47, 45]]);
    P(g, 0x1976d2, [[7, 40], [8, 27], [15, 16], [25, 10], [31, 19], [26, 29], [20, 40]]);
    P(g, 0x42a5f5, [[2, 26], [9, 12], [20, 5], [12, 22]]);
    L(g, 3, PALE_GOLD, [[1, 45], [2, 26], [9, 12], [20, 5], [30, 2], [40, 7], [47, 18], [38, 16], [32, 21], [36, 30], [47, 38], [47, 45]]);
    P(g, 0xbbdefb, star(36, 7, 5, 2.5, 5));
    P(g, 0xbbdefb, star(14, 11, 4, 2, 5));
    eyes(g, 21, 29, 10, 3);
  },
  trench: (g) => {
    P(g, 0x01579b, [[3, 8], [45, 8], [38, 28], [28, 44], [20, 44], [10, 28]]);
    P(g, 0x0277bd, [[9, 13], [39, 13], [34, 27], [26, 39], [22, 39], [14, 27]]);
    L(g, 3, PALE_GOLD, [[3, 8], [45, 8], [38, 28], [28, 44], [20, 44], [10, 28]]);
    P(g, 0xffffff, [[14, 13], [17, 21], [20, 13]]);
    P(g, 0xffffff, [[28, 13], [31, 21], [34, 13]]);
    P(g, 0xffeb3b, star(24, 3, 4, 1.8, 5));
    eyes(g, 24, 26, 10, 3);
  },
};

// ── LIGHT ────────────────────────────────────────────────────────

const LIGHT: Record<string, (g: G) => void> = {
  glimmer: (g) => {
    glow(g, 24, 24, 22, 0xfff59d);
    P(g, 0xfff176, star(24, 24, 18, 6, 4));
    P(g, 0xffee58, ngon(24, 24, 10, 8));
    gem(g, 8, 10, 0xffffff, 3);
    gem(g, 41, 37, 0xffffff, 2.5);
    gem(g, 39, 9, 0xfff59d, 2);
    eyes(g, 24, 24, 7, 2.5);
  },
  luminar: (g) => {
    glow(g, 24, 24, 23, 0xffe082);
    P(g, 0xffd54f, star(24, 24, 23, 8, 8));
    P(g, 0xfff176, star(24, 24, 16, 10, 8, -Math.PI / 2 + Math.PI / 8));
    P(g, 0xffffff, ngon(24, 24, 10, 10));
    L(g, 2, GOLD, star(24, 24, 23, 8, 8));
    gem(g, 6, 8, GOLD, 2.5);
    gem(g, 42, 40, GOLD, 2.5);
    eyes(g, 24, 24, 8, 3);
  },
  dawnling: (g) => {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + 0.25 + (i * (Math.PI - 0.5)) / 4;
      const b0: Pt = [24 + Math.cos(a - 0.13) * 18, 34 + Math.sin(a - 0.13) * 18];
      const b1: Pt = [24 + Math.cos(a + 0.13) * 18, 34 + Math.sin(a + 0.13) * 18];
      P(g, 0xffcc80, [b0, [24 + Math.cos(a) * 25, 34 + Math.sin(a) * 25], b1]);
    }
    P(g, 0xffb74d, arcPts(24, 34, 16, Math.PI, Math.PI * 2, 14));
    P(g, 0xffd180, arcPts(24, 34, 11, Math.PI, Math.PI * 2, 14));
    rect(g, 0xf06292, 3, 33, 42, 9, 4);
    rect(g, 0xf8bbd0, 8, 38, 32, 3, 1.5);
    eyes(g, 24, 28, 10, 3);
  },
  solstice: (g) => {
    glow(g, 24, 26, 23, 0xffb74d);
    P(g, 0xff9800, star(24, 26, 23, 14, 12));
    P(g, 0xffb74d, star(24, 26, 17, 12, 12, -Math.PI / 2 + Math.PI / 12));
    P(g, 0xffe082, ngon(24, 26, 12, 12));
    L(g, 3, GOLD, star(24, 26, 23, 14, 12));
    eyes(g, 24, 26, 9, 3);
  },
  halo: (g) => {
    glow(g, 24, 28, 20, 0xe3f2fd);
    P(g, 0xe1f5fe, leaf(18, 28, 15, 5, Math.PI + 0.45));
    P(g, 0xe1f5fe, leaf(30, 28, 15, 5, -0.45));
    P(g, 0xffffff, [[24, 14], [34, 20], [35, 32], [30, 43], [24, 38], [18, 43], [13, 32], [14, 20]]);
    P(g, 0xe3f2fd, [[24, 20], [30, 25], [30, 33], [24, 36], [18, 33], [18, 25]]);
    L(g, 4, GOLD, ellipse(24, 9, 11, 4, 20));
    eyes(g, 24, 28, 8, 2.5);
  },
  prismoth: (g) => {
    const wing = (m: number) => {
      const pts = (p: Pt[]): Pt[] => p.map(([x, y]) => [m < 0 ? 48 - x : x, y] as Pt);
      P(g, 0xef5350, pts([[22, 24], [4, 5], [2, 22], [12, 31]]));
      P(g, 0xffa726, pts([[21, 24], [9, 11], [8, 22], [14, 28]]));
      P(g, 0x26c6da, pts([[22, 28], [8, 34], [11, 45], [22, 38]]));
      P(g, 0xab47bc, pts([[21, 30], [12, 36], [14, 42], [21, 37]]));
    };
    wing(1);
    wing(-1);
    seg(g, 1.5, 0xfff8e1, 22, 14, 14, 4);
    seg(g, 1.5, 0xfff8e1, 26, 14, 34, 4);
    gem(g, 14, 4, 0xffffff, 2);
    gem(g, 34, 4, 0xffffff, 2);
    rect(g, 0xfff8e1, 20, 13, 8, 30, 4);
    eyes(g, 24, 20, 6, 2);
  },
  aurelion: (g) => {
    glow(g, 24, 26, 24, 0xffe082);
    P(g, 0xffb300, star(24, 26, 23, 16, 14));
    P(g, 0xffca28, star(24, 26, 18, 13, 14, -Math.PI / 2 + Math.PI / 14));
    L(g, 2, GOLD, star(24, 26, 23, 16, 14));
    P(g, 0xffca28, [[10, 15], [7, 4], [18, 10]]);
    P(g, 0xffca28, [[38, 15], [41, 4], [30, 10]]);
    P(g, 0xffe082, [[10, 22], [12, 13], [24, 10], [36, 13], [38, 22], [36, 36], [24, 42], [12, 36]]);
    P(g, 0xfff8e1, [[17, 30], [31, 30], [29, 38], [24, 41], [19, 38]]);
    P(g, 0xd84315, [[22, 31], [26, 31], [24, 34]]);
    P(g, GOLD, [[16, 12], [17, 3], [21, 9], [24, 1], [27, 9], [31, 3], [32, 12]]);
    gem(g, 24, 8, 0xe53935, 2);
    eyes(g, 24, 24, 12, 3);
  },
};

// ── SHADOW ───────────────────────────────────────────────────────

const VIOLET = 0xb39ddb;

const SHADOW: Record<string, (g: G) => void> = {
  gloam: (g) => {
    P(g, 0x4527a0, [[24, 4], [33, 13], [36, 25], [32, 35], [35, 45], [26, 39], [22, 46], [18, 38], [11, 42], [14, 30], [12, 19], [17, 10]]);
    P(g, 0x7e57c2, [[24, 12], [30, 19], [31, 28], [27, 34], [24, 40], [21, 34], [17, 28], [18, 19]]);
    P(g, 0xb39ddb, [[20, 12], [24, 8], [25, 13]], 0.7);
    glint(g, 24, 24, 9, 3, 0xffee58);
  },
  umbraith: (g) => {
    const cloak: Pt[] = [[24, 1], [34, 11], [37, 25], [43, 42], [36, 38], [31, 46], [24, 39], [17, 46], [12, 38], [5, 42], [11, 25], [14, 11]];
    P(g, 0x4a148c, leaf(11, 30, 10, 3, 2.7));
    P(g, 0x4a148c, leaf(37, 30, 10, 3, 0.44));
    P(g, 0x1a1030, cloak);
    L(g, 2.5, VIOLET, cloak);
    P(g, 0x05000d, [[24, 9], [30, 15], [29, 25], [24, 29], [19, 25], [18, 15]]);
    glint(g, 24, 19, 8, 3, 0xce93d8);
    gem(g, 24, 35, 0xce93d8, 2.5);
  },
  dusklet: (g) => {
    P(g, 0x311b92, [[36, 38], [46, 29], [45, 40], [40, 45]]);
    P(g, 0x311b92, [[10, 20], [7, 3], [18, 11], [30, 11], [41, 3], [38, 20], [41, 32], [35, 44], [13, 44], [7, 32]]);
    P(g, 0x7e57c2, [[10, 14], [10, 7], [15, 12]]);
    P(g, 0x7e57c2, [[38, 14], [38, 7], [33, 12]]);
    P(g, 0x4527a0, [[17, 30], [31, 30], [30, 42], [18, 42]]);
    rect(g, 0x1a1030, 12, 42, 9, 4, 2);
    rect(g, 0x1a1030, 27, 42, 9, 4, 2);
    gem(g, 13, 32, 0xfff59d, 1.8);
    gem(g, 35, 26, 0xfff59d, 1.5);
    gem(g, 31, 38, 0xfff59d, 1.4);
    glint(g, 24, 22, 12, 3.5, 0xfff176);
  },
  nightfall: (g) => {
    const body: Pt[] = [[10, 22], [6, 0], [18, 12], [30, 12], [42, 0], [38, 22], [41, 34], [34, 45], [14, 45], [7, 34]];
    P(g, 0x1a1030, star(24, 28, 23, 16, 10));
    P(g, 0x311b92, body);
    L(g, 2.5, VIOLET, body);
    P(g, 0x4527a0, [[17, 31], [31, 31], [30, 43], [18, 43]]);
    P(g, 0xfff59d, [[24, 8], [27, 10], [28, 14], [27, 18], [24, 20], [26, 16], [26, 12]]);
    gem(g, 10, 34, 0xfff59d, 2);
    gem(g, 38, 30, 0xfff59d, 2);
    gem(g, 33, 42, 0xfff59d, 1.6);
    glint(g, 24, 25, 12, 3.5, 0xce93d8);
  },
  shade: (g) => {
    const sil: Pt[] = [[24, 3], [31, 8], [32, 17], [39, 22], [40, 36], [33, 45], [15, 45], [8, 36], [9, 22], [16, 17], [17, 8]];
    P(g, 0x120a22, sil);
    P(g, 0x1e1238, [[24, 24], [33, 28], [34, 38], [24, 43], [14, 38], [15, 28]]);
    L(g, 1.5, 0x5e35b1, sil);
    glint(g, 24, 15, 8, 3, 0x80deea);
  },
  murkfang: (g) => {
    P(g, 0x2a1a4a, star(24, 26, 23, 15, 11));
    P(g, 0x2a1a4a, [[8, 16], [5, 3], [16, 10]]);
    P(g, 0x2a1a4a, [[40, 16], [43, 3], [32, 10]]);
    P(g, 0x3d2766, [[8, 20], [12, 10], [24, 8], [36, 10], [40, 20], [38, 36], [24, 44], [10, 36]]);
    P(g, 0x120a22, [[13, 29], [35, 29], [31, 41], [17, 41]]);
    P(g, 0xffffff, [[16, 29], [20, 29], [18, 38]]);
    P(g, 0xffffff, [[28, 29], [32, 29], [30, 38]]);
    P(g, 0xffffff, [[21, 41], [24, 41], [22.5, 34]]);
    glint(g, 24, 19, 14, 3.5, 0xff1744);
  },
  eclipsor: (g) => {
    P(g, 0xffe082, star(24, 16, 21, 13, 16));
    P(g, 0x0b0614, ellipse(24, 16, 12, 12, 20));
    P(g, 0x4a148c, [[2, 45], [2, 34], [9, 27], [18, 32], [14, 38], [10, 45]]);
    P(g, 0x4a148c, [[46, 45], [46, 34], [39, 27], [30, 32], [34, 38], [38, 45]]);
    const head: Pt[] = [[8, 37], [24, 24], [40, 37], [37, 47], [11, 47]];
    P(g, 0x311b92, head);
    L(g, 2.5, VIOLET, head);
    P(g, 0xffffff, [[17, 44], [20, 44], [18.5, 49]]);
    P(g, 0xffffff, [[28, 44], [31, 44], [29.5, 49]]);
    glint(g, 24, 35, 12, 3.5, 0xffee58);
  },
};

const ALL: Record<string, (g: G) => void> = { ...ROCK, ...NATURE, ...WOOD, ...WATER, ...LIGHT, ...SHADOW };

/** Draws the pet onto `g`; returns false if no polygon art exists for this id. */
export function drawPolygonPet(g: G, id: string, scale = 1): boolean {
  const fn = ALL[id];
  if (!fn) return false;
  K = scale;
  fn(g);
  K = 1;
  return true;
}

export const POLYGON_PET_IDS = Object.keys(ALL);
