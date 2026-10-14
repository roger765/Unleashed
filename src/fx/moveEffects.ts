import Phaser from 'phaser';
import { IMove, AttackCategory } from '../types/move';
import { PetType } from '../types/pet';

export interface Pt { x: number; y: number }

/**
 * dash   – attacker lunges to the target and the effect plays at contact.
 * cast   – attacker stays back; effect travels from attacker to target.
 * summon – attacker rears up; effect appears on the target.
 */
export type MoveMode = 'dash' | 'cast' | 'summon';

export interface FxContext {
  s: Phaser.Scene;
  /** Contact point for dash moves, attacker position otherwise. */
  from: Pt;
  to: Pt;
  /** Angle from `from` to `to` (radians). */
  ang: number;
  /** Must be called once the hit has landed so the attacker can recover. */
  done: () => void;
}

export interface MoveFx {
  mode: MoveMode;
  run: (c: FxContext) => void;
}

export const TYPE_FX_COLOR: Record<number, number> = {
  [PetType.Rock]: 0xc4b49a,
  [PetType.Nature]: 0x6ee05a,
  [PetType.Wood]: 0xb07a45,
  [PetType.Water]: 0x45b6ff,
  [PetType.Normal]: 0xffffff,
  [PetType.Light]: 0xffe680,
  [PetType.Shadow]: 0xa030f0,
  [PetType.Fire]: 0xff6a2a,
  [PetType.Ice]: 0x9fe8ff,
};

const DEPTH = 500;
const ADD = Phaser.BlendModes.ADD;
const rnd = (a: number, b: number): number => Phaser.Math.FloatBetween(a, b);
const TAU = Math.PI * 2;

// ────────────────────────────────────────────────────────────────
// Procedural textures (white shapes, tinted at use-site)
// ────────────────────────────────────────────────────────────────

function ensureTextures(s: Phaser.Scene): void {
  if (s.textures.exists('fx-glow')) return;

  const make = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): void => {
    const t = s.textures.createCanvas(key, w, h);
    if (!t) return;
    const g = t.getContext();
    g.fillStyle = '#fff';
    g.strokeStyle = '#fff';
    draw(g);
    t.refresh();
  };

  make('fx-glow', 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });
  make('fx-ring', 128, 128, (g) => {
    g.lineWidth = 7;
    g.shadowColor = '#fff';
    g.shadowBlur = 8;
    g.beginPath();
    g.arc(64, 64, 56, 0, TAU);
    g.stroke();
  });
  make('fx-crescent', 128, 128, (g) => {
    g.beginPath();
    g.arc(46, 64, 62, 0, TAU);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(26, 64, 60, 0, TAU);
    g.fill();
  });
  make('fx-blade', 128, 32, (g) => {
    const gr = g.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)');
    gr.addColorStop(0.7, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, 13);
    g.lineTo(100, 5);
    g.lineTo(128, 16);
    g.lineTo(100, 27);
    g.lineTo(0, 19);
    g.closePath();
    g.fill();
  });
  make('fx-shard', 16, 40, (g) => {
    g.beginPath();
    g.moveTo(8, 0);
    g.lineTo(16, 28);
    g.lineTo(8, 40);
    g.lineTo(0, 28);
    g.closePath();
    g.fill();
  });
  make('fx-leaf', 32, 16, (g) => {
    g.beginPath();
    g.moveTo(0, 8);
    g.quadraticCurveTo(16, -5, 32, 8);
    g.quadraticCurveTo(16, 21, 0, 8);
    g.fill();
  });
  make('fx-drop', 16, 24, (g) => {
    g.beginPath();
    g.moveTo(8, 0);
    g.bezierCurveTo(8, 0, 16, 11, 16, 16);
    g.arc(8, 16, 8, 0, Math.PI);
    g.bezierCurveTo(0, 11, 8, 0, 8, 0);
    g.fill();
  });
  make('fx-star', 48, 48, (g) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 24 : 5;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      g.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  });
  make('fx-rock', 40, 40, (g) => {
    g.beginPath();
    const pts = [[6, 14], [16, 3], [32, 6], [38, 20], [30, 36], [12, 37], [3, 26]];
    pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
    g.closePath();
    g.fill();
  });
  make('fx-bar', 8, 8, (g) => {
    g.fillRect(0, 0, 8, 8);
  });
}

// ────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────

function mk(
  s: Phaser.Scene, key: string, x: number, y: number, color: number,
  scale = 1, add = true, alpha = 1,
): Phaser.GameObjects.Image {
  const o = s.add.image(x, y, key).setDepth(DEPTH).setTint(color).setScale(scale).setAlpha(alpha);
  if (add) o.setBlendMode(ADD);
  return o;
}

function fade(
  s: Phaser.Scene, o: Phaser.GameObjects.GameObject, dur: number,
  props: Record<string, unknown> = {},
): void {
  s.tweens.add({ targets: o, alpha: 0, duration: dur, ...props, onComplete: () => o.destroy() });
}

const after = (s: Phaser.Scene, ms: number, fn: () => void): void => {
  s.time.delayedCall(ms, fn);
};
const shake = (s: Phaser.Scene, ms: number, m: number): void => {
  s.cameras.main.shake(ms, m);
};

function pop(s: Phaser.Scene, p: Pt, color: number, size: number, dur: number): void {
  const g = mk(s, 'fx-glow', p.x, p.y, color, 0.3);
  fade(s, g, dur, { scale: size });
}

function ring(s: Phaser.Scene, p: Pt, color: number, max = 1.5, dur = 350, squash = 1): void {
  const r = mk(s, 'fx-ring', p.x, p.y, color, 0.15);
  r.scaleY = 0.15 * squash;
  fade(s, r, dur, { scaleX: max, scaleY: max * squash, ease: 'Cubic.easeOut' });
}

interface BurstOpts {
  key?: string; n?: number; speed?: number; life?: number; size?: number;
  add?: boolean; grav?: number; ang?: number; cone?: number; spin?: boolean; align?: boolean;
}

function burst(s: Phaser.Scene, p: Pt, color: number, o: BurstOpts = {}): void {
  const n = o.n ?? 10;
  for (let i = 0; i < n; i++) {
    const a = o.ang === undefined ? rnd(0, TAU) : o.ang + rnd(-(o.cone ?? 0.6), o.cone ?? 0.6);
    const d = (o.speed ?? 60) * rnd(0.5, 1.2);
    const q = mk(s, o.key ?? 'fx-glow', p.x, p.y, color, (o.size ?? 0.25) * rnd(0.7, 1.3), o.add ?? true);
    const r0 = o.align ? a : rnd(0, TAU);
    q.rotation = r0;
    s.tweens.add({
      targets: q,
      x: p.x + Math.cos(a) * d,
      y: p.y + Math.sin(a) * d + (o.grav ?? 0),
      alpha: 0,
      scale: q.scale * 0.35,
      rotation: o.spin ? r0 + rnd(-4, 4) : r0,
      duration: (o.life ?? 450) * rnd(0.7, 1.2),
      ease: 'Cubic.easeOut',
      onComplete: () => q.destroy(),
    });
  }
}

