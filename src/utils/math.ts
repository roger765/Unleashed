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
 *   Light <-> Shadow: each hits the other for 1.5x; both are neutral to the four elements.
 *   Fire  > Ice, Nature, Wood
 *   Ice   > Water, Nature, Wood
 *   Water > Fire (as well as Rock), Rock > Fire, Ice (as well as Wood)
 *   Fire and Ice are neutral to Light and Shadow.
 */
const advantageMap: Record<PetType, PetType[]> = {
  [PetType.Nature]: [PetType.Water],
  [PetType.Water]: [PetType.Rock, PetType.Fire],
  [PetType.Rock]: [PetType.Wood, PetType.Fire, PetType.Ice],
  [PetType.Wood]: [PetType.Nature],
  [PetType.Fire]: [PetType.Ice, PetType.Nature, PetType.Wood],
  [PetType.Ice]: [PetType.Water, PetType.Nature, PetType.Wood],
  [PetType.Normal]: [], // Normal has no advantage
  [PetType.Light]: [PetType.Shadow],
  [PetType.Shadow]: [PetType.Light],
};

/** Every type, in enum order. Use instead of hardcoded type lists. */
export const ALL_PET_TYPES: PetType[] = [
  PetType.Rock,
  PetType.Nature,
  PetType.Wood,
  PetType.Water,
  PetType.Normal,
  PetType.Light,
  PetType.Shadow,
  PetType.Fire,
  PetType.Ice,
];

export const PET_TYPE_LABELS: Record<PetType, string> = {
  [PetType.Rock]: 'Rock',
  [PetType.Nature]: 'Nature',
  [PetType.Wood]: 'Wood',
  [PetType.Water]: 'Water',
  [PetType.Normal]: 'Normal',
  [PetType.Light]: 'Light',
  [PetType.Shadow]: 'Shadow',
  [PetType.Fire]: 'Fire',
  [PetType.Ice]: 'Ice',
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
  if (advantageMap[attackType].includes(defenderType)) {
    return TYPE_ADVANTAGE_MULTIPLIER;
  }
  if (advantageMap[defenderType].includes(attackType)) {
    return TYPE_DISADVANTAGE_MULTIPLIER;
  }
  return 1.0;
}
