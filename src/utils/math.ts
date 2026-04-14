import { PetType } from '../types/pet';
import {
  MISS_CHANCE,
  TYPE_ADVANTAGE_MULTIPLIER,
  TYPE_DISADVANTAGE_MULTIPLIER,
} from '../constants';

/** Inclusive random integer between min and max. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float between min (inclusive) and max (exclusive). */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Clamp value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Pick a value from a weighted list. */
export function weightedRandom<T>(items: { value: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  // Fallback (should not happen with valid weights)
  return items[items.length - 1].value;
}

/** Returns true 20% of the time (MISS_CHANCE). */
export function rollMiss(): boolean {
  return Math.random() < MISS_CHANCE;
}

/**
 * Type effectiveness chart (cyclic):
 *   Nature > Water > Rock > Wood > Nature  (1.5x)
 *   Reverse direction = 0.5x
 *   Same type or Normal involved = 1.0x
 */
const advantageMap: Record<PetType, PetType> = {
  [PetType.Nature]: PetType.Water,
  [PetType.Water]: PetType.Rock,
  [PetType.Rock]: PetType.Wood,
  [PetType.Wood]: PetType.Nature,
  [PetType.Normal]: PetType.Normal, // Normal has no advantage
};

export function getTypeEffectiveness(
  attackType: PetType,
  defenderType: PetType,
): number {
  if (attackType === PetType.Normal || defenderType === PetType.Normal) {
    return 1.0;
  }
  if (attackType === defenderType) {
    return 1.0;
  }
  if (advantageMap[attackType] === defenderType) {
    return TYPE_ADVANTAGE_MULTIPLIER;
  }
  if (advantageMap[defenderType] === attackType) {
    return TYPE_DISADVANTAGE_MULTIPLIER;
  }
  return 1.0;
}
