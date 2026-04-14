import { IBattleCombatant, IDamageResult } from '../types/battle';
import { IMove, AttackCategory } from '../types/move';
import { executeMove } from './MoveExecutor';
import { getAIDecision, AIDecision } from './BattleAI';
import { xpForDefeating } from '../data/xp-table';
import { randomInt } from '../utils/math';

/**
 * Spirits earned from one wild pet — scales with level and combat stats (stronger = more).
 */
function wildSpiritsPerEnemy(enemy: IBattleCombatant): number {
  const level = enemy.pet?.level ?? 1;
  const maxHp = Math.max(1, enemy.maxHp);
  const atk = Math.max(0, enemy.attack);
  const def = Math.max(0, enemy.defense);
  const strength = level * 2 + Math.floor(maxHp / 20) + Math.floor((atk + def) / 6);
  return Math.max(1, Math.min(12, Math.floor(strength / 6)));
}

export enum BattlePhase {
  SelectAttacker,
  SelectMove,
  SelectTarget,
  Animating,
  EnemyTurn,
  ProcessEffects,
  BattleOver,
}

export interface BattleConfig {
  playerTeam: IBattleCombatant[];
  enemyTeam: IBattleCombatant[];
  isBoss: boolean;
  isWild: boolean;
  returnScene: string;
}

export class BattleManager {
  config: BattleConfig;
  phase: BattlePhase;
  selectedAttackerIndex: number = -1;
  selectedMoveIndex: number = -1;
  turnLog: string[] = [];
  private won = false;

  constructor(config: BattleConfig) {
    this.config = config;
    this.phase = BattlePhase.SelectAttacker;
  }

  // --- Player actions ---

  selectAttacker(index: number): boolean {
    const c = this.config.playerTeam[index];
    if (!c || c.currentHp <= 0) return false;
    this.selectedAttackerIndex = index;
    this.phase = BattlePhase.SelectMove;
    return true;
  }

  selectMove(moveIndex: number): BattlePhase {
    const attacker = this.config.playerTeam[this.selectedAttackerIndex];
    if (!attacker) return this.phase;
    const move = attacker.moves[moveIndex];
    if (!move) return this.phase;
    this.selectedMoveIndex = moveIndex;

    if (move.category === AttackCategory.Direct) {
      this.phase = BattlePhase.SelectTarget;
      return BattlePhase.SelectTarget;
    }
    // Ranged and Chance don't need target selection
    this.phase = BattlePhase.Animating;
    return BattlePhase.Animating;
  }

  selectTarget(_targetIndex: number): void {
    this.phase = BattlePhase.Animating;
  }

  executePlayerMove(move: IMove, targets: IBattleCombatant[]): IDamageResult[] {
    const attacker = this.config.playerTeam[this.selectedAttackerIndex];
    this.turnLog = [];

    this.turnLog.push(`${attacker.name} used ${move.name}!`);
    const results = executeMove(move, attacker, targets);

    for (const r of results) {
      if (r.missed) {
        this.turnLog.push('MISS!');
      } else {
        if (r.effectiveness === 'super') this.turnLog.push("It's super effective!");
        else if (r.effectiveness === 'weak') this.turnLog.push('Not very effective...');
        const target = this.findCombatant(r.targetId);
        this.turnLog.push(`${target?.name ?? 'Target'} took ${r.damage} damage!`);
        if (target && target.currentHp <= 0) {
          this.turnLog.push(`${target.name} was defeated!`);
        }
      }
    }

    return results;
  }

  useItem(itemId: string, targetIndex: number): void {
    // Item usage handled by BattleScene — this just advances the phase
    this.turnLog = [`Used item on ally!`];
    void itemId;
    void targetIndex;
    this.phase = BattlePhase.EnemyTurn;
  }

