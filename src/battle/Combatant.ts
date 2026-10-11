import { IBattleCombatant } from '../types/battle';
import { IPetInstance, PetType } from '../types/pet';
import { IPlayerState } from '../types/player';
import { IMove } from '../types/move';
import { MOVES } from '../data/moves';
import { PET_TEMPLATES } from '../data/pets';
import { ITEMS } from '../data/items';
import { getPetMoveSlots } from '../utils/petMoves';
import { GameState } from '../state/GameState';
import { ALL_PET_TYPES } from '../utils/math';

export function createPetCombatant(
  pet: IPetInstance,
  id: string,
  defenseBonus = 0,
  hpBoostPercent = 0,
  resistances: Partial<Record<PetType, number>> = {},
  hpBoostFlat = 0,
): IBattleCombatant {
  const moves: IMove[] = [];
  for (const slot of getPetMoveSlots(pet)) {
    if (pet.level >= slot.level) {
      const move = MOVES[slot.id];
      if (move) moves.push(move);
    }
  }

  const hpMult = 1 + hpBoostPercent / 100;
  const maxHp = Math.floor(pet.maxHp * hpMult) + hpBoostFlat;
  // Damage persists between battles, so carry the pet's remaining HP as a fraction of max.
  const hpFraction = pet.maxHp > 0 ? Math.min(1, Math.max(0, pet.currentHp / pet.maxHp)) : 1;
  const currentHp = pet.currentHp <= 0 ? 0 : Math.max(1, Math.round(maxHp * hpFraction));
  return {
    id,
    name: pet.nickname,
    isPlayer: false,
    pet,
    currentHp,
    maxHp,
    attack: pet.attack,
    defense: pet.defense + defenseBonus,
    type: PET_TEMPLATES[pet.templateId]?.type ?? PetType.Normal,
    moves,
    statusEffects: [],
    resistances,
  };
}

export function createPlayerCombatant(
  name: string,
  level: number,
  equippedWeaponId: string | null,
  defenseBonus = 0,
  hpBoostPercent = 0,
  resistances: Partial<Record<PetType, number>> = {},
  hpBoostFlat = 0,
): IBattleCombatant {
  const baseHp = 100;
  const baseAtk = 10;
  const baseDef = 8;
  const rawHp = Math.floor(baseHp + level * baseHp * 0.1);
  const atk = Math.floor(baseAtk + level * baseAtk * 0.1);
  const def = Math.floor(baseDef + level * baseDef * 0.1);
  const hpMult = 1 + hpBoostPercent / 100;
  const hp = Math.floor(rawHp * hpMult) + hpBoostFlat;

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
    defense: def + defenseBonus,
    type: PetType.Normal,
    moves,
    statusEffects: [],
    resistances,
  };
}

export function buildPlayerTeamFromState(state: IPlayerState): IBattleCombatant[] {
  const gs = GameState.getInstance();
  const defenseBonus = gs.getTotalArmorDefenseBonus();
  const hpBoostPercent = gs.getArmorHpBoostPercent();
  const baseResistances = gs.getArmorResistances();

  // Champion set bonus: +300 flat HP and +20% resistance to all damage types
  const championSet = gs.isChampionSetEquipped();
  const hpBoostFlat = championSet ? 300 : 0;
  const resistances = { ...baseResistances };
  if (championSet) {
    for (const type of ALL_PET_TYPES) {
      resistances[type] = Math.min(75, (resistances[type] ?? 0) + 20);
    }
  }

  const team: IBattleCombatant[] = [];
  team.push(createPlayerCombatant(state.name, state.level, state.equippedWeaponId, defenseBonus, hpBoostPercent, resistances, hpBoostFlat));
  for (let i = 0; i < state.team.length; i++) {
    const petCombatant = createPetCombatant(state.team[i], `pet-${i}`, defenseBonus, hpBoostPercent, resistances, hpBoostFlat);
    petCombatant.limitedAA = true;
    team.push(petCombatant);
  }
  return team;
}
