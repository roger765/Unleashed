import { IBossDefinition, OVERWORLD_ZONE_BOSS_IDS } from '../data/bosses';
import { MOVES } from '../data/moves';
import { PET_TEMPLATES } from '../data/pets';
import { GameState } from '../state/GameState';
import { IBattleCombatant } from '../types/battle';
import { IPetInstance } from '../types/pet';
import { createPetCombatant } from './Combatant';

/** True when all six overworld zone bosses are defeated (Prism Wilds gate; excludes Boss Tower). */
export function areAllOverworldZoneBossesDefeated(): boolean {
  const gs = GameState.getInstance();
  return OVERWORLD_ZONE_BOSS_IDS.every((bid) => gs.getFlag(`boss-defeated-${bid}`));
}

/** Build scaled boss enemy combatants (same stat formula as tower / Thornguard). */
export function buildBossEnemyTeam(boss: IBossDefinition): IBattleCombatant[] {
  return boss.team.map((entry, i) => {
    const template = PET_TEMPLATES[entry.petTemplateId];
    const level = entry.level;
    const hp = template ? Math.floor(template.baseHp + level * template.baseHp * 0.15) : 100;
    const atk = template ? Math.floor(template.baseAttack + level * template.baseAttack * 0.15) : 15;
    const def = template ? Math.floor(template.baseDefense + level * template.baseDefense * 0.12) : 10;

    const pet: IPetInstance = {
      templateId: entry.petTemplateId,
      nickname: `${boss.name}'s ${template?.name ?? 'Pet'}`,
      level,
      currentHp: hp,
      maxHp: hp,
      xp: 0,
      attack: atk,
      defense: def,
    };
    return createPetCombatant(pet, `boss-pet-${i}`);
  });
}

/** Appends boss special moves to the lead enemy (ace) pet. */
export function applyBossSpecialMoves(team: IBattleCombatant[], boss: IBossDefinition): void {
  if (team.length === 0) return;
  const lead = team[0];
  for (const id of boss.specialMoveIds) {
    const m = MOVES[id];
    if (m && !lead.moves.some((mv) => mv.id === m.id)) {
      lead.moves.push(m);
    }
  }
}
