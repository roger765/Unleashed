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
