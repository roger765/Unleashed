import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { WildPet } from '../entities/WildPet';
import { NPC } from '../entities/NPC';
import { DialogueBox } from '../ui/DialogueBox';
import { Toast } from '../ui/Toast';
import { GameState } from '../state/GameState';
import { EventBus } from '../state/EventBus';
import { isTouchDevice } from '../utils/mobile';
import { PET_TEMPLATES } from '../data/pets';
import { IPetInstance, PetType } from '../types/pet';
import { createPlayerCombatant, createPetCombatant } from '../battle/Combatant';
import { BattleConfig } from '../battle/BattleManager';
import { randomInt } from '../utils/math';
import { AudioManager } from '../audio/AudioManager';
import { BOSSES } from '../data/bosses';
import { applyBossSpecialMoves, buildBossEnemyTeam } from '../battle/bossUtils';
import { Chest } from '../entities/Chest';

const MAP_W = 60;
const MAP_H = 50;

export class ForestScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private forestQuestNpc: NPC | null = null;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  /** Prevents E from opening a second dialogue while one is active */
  private forestDialogueBlocking = false;
  /** Throttle toast when east exit to Shrub is locked (Thornguard). */
  private forestExitEastWarnAt = 0;
  private nearNpc = false;

  constructor() {
    super({ key: 'ForestScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    const entry = (this.scene.settings.data as { entry?: 'west' | 'east' } | undefined)?.entry;
    const spawnX = entry === 'east' ? worldW - 96 : 96;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Draw tiles
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const px = x * TILE_SIZE + 16;
        const py = y * TILE_SIZE + 16;
        const tileKey = (x + y) % 7 === 0 ? 'tile-grass-dark' : 'tile-grass';
        this.add.image(px, py, tileKey);
      }
    }

    // Trees as obstacles around edges and scattered
    this.walls = this.physics.add.staticGroup();
    for (let i = 0; i < 80; i++) {
      const tx = randomInt(3, MAP_W - 4) * TILE_SIZE + 16;
      const ty = randomInt(3, MAP_H - 4) * TILE_SIZE + 16;
      const tree = this.walls.create(tx, ty, 'tile-tree');
      tree.setDepth(3);
    }

    // Cave entrance (top-right area)
    const caveX = (MAP_W - 5) * TILE_SIZE;
    const caveY = 5 * TILE_SIZE;
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        this.add.image(caveX + dx * TILE_SIZE + 16, caveY + dy * TILE_SIZE + 16, 'tile-stone-dark');
      }
    }
    this.add.text(caveX + 48, caveY - 10, 'Rocky Cave', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffffff',
      backgroundColor: '#000',
    }).setOrigin(0.5).setDepth(10);

    const caveZone = this.add.zone(caveX + 48, caveY + 48, 64, 64);
    this.physics.add.existing(caveZone, true);

    // Pond entrance (bottom-right area)
    const pondX = (MAP_W - 8) * TILE_SIZE;
    const pondY = (MAP_H - 8) * TILE_SIZE;
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        this.add.image(pondX + dx * TILE_SIZE + 16, pondY + dy * TILE_SIZE + 16, 'tile-water');
      }
    }
    this.add.text(pondX + 64, pondY - 10, 'Forest Pond', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffffff',
      backgroundColor: '#000',
    }).setOrigin(0.5).setDepth(10);

    const pondZone = this.add.zone(pondX + 64, pondY + 64, 96, 96);
    this.physics.add.existing(pondZone, true);

    // West → Town (first zone exit back to hub)
    const exitWest = this.add.zone(16, worldH / 2, 32, 128);
    this.physics.add.existing(exitWest, true);
    this.add.text(32, worldH / 2 - 20, '← Town', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
    }).setDepth(10);

    // East → Shrub Woodlands (wild hub — locked until Thornguard falls)
    const exitEast = this.add.zone(worldW - 16, worldH / 2, 32, 128);
    this.physics.add.existing(exitEast, true);
    this.add.text(worldW - 36, worldH / 2 - 20, 'Shrub Woodlands →', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
    }).setOrigin(1, 0.5).setDepth(10);

    // Player
    this.player = new Player(this, spawnX, worldH / 2);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    this.physics.add.collider(this.player, this.walls);

    // Zone transitions (with fade)
    let transitioning = false;
    const fadeToScene = (target: string, stopUI = false) => {
      if (transitioning) return;
      transitioning = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (stopUI) this.scene.stop('UIScene');
        this.scene.start(target);
      });
    };

    this.physics.add.overlap(this.player, caveZone, () => fadeToScene('CaveScene'));
    this.physics.add.overlap(this.player, pondZone, () => fadeToScene('PondScene'));
    this.physics.add.overlap(this.player, exitWest, () => fadeToScene('TownScene', true));

    const gsForest = GameState.getInstance();
    const shrubReachable = () => gsForest.getFlag('boss-defeated-thornguard');
    const warnForestEastLocked = () => {
      const t = this.time.now;
      if (t - this.forestExitEastWarnAt > 2800) {
        Toast.show(this, 'Defeat Thornguard before entering the Shrub Woodlands.');
        this.forestExitEastWarnAt = t;
      }
    };
    this.physics.add.overlap(this.player, exitEast, () => {
      if (!shrubReachable()) {
        warnForestEastLocked();
        return;
      }
      fadeToScene('ShrubWoodlandsScene');
    });

    // Chests
    const chestPositions = [
      { x: 15 * TILE_SIZE, y: 10 * TILE_SIZE, id: 'forest-1', coins: 30, item: { itemId: 'health-potion', quantity: 2 } },
      { x: 40 * TILE_SIZE, y: 35 * TILE_SIZE, id: 'forest-2', coins: 50 },
      { x: 25 * TILE_SIZE, y: 20 * TILE_SIZE, id: 'forest-3', coins: 40, item: { itemId: 'apple', quantity: 3 } },
    ];
    for (const cp of chestPositions) {
      const chest = new Chest(this, cp.x, cp.y, cp.id, cp.coins, cp.item);
      this.physics.add.overlap(this.player, chest, () => chest.open());
    }

    // Spawn wild Wood + Nature pets
    const woodPets = ['twig', 'bark', 'cedar', 'willow'];
    const naturePets = ['leaf', 'sprout', 'fern', 'blossom'];
    const forestPets = [...woodPets, ...naturePets];

    for (let i = 0; i < 10; i++) {
      const tid = forestPets[randomInt(0, forestPets.length - 1)];
      const template = PET_TEMPLATES[tid];
      const px = randomInt(5, MAP_W - 10) * TILE_SIZE;
      const py = randomInt(5, MAP_H - 10) * TILE_SIZE;
      const level = randomInt(3, 10);
      const wp = new WildPet(this, px, py, template, level);
      this.wildPets.push(wp);
    }

    // Quest NPC for zone boss
    const gs = GameState.getInstance();
    if (!gs.getFlag('boss-defeated-thornguard')) {
      this.forestQuestNpc = new NPC(
        this, MAP_W / 2 * TILE_SIZE, MAP_H / 2 * TILE_SIZE,
        'npc-quest', 'forest-quest',
        () => {
          if (this.forestDialogueBlocking) return;
          this.forestDialogueBlocking = true;
          const endDialogue = () => {
            this.forestDialogueBlocking = false;
          };
          const dialogue = new DialogueBox(this);
          if (gs.getFlag('forest-boss-unlocked')) {
            dialogue.show('Forest Ranger', [
              'The forest guardian Thornguard has appeared!',
              'You are ready to face it. Good luck, wizard!',
              'Come back and talk as much as you like. Press R near me when you want the battle.',
            ], endDialogue);
          } else if (gs.getFlag('forest-quest-accepted')) {
            const wins = gs.getCounter('forest-wins');
            dialogue.show('Forest Ranger', [
              `You've defeated ${wins}/5 wild creatures. ${wins >= 5 ? 'You are ready!' : 'Keep battling!'}`,
            ], endDialogue);
          } else {
            dialogue.show('Forest Ranger', [
              'Greetings, wizard! A powerful guardian lurks in this forest.',
              'Prove your strength by defeating 5 wild creatures here.',
              'Come back to me when you are done!',
            ], () => {
              gs.setFlag('forest-quest-accepted', true);
              Toast.show(this, 'Quest accepted: Defeat 5 wild creatures!');
              endDialogue();
            });
          }
        },
      );
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

    // Click to move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    // Launch UI
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    GameState.getInstance().setCurrentScene('ForestScene');
  }

  update(_time: number, delta: number): void {
    this.player.update();

    if (this.forestQuestNpc) {
      const near = this.physics.overlap(this.player, this.forestQuestNpc.getZone());
      const gsNear = GameState.getInstance();
      if (near) {
        if (gsNear.getFlag('forest-boss-unlocked')) {
          this.forestQuestNpc.setInteractHint('E: talk   R: fight');
        } else {
          this.forestQuestNpc.setInteractHint('Press E');
        }
        this.forestQuestNpc.showPrompt();
        if (
          !this.forestDialogueBlocking &&
          this.interactKey &&
          Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
          this.forestQuestNpc.interact();
        }
        if (
          !this.forestDialogueBlocking &&
          this.fightKey &&
          Phaser.Input.Keyboard.JustDown(this.fightKey) &&
          gsNear.getFlag('forest-boss-unlocked')
        ) {
          this.startBossBattle();
        }
        if (!this.nearNpc && isTouchDevice()) {
          EventBus.emit('mobile-action-show', {
            showE: true,
            showR: gsNear.getFlag('forest-boss-unlocked'),
          });
        }
        this.nearNpc = true;
      } else {
        if (this.nearNpc && isTouchDevice()) EventBus.emit('mobile-action-hide');
        this.nearNpc = false;
        this.forestQuestNpc.hidePrompt();
      }
    }

    for (const wp of this.wildPets) {
      if (wp.isDefeated()) continue;
      const shouldBattle = wp.updateAI(this.player.x, this.player.y, delta);
      if (shouldBattle) {
        this.startBattle(wp);
        break;
      }
    }
  }

  private onMobileInteract(): void {
    if (this.forestQuestNpc && !this.forestDialogueBlocking) {
      this.forestQuestNpc.interact();
    }
  }

  private onMobileFight(): void {
    if (!this.forestDialogueBlocking && GameState.getInstance().getFlag('forest-boss-unlocked')) {
      this.startBossBattle();
    }
  }

  private startBattle(wildPet: WildPet): void {
    wildPet.markDefeated();

    const gs = GameState.getInstance();
    const state = gs.getState();

    // Build player team
    const playerTeam = [];
    playerTeam.push(createPlayerCombatant(state.name, state.level, state.equippedWeaponId));
    for (let i = 0; i < state.team.length; i++) {
      playerTeam.push(createPetCombatant(state.team[i], `pet-${i}`));
    }

    // Build enemy
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
    const enemyCombatant = createPetCombatant(enemyPet, 'enemy-0');

    const config: BattleConfig = {
      playerTeam,
      enemyTeam: [enemyCombatant],
      isBoss: false,
      isWild: true,
      returnScene: 'ForestScene',
    };

    this.scene.start('BattleScene', { battleConfig: config });
  }

  private startBossBattle(): void {
    const boss = BOSSES['thornguard'];
    if (!boss) return;

    const gs = GameState.getInstance();
    const state = gs.getState();

    const playerTeam = [createPlayerCombatant(state.name, state.level, state.equippedWeaponId)];
    for (let i = 0; i < state.team.length; i++) {
      playerTeam.push(createPetCombatant(state.team[i], `pet-${i}`));
    }

    const enemyTeam = buildBossEnemyTeam(boss);
    applyBossSpecialMoves(enemyTeam, boss);

    gs.setFlag('fighting-boss-thornguard', true);

    const config: BattleConfig = {
      playerTeam,
      enemyTeam,
      isBoss: true,
      isWild: false,
      returnScene: 'ForestScene',
    };

    this.scene.start('BattleScene', { battleConfig: config });
  }
}
