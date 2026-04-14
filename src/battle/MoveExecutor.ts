import { IBattleCombatant, IDamageResult } from '../types/battle';
import { IMove } from '../types/move';
import { rollMiss, getTypeEffectiveness, randomInt, clamp } from '../utils/math';

export function executeMove(
  move: IMove,
  attacker: IBattleCombatant,
  targets: IBattleCombatant[],
): IDamageResult[] {
  const results: IDamageResult[] = [];

  for (const target of targets) {
    if (target.currentHp <= 0) continue;

    const missed = rollMiss();
    if (missed) {
      results.push({ targetId: target.id, damage: 0, missed: true, effectiveness: 'normal' });
      continue;
    }

    const multiplier = getTypeEffectiveness(move.type, target.type);
    const baseDamage = move.power + attacker.attack - target.defense;
    const variation = 1 + (randomInt(-10, 10) / 100);
    let damage = Math.floor(baseDamage * multiplier * variation);
    damage = Math.max(1, damage);

    target.currentHp = clamp(target.currentHp - damage, 0, target.maxHp);

    let effectiveness: 'super' | 'normal' | 'weak' = 'normal';
    if (multiplier > 1) effectiveness = 'super';
    else if (multiplier < 1) effectiveness = 'weak';

    results.push({ targetId: target.id, damage, missed: false, effectiveness });
  }

  return results;
}
