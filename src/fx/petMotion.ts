import Phaser from 'phaser';
import { PET_TEMPLATES } from '../data/pets';
import { PET_EVOLUTION } from '../data/evolutions';
import { PetType } from '../types';

/**
 * Per-type movement personality for Rock, Nature, Wood, Water, Light and Shadow pets.
 *   Rock   — heavy hop, thud on landing
 *   Nature — leafy sway, springy skip
 *   Wood   — lumbering waddle
 *   Water  — volume-preserving squash and stretch
 *   Light  — weightless hover with a gentle pulse
 *   Shadow — billowing drift
 * Evolved forms move slower, so they feel heavier than their base form.
 */
export type PetMotionKind = 'hop' | 'sway' | 'waddle' | 'slosh' | 'float' | 'drift';

const KIND_BY_TYPE: Partial<Record<PetType, PetMotionKind>> = {
  [PetType.Rock]: 'hop',
  [PetType.Nature]: 'sway',
  [PetType.Wood]: 'waddle',
  [PetType.Water]: 'slosh',
  [PetType.Light]: 'float',
  [PetType.Shadow]: 'drift',
};

export function petMotionKind(templateId: string): PetMotionKind | null {
  const type = PET_TEMPLATES[templateId]?.type;
  return type === undefined ? null : KIND_BY_TYPE[type] ?? null;
}

function tierOf(id: string): number {
  const parent = Object.entries(PET_EVOLUTION).find(([, e]) => e.into === id)?.[0];
  return parent ? 1 + tierOf(parent) : 0;
}

/** Offset from the resting pose. `dy` is a fraction of sprite height (negative = up). */
export interface PetPose { dy: number; sx: number; sy: number; rot: number }

export function petPose(kind: PetMotionKind, tau: number, walking: boolean, face = 1): PetPose {
  let dy = 0, sx = 1, sy = 1, rot = 0;
  switch (kind) {
    case 'hop':
      if (!walking) {
        const k = Math.sin(tau * 2.4);
        sy = 1 + 0.03 * k; sx = 1 - 0.025 * k;
      } else {
        const c = (tau * 1.5) % 1;
        if (c < 0.55) {
          const a = Math.sin(Math.PI * (c / 0.55));
          dy = -a * 0.12; sy = 1 + 0.09 * a; sx = 1 - 0.06 * a;
        } else {
          const a = (c - 0.55) / 0.45;
          const k = Math.exp(-a * 4) * Math.cos(a * Math.PI * 2.5);
          sy = 1 - 0.18 * k; sx = 1 + 0.15 * k;
        }
      }
      break;
    case 'sway':
      if (!walking) {
        rot = 0.09 * Math.sin(tau * 2.1);
        const k = Math.sin(tau * 4.2);
        sy = 1 + 0.03 * k; sx = 1 - 0.02 * k;
      } else {
        const sn = Math.sin(tau * 5);
        dy = -Math.abs(sn) * 0.075;
        rot = 0.13 * sn + 0.07 * face;
        sy = 1 + 0.05 * Math.abs(sn);
      }
      break;
    case 'waddle':
      if (!walking) {
        rot = 0.03 * Math.sin(tau * 1.6);
        sy = 1 + 0.018 * Math.sin(tau * 3.2);
      } else {
        const sn = Math.sin(tau * 5.5);
        rot = 0.16 * sn; dy = -Math.abs(sn) * 0.052; sx = 1 + 0.025 * sn;
      }
      break;
    case 'slosh':
      if (!walking) {
        const k = Math.sin(tau * 2.6);
        sx = 1 + 0.07 * k; sy = 1 - 0.07 * k;
      } else {
        const k = Math.sin(tau * 4);
        sx = 1 + 0.15 * k; sy = 1 - 0.15 * k;
        dy = -Math.max(0, k) * 0.045; rot = 0.06 * Math.cos(tau * 4) * face;
      }
      break;
    case 'float':
      if (!walking) {
        dy = -0.05 - 0.035 * Math.sin(tau * 2.2);
        const k = Math.sin(tau * 4.4);
        sy = 1 + 0.025 * k; sx = 1 - 0.02 * k;
        rot = 0.03 * Math.sin(tau * 1.7);
      } else {
        const b = Math.sin(tau * 3.6);
        dy = -0.07 - 0.05 * b;
        rot = 0.07 * Math.cos(tau * 3.6) * face;
        sy = 1 + 0.03 * b; sx = 1 - 0.02 * b;
      }
      break;
    case 'drift':
      if (!walking) {
        const k = Math.sin(tau * 1.9);
        sy = 1 + 0.06 * k;
        sx = 1 + 0.05 * Math.sin(tau * 1.9 + 1.5);
        rot = 0.05 * Math.sin(tau * 1.3);
      } else {
        const k = Math.sin(tau * 3.2);
        sx = 1 + 0.12 * Math.sin(tau * 3.2 + 1);
        sy = 1 + 0.08 * k;
        rot = 0.1 * face + 0.04 * Math.sin(tau * 6);
        dy = -0.02 - 0.02 * k;
      }
      break;
  }
  return { dy, sx, sy, rot };
}

export interface PetMotionOpts {
  /** Return true while the pet is travelling (switches idle → walk motion). */
  isMoving?: () => boolean;
  /** Only tilt and squash; never move x/y. Use for physics-driven sprites. */
  staticPosition?: boolean;
  /** 0-1 multiplier on how far scale deviates from rest. */
  intensity?: number;
}

/**
 * Animate a pet sprite from its current resting transform. The animation yields to any
 * running tween on the sprite (attacks, hits, defeat) and picks up again afterwards,
 * so it never fights the battle effects.
 */
export function attachPetMotion(
  sprite: Phaser.GameObjects.Image,
  templateId: string,
  opts: PetMotionOpts = {},
): void {
  const kind = petMotionKind(templateId);
  if (!kind) return;
  const scene = sprite.scene;
  const speed = 1 - tierOf(templateId) * 0.12;
  const phase = Math.random() * 10;
  const intensity = opts.intensity ?? 1;
  const base = { x: sprite.x, y: sprite.y, sx: sprite.scaleX, sy: sprite.scaleY };
  const h = sprite.height * base.sy;

  const onUpdate = (time: number): void => {
    if (!sprite.active || !sprite.visible) return;
    if (scene.tweens.getTweensOf(sprite).length > 0) return;
    const walking = opts.isMoving?.() ?? false;
    const face = sprite.flipX ? -1 : 1;
    const p = petPose(kind, (time / 1000) * speed + phase, walking, face);
    const sx = 1 + (p.sx - 1) * intensity;
    const sy = 1 + (p.sy - 1) * intensity;
    sprite.setScale(base.sx * sx, base.sy * sy);
    sprite.setRotation(p.rot);
    if (opts.staticPosition) return;
    // Keep the feet planted: pivot squash and tilt around the bottom edge.
    const hh = (h * sy) / 2;
    sprite.setPosition(
      base.x + hh * Math.sin(p.rot),
      base.y + h / 2 - hh * Math.cos(p.rot) + p.dy * h,
    );
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
  sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
  });
}
