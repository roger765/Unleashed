import { IBattleCombatant } from '../types/battle';
import { IPetInstance, PetType } from '../types/pet';
import { IMove } from '../types/move';
import { MOVES } from '../data/moves';
import { PET_TEMPLATES } from '../data/pets';
import { ITEMS } from '../data/items';

export function createPetCombatant(pet: IPetInstance, id: string): IBattleCombatant {
  const template = PET_TEMPLATES[pet.templateId];
  const moves: IMove[] = [];
  if (template) {
    for (let i = 0; i < template.moveIds.length; i++) {
      if (pet.level >= template.moveLevels[i]) {
        const move = MOVES[template.moveIds[i]];
        if (move) moves.push(move);
      }
    }
  }

  return {
    id,
    name: pet.nickname,
    isPlayer: false,
    pet,
    currentHp: pet.currentHp,
    maxHp: pet.maxHp,
    attack: pet.attack,
    defense: pet.defense,
    type: template?.type ?? PetType.Normal,
    moves,
    statusEffects: [],
  };
}

export function createPlayerCombatant(
  name: string,
  level: number,
  equippedWeaponId: string | null,
): IBattleCombatant {
  const baseHp = 100;
  const baseAtk = 10;
  const baseDef = 8;
  const hp = Math.floor(baseHp + level * baseHp * 0.1);
  const atk = Math.floor(baseAtk + level * baseAtk * 0.1);
  const def = Math.floor(baseDef + level * baseDef * 0.1);

  let moves: IMove[] = [];
  if (equippedWeaponId) {
    const weapon = ITEMS[equippedWeaponId];
    if (weapon?.moveIds) {
      moves = weapon.moveIds.map((id) => MOVES[id]).filter(Boolean) as IMove[];
    }
  }
  if (moves.length === 0) {
    moves = [MOVES['bash'], MOVES['star-strike']].filter(Boolean) as IMove[];
  }

  return {
    id: 'player-character',
    name,
    isPlayer: true,
    currentHp: hp,
    maxHp: hp,
    attack: atk,
    defense: def,
    type: PetType.Normal,
    moves,
    statusEffects: [],
  };
}
