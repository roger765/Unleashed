import { IPetInstance, PetType } from './pet';
import { IMove } from './move';

export interface IBattleCombatant {
  id: string;
  name: string;
  isPlayer: boolean;
  pet?: IPetInstance;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  type: PetType;
  moves: IMove[];
  statusEffects: IStatusEffect[];
  resistances: Partial<Record<PetType, number>>;
  /** True for the player's pets: their moves are limited by Attack Allowance (AA). */
  limitedAA?: boolean;
  /** Overrides the sprite texture (e.g. a trainer fighting in person). */
  texture?: string;
  /** Level for combatants that are not pets, used for XP and coin rewards. */
  level?: number;
}

export interface IStatusEffect {
  type: 'healOverTime';
  amountPerTurn: number;
  turnsRemaining: number;
}

export interface IDamageResult {
  targetId: string;
  damage: number;
  missed: boolean;
  effectiveness: 'super' | 'normal' | 'weak';
}
