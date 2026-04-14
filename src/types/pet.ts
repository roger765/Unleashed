export enum PetType {
  Rock,
  Nature,
  Wood,
  Water,
  Normal,
}

export interface IPetTemplate {
  id: string;
  name: string;
  type: PetType;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  moveIds: string[];
  moveLevels: number[];
  captureCost: number;
  rarity: 'common' | 'uncommon' | 'rare';
  description: string;
}

export interface IPetInstance {
  templateId: string;
  nickname: string;
  level: number;
  currentHp: number;
  maxHp: number;
  xp: number;
  attack: number;
  defense: number;
}
