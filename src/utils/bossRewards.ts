import { GameState } from '../state/GameState';
import { ITEMS } from '../data/items';
import { PET_TEMPLATES } from '../data/pets';
import { FIRE_ICE_ZONE_BOSS_IDS } from '../data/bosses';
import { LEVEL_CAP } from '../constants';
import { IPetInstance } from '../types/pet';

/** What a boss hands over the first time it is beaten. */
export interface BossRewards {
  /** Move taught by a TM added to the bag. */
  tmMoveId?: string;
  /** Species added to the team (or storage when the team is full), at the player's level. */
  petTemplateId?: string;
  /** Text for the key half, e.g. "the Fire half of the Steam Sanctum key". The key itself is the boss-defeated flag. */
  keyHalf?: string;
}

/** True when both Fire and Ice zone bosses are defeated (opens the Steam Sanctum). */
export function areBothFireIceBossesDefeated(): boolean {
  const gs = GameState.getInstance();
  return FIRE_ICE_ZONE_BOSS_IDS.every((bid) => gs.getFlag(`boss-defeated-${bid}`));
}

/**
 * Pays out a boss's rewards once, after it has been defeated. Returns the dialogue lines that
 * announce them (empty when the boss is still standing or the rewards were already claimed).
 */
export function claimBossRewards(bossId: string, rewards: BossRewards): string[] {
  const gs = GameState.getInstance();
  if (!gs.getFlag(`boss-defeated-${bossId}`) || gs.getFlag(`boss-rewards-claimed-${bossId}`)) return [];
  gs.setFlag(`boss-rewards-claimed-${bossId}`, true);

  const lines: string[] = [];
  if (rewards.keyHalf) lines.push(`You earned ${rewards.keyHalf}.`);

  const tm = rewards.tmMoveId ? ITEMS[`tm-${rewards.tmMoveId}`] : undefined;
  if (tm) {
    gs.addItem(tm.id, 1);
    lines.push(`Prize: ${tm.name}. Teach it to a pet from your bag.`);
  }

  const template = rewards.petTemplateId ? PET_TEMPLATES[rewards.petTemplateId] : undefined;
  if (template) {
    const level = Math.max(1, Math.min(gs.getState().level, LEVEL_CAP));
    const stat = (base: number): number => Math.floor(base + level * base * 0.1);
    const hp = stat(template.baseHp);
    const pet: IPetInstance = {
      templateId: template.id,
      nickname: template.name,
      level,
      currentHp: hp,
      maxHp: hp,
      xp: 0,
      attack: stat(template.baseAttack),
      defense: stat(template.baseDefense),
    };
    if (gs.addPetToTeam(pet)) {
      lines.push(`${template.name} joined your team!`);
    } else {
      gs.addPetToStorage(pet);
      lines.push(`${template.name} was sent to storage (your team is full).`);
    }
  }

  return lines;
}
