import { PetType } from './pet';

export enum AttackCategory {
  Direct,
  Ranged,
  Chance,
}

export interface IMove {
  id: string;
  name: string;
  type: PetType;
  category: AttackCategory;
  power: number;
  description: string;
}