function impact(s: Phaser.Scene, p: Pt, color: number, size = 1): void {
  pop(s, p, 0xffffff, 2.2 * size, 220);
  pop(s, p, color, 3.4 * size, 380);
  ring(s, p, color, 1.5 * size, 340);
  burst(s, p, color, { n: 10, speed: 75 * size, key: 'fx-star', size: 0.28, spin: true });
  shake(s, 90, 0.003 * size);
}

interface ProjOpts {
  key?: string; color: number; scale?: number; dur?: number; arc?: number; spin?: number;
  align?: boolean; trail?: number; ease?: string; delay?: number; trailKey?: string;
}

function proj(s: Phaser.Scene, from: Pt, to: Pt, o: ProjOpts, onHit: () => void): void {
  const run = (): void => {
    const sc = o.scale ?? 0.5;
    const p = mk(s, o.key ?? 'fx-glow', from.x, from.y, o.color, sc);
    const ang = Math.atan2(to.y - from.y, to.x - from.x);
    if (o.align) p.rotation = ang;
    const st = { v: 0 };
    let last = 0;
    s.tweens.add({
      targets: st, v: 1, duration: o.dur ?? 350, ease: o.ease ?? 'Sine.easeIn',
      onUpdate: () => {
        const v = st.v;
        p.x = from.x + (to.x - from.x) * v;
        p.y = from.y + (to.y - from.y) * v - Math.sin(Math.PI * v) * (o.arc ?? 0);
        if (o.spin) p.rotation += o.spin;
        if (v - last > 0.05) {
          last = v;
          const t = mk(s, o.trailKey ?? 'fx-glow', p.x, p.y, o.trail ?? o.color, sc * 0.7);
          t.rotation = p.rotation;
          fade(s, t, 240, { scale: 0 });
        }
      },
      onComplete: () => { p.destroy(); onHit(); },
    });
  };
  if (o.delay) after(s, o.delay, run); else run();
}

function charge(s: Phaser.Scene, p: Pt, color: number, dur: number, r = 70): void {
  const core = mk(s, 'fx-glow', p.x, p.y, color, 0.2);
  fade(s, core, dur, { scale: 1.6, ease: 'Sine.easeIn' });
  for (let i = 0; i < 12; i++) {
    const a = rnd(0, TAU);
    const q = mk(s, 'fx-glow', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, color, 0.22);
    s.tweens.add({
      targets: q, x: p.x, y: p.y, alpha: 0.2, duration: dur * rnd(0.6, 1),
      delay: rnd(0, dur * 0.3), ease: 'Cubic.easeIn', onComplete: () => q.destroy(),
    });
  }
}

function beam(s: Phaser.Scene, from: Pt, to: Pt, color: number, w: number, dur: number): void {
  const g = s.add.graphics().setDepth(DEPTH).setBlendMode(ADD);
  const st = { v: 0 };
  s.tweens.add({
    targets: st, v: 1, duration: dur,
    onUpdate: () => {
      g.clear();
      const k = Math.min(1, Math.sin(Math.PI * st.v) * 2.2) * (0.85 + Math.random() * 0.3);
      const ww = w * k;
      g.lineStyle(ww * 2.4, color, 0.3).lineBetween(from.x, from.y, to.x, to.y);
      g.lineStyle(ww, color, 0.8).lineBetween(from.x, from.y, to.x, to.y);
      g.lineStyle(ww * 0.4, 0xffffff, 1).lineBetween(from.x, from.y, to.x, to.y);
    },
    onComplete: () => g.destroy(),
  });
}

function lightning(s: Phaser.Scene, from: Pt, to: Pt, color: number, strikes = 6): void {
  const g = s.add.graphics().setDepth(DEPTH).setBlendMode(ADD);
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const px = -Math.sin(ang);
  const py = Math.cos(ang);
  let n = 0;
  const draw = (): void => {
    g.clear();
    const pts: Pt[] = [from];
    const segs = 9;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const j = rnd(-22, 22);
      pts.push({ x: from.x + (to.x - from.x) * t + px * j, y: from.y + (to.y - from.y) * t + py * j });
    }
    pts.push(to);
    const stroke = (w: number, c: number, a: number): void => {
      g.lineStyle(w, c, a).beginPath().moveTo(pts[0].x, pts[0].y);
      for (const q of pts) g.lineTo(q.x, q.y);
      g.strokePath();
    };
    stroke(12, color, 0.3);
    stroke(5, color, 0.9);
    stroke(2, 0xffffff, 1);
    if (++n >= strikes) { timer.remove(); fade(s, g, 120); }
  };
  const timer = s.time.addEvent({ delay: 45, loop: true, callback: draw });
  draw();
}

function polyline(g: Phaser.GameObjects.Graphics, pts: Pt[], w: number, color: number, a = 1): void {
  if (pts.length < 2) return;
  g.lineStyle(w, color, a).beginPath().moveTo(pts[0].x, pts[0].y);
  for (const q of pts) g.lineTo(q.x, q.y);
  g.strokePath();
}

/** Crescent slash mark that sweeps open then fades. */
function slashMark(
  s: Phaser.Scene, p: Pt, rot: number, color: number, size = 1.5, core = 0xffffff, dur = 320,
): void {
  for (const [c, thick] of [[color, 1], [core, 0.45]] as const) {
    const m = mk(s, 'fx-crescent', p.x, p.y, c, 1);
    m.rotation = rot;
    m.setScale(size * 0.55 * thick, size * 0.3);
    fade(s, m, dur, { scaleX: size * 0.55 * thick * 1.5, scaleY: size * 1.15, ease: 'Cubic.easeOut' });
  }
}

/** A tinted blade that swings around a pivot. */
function bladeSwing(
  s: Phaser.Scene, pivot: Pt, a0: number, a1: number, len: number, color: number,
  dur: number, thick: number, onHit: () => void,
): void {
  const blade = mk(s, 'fx-blade', pivot.x, pivot.y, color, 1).setOrigin(0, 0.5);
  const core = mk(s, 'fx-blade', pivot.x, pivot.y, 0xffffff, 1).setOrigin(0, 0.5);
  blade.setScale(len / 128, thick);
  core.setScale(len / 128, thick * 0.35);
  const hilt = mk(s, 'fx-glow', pivot.x, pivot.y, color, 0.8);
  fade(s, hilt, dur + 200, { scale: 0.2 });
  const st = { v: 0 };
  s.tweens.add({
    targets: st, v: 1, duration: dur, ease: 'Cubic.easeIn',
    onUpdate: () => {
      const a = a0 + (a1 - a0) * st.v;
      blade.rotation = a;
      core.rotation = a;
      const ghost = mk(s, 'fx-blade', pivot.x, pivot.y, color, 1, true, 0.45).setOrigin(0, 0.5);
      ghost.setScale(len / 128, thick);
      ghost.rotation = a;
      fade(s, ghost, 200);
    },
    onComplete: () => {
      onHit();
      fade(s, blade, 180);
      fade(s, core, 180);
    },
  });
}

