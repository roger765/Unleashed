import { IBattleCombatant } from '../types/battle';
import { IPetInstance } from '../types/pet';
import { PET_TEMPLATES } from '../data/pets';

export interface CaptureInfo {
  canCapture: boolean;
  petTemplateId: string;
  petLevel: number;
  cost: number;
  petName: string;
}

export function getCaptureInfo(enemyTeam: IBattleCombatant[]): CaptureInfo | null {
  for (const combatant of enemyTeam) {
    if (combatant.pet) {
      const template = PET_TEMPLATES[combatant.pet.templateId];
      if (!template) continue;
      return {
        canCapture: true,
        petTemplateId: combatant.pet.templateId,
        petLevel: combatant.pet.level,
        cost: template.captureCost,
        petName: template.name,
      };
    }
  }
  return null;
}

export function performCapture(info: CaptureInfo): IPetInstance {
  const template = PET_TEMPLATES[info.petTemplateId];
  const level = info.petLevel;
  const hp = template
    ? Math.floor(template.baseHp + level * template.baseHp * 0.1)
    : 50;
  const atk = template
    ? Math.floor(template.baseAttack + level * template.baseAttack * 0.1)
    : 10;
  const def = template
    ? Math.floor(template.baseDefense + level * template.baseDefense * 0.1)
    : 5;

  return {
    templateId: info.petTemplateId,
    nickname: info.petName,
    level,
    currentHp: hp,
    maxHp: hp,
    xp: 0,
    attack: atk,
    defense: def,
  };
}
