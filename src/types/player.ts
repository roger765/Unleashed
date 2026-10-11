import { IPetInstance } from './pet';

export interface IPlayerAppearance {
  hairColor: string;
  skinColor: string;
}

export interface IEquippedArmor {
  helmet: string | null;
  chest: string | null;
  boots: string | null;
}

export interface IPlayerState {
  name: string;
  appearance: IPlayerAppearance;
  level: number;
  xp: number;
  coins: number;
  spirits: number;
  equippedWeaponId: string | null;
  equippedArmor: IEquippedArmor;
  equippedCharmId: string | null;
  team: IPetInstance[];
  storage: IPetInstance[];
  inventory: { itemId: string; quantity: number }[];
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  currentScene: string;
  lastSpinDate: string | null;
  quizTowerFloor: number;
  bossTowerFloor: number;
}
