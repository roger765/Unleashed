import {
  IBossDefinition,
  OVERWORLD_ZONE_BOSS_IDS,
  CASTLE_MASTER_BOSS_IDS,
  BASEMENT_BOSS_IDS,
  LIGHT_SHADOW_ZONE_BOSS_IDS,
} from '../data/bosses';
import { MOVES } from '../data/moves';
import { ITrainerDefinition, buildTrainerBoss, trainerLevel } from '../data/trainers';
import { PET_TEMPLATES } from '../data/pets';
import { GameState } from '../state/GameState';
import { IBattleCombatant } from '../types/battle';
import { IPetInstance } from '../types/pet';
import { createPetCombatant, createPlayerCombatant } from './Combatant';

/** True when all six overworld zone bosses are defeated (Prism Wilds gate; excludes Boss Tower). */
export function areAllOverworldZoneBossesDefeated(): boolean {
  const gs = GameState.getInstance();
  return OVERWORLD_ZONE_BOSS_IDS.every((bid) => gs.getFlag(`boss-defeated-${bid}`));
}

const allDefeated = (ids: string[]): boolean => {
  const gs = GameState.getInstance();
  return ids.every((bid) => gs.getFlag(`boss-defeated-${bid}`));
};

/** True when all three Castle of Masters guardians are defeated (opens the basement). */
export function areAllCastleMastersDefeated(): boolean {
  return allDefeated(CASTLE_MASTER_BOSS_IDS);
}

/** True when all three basement trainers are defeated (opens the portals). */
export function areAllBasementTrainersDefeated(): boolean {
  return allDefeated(BASEMENT_BOSS_IDS);
}

/** True when both Light and Shadow zone bosses are defeated (opens the Eclipse Sanctum gate). */
export function areBothZoneBossesDefeated(): boolean {
  return allDefeated(LIGHT_SHADOW_ZONE_BOSS_IDS);
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

/**
 * Fresh enemy team for a Training Zone trainer, scaled to the player's level.
 * The trainer fights in person with a staff (like the player), in front of their pets.
 */
export function buildTrainerEnemyTeam(trainer: ITrainerDefinition, playerLevel: number): IBattleCombatant[] {
  const boss = buildTrainerBoss(trainer, playerLevel);
  const pets = buildBossEnemyTeam(boss);
  applyBossSpecialMoves(pets, boss);
  // Four fighters share the screen, so label pets by species rather than "Trainer's Pet"
  for (const c of pets) {
    const speciesName = c.pet ? PET_TEMPLATES[c.pet.templateId]?.name : undefined;
    if (speciesName) c.name = speciesName;
  }

  const level = trainerLevel(trainer, playerLevel);
  const fighter = createPlayerCombatant(trainer.name, level, trainer.weaponId);
  fighter.id = 'trainer';
  fighter.texture = trainer.texture;
  fighter.level = level;
  return [fighter, ...pets];
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
