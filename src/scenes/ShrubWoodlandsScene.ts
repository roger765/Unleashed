import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { WildPet } from '../entities/WildPet';
import { GameState } from '../state/GameState';
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
import { Toast } from '../ui/Toast';

const MAP_W = 52;
const MAP_H = 42;

/** Nature + wood pets — primary grind for this zone. */
const SHRUB_WOOD_PETS = ['twig', 'bark', 'cedar', 'willow', 'ironwood'];
const SHRUB_NATURE_PETS = ['leaf', 'sprout', 'fern', 'blossom', 'flora'];
const SHRUB_SPAWN_POOL = [...SHRUB_WOOD_PETS, ...SHRUB_NATURE_PETS];

export class ShrubWoodlandsScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private zoneBossNpc: NPC | null = null;
  private zoneBossDialogBlocking = false;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  /** Throttle toast when shrub exits are locked. */
  private shrubExitWarnAt = 0;

  constructor() {
    super({ key: 'ShrubWoodlandsScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Denser shrub feel: more dark grass, smaller clearings
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const px = x * TILE_SIZE + 16;
        const py = y * TILE_SIZE + 16;
        const n = (x * 13 + y * 7) % 10;
        const tileKey = n < 4 ? 'tile-grass-dark' : n < 7 ? 'tile-grass' : 'tile-grass-dark';
        this.add.image(px, py, tileKey);
      }
    }

    this.walls = this.physics.add.staticGroup();
    for (let i = 0; i < 55; i++) {
      const tx = randomInt(3, MAP_W - 4) * TILE_SIZE + 16;
      const ty = randomInt(3, MAP_H - 4) * TILE_SIZE + 16;
      const tree = this.walls.create(tx, ty, 'tile-tree');
      tree.setDepth(3);
    }

    let transitioning = false;
    const fadeToScene = (target: string, stopUI = false, data?: { entry?: 'west' | 'east' }) => {
      if (transitioning) return;
      transitioning = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (stopUI) this.scene.stop('UIScene');
        this.scene.start(target, data);
      });
    };

    // West → Deep Forest (back toward town)
    const exitWest = this.add.zone(16, worldH / 2, 32, 160);
    this.physics.add.existing(exitWest, true);
    this.add.text(36, worldH / 2 - 20, '← Deep Forest', {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffd700',
    }).setDepth(10);

    // North → Stony Mountains (rock pets)
    const exitNorth = this.add.zone(worldW / 2, 16, 160, 32);
    this.physics.add.existing(exitNorth, true);
    this.add.text(worldW / 2, 28, '↑ Stony Mountains', {
      fontSize: '11px', fontFamily: 'Arial', color: '#b0bec5',
    }).setOrigin(0.5).setDepth(10);

    // South → Aqua Isles (water + nature pets)
    const exitSouth = this.add.zone(worldW / 2, worldH - 16, 160, 32);
    this.physics.add.existing(exitSouth, true);
    this.add.text(worldW / 2, worldH - 36, '↓ Aqua Isles', {
      fontSize: '12px', fontFamily: 'Arial', color: '#4fc3f7',
    }).setOrigin(0.5).setDepth(10);

    this.player = new Player(this, 120, worldH / 2);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, this.walls);

    const gsExit = GameState.getInstance();
    const shrubUnlocked = () => gsExit.getFlag('boss-defeated-grovekeeper');
    const warnShrubLocked = () => {
      const t = this.time.now;
      if (t - this.shrubExitWarnAt > 2800) {
        Toast.show(this, 'Defeat the Grovekeeper before leaving the Shrub Woodlands.');
        this.shrubExitWarnAt = t;
      }
    };

    this.physics.add.overlap(this.player, exitWest, () =>
      fadeToScene('ForestScene', false, { entry: 'east' }),
    );
    this.physics.add.overlap(this.player, exitNorth, () => {
      if (!shrubUnlocked()) {
        warnShrubLocked();
        return;
      }
      fadeToScene('StonyMountainsScene');
    });
    this.physics.add.overlap(this.player, exitSouth, () => {
      if (!shrubUnlocked()) {
        warnShrubLocked();
        return;
      }
      fadeToScene('AquaIslesScene');
    });

    const chestPositions = [
      { x: 12 * TILE_SIZE, y: 14 * TILE_SIZE, id: 'shrub-1', coins: 35, item: { itemId: 'apple', quantity: 2 } },
      { x: 38 * TILE_SIZE, y: 28 * TILE_SIZE, id: 'shrub-2', coins: 45 },
    ];
    for (const cp of chestPositions) {
      const chest = new Chest(this, cp.x, cp.y, cp.id, cp.coins, cp.item);
      this.physics.add.overlap(this.player, chest, () => chest.open());
    }

    for (let i = 0; i < 11; i++) {
      const tid = SHRUB_SPAWN_POOL[randomInt(0, SHRUB_SPAWN_POOL.length - 1)];
      const template = PET_TEMPLATES[tid];
      const px = randomInt(5, MAP_W - 8) * TILE_SIZE;
      const py = randomInt(5, MAP_H - 8) * TILE_SIZE;
      const level = randomInt(3, 11);
      this.wildPets.push(new WildPet(this, px, py, template, level));
    }

    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null;
    this.fightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) ?? null;
    const gsBoss = GameState.getInstance();
    if (!gsBoss.getFlag('boss-defeated-grovekeeper')) {
      this.zoneBossNpc = new NPC(
        this,
        26 * TILE_SIZE,
        21 * TILE_SIZE,
        'npc-quest',
        'shrub-zone-boss',
        () => {
          if (this.zoneBossDialogBlocking) return;
          this.zoneBossDialogBlocking = true;
          const end = () => {
            this.zoneBossDialogBlocking = false;
          };
          const d = new DialogueBox(this);
          d.show('Woodland Warden', [
            'The Grovekeeper commands every root and branch in these shrubs.',
            'Paths beyond this thicket stay sealed until that guardian falls.',
            'Come back and talk whenever you like. Press R near me when you want to fight.',
          ], end);
        },
        'E: talk   R: fight',
      );
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    GameState.getInstance().setCurrentScene('ShrubWoodlandsScene');
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
          this.startGrovekeeperBossBattle();
        }
      } else {
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

  private startBattle(wildPet: WildPet): void {
    wildPet.markDefeated();
    const gs = GameState.getInstance();
    const state = gs.getState();

    const playerTeam = [];
    playerTeam.push(createPlayerCombatant(state.name, state.level, state.equippedWeaponId));
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

    const config: BattleConfig = {
      playerTeam,
      enemyTeam: [createPetCombatant(enemyPet, 'enemy-0')],
      isBoss: false,
      isWild: true,
      returnScene: 'ShrubWoodlandsScene',
    };

    this.scene.start('BattleScene', { battleConfig: config });
  }

  private startGrovekeeperBossBattle(): void {
    const boss = BOSSES.grovekeeper;
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
        returnScene: 'ShrubWoodlandsScene',
      } as BattleConfig,
    });
  }
}
