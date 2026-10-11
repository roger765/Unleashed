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
  TM,
}

export type ArmorSlot = 'helmet' | 'chest' | 'boots';

export interface IItem {
  id: string;
  name: string;
  itemType: ItemType;
  description: string;
  buyPrice: number;
  healAmount?: number;
  /** Food: restores the target pet to full HP regardless of its max. */
  healsFully?: boolean;
  /** Food: also restores every move's Attack Allowance (AA) on the target pet. */
  refillsAA?: boolean;
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
  /** TM: the move this item teaches. */
  teachMoveId?: string;
}
