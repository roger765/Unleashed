export enum PetType {
  Rock,
  Nature,
  Wood,
  Water,
  Normal,
  Light,
  Shadow,
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

/** One move slot on a pet; `level` is the pet level at which it becomes usable. */
export interface IPetMoveSlot {
  id: string;
  level: number;
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
  /** Per-pet move list, written when a TM is first used. Absent = use the species template's moves. */
  moves?: IPetMoveSlot[];
}
