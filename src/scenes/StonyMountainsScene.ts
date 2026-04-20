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

const MAP_W = 40;
const MAP_H = 34;

/** Rock-type pets only — Stony Mountains. */
const MOUNTAIN_ROCK_PETS = ['gravel', 'cobble', 'slate', 'marble', 'obsidian'];

export class StonyMountainsScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private zoneBossNpc: NPC | null = null;
  private zoneBossDialogBlocking = false;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private nearNpc = false;

  constructor() {
    super({ key: 'StonyMountainsScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Craggy highland floor — stone and shadow
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const px = x * TILE_SIZE + 16;
        const py = y * TILE_SIZE + 16;
        const ridge = Math.abs(x - MAP_W * 0.45) + Math.abs(y - MAP_H * 0.35);
        const tileKey =
          (x + y * 11) % 9 === 0 || ridge % 5 === 0 ? 'tile-stone-dark' : 'tile-stone';
        this.add.image(px, py, tileKey);
      }
    }

    const walls = this.physics.add.staticGroup();
    for (let i = 0; i < 38; i++) {
      const tx = randomInt(2, MAP_W - 3) * TILE_SIZE + 16;
      const ty = randomInt(2, MAP_H - 3) * TILE_SIZE + 16;
      walls.create(tx, ty, 'tile-rock').setDepth(3);
    }

    let transitioning = false;
    const fadeBack = () => {
      if (transitioning) return;
      transitioning = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('ShrubWoodlandsScene');
      });
    };

    const exitSouth = this.add.zone(worldW / 2, worldH - 16, 200, 32);
    this.physics.add.existing(exitSouth, true);
    this.add.text(worldW / 2, worldH - 36, '↓ Shrub Woodlands', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
    }).setOrigin(0.5).setDepth(10);

    const savedPos = (() => { const s = GameState.getInstance().getState(); return s.playerPosition && s.currentScene === 'StonyMountainsScene' ? s.playerPosition : null; })();
    this.player = new Player(this, savedPos ? savedPos.x : worldW / 2, savedPos ? savedPos.y : worldH - 90);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, walls);
    this.physics.add.overlap(this.player, exitSouth, fadeBack);

    const mountainChest = new Chest(this, 10 * TILE_SIZE, 12 * TILE_SIZE, 'mountains-1', 70, {
      itemId: 'super-health-potion',
      quantity: 1,
    });
    this.physics.add.overlap(this.player, mountainChest, () => mountainChest.open());

    for (let i = 0; i < 9; i++) {
      const tid = MOUNTAIN_ROCK_PETS[randomInt(0, MOUNTAIN_ROCK_PETS.length - 1)];
      const template = PET_TEMPLATES[tid];
      const px = randomInt(3, MAP_W - 4) * TILE_SIZE;
      const py = randomInt(4, MAP_H - 5) * TILE_SIZE;
      const level = randomInt(6, 16);
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
    if (!gsBoss.getFlag('boss-defeated-cragnar')) {
      this.zoneBossNpc = new NPC(
        this,
        20 * TILE_SIZE,
        14 * TILE_SIZE,
        'npc-quest',
        'mountains-zone-boss',
        () => {
          if (this.zoneBossDialogBlocking) return;
          this.zoneBossDialogBlocking = true;
          const end = () => {
            this.zoneBossDialogBlocking = false;
          };
          const d = new DialogueBox(this);
          d.show('Highland Hermit', [
            'Cragnar wakes when intruders climb too high.',
            'The peak does not forgive weakness — hear that well.',
            'Talk to me anytime. Press R near me when you want to challenge Cragnar.',
          ], end);
        },
        'E: talk   R: fight',
      );
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    GameState.getInstance().setCurrentScene('StonyMountainsScene');
  }

  update(_time: number, delta: number): void {
    this.player.update();
    GameState.getInstance().setPlayerPosition(this.player.x, this.player.y);

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
          this.startCragnarBossBattle();
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
      this.startCragnarBossBattle();
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
      currentHp: hp,
      maxHp: hp,
      xp: 0,
      attack: atk,
      defense: def,
    };

    this.scene.start('BattleScene', {
      battleConfig: {
        playerTeam,
        enemyTeam: [createPetCombatant(enemyPet, 'enemy-0')],
        isBoss: false,
        isWild: true,
        returnScene: 'StonyMountainsScene',
      } as BattleConfig,
    });
  }

  private startCragnarBossBattle(): void {
    const boss = BOSSES.cragnar;
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
        returnScene: 'StonyMountainsScene',
      } as BattleConfig,
    });
  }
}
