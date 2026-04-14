import { PetType } from './pet';

export enum ItemType {
  Potion,
  Food,
  Weapon,
  Staff,
}

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
}
