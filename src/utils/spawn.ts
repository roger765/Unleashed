import { PET_TEMPLATES } from '../data/pets';
import { PET_EVOLUTION } from '../data/evolutions';
import { IPetTemplate, PetType } from '../types/pet';
import { GameState } from '../state/GameState';
import { randomInt } from './math';

/** Base chance (per wild spawn, per type) that an old-zone spawn is swapped for Light/Shadow (Fire/Ice: see below). */
export const BASE_LIGHT_SHADOW_CHANCE = 0.01;
/** Hard cap on the combined swap chance so charms and lures never take over a zone. */
const MAX_SWAP_CHANCE = 0.5;

/** Fire and Ice are rarer in old zones: their own zones are the main source. */
export const BASE_FIRE_ICE_CHANCE = 0.005;

/** Types that can swap into old-zone spawns (and that charms and lures boost). */
export const BOOSTABLE_TYPES: PetType[] = [PetType.Light, PetType.Shadow, PetType.Fire, PetType.Ice];

const baseSpawnChance = (type: PetType): number =>
  type === PetType.Fire || type === PetType.Ice ? BASE_FIRE_ICE_CHANCE : BASE_LIGHT_SHADOW_CHANCE;

/** Wild-capturable base forms (no evolved forms, nothing uncapturable). */
function wildPoolFor(type: PetType): IPetTemplate[] {
  const evolvedIds = new Set(Object.values(PET_EVOLUTION).map((e) => e.into));
  return Object.values(PET_TEMPLATES).filter(
    (t) => t.type === type && t.captureCost < 999 && !evolvedIds.has(t.id),
  );
}

/** Current swap chance for a boostable type, including equipped charm and active lure. */
export function getLightShadowSpawnChance(type: PetType): number {
  const gs = GameState.getInstance();
  const multiplier = gs.getCharmSpawnMultiplier(type) * gs.getLureSpawnMultiplier(type);
  return baseSpawnChance(type) * multiplier;
}

/**
 * Call on the template a zone scene just picked for a wild spawn. Usually returns it
 * unchanged; rarely swaps it for a Light, Shadow, Fire or Ice pet. Charms and lures raise the odds.
 * Zones that always spawn Light/Shadow (the new zones) should not use this.
 */
export function rollWildTemplate(template: IPetTemplate): IPetTemplate {
  const chances = BOOSTABLE_TYPES.map((type) => ({ type, chance: getLightShadowSpawnChance(type) }));
  const total = chances.reduce((sum, c) => sum + c.chance, 0);
  const scale = total > MAX_SWAP_CHANCE ? MAX_SWAP_CHANCE / total : 1;

  let roll = Math.random();
  for (const { type, chance } of chances) {
    const scaled = chance * scale;
    if (roll < scaled) {
      const pool = wildPoolFor(type);
      if (pool.length === 0) return template;
      return pool[randomInt(0, pool.length - 1)];
    }
    roll -= scaled;
  }
  return template;
}