const fin = (c: FxContext, ms = 140): void => { after(c.s, ms, c.done); };
const perp = (ang: number, d: number): Pt => ({ x: -Math.sin(ang) * d, y: Math.cos(ang) * d });
const at = (p: Pt, o: Pt, k = 1): Pt => ({ x: p.x + o.x * k, y: p.y + o.y * k });
const above = (p: Pt, d: number): Pt => ({ x: p.x, y: p.y - d });
const groundShadow = (s: Phaser.Scene, p: Pt, w: number, dur: number): void => {
  const sh = mk(s, 'fx-glow', p.x, p.y + 30, 0x000000, 0.2, false, 0.55);
  sh.scaleY = 0.1;
  fade(s, sh, dur, { scaleX: w, scaleY: w * 0.28, alpha: 0.7, ease: 'Sine.easeIn' });
};

// ────────────────────────────────────────────────────────────────
// Per-move effects
// ────────────────────────────────────────────────────────────────

const FX: Record<string, MoveFx> = {
  // ── Normal ────────────────────────────────────────────────────
  'bash': {
    mode: 'dash',
    run: (c) => {
      impact(c.s, c.to, 0xffffff, 1.1);
      const st = mk(c.s, 'fx-star', c.to.x, c.to.y, 0xfff2a0, 0.3);
      fade(c.s, st, 300, { scale: 2.2, rotation: 0.8 });
      fin(c);
    },
  },
  'star-strike': {
    mode: 'cast',
    run: (c) => {
      charge(c.s, c.from, 0xfff2a0, 150, 40);
      proj(c.s, c.from, c.to, {
        key: 'fx-star', color: 0xfff2a0, scale: 1, dur: 360, spin: 0.35, arc: 30,
        trailKey: 'fx-star', delay: 120,
      }, () => {
        impact(c.s, c.to, 0xfff2a0, 1.2);
        burst(c.s, c.to, 0xffffff, { n: 8, speed: 110, key: 'fx-star', size: 0.2, spin: true });
        fin(c);
      });
    },
  },
  'arcane-blast': {
    mode: 'cast',
    run: (c) => {
      charge(c.s, c.from, 0xd060ff, 300, 80);
      proj(c.s, c.from, c.to, { color: 0xd060ff, scale: 1.1, dur: 300, trail: 0x6080ff, delay: 300 }, () => {
        impact(c.s, c.to, 0xd060ff, 1.5);
        ring(c.s, c.to, 0x6080ff, 2.2, 480);
        shake(c.s, 160, 0.006);
        fin(c, 200);
      });
    },
  },

  // ── Rock ──────────────────────────────────────────────────────
  'rock-throw': {
    mode: 'cast',
    run: (c) => {
      proj(c.s, c.from, c.to, {
        key: 'fx-rock', color: 0xa89a86, scale: 0.9, dur: 420, arc: 70, spin: 0.3, delay: 100, trail: 0x888888,
      }, () => {
        burst(c.s, c.to, 0x9a8c78, { n: 12, speed: 80, key: 'fx-rock', size: 0.28, add: false, grav: 30, spin: true });
        impact(c.s, c.to, 0xc4b49a, 0.9);
        fin(c);
      });
    },
  },
  'boulder-smash': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      groundShadow(s, to, 3, 450);
      const b = mk(s, 'fx-rock', to.x, to.y - 360, 0x8d7f6b, 3.2, false);
      s.tweens.add({
        targets: b, y: to.y - 8, rotation: 0.6, duration: 450, delay: 120, ease: 'Cubic.easeIn',
        onComplete: () => {
          shake(s, 220, 0.009);
          ring(s, to, 0xc4b49a, 2.6, 450, 0.45);
          burst(s, to, 0x9a8c78, { n: 18, speed: 130, key: 'fx-rock', size: 0.4, add: false, grav: 60, spin: true });
          burst(s, to, 0xd8ccb8, { n: 10, speed: 90, size: 0.7, add: false, life: 600 });
          fade(s, b, 350, { y: b.y + 6 });
          fin(c, 200);
        },
      });
    },
  },
  'earthquake': {
    mode: 'summon',
    run: (c) => {
      const { s, to, from } = c;
      const g = s.add.graphics().setDepth(DEPTH - 1);
      const cracks: Pt[][] = [];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + rnd(-0.2, 0.2);
        const pts: Pt[] = [{ x: to.x, y: to.y + 20 }];
        for (let i = 1; i <= 7; i++) {
          const r = i * 18;
          pts.push({ x: to.x + Math.cos(a) * r + rnd(-8, 8), y: to.y + 20 + Math.sin(a) * r * 0.5 + rnd(-6, 6) });
        }
        cracks.push(pts);
      }
      const st = { v: 0 };
      s.tweens.add({
        targets: st, v: 1, duration: 420,
        onUpdate: () => {
          g.clear();
          for (const pts of cracks) {
            const n = Math.max(2, Math.floor(pts.length * st.v));
            polyline(g, pts.slice(0, n), 5, 0x1a1208, 1);
            polyline(g, pts.slice(0, n), 2, 0xffa040, 0.8);
          }
        },
        onComplete: () => fade(s, g, 350),
      });
      shake(s, 600, 0.008);
      ring(s, from, 0xc4b49a, 1.4, 450, 0.4);
      for (let i = 0; i < 8; i++) {
        const p = { x: to.x + rnd(-80, 80), y: to.y + rnd(0, 30) };
        const r = mk(s, 'fx-rock', p.x, p.y, 0x8d7f6b, rnd(0.5, 0.9), false);
        s.tweens.add({
          targets: r, y: p.y - rnd(40, 90), rotation: rnd(-2, 2), duration: 260, delay: 100 + i * 40,
          ease: 'Cubic.easeOut', yoyo: true, onComplete: () => r.destroy(),
        });
      }
      burst(s, to, 0xb8a98f, { n: 14, speed: 70, size: 0.8, add: false, life: 700, grav: -10 });
      fin(c, 520);
    },
  },
  'pebble-shot': {
    mode: 'cast',
    run: (c) => {
      let landed = 0;
      for (let i = 0; i < 6; i++) {
        const off = perp(c.ang, rnd(-22, 22));
        proj(c.s, at(c.from, off), at(c.to, off, 0.6), {
          key: 'fx-rock', color: 0xa89a86, scale: 0.32, dur: 230, delay: 80 + i * 70, spin: 0.4, trail: 0xcccccc,
        }, () => {
          burst(c.s, at(c.to, off, 0.6), 0xb8a98f, { n: 4, speed: 40, key: 'fx-rock', size: 0.14, add: false, grav: 20 });
          pop(c.s, at(c.to, off, 0.6), 0xffffff, 0.9, 140);
          shake(c.s, 40, 0.0015);
          if (++landed === 6) fin(c);
        });
      }
    },
  },
  'stone-edge': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      groundShadow(s, to, 2.8, 300);
      const spikes: [number, number, number][] = [[-70, 6, 0.9], [-35, -8, 1.3], [0, 4, 1.7], [35, -6, 1.3], [70, 8, 0.9]];
      spikes.forEach(([dx, dy, sz], i) => {
        const sp = mk(s, 'fx-shard', to.x + dx, to.y + 30 + dy, 0xa7b2bd, sz, false).setOrigin(0.5, 1);
        sp.scaleY = 0;
        sp.rotation = dx * 0.004;
        s.tweens.add({
          targets: sp, scaleY: sz * 2.4, duration: 130, delay: i === 2 ? 220 : 120 + i * 45, ease: 'Back.easeOut',
          onStart: () => {
            burst(s, { x: sp.x, y: sp.y }, 0x9a8c78, { n: 5, speed: 50, key: 'fx-rock', size: 0.15, add: false, grav: 25 });
            shake(s, 60, 0.004);
          },
          onComplete: () => fade(s, sp, 360, { delay: 150 }),
        });
      });
      after(s, 330, () => {
        pop(s, above(to, 20), 0xffffff, 3, 260);
        ring(s, to, 0xdfe6ee, 1.6, 320, 0.5);
      });
      fin(c, 480);
    },
  },

  // ── Nature ────────────────────────────────────────────────────
  'vine-whip': {
    mode: 'cast',
    run: (c) => {
      const { s, from, to, ang } = c;
      const g = s.add.graphics().setDepth(DEPTH);
      const st = { v: 0 };
      let hit = false;
      s.tweens.add({
        targets: st, v: 1, duration: 520, delay: 90,
        onUpdate: () => {
          const v = st.v;
          const ext = v < 0.4 ? v / 0.4 : v < 0.6 ? 1 : 1 - (v - 0.6) / 0.4;
          const n = 16;
          const pts: Pt[] = [];
          const px = -Math.sin(ang);
          const py = Math.cos(ang);
          for (let i = 0; i <= n; i++) {
            const t = (i / n) * ext;
            const wob = Math.sin(t * 9 + v * 14) * 18 * (1 - t * 0.5) * (v < 0.6 ? 1 : 0.4);
            pts.push({ x: from.x + (to.x - from.x) * t + px * wob, y: from.y + (to.y - from.y) * t + py * wob });
          }
          g.clear();
          polyline(g, pts, 9, 0x1f5a1a);
          polyline(g, pts, 5, 0x58c046);
          polyline(g, pts, 1.5, 0xc8ffb0, 0.9);
          if (!hit && ext >= 0.99) {
            hit = true;
            impact(s, to, 0x6ee05a, 1);
            burst(s, to, 0x58c046, { n: 9, speed: 90, key: 'fx-leaf', size: 0.7, add: false, spin: true, grav: 20 });
            fin(c, 180);
          }
        },
        onComplete: () => g.destroy(),
      });
    },
  },
  'petal-storm': {
    mode: 'cast',
    run: (c) => {
      const { s, from, to, ang } = c;
      let landed = 0;
      const total = 16;
      for (let i = 0; i < total; i++) {
        const pt = mk(s, 'fx-leaf', from.x, from.y, i % 2 ? 0xff9ec8 : 0xffd0e4, 0.9, false);
        pt.setAlpha(0);
        const st = { v: 0 };
        const phase = rnd(0, TAU);
        const rad = rnd(18, 42);
        s.tweens.add({
          targets: st, v: 1, duration: 520, delay: 100 + i * 28, ease: 'Sine.easeInOut',
          onStart: () => pt.setAlpha(1),
          onUpdate: () => {
            const v = st.v;
            const sw = Math.sin(v * 11 + phase) * rad * Math.sin(Math.PI * v);
            pt.x = from.x + (to.x - from.x) * v - Math.sin(ang) * sw;
            pt.y = from.y + (to.y - from.y) * v + Math.cos(ang) * sw;
            pt.rotation += 0.35;
          },
          onComplete: () => {
            pt.destroy();
            if (++landed === total) {
              impact(s, to, 0xff9ec8, 1.1);
              burst(s, to, 0xffc0dc, { n: 14, speed: 100, key: 'fx-leaf', size: 0.8, add: false, spin: true, grav: 30, life: 700 });
              fin(c, 200);
            }
          },
        });
      }
    },
  },
  'bloom-burst': {
    mode: 'dash',
    run: (c) => {
      const { s, to } = c;
      pop(s, to, 0xfff59d, 3.5, 450);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const p = mk(s, 'fx-leaf', to.x, to.y, i % 2 ? 0xff80b0 : 0xffb0d0, 0.4, false).setOrigin(0, 0.5);
        p.rotation = a;
        s.tweens.add({
          targets: p, scaleX: 2.6, scaleY: 1.8, rotation: a + 0.5, alpha: 0, duration: 520, ease: 'Cubic.easeOut',
          onComplete: () => p.destroy(),
        });
      }
      ring(s, to, 0xffd0e4, 2, 450);
      burst(s, to, 0x80e070, { n: 12, speed: 100, key: 'fx-leaf', size: 0.5, add: false, spin: true });
      shake(s, 130, 0.005);
      fin(c, 220);
    },
  },
  'spore-cloud': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      for (let i = 0; i < 12; i++) {
        const p = { x: to.x + rnd(-45, 45), y: to.y + rnd(-30, 35) };
        const puff = mk(s, 'fx-glow', p.x, p.y, i % 3 ? 0x8fcf4a : 0xb070d0, 0.1, false, 0.7);
        s.tweens.add({
          targets: puff, scale: rnd(1.4, 2.2), x: p.x + rnd(-25, 25), y: p.y - rnd(10, 40), alpha: 0,
          duration: 900, delay: i * 40, ease: 'Sine.easeOut', onComplete: () => puff.destroy(),
        });
      }
      for (let i = 0; i < 14; i++) {
        const sp = mk(s, 'fx-glow', to.x + rnd(-50, 50), to.y + rnd(0, 40), 0xd8ff90, 0.12);
        s.tweens.add({
          targets: sp, y: sp.y - rnd(40, 90), alpha: 0, duration: 800, delay: 100 + i * 45,
          onComplete: () => sp.destroy(),
        });
      }
      fin(c, 600);
    },
  },
  'solar-beam': {
    mode: 'cast',
    run: (c) => {
      charge(c.s, c.from, 0xfff27a, 420, 90);
      after(c.s, 420, () => {
        beam(c.s, c.from, c.to, 0xcaff4a, 26, 520);
        after(c.s, 120, () => { impact(c.s, c.to, 0xfff27a, 1.5); shake(c.s, 320, 0.006); });
        fin(c, 560);
      });
    },
  },

  // ── Wood ──────────────────────────────────────────────────────
  'branch-strike': {
    mode: 'dash',
    run: (c) => {
      const { s, from, to, ang } = c;
      bladeSwing(s, at(from, perp(ang, -10)), ang - 1.4, ang + 1.2, 105, 0x9a6a38, 170, 2.6, () => {
        slashMark(s, to, ang + 0.15, 0xc99a5a, 1.2, 0xf0d9a8, 260);
        impact(s, to, 0xb07a45, 1);
        burst(s, to, 0x6ee05a, { n: 8, speed: 90, key: 'fx-leaf', size: 0.6, add: false, spin: true, grav: 25 });
        fin(c, 100);
      });
    },
  },
  'splinter-shot': {
    mode: 'cast',
    run: (c) => {
      let landed = 0;
      for (let i = 0; i < 3; i++) {
        const off = perp(c.ang, (i - 1) * 20);
        proj(c.s, at(c.from, off), at(c.to, off, 0.7), {
          key: 'fx-shard', color: 0xc08a50, scale: 0.7, dur: 220, delay: 90 + i * 90, align: true, trail: 0xe0b878,
        }, () => {
          burst(c.s, at(c.to, off, 0.7), 0xe0b878, { n: 5, speed: 60, key: 'fx-shard', size: 0.2, add: false, spin: true });
          pop(c.s, at(c.to, off, 0.7), 0xffffff, 1, 140);
          shake(c.s, 50, 0.002);
          if (++landed === 3) fin(c);
        });
      }
    },
  },
  'timber-slam': {
    mode: 'dash',
    run: (c) => {
      const { s, to } = c;
      const log = mk(s, 'fx-blade', to.x - 20, to.y - 110, 0x8a5a2b, 1, false).setOrigin(0, 0.5);
      log.setScale(1, 3.6);
      log.rotation = -2.3;
      const core = mk(s, 'fx-blade', to.x - 20, to.y - 110, 0xc99a5a, 1, false).setOrigin(0, 0.5);
      core.setScale(1, 1.2);
      core.rotation = -2.3;
      s.tweens.add({
        targets: [log, core], rotation: 0.8, duration: 200, ease: 'Cubic.easeIn',
        onComplete: () => {
          shake(s, 200, 0.009);
          ring(s, at(to, { x: 0, y: 30 }), 0xc99a5a, 2.4, 420, 0.4);
          burst(s, to, 0xb07a45, { n: 14, speed: 120, key: 'fx-shard', size: 0.35, add: false, spin: true, grav: 40 });
          burst(s, to, 0xd8ccb8, { n: 8, speed: 80, size: 0.6, add: false, life: 600 });
          impact(s, to, 0xb07a45, 1.2);
          fade(s, log, 300);
          fade(s, core, 300);
          fin(c, 160);
        },
      });
    },
  },
  'root-trap': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      const g = s.add.graphics().setDepth(DEPTH);
      const roots: Pt[][] = [];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        const base = { x: to.x + Math.cos(a) * 70, y: to.y + 36 + Math.sin(a) * 18 };
        const pts: Pt[] = [];
        for (let i = 0; i <= 14; i++) {
          const t = i / 14;
          const sway = Math.sin(t * 6 + k) * 10;
          pts.push({
            x: base.x + (to.x - base.x) * t * 0.9 + sway,
            y: base.y - t * 95 + Math.sin(t * Math.PI) * 10,
          });
        }
        roots.push(pts);
      }
      const st = { v: 0 };
      s.tweens.add({
        targets: st, v: 1, duration: 520,
        onUpdate: () => {
          g.clear();
          for (const pts of roots) {
            const n = Math.max(2, Math.floor(pts.length * st.v));
            polyline(g, pts.slice(0, n), 9, 0x3b2410);
            polyline(g, pts.slice(0, n), 5, 0x7a5230);
            polyline(g, pts.slice(0, n), 1.5, 0xb88a58, 0.8);
          }
        },
        onComplete: () => { shake(s, 100, 0.003); fade(s, g, 450, { delay: 150 }); },
      });
      burst(s, at(to, { x: 0, y: 36 }), 0x6a4a28, { n: 12, speed: 70, size: 0.5, add: false, grav: 20 });
      fin(c, 560);
    },
  },
  'forest-fury': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      shake(s, 600, 0.007);
      for (let i = 0; i < 9; i++) {
        const dx = (i - 4) * 24;
        const sp = mk(s, 'fx-shard', to.x + dx, to.y + 34 + rnd(-6, 6), i % 2 ? 0x4a7a2a : 0x7a5230, 1.1, false).setOrigin(0.5, 1);
        sp.scaleY = 0;
        sp.rotation = dx * 0.006;
        s.tweens.add({
          targets: sp, scaleY: rnd(2, 3.2), duration: 140, delay: 80 + i * 40, ease: 'Back.easeOut',
          onStart: () => burst(s, { x: sp.x, y: sp.y }, 0x6ee05a, { n: 4, speed: 50, key: 'fx-leaf', size: 0.45, add: false, spin: true }),
          onComplete: () => fade(s, sp, 380, { delay: 200 }),
        });
      }
      for (let i = 0; i < 22; i++) {
        const lf = mk(s, 'fx-leaf', to.x, to.y, i % 2 ? 0x58c046 : 0xa8e060, 0.8, false);
        const a0 = rnd(0, TAU);
        const st = { v: 0 };
        s.tweens.add({
          targets: st, v: 1, duration: 800, delay: 150 + i * 20,
          onUpdate: () => {
            const a = a0 + st.v * 7;
            const r = 20 + st.v * 85;
            lf.x = to.x + Math.cos(a) * r;
            lf.y = to.y + Math.sin(a) * r * 0.55 - st.v * 30;
            lf.rotation = a + 1.5;
            lf.alpha = 1 - st.v * st.v;
          },
          onComplete: () => lf.destroy(),
        });
      }
      after(s, 380, () => { impact(s, to, 0x6ee05a, 1.6); ring(s, to, 0xa8e060, 2.4, 500, 0.5); });
      fin(c, 760);
    },
  },
  'thorn-barrage': {
    mode: 'cast',
    run: (c) => {
      let landed = 0;
      const total = 9;
      for (let i = 0; i < total; i++) {
        const off = perp(c.ang, rnd(-40, 40));
        proj(c.s, at(c.from, off, 0.4), at(c.to, off, 0.9), {
          key: 'fx-shard', color: 0x7ad44a, scale: 0.65, dur: 200, delay: 60 + i * 55, align: true, trail: 0x2f6a1c,
        }, () => {
          burst(c.s, at(c.to, off, 0.9), 0x7ad44a, { n: 4, speed: 55, key: 'fx-shard', size: 0.18, spin: true });
          pop(c.s, at(c.to, off, 0.9), 0xd8ff90, 0.9, 130);
          shake(c.s, 40, 0.002);
          if (++landed === total) fin(c);
        });
      }
    },
  },

  // ── Water ─────────────────────────────────────────────────────
  'splash': {
    mode: 'cast',
    run: (c) => {
      let landed = 0;
      for (let i = 0; i < 4; i++) {
        proj(c.s, c.from, at(c.to, perp(c.ang, (i - 1.5) * 16)), {
          key: 'fx-drop', color: 0x6cc4ff, scale: 1.4, dur: 330, arc: 55 + i * 10, delay: 80 + i * 50,
        }, () => {
          burst(c.s, c.to, 0x9be0ff, { n: 6, speed: 60, key: 'fx-drop', size: 0.7, grav: 40, ang: -Math.PI / 2, cone: 1.2 });
          if (++landed === 4) { impact(c.s, c.to, 0x45b6ff, 0.9); fin(c); }
        });
      }
    },
  },
  'water-jet': {
    mode: 'cast',
    run: (c) => {
      after(c.s, 100, () => {
        beam(c.s, c.from, c.to, 0x45b6ff, 12, 380);
        for (let i = 0; i < 10; i++) {
          proj(c.s, c.from, c.to, { key: 'fx-drop', color: 0xbfe9ff, scale: 0.7, dur: 180 + i * 10, delay: i * 25, align: true }, () => undefined);
        }
        after(c.s, 120, () => {
          impact(c.s, c.to, 0x45b6ff, 1);
          burst(c.s, c.to, 0xbfe9ff, { n: 12, speed: 90, key: 'fx-drop', size: 0.7, grav: 40 });
        });
        fin(c, 380);
      });
    },
  },
  'tidal-wave': {
    mode: 'cast',
    run: (c) => {
      const { s, from, to, ang } = c;
      const w = mk(s, 'fx-crescent', from.x, from.y, 0x2e9bff, 1.4);
      const wc = mk(s, 'fx-crescent', from.x, from.y, 0xe0f6ff, 0.9);
      w.rotation = wc.rotation = ang;
      w.setScale(0.5, 1.7);
      wc.setScale(0.35, 1.5);
      const st = { v: 0 };
      s.tweens.add({
        targets: st, v: 1, duration: 520, delay: 120, ease: 'Sine.easeIn',
        onUpdate: () => {
          w.x = wc.x = from.x + (to.x - from.x) * st.v;
          w.y = wc.y = from.y + (to.y - from.y) * st.v;
          w.scaleX = 0.5 + st.v * 0.9;
          if (Math.random() < 0.7) {
            burst(s, { x: w.x, y: w.y }, 0xe0f6ff, { n: 1, speed: 25, key: 'fx-drop', size: 0.5, ang: ang + Math.PI, cone: 1.2, life: 350 });
          }
        },
        onComplete: () => {
          fade(s, w, 300, { scaleX: 3 });
          fade(s, wc, 300, { scaleX: 2.5 });
          impact(s, to, 0x45b6ff, 1.5);
          ring(s, to, 0xe0f6ff, 2.6, 520, 0.5);
          burst(s, to, 0xbfe9ff, { n: 20, speed: 120, key: 'fx-drop', size: 0.9, grav: 60, ang: -Math.PI / 2, cone: 1.4, life: 650 });
          shake(s, 220, 0.007);
          fin(c, 220);
        },
      });
    },
  },
  'whirlpool': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      for (let i = 0; i < 3; i++) {
        const r = mk(s, 'fx-ring', to.x, to.y + 20, 0x3aa8ff, 1.3 - i * 0.3);
        r.scaleY = r.scaleX * 0.4;
        s.tweens.add({
          targets: r, rotation: 5 + i, scaleX: 0.2, scaleY: 0.08, alpha: 0.15, duration: 900, delay: i * 120,
          ease: 'Sine.easeIn', onComplete: () => r.destroy(),
        });
      }
      for (let i = 0; i < 16; i++) {
        const d = mk(s, 'fx-drop', to.x, to.y, 0xbfe9ff, 0.7);
        const a0 = rnd(0, TAU);
        const st = { v: 0 };
        s.tweens.add({
          targets: st, v: 1, duration: 850, delay: i * 25,
          onUpdate: () => {
            const a = a0 + st.v * 10;
            const r = 85 * (1 - st.v * 0.85);
            d.x = to.x + Math.cos(a) * r;
            d.y = to.y + 20 + Math.sin(a) * r * 0.4;
            d.rotation = a + 1.6;
          },
          onComplete: () => d.destroy(),
        });
      }
      after(s, 650, () => { impact(s, to, 0x45b6ff, 1.1); shake(s, 180, 0.005); });
      fin(c, 820);
    },
  },
  'torrent': {
    mode: 'dash',
    run: (c) => {
      const { s, from, to, ang } = c;
      beam(s, from, to, 0x45b6ff, 22, 320);
      for (let i = 0; i < 18; i++) {
        proj(s, at(from, perp(ang, rnd(-14, 14))), at(to, perp(ang, rnd(-20, 20))), {
          key: 'fx-drop', color: 0xbfe9ff, scale: 0.8, dur: 200, delay: i * 14, align: true,
        }, () => undefined);
      }
      after(s, 140, () => {
        impact(s, to, 0x45b6ff, 1.3);
        burst(s, to, 0xbfe9ff, { n: 16, speed: 120, key: 'fx-drop', size: 0.8, grav: 50, ang, cone: 1.3 });
        shake(s, 160, 0.006);
      });
      fin(c, 340);
    },
  },
  'tidal-crash': {
    mode: 'dash',
    run: (c) => {
      const { s, to } = c;
      const w = mk(s, 'fx-crescent', to.x, to.y - 220, 0x2e9bff, 1.2);
      const wc = mk(s, 'fx-crescent', to.x, to.y - 220, 0xe0f6ff, 0.8);
      w.rotation = wc.rotation = Math.PI / 2;
      w.setScale(0.6, 2.4);
      wc.setScale(0.4, 2.1);
      s.tweens.add({
        targets: [w, wc], y: to.y + 10, duration: 260, ease: 'Cubic.easeIn',
        onComplete: () => {
          fade(s, w, 350, { scaleX: 1.6, scaleY: 3.4 });
          fade(s, wc, 350);
          impact(s, to, 0x45b6ff, 1.6);
          ring(s, at(to, { x: 0, y: 28 }), 0xe0f6ff, 3, 520, 0.4);
          burst(s, to, 0xbfe9ff, { n: 22, speed: 140, key: 'fx-drop', size: 0.9, grav: 70, ang: -Math.PI / 2, cone: 1.5, life: 700 });
          shake(s, 260, 0.009);
          fin(c, 220);
        },
      });
    },
  },
  'aqua-burst': {
    mode: 'cast',
    run: (c) => {
      charge(c.s, c.from, 0x6cc4ff, 220, 50);
      proj(c.s, c.from, c.to, { color: 0x6cc4ff, scale: 1.2, dur: 380, arc: 40, delay: 200, trail: 0xbfe9ff }, () => {
        impact(c.s, c.to, 0x45b6ff, 1.3);
        ring(c.s, c.to, 0xbfe9ff, 2.4, 480);
        burst(c.s, c.to, 0xbfe9ff, { n: 24, speed: 130, key: 'fx-drop', size: 0.8, grav: 40, life: 600 });
        fin(c, 200);
      });
    },
  },

  // ── Light ─────────────────────────────────────────────────────
  'flash': {
    mode: 'dash',
    run: (c) => {
      const { s, to } = c;
      pop(s, to, 0xffffff, 6, 420);
      for (let i = 0; i < 10; i++) {
        const r = mk(s, 'fx-blade', to.x, to.y, 0xfff2a0, 0.1).setOrigin(0, 0.5);
        r.rotation = (i / 10) * TAU;
        r.scaleY = 0.6;
        fade(s, r, 380, { scaleX: 1.1, ease: 'Cubic.easeOut' });
      }
      ring(s, to, 0xffffff, 2, 360);
      shake(s, 100, 0.004);
      fin(c, 160);
    },
  },
  'radiant-beam': {
    mode: 'cast',
    run: (c) => {
      charge(c.s, c.from, 0xfff2a0, 360, 80);
      after(c.s, 360, () => {
        beam(c.s, c.from, c.to, 0xffe680, 22, 460);
        for (let i = 0; i < 8; i++) {
          const t = (i + 1) / 9;
          const p = { x: c.from.x + (c.to.x - c.from.x) * t, y: c.from.y + (c.to.y - c.from.y) * t };
          after(c.s, i * 35, () => ring(c.s, p, 0xfff2a0, 0.5, 260));
        }
        after(c.s, 100, () => { impact(c.s, c.to, 0xfff2a0, 1.5); shake(c.s, 260, 0.005); });
        fin(c, 480);
      });
    },
  },
  'dawn-strike': {
    mode: 'dash',
    run: (c) => {
      const { s, to } = c;
      const col = mk(s, 'fx-bar', to.x, to.y + 40, 0xffd966, 1).setOrigin(0.5, 1);
      col.setScale(0.5, 0.1);
      s.tweens.add({
        targets: col, scaleX: 11, scaleY: 40, duration: 160, ease: 'Cubic.easeOut',
        onComplete: () => fade(s, col, 340, { scaleX: 3 }),
      });
      const piv = { x: to.x + 90, y: to.y - 90 };
      bladeSwing(s, piv, Math.PI * 0.75 - 0.5, Math.PI * 0.75 + 0.1, 160, 0xffd966, 150, 2.4, () => {
        slashMark(s, to, 0.75, 0xffd966, 1.7, 0xffffff, 340);
        impact(s, to, 0xffe680, 1.3);
        burst(s, to, 0xffffff, { n: 12, speed: 100, key: 'fx-star', size: 0.2, spin: true });
        fin(c, 140);
      });
    },
  },
  'holy-nova': {
    mode: 'cast',
    run: (c) => {
      const { s, from, to, ang } = c;
      charge(s, from, 0xfff2a0, 240, 60);
      after(s, 240, () => {
        ring(s, from, 0xfff2a0, 2.8, 480);
        after(s, 100, () => ring(s, from, 0xffffff, 2, 420));
        for (let i = 0; i < 6; i++) {
          const off = perp(ang, (i - 2.5) * 22);
          proj(s, from, at(to, off, 0.8), {
            key: 'fx-star', color: 0xfff2a0, scale: 0.7, dur: 340, delay: i * 40, spin: 0.2, arc: 20 * (i % 2 ? 1 : -1),
          }, () => burst(s, at(to, off, 0.8), 0xfff2a0, { n: 4, speed: 50, key: 'fx-star', size: 0.15, spin: true }));
        }
        after(s, 460, () => {
          pop(s, to, 0xffffff, 6, 450);
          impact(s, to, 0xffe680, 1.6);
          ring(s, to, 0xfff2a0, 3, 560);
          shake(s, 240, 0.007);
        });
        fin(c, 700);
      });
    },
  },
  'sunburst': {
    mode: 'dash',
    run: (c) => {
      const { s, to } = c;
      const sun = mk(s, 'fx-glow', to.x, to.y, 0xffc233, 0.3);
      s.tweens.add({ targets: sun, scale: 4.2, duration: 220, ease: 'Cubic.easeOut', onComplete: () => fade(s, sun, 320, { scale: 5.5 }) });
      const rays = s.add.container(to.x, to.y).setDepth(DEPTH);
      for (let i = 0; i < 12; i++) {
        const r = s.add.image(0, 0, 'fx-blade').setOrigin(0, 0.5).setTint(0xffe680).setBlendMode(ADD);
        r.rotation = (i / 12) * TAU;
        r.setScale(0.9, 0.5);
        rays.add(r);
      }
      rays.setScale(0.2);
      s.tweens.add({ targets: rays, scale: 1.3, rotation: 0.9, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => rays.destroy() });
      pop(s, to, 0xffffff, 3, 200);
      ring(s, to, 0xffe680, 2.8, 520);
      shake(s, 240, 0.008);
      fin(c, 260);
    },
  },

  // ── Shadow ────────────────────────────────────────────────────
  'shade-claw': {
    mode: 'dash',
    run: (c) => {
      const { s, to, ang } = c;
      for (let i = 0; i < 3; i++) {
        after(s, i * 75, () => {
          const p = at(to, perp(ang, (i - 1) * 26));
          slashMark(s, p, ang - Math.PI / 2 - 0.9, 0xb040ff, 1.2, 0xf0d0ff, 230);
          burst(s, p, 0x3a0a5a, { n: 5, speed: 60, size: 0.5, add: false, life: 500 });
          if (i === 2) { impact(s, to, 0xa030f0, 1.1); fin(c, 100); }
          else shake(s, 50, 0.002);
        });
      }
    },
  },
  'gloom-bolt': {
    mode: 'cast',
    run: (c) => {
      charge(c.s, c.from, 0xa030f0, 180, 45);
      after(c.s, 180, () => {
        lightning(c.s, c.from, c.to, 0xb050ff);
        after(c.s, 60, () => {
          impact(c.s, c.to, 0xa030f0, 1.3);
          burst(c.s, c.to, 0x2a0840, { n: 8, speed: 70, size: 0.6, add: false, life: 550 });
        });
        fin(c, 330);
      });
    },
  },
  'night-slash': {
    mode: 'dash',
    run: (c) => {
      const { s, from, to, ang } = c;
      const col = 0xa020f0;
      pop(s, at(from, perp(ang, -10)), col, 2.4, 260);
      burst(s, from, 0x3a0a5a, { n: 8, speed: 50, size: 0.5, add: false, life: 450 });
      const len = Math.hypot(to.x - from.x, to.y - from.y) + 55;
      bladeSwing(s, at(from, perp(ang, -10)), ang - 1.45, ang + 1.15, len, col, 210, 2.4, () => {
        slashMark(s, at(to, { x: Math.cos(ang) * 8, y: Math.sin(ang) * 8 }), ang + 0.25, col, 2, 0xf0d0ff, 380);
        impact(s, to, col, 1.4);
        burst(s, to, 0x1e0630, { n: 12, speed: 90, size: 0.55, add: false, life: 600 });
        burst(s, to, 0xd890ff, { n: 10, speed: 120, key: 'fx-shard', size: 0.22, align: true, ang, cone: 1.4 });
        shake(s, 170, 0.006);
        fin(c, 140);
      });
    },
  },
  'void-crush': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      const orb = mk(s, 'fx-glow', to.x, to.y - 10, 0x5a10a0, 0.3, false, 0.95);
      const rim = mk(s, 'fx-ring', to.x, to.y - 10, 0xc070ff, 0.1);
      s.tweens.add({ targets: orb, scale: 3.4, duration: 340, ease: 'Sine.easeOut' });
      s.tweens.add({ targets: rim, scale: 1.6, duration: 340, ease: 'Sine.easeOut' });
      for (let i = 0; i < 18; i++) {
        const a = rnd(0, TAU);
        const q = mk(s, 'fx-glow', to.x + Math.cos(a) * 130, to.y - 10 + Math.sin(a) * 100, 0xb060ff, 0.2);
        s.tweens.add({
          targets: q, x: to.x, y: to.y - 10, alpha: 0, duration: 380, delay: 200 + i * 15, ease: 'Cubic.easeIn',
          onComplete: () => q.destroy(),
        });
      }
      after(s, 360, () => {
        s.tweens.add({
          targets: [orb, rim], scale: 0.05, duration: 160, ease: 'Cubic.easeIn',
          onComplete: () => {
            orb.destroy(); rim.destroy();
            pop(s, to, 0xffffff, 3, 240);
            ring(s, to, 0xc070ff, 3, 520);
            ring(s, to, 0x6a20b0, 2, 420);
            burst(s, to, 0xb060ff, { n: 16, speed: 130, key: 'fx-shard', size: 0.25, spin: true, align: true });
            shake(s, 280, 0.01);
            fin(c, 200);
          },
        });
      });
    },
  },
  'eclipse': {
    mode: 'summon',
    run: (c) => {
      const { s, to } = c;
      const top = { x: to.x, y: to.y - 130 };
      const corona = mk(s, 'fx-glow', top.x, top.y, 0xffb347, 0.2);
      const disc = mk(s, 'fx-glow', top.x, top.y, 0x08000f, 0.2, false);
      const rays = s.add.container(top.x, top.y).setDepth(DEPTH);
      for (let i = 0; i < 14; i++) {
        const r = s.add.image(0, 0, 'fx-blade').setOrigin(0, 0.5).setTint(0xc070ff).setBlendMode(ADD);
        r.rotation = (i / 14) * TAU;
        r.setScale(0.6, 0.4);
        rays.add(r);
      }
      rays.setScale(0.2);
      s.tweens.add({ targets: corona, scale: 4.4, duration: 480, ease: 'Sine.easeOut' });
      s.tweens.add({ targets: disc, scale: 2.2, duration: 480, ease: 'Sine.easeOut' });
      s.tweens.add({ targets: rays, scale: 1.1, rotation: 1.2, duration: 700, ease: 'Sine.easeOut' });
      after(s, 520, () => {
        beam(s, top, to, 0xb050ff, 30, 380);
        impact(s, to, 0xa030f0, 1.7);
        ring(s, to, 0xffb347, 2.8, 520, 0.6);
        shake(s, 340, 0.009);
        fade(s, corona, 300);
        fade(s, disc, 300);
        fade(s, rays, 300);
      });
      fin(c, 760);
    },
  },

  // ── Rock (heavy melee) ────────────────────────────────────────
  'grand-slam': {
    mode: 'dash',
    run: (c) => {
      const { s, to } = c;
      shake(s, 320, 0.012);
      ring(s, at(to, { x: 0, y: 28 }), 0xc4b49a, 3.4, 600, 0.35);
      ring(s, at(to, { x: 0, y: 28 }), 0xffffff, 2.2, 480, 0.35);
      impact(s, to, 0xc4b49a, 1.7);
      burst(s, to, 0x9a8c78, { n: 18, speed: 150, key: 'fx-rock', size: 0.4, add: false, grav: 70, spin: true });
      burst(s, to, 0xd8ccb8, { n: 10, speed: 100, size: 0.8, add: false, life: 700 });
      const st = mk(s, 'fx-star', to.x, to.y, 0xfff2a0, 0.4);
      fade(s, st, 360, { scale: 3, rotation: 1 });
      fin(c, 260);
    },
  },
};

// ────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────

/** Fallback for moves without a bespoke effect (e.g. future/boss moves). */
function genericFx(move: IMove): MoveFx {
  const color = TYPE_FX_COLOR[move.type] ?? 0xffffff;
  if (move.category === AttackCategory.Direct) {
    return { mode: 'dash', run: (c) => { impact(c.s, c.to, color, 1.1); fin(c); } };
  }
  return {
    mode: 'cast',
    run: (c) => {
      proj(c.s, c.from, c.to, { color, scale: 0.8, dur: 350, delay: 100 }, () => {
        impact(c.s, c.to, color, 1.1);
        fin(c);
      });
    },
  };
}

export function getMoveFx(move: IMove): MoveFx {
  return FX[move.id] ?? genericFx(move);
}

export function prepareMoveFx(scene: Phaser.Scene): void {
  ensureTextures(scene);
}

export const MOVE_FX_IDS = Object.keys(FX);
