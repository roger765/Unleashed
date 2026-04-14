import { IBattleCombatant } from '../types/battle';
import { getTypeEffectiveness, randomInt } from '../utils/math';

export interface AIDecision {
  attackerIndex: number;
  moveIndex: number;
  targetIndex: number;
}

export function getAIDecision(
  enemyTeam: IBattleCombatant[],
  playerTeam: IBattleCombatant[],
  isBoss: boolean,
): AIDecision {
  const aliveEnemies = enemyTeam
    .map((c, i) => ({ c, i }))
    .filter((e) => e.c.currentHp > 0);
  const alivePlayers = playerTeam
    .map((c, i) => ({ c, i }))
    .filter((e) => e.c.currentHp > 0);

  if (aliveEnemies.length === 0 || alivePlayers.length === 0) {
    return { attackerIndex: 0, moveIndex: 0, targetIndex: 0 };
  }

  // Pick attacker
  const attacker = aliveEnemies[randomInt(0, aliveEnemies.length - 1)];
  const moves = attacker.c.moves;

  // Pick move
  let moveIndex = 0;
  if (isBoss && Math.random() < 0.7) {
    // Boss: prefer type-advantaged moves against a random player target
    const sampleTarget = alivePlayers[randomInt(0, alivePlayers.length - 1)];
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < moves.length; i++) {
      const eff = getTypeEffectiveness(moves[i].type, sampleTarget.c.type);
      const score = moves[i].power * eff;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    moveIndex = bestIdx;
  } else {
    moveIndex = randomInt(0, moves.length - 1);
  }

  // Pick target
  let targetEntry;
  if (isBoss && Math.random() < 0.7) {
    // Boss: target type-disadvantaged opponent
    let bestTarget = alivePlayers[0];
    let bestEff = 0;
    for (const p of alivePlayers) {
      const eff = getTypeEffectiveness(moves[moveIndex].type, p.c.type);
      if (eff > bestEff) {
        bestEff = eff;
        bestTarget = p;
      }
    }
    targetEntry = bestTarget;
  } else if (Math.random() < 0.5) {
    // Target lowest HP
    let lowest = alivePlayers[0];
    for (const p of alivePlayers) {
      if (p.c.currentHp < lowest.c.currentHp) lowest = p;
    }
    targetEntry = lowest;
  } else {
    targetEntry = alivePlayers[randomInt(0, alivePlayers.length - 1)];
  }

  return {
    attackerIndex: attacker.i,
    moveIndex,
    targetIndex: targetEntry.i,
  };
}
