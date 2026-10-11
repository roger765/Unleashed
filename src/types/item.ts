import { PetType } from './pet';

export enum ItemType {
  Potion,
  Food,
  Weapon,
  Staff,
  ArmorHelmet,
  ArmorChest,
  ArmorBoots,
  Charm,
  Lure,
  EvoStone,
}

export type ArmorSlot = 'helmet' | 'chest' | 'boots';

export interface IItem {
  id: string;
  name: string;
  itemType: ItemType;
  description: string;
  buyPrice: number;
  healAmount?: number;
  healPerTurn?: number;
  healDuration?: number;
  attackType?: PetType;
  moveIds?: string[];
  defenseBoost?: number;
  hpBoostPercent?: number;
  resistType?: PetType;
  resistPercent?: number;
  /** Charm / Lure: which type's spawn chance is boosted. */
  boostType?: PetType;
  /** Charm / Lure: multiplier applied to the base Light/Shadow spawn chance. */
  spawnMultiplier?: number;
  /** Lure: how long the boost lasts once used. */
  lureDurationMs?: number;
  /** EvoStone: which type of pet it can evolve. */
  stoneType?: PetType;
}