  executeEnemyTurn(): { decision: AIDecision; results: IDamageResult[] } {
    const decision = getAIDecision(
      this.config.enemyTeam,
      this.config.playerTeam,
      this.config.isBoss,
    );

    const attacker = this.config.enemyTeam[decision.attackerIndex];
    if (!attacker || attacker.currentHp <= 0) {
      return { decision, results: [] };
    }

    const move = attacker.moves[decision.moveIndex];
    if (!move) return { decision, results: [] };

    this.turnLog = [];
    this.turnLog.push(`${attacker.name} used ${move.name}!`);

    let targets: IBattleCombatant[];
    if (move.category === AttackCategory.Ranged) {
      targets = this.config.playerTeam.filter((c) => c.currentHp > 0);
    } else if (move.category === AttackCategory.Chance) {
      const alive = this.config.playerTeam.filter((c) => c.currentHp > 0);
      targets = alive.length > 0 ? [alive[randomInt(0, alive.length - 1)]] : [];
    } else {
      const target = this.config.playerTeam[decision.targetIndex];
      targets = target && target.currentHp > 0 ? [target] : [];
    }

    const results = executeMove(move, attacker, targets);

    for (const r of results) {
      if (r.missed) {
        this.turnLog.push('MISS!');
      } else {
        if (r.effectiveness === 'super') this.turnLog.push("It's super effective!");
        else if (r.effectiveness === 'weak') this.turnLog.push('Not very effective...');
        const target = this.findCombatant(r.targetId);
        this.turnLog.push(`${target?.name ?? 'Target'} took ${r.damage} damage!`);
        if (target && target.currentHp <= 0) {
          this.turnLog.push(`${target.name} was defeated!`);
        }
      }
    }

    return { decision, results };
  }

  processStatusEffects(team: IBattleCombatant[]): void {
    for (const c of team) {
      if (c.currentHp <= 0) continue;
      for (let i = c.statusEffects.length - 1; i >= 0; i--) {
        const eff = c.statusEffects[i];
        if (eff.type === 'healOverTime') {
          c.currentHp = Math.min(c.maxHp, c.currentHp + eff.amountPerTurn);
        }
        eff.turnsRemaining--;
        if (eff.turnsRemaining <= 0) {
          c.statusEffects.splice(i, 1);
        }
      }
    }
  }

  checkBattleEnd(): 'win' | 'lose' | 'ongoing' {
    const playerAlive = this.config.playerTeam.some((c) => c.currentHp > 0);
    const enemyAlive = this.config.enemyTeam.some((c) => c.currentHp > 0);

    if (!enemyAlive) {
      this.won = true;
      this.phase = BattlePhase.BattleOver;
      return 'win';
    }
    if (!playerAlive) {
      this.won = false;
      this.phase = BattlePhase.BattleOver;
      return 'lose';
    }
    return 'ongoing';
  }

  getAlive(team: IBattleCombatant[]): IBattleCombatant[] {
    return team.filter((c) => c.currentHp > 0);
  }

  calculateRewards(): { xpPerPet: number; coins: number; wildSpirits: number } {
    const avgPlayerLevel =
      this.config.playerTeam.reduce((s, c) => s + (c.pet?.level ?? 1), 0) /
      Math.max(1, this.config.playerTeam.length);

    let totalXp = 0;
    let totalCoins = 0;
    let wildSpirits = 0;
    for (const enemy of this.config.enemyTeam) {
      const enemyLevel = enemy.pet?.level ?? 1;
      totalXp += xpForDefeating(enemyLevel, avgPlayerLevel);
      totalCoins += enemyLevel * randomInt(2, 5);
      if (this.config.isWild && !this.config.isBoss) {
        wildSpirits += wildSpiritsPerEnemy(enemy);
      }
    }

    const alivePets = this.config.playerTeam.filter(
      (c) => c.currentHp > 0 && !c.isPlayer,
    ).length;
    const xpPerPet = alivePets > 0 ? Math.floor(totalXp / alivePets) : 0;

    return { xpPerPet, coins: totalCoins, wildSpirits };
  }

  didWin(): boolean {
    return this.won;
  }

  private findCombatant(id: string): IBattleCombatant | undefined {
    return (
      this.config.playerTeam.find((c) => c.id === id) ??
      this.config.enemyTeam.find((c) => c.id === id)
    );
  }
}
