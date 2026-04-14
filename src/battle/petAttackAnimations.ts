import Phaser from 'phaser';
import { PET_TEMPLATES } from '../data/pets';
import { IBattleCombatant } from '../types/battle';
import { AttackCategory } from '../types/move';

/** Per-pet numeric recipe; each pet has a unique tuple so motion reads differently. */
export interface PetAttackRecipe {
  /** Scales forward travel toward target (0.35–1.05). */
  lunge: number;
  /** Perpendicular offset magnitude at strike (roughly -10…10). */
  side: number;
  /** Rotation swing in degrees at peak. */
  rot: number;
  /** Scale overshoot factor (0.05–0.22). */
  pulse: number;
  /** Vertical hop emphasis (0–14 px). */
  hop: number;
  /** Windup pull as fraction of base pull (0.08–0.42). */
  windup: number;
  /** Base duration scale (ms). */
  ms: number;
}

function R(
  lunge: number,
  side: number,
  rot: number,
  pulse: number,
  hop: number,
  windup: number,
  ms: number,
): PetAttackRecipe {
  return { lunge, side, rot, pulse, hop, windup, ms };
}

/** Human player — distinct from all pets. */
export const PLAYER_ATTACK_RECIPE: PetAttackRecipe = R(0.88, 2, 14, 0.1, 6, 0.16, 290);

const FALLBACK_RECIPE: PetAttackRecipe = R(0.85, 0, 8, 0.09, 4, 0.18, 280);

const PET_ATTACK_RECIPES: Record<string, PetAttackRecipe> = {
  gravel: R(0.95, 4, 6, 0.08, 2, 0.14, 270),
  cobble: R(0.78, -5, -8, 0.14, 0, 0.22, 300),
  slate: R(0.91, -3, 12, 0.07, 5, 0.12, 265),
  marble: R(0.72, 6, -5, 0.11, 3, 0.2, 315),
  obsidian: R(0.99, -2, 18, 0.06, 8, 0.1, 255),
  leaf: R(0.86, 7, -10, 0.1, 6, 0.17, 285),
  sprout: R(0.82, -4, -4, 0.13, 10, 0.24, 305),
  fern: R(0.9, 5, 9, 0.09, 4, 0.15, 275),
  blossom: R(0.84, -6, 7, 0.12, 7, 0.19, 295),
  flora: R(0.97, 3, 15, 0.08, 5, 0.11, 260),
  twig: R(0.88, -7, 11, 0.1, 8, 0.16, 278),
  bark: R(0.8, 2, -6, 0.07, 2, 0.21, 308),
  cedar: R(0.93, -5, 5, 0.09, 3, 0.13, 272),
  willow: R(0.75, 9, -14, 0.11, 12, 0.23, 320),
  ironwood: R(1.02, -1, 20, 0.05, 4, 0.09, 248),
  wave: R(0.87, 5, -7, 0.12, 9, 0.18, 288),
  puddle: R(0.7, -8, 3, 0.15, 6, 0.26, 325),
  brook: R(0.92, 4, 8, 0.1, 11, 0.14, 268),
  reef: R(0.85, -4, -12, 0.08, 5, 0.17, 282),
  tsunami: R(1.0, 6, 16, 0.07, 14, 0.11, 252),
  monolith: R(0.94, -3, 4, 0.06, 3, 0.13, 278),
  tumbler: R(0.76, 8, -18, 0.13, 2, 0.25, 312),
  canopy: R(0.89, -5, 10, 0.1, 7, 0.16, 280),
  thornthrall: R(0.91, 7, 13, 0.09, 6, 0.12, 266),
  groveward: R(0.96, -6, -9, 0.08, 5, 0.14, 274),
  bulwark: R(0.83, 1, -4, 0.06, 1, 0.2, 300),
  breaker: R(0.9, 5, 11, 0.11, 13, 0.15, 262),
  depthling: R(0.79, -7, 6, 0.12, 8, 0.22, 310),
  razorslate: R(0.98, 2, 17, 0.07, 4, 0.1, 258),
  marblemarch: R(0.74, -9, -7, 0.1, 4, 0.24, 318),
  primeval: R(0.93, 6, -11, 0.09, 9, 0.13, 276),
  fullbloom: R(0.86, -4, 8, 0.13, 8, 0.18, 292),
  edenguard: R(1.01, 3, 19, 0.06, 6, 0.09, 250),
  sequoia: R(0.92, -2, 7, 0.07, 3, 0.15, 285),
  weepgiant: R(0.81, 10, -16, 0.1, 11, 0.21, 302),
  adamantbark: R(1.03, -1, 22, 0.05, 5, 0.08, 245),
  rapidsoul: R(0.88, 4, 9, 0.11, 12, 0.17, 270),
  atollward: R(0.84, -5, -10, 0.08, 7, 0.19, 288),
  megalith: R(0.97, -4, 5, 0.06, 4, 0.12, 272),
  rockslide: R(0.8, 9, -20, 0.12, 3, 0.23, 308),
  skylarch: R(0.9, 5, 12, 0.09, 10, 0.14, 268),
  brambleking: R(0.94, -7, 14, 0.1, 6, 0.13, 264),
  wildwood: R(0.87, 3, -8, 0.08, 9, 0.17, 284),
  citadel: R(0.85, -2, -3, 0.06, 2, 0.2, 298),
  chalk: R(0.83, 3, 5, 0.11, 3, 0.2, 290),
  grit: R(0.89, -6, 4, 0.12, 2, 0.19, 288),
  shale: R(0.88, 4, -9, 0.09, 2, 0.17, 283),
  basalt: R(0.96, -2, 11, 0.07, 4, 0.14, 268),
  limestone: R(0.91, 5, 8, 0.08, 3, 0.15, 276),
  moss: R(0.79, 6, -5, 0.12, 9, 0.22, 298),
  clover: R(0.84, -5, 6, 0.11, 8, 0.2, 292),
  orchid: R(0.87, 7, -8, 0.1, 6, 0.17, 280),
  thistle: R(0.9, -7, 10, 0.09, 4, 0.16, 274),
  myrtle: R(0.82, 4, 7, 0.1, 7, 0.18, 286),
  driftwood: R(0.77, 8, -12, 0.13, 5, 0.24, 305),
  acorn: R(0.86, -4, 4, 0.12, 10, 0.21, 295),
  pine: R(0.9, 3, -7, 0.09, 4, 0.16, 278),
  bamboo: R(0.94, -3, 9, 0.08, 6, 0.14, 270),
  birch: R(0.8, 6, -11, 0.1, 5, 0.2, 292),
  droplet: R(0.81, -6, 5, 0.14, 11, 0.23, 302),
  mist: R(0.74, 9, -6, 0.11, 7, 0.26, 318),
  geyser: R(0.95, 2, 12, 0.1, 14, 0.13, 262),
  lagoon: R(0.85, -5, 8, 0.11, 10, 0.18, 282),
  riptide: R(0.92, 7, -14, 0.09, 12, 0.15, 268),
  deluge: R(0.99, 6, 15, 0.1, 13, 0.11, 256),
  trench: R(0.77, -8, 4, 0.11, 9, 0.25, 318),
};

