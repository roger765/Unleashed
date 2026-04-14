import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { BOSSES } from '../data/bosses';
import { createPlayerCombatant, createPetCombatant } from '../battle/Combatant';
import { BattleConfig } from '../battle/BattleManager';
import { applyBossSpecialMoves, buildBossEnemyTeam } from '../battle/bossUtils';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { AudioManager } from '../audio/AudioManager';

const TOWER_BOSS_ORDER = [
  'boss-tower-1',
  'boss-tower-2',
  'boss-tower-3',
  'boss-tower-4',
  'boss-tower-5',
];

export class BossTowerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossTowerScene' });
  }

  create(): void {
    const gs = GameState.getInstance();

    AudioManager.playMusic('calm');

    // Check if we just returned from a won boss fight
    const state = gs.getState();
    const bossId = TOWER_BOSS_ORDER[state.bossTowerFloor - 1];
    if (bossId && gs.getFlag(`boss-defeated-${bossId}`)) {
      state.bossTowerFloor++;
      gs.autoSave();
    }

    const currentFloor = state.bossTowerFloor;

    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e);

    this.add.text(SCREEN_WIDTH / 2, 40, 'Boss Fight Tower', {
      fontSize: '32px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    this.add.text(SCREEN_WIDTH / 2, 85, `Floor ${currentFloor} / ${TOWER_BOSS_ORDER.length}`, {
      fontSize: '18px', fontFamily: 'Arial', color: '#3498DB',
    }).setOrigin(0.5);

    if (currentFloor > TOWER_BOSS_ORDER.length) {
      // All floors cleared
      this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 30, 'Tower Conquered!', {
        fontSize: '36px', fontFamily: 'Arial Black', color: '#ffd700',
      }).setOrigin(0.5);
      this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20, 'You have defeated all bosses in the tower.', {
        fontSize: '16px', fontFamily: 'Arial', color: '#aaaaaa',
      }).setOrigin(0.5);
    } else {
      const bossId = TOWER_BOSS_ORDER[currentFloor - 1];
      const boss = BOSSES[bossId];

      if (boss) {
        this.add.text(SCREEN_WIDTH / 2, 130, `Boss: ${boss.name}`, {
          fontSize: '24px', fontFamily: 'Arial Black', color: '#E53935',
        }).setOrigin(0.5);

        this.add.text(SCREEN_WIDTH / 2, 165, `Level ${boss.level} — ${boss.team.length} creatures`, {
          fontSize: '16px', fontFamily: 'Arial', color: '#aaaaaa',
        }).setOrigin(0.5);

        // Show boss team preview
        for (let i = 0; i < boss.team.length; i++) {
          const pet = boss.team[i];
          const x = SCREEN_WIDTH / 2 - ((boss.team.length - 1) * 70) / 2 + i * 70;
          this.add.image(x, 230, pet.petTemplateId).setScale(2);
        }

        new Button(this, SCREEN_WIDTH / 2, 310, 'Fight!', () => {
          this.startBossBattle(bossId);
        }, { width: 200, height: 50, fontSize: '20px', fillColor: 0xc0392b });
      }
    }

    new Button(this, SCREEN_WIDTH / 2, SCREEN_HEIGHT - 50, 'Leave Tower', () => {
      this.scene.start('TownScene');
    }, { width: 180, height: 40, fontSize: '14px', fillColor: 0x2c3e50 });
  }

  private startBossBattle(bossId: string): void {
    const boss = BOSSES[bossId];
    if (!boss) return;

    const gs = GameState.getInstance();
    const state = gs.getState();

    // Build player team
    const playerTeam = [createPlayerCombatant(state.name, state.level, state.equippedWeaponId)];
    for (let i = 0; i < state.team.length; i++) {
      playerTeam.push(createPetCombatant(state.team[i], `pet-${i}`));
    }

    const enemyTeam = buildBossEnemyTeam(boss);
    applyBossSpecialMoves(enemyTeam, boss);

    // Mark this as a boss fight return scene
    gs.setFlag(`fighting-boss-${bossId}`, true);

    const config: BattleConfig = {
      playerTeam,
      enemyTeam,
      isBoss: true,
      isWild: false,
      returnScene: 'BossTowerScene',
    };

    // Advance tower floor if we win (tracked on return)
    this.scene.start('BattleScene', { battleConfig: config });
  }
}
