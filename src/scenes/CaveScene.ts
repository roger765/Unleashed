import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { WildPet } from '../entities/WildPet';
import { GameState } from '../state/GameState';
import { EventBus } from '../state/EventBus';
import { isTouchDevice } from '../utils/mobile';
import { PET_TEMPLATES } from '../data/pets';
import { IPetInstance } from '../types/pet';
import { createPlayerCombatant, createPetCombatant } from '../battle/Combatant';
import { BattleConfig } from '../battle/BattleManager';
import { randomInt } from '../utils/math';
import { AudioManager } from '../audio/AudioManager';
import { Chest } from '../entities/Chest';
import { NPC } from '../entities/NPC';
import { DialogueBox } from '../ui/DialogueBox';
import { BOSSES } from '../data/bosses';
import { applyBossSpecialMoves, buildBossEnemyTeam } from '../battle/bossUtils';

const MAP_W = 30;
const MAP_H = 25;

export class CaveScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private zoneBossNpc: NPC | null = null;
  private zoneBossDialogBlocking = false;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private nearNpc = false;

  constructor() {
    super({ key: 'CaveScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Stone floor
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tileKey = (x + y) % 5 === 0 ? 'tile-stone-dark' : 'tile-stone';
        this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, tileKey);
      }
    }

    // Rock obstacles
    const walls = this.physics.add.staticGroup();
    for (let i = 0; i < 25; i++) {
      const tx = randomInt(2, MAP_W - 3) * TILE_SIZE + 16;
      const ty = randomInt(2, MAP_H - 3) * TILE_SIZE + 16;
      walls.create(tx, ty, 'tile-rock').setDepth(3);
    }

    // Exit back to forest (bottom edge)
    const exitZone = this.add.zone(worldW / 2, worldH - 16, 128, 32);
    this.physics.add.existing(exitZone, true);
    this.add.text(worldW / 2, worldH - 32, '↓ Back to Forest', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
    }).setOrigin(0.5).setDepth(10);

    // Player
    this.player = new Player(this, worldW / 2, worldH - 80);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, walls);

    this.physics.add.overlap(this.player, exitZone, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('ForestScene');
      });
    });

    // Chests
    const caveChest = new Chest(this, 10 * TILE_SIZE, 8 * TILE_SIZE, 'cave-1', 60, { itemId: 'super-health-potion', quantity: 1 });
    this.physics.add.overlap(this.player, caveChest, () => caveChest.open());

    // Spawn Rock-type pets
    const rockPets = ['gravel', 'cobble', 'slate', 'marble', 'obsidian'];
    for (let i = 0; i < 6; i++) {
      const tid = rockPets[randomInt(0, rockPets.length - 1)];
      const template = PET_TEMPLATES[tid];
      const px = randomInt(3, MAP_W - 4) * TILE_SIZE;
      const py = randomInt(3, MAP_H - 4) * TILE_SIZE;
      const level = randomInt(5, 14);
      this.wildPets.push(new WildPet(this, px, py, template, level));
    }

    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null;
    this.fightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) ?? null;

    if (isTouchDevice()) {
      EventBus.on('mobile-interact', this.onMobileInteract, this);
      EventBus.on('mobile-fight', this.onMobileFight, this);
    }
    this.events.on('shutdown', () => {
      EventBus.off('mobile-interact', this.onMobileInteract, this);
      EventBus.off('mobile-fight', this.onMobileFight, this);
      EventBus.emit('mobile-action-hide');
    });

    const gsBoss = GameState.getInstance();
    if (!gsBoss.getFlag('boss-defeated-deeprock')) {
      this.zoneBossNpc = new NPC(
        this,
        14 * TILE_SIZE,
        10 * TILE_SIZE,
        'npc-quest',
        'cave-zone-boss',
        () => {
          if (this.zoneBossDialogBlocking) return;
          this.zoneBossDialogBlocking = true;
          const end = () => {
            this.zoneBossDialogBlocking = false;
          };
          const d = new DialogueBox(this);
          d.show('Deep Prospector', [
            'Something massive shifts in the lowest vein…',
            'Deeprock will crush anyone who steals its shine.',
            'Talk through this as many times as you need. Press R near me to wake Deeprock.',
          ], end);
        },
        'E: talk   R: fight',
      );
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    GameState.getInstance().setCurrentScene('CaveScene');
  }

  update(_time: number, delta: number): void {
    this.player.update();

    if (this.zoneBossNpc) {
      const near = this.physics.overlap(this.player, this.zoneBossNpc.getZone());
      if (near) {
        this.zoneBossNpc.showPrompt();
        if (
          !this.zoneBossDialogBlocking &&
          this.interactKey &&
          Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
          this.zoneBossNpc.interact();
        }
        if (
          !this.zoneBossDialogBlocking &&
          this.fightKey &&
          Phaser.Input.Keyboard.JustDown(this.fightKey)
        ) {
          this.startDeeprockBossBattle();
        }
        if (!this.nearNpc && isTouchDevice()) {
          EventBus.emit('mobile-action-show', { showE: true, showR: true });
        }
        this.nearNpc = true;
      } else {
        if (this.nearNpc && isTouchDevice()) EventBus.emit('mobile-action-hide');
        this.nearNpc = false;
        this.zoneBossNpc.hidePrompt();
      }
    }

    for (const wp of this.wildPets) {
      if (wp.isDefeated()) continue;
      if (wp.updateAI(this.player.x, this.player.y, delta)) {
        this.startBattle(wp);
        break;
      }
    }
  }

  private onMobileInteract(): void {
    if (this.zoneBossNpc && !this.zoneBossDialogBlocking) {
      this.zoneBossNpc.interact();
    }
  }

  private onMobileFight(): void {
    if (!this.zoneBossDialogBlocking) {
      this.startDeeprockBossBattle();
    }
  }

  private startBattle(wildPet: WildPet): void {
    wildPet.markDefeated();
    const gs = GameState.getInstance();
    const state = gs.getState();

    const playerTeam = [createPlayerCombatant(state.name, state.level, state.equippedWeaponId)];
    for (let i = 0; i < state.team.length; i++) {
      playerTeam.push(createPetCombatant(state.team[i], `pet-${i}`));
    }

    const hp = Math.floor(wildPet.petTemplate.baseHp + wildPet.petLevel * wildPet.petTemplate.baseHp * 0.1);
    const atk = Math.floor(wildPet.petTemplate.baseAttack + wildPet.petLevel * wildPet.petTemplate.baseAttack * 0.1);
    const def = Math.floor(wildPet.petTemplate.baseDefense + wildPet.petLevel * wildPet.petTemplate.baseDefense * 0.1);

    const enemyPet: IPetInstance = {
      templateId: wildPet.petTemplate.id,
      nickname: `Wild ${wildPet.petTemplate.name}`,
      level: wildPet.petLevel,
      currentHp: hp, maxHp: hp, xp: 0, attack: atk, defense: def,
    };

    this.scene.start('BattleScene', {
      battleConfig: {
        playerTeam,
        enemyTeam: [createPetCombatant(enemyPet, 'enemy-0')],
        isBoss: false,
        isWild: true,
        returnScene: 'CaveScene',
      } as BattleConfig,
    });
  }

  private startDeeprockBossBattle(): void {
    const boss = BOSSES.deeprock;
    if (!boss) return;

    const gs = GameState.getInstance();
    const state = gs.getState();
    const playerTeam = [createPlayerCombatant(state.name, state.level, state.equippedWeaponId)];
    for (let i = 0; i < state.team.length; i++) {
      playerTeam.push(createPetCombatant(state.team[i], `pet-${i}`));
    }

    const enemyTeam = buildBossEnemyTeam(boss);
    applyBossSpecialMoves(enemyTeam, boss);
    gs.setFlag(`fighting-boss-${boss.id}`, true);

    this.scene.start('BattleScene', {
      battleConfig: {
        playerTeam,
        enemyTeam,
        isBoss: true,
        isWild: false,
        returnScene: 'CaveScene',
      } as BattleConfig,
    });
  }
}