for (const id of Object.keys(PET_TEMPLATES)) {
  if (PET_ATTACK_RECIPES[id] === undefined) {
    PET_ATTACK_RECIPES[id] = FALLBACK_RECIPE;
    if (import.meta.env?.DEV) {
      console.warn(
        `[petAttackAnimations] Missing attack recipe for pet "${id}"; using FALLBACK_RECIPE`,
      );
    }
  }
}

export interface PetAttackAnimationOpts {
  targetX: number;
  targetY: number;
  moveCategory: AttackCategory;
}

/**
 * Plays a short attacker-only tween, then restores sprite transform and calls onComplete.
 */
export function playPetAttackAnimation(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image,
  combatant: IBattleCombatant,
  opts: PetAttackAnimationOpts,
  onComplete: () => void,
): void {
  scene.tweens.killTweensOf(sprite);

  const snap = {
    x: sprite.x,
    y: sprite.y,
    sx: sprite.scaleX,
    sy: sprite.scaleY,
    angle: sprite.angle,
  };

  const recipe = combatant.isPlayer
    ? PLAYER_ATTACK_RECIPE
    : PET_ATTACK_RECIPES[combatant.pet?.templateId ?? ''] ?? FALLBACK_RECIPE;

  const dx = opts.targetX - snap.x;
  const dy = opts.targetY - snap.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const px = -ny;
  const py = nx;

  const r = recipe;
  const cat = opts.moveCategory;

  const baseDirect = 30;
  const baseChance = 24;
  const baseRangedFwd = 10;

  let travel: number;
  if (cat === AttackCategory.Ranged) {
    travel = baseRangedFwd * r.lunge * 0.45;
  } else if (cat === AttackCategory.Chance) {
    travel = baseChance * r.lunge;
  } else {
    travel = baseDirect * r.lunge;
  }

  const sideAmt = r.side * 0.85;
  const hopAmt = r.hop;

  const windMult = cat === AttackCategory.Ranged ? 1.35 : 0.9;
  const windPull = (cat === AttackCategory.Ranged ? 22 : 14) * r.windup * windMult;

  const dur1 = Math.round(r.ms * 0.36);
  const dur2 = Math.round(r.ms * 0.34);
  const dur3 = Math.round(r.ms * 0.38);

  const windX =
    snap.x - nx * windPull + px * sideAmt * (cat === AttackCategory.Chance ? 0.35 : 0.2);
  const windY =
    snap.y - ny * windPull + py * sideAmt * (cat === AttackCategory.Chance ? 0.35 : 0.2);

  let peakX = snap.x + nx * travel + px * sideAmt;
  let peakY = snap.y + ny * travel + py * sideAmt - hopAmt * 0.45;

  if (cat === AttackCategory.Ranged) {
    peakX = snap.x + nx * travel * 0.55 + px * sideAmt * 1.15;
    peakY = snap.y + ny * travel * 0.55 - hopAmt * 0.2;
  }

  if (cat === AttackCategory.Chance) {
    peakX += (Math.random() - 0.5) * 10;
    peakY += (Math.random() - 0.5) * 10;
  }

  const pulseScale = 1 + r.pulse;
  const windScaleX = snap.sx * (1 - r.pulse * 0.38);
  const windScaleY = snap.sy * (1 - r.pulse * 0.38);

  const done = (): void => {
    sprite.setPosition(snap.x, snap.y);
    sprite.setScale(snap.sx, snap.sy);
    sprite.setAngle(snap.angle);
    onComplete();
  };

  scene.tweens.add({
    targets: sprite,
    x: windX,
    y: windY,
    scaleX: windScaleX,
    scaleY: windScaleY,
    angle: snap.angle - r.rot * 0.38,
    duration: dur1,
    ease: 'Sine.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: sprite,
        x: peakX,
        y: peakY,
        scaleX: snap.sx * pulseScale,
        scaleY: snap.sy * pulseScale,
        angle: snap.angle + r.rot * 0.62,
        duration: dur2,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          scene.tweens.add({
            targets: sprite,
            x: snap.x,
            y: snap.y,
            scaleX: snap.sx,
            scaleY: snap.sy,
            angle: snap.angle,
            duration: dur3,
            ease: 'Sine.easeInOut',
            onComplete: done,
          });
        },
      });
    },
  });
}
