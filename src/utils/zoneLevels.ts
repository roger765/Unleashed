import { clamp } from './math';

/** How a zone's wild pets and bosses follow the player's level. Offsets are added to the player level. */
export interface ZoneLevelScaling {
  wildMin: number;
  wildMax: number;
  bossOffset: number;
  /** Enemies are never weaker than this, however low the player's level. */
  floor: number;
  /** Enemies are never stronger than this. */
  cap: number;
}

/** Emberreach and Frostmoor: wild pets at player -3..+2, bosses at +3, never below 20 or above 60. */
export const FIRE_ICE_SCALING: ZoneLevelScaling = {
  wildMin: -3,
  wildMax: 2,
  bossOffset: 3,
  floor: 20,
  cap: 60,
};

/** Player level plus an offset, held between the scaling's floor and cap. */
export function scaledLevel(playerLevel: number, offset: number, scaling: ZoneLevelScaling): number {
  return clamp(playerLevel + offset, scaling.floor, scaling.cap);
}
