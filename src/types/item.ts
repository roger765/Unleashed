import { PetType } from './pet';

export enum ItemType {
  Potion,
  Food,
  Weapon,
  Staff,
  ArmorHelmet,
  ArmorChest,
  ArmorBoots,
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
}
