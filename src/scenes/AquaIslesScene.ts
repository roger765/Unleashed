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
import { Toast } from '../ui/Toast';

const MAP_W = 56;
const MAP_H = 42;

/** Twin isle centers (tile coords). */
const ISLE_A = { tx: 14, ty: 20 };
const ISLE_B = { tx: 42, ty: 22 };

function isleMetric(tx: number, ty: number): number {
  const d1 = Math.hypot(tx - ISLE_A.tx, ty - ISLE_A.ty);
  const d2 = Math.hypot(tx - ISLE_B.tx, ty - ISLE_B.ty);
  return Math.min(d1, d2);
}

/** Light blue (shallow) ribbon along the line between isle centers — not walk-blocking. */
function isInterIsleShallowStrait(tx: number, ty: number): boolean {
  const d = isleMetric(tx, ty);
  if (d < 8.5) return false;

  const px = tx + 0.5;
  const py = ty + 0.5;
  const x1 = ISLE_A.tx;
  const y1 = ISLE_A.ty;
  const x2 = ISLE_B.tx;
  const y2 = ISLE_B.ty;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return false;

  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  if (t < 0.07 || t > 0.93) return false;

  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  const perp = Math.hypot(px - nx, py - ny);
  const halfWidth = 6.2;
  return perp < halfWidth;
}

type Terrain = 'grass' | 'sand' | 'water' | 'deep';

function terrainAt(tx: number, ty: number): Terrain {
  const d = isleMetric(tx, ty);
  if (d < 5) return 'grass';
  if (d < 8.5) return 'sand';
  if (isInterIsleShallowStrait(tx, ty)) return 'water';
  if (d < 11.5) return 'water';
  return 'deep';
}

/** Northern beach of the west isle (tiles closer to ISLE_A than ISLE_B) for the exit zone. */
function getShrubExitAnchorTile(): { tx: number; ty: number } {
  let minTy = MAP_H;
  const xsAtMin: number[] = [];
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const t = terrainAt(tx, ty);
      if (t !== 'grass' && t !== 'sand') continue;
      const dA = Math.hypot(tx - ISLE_A.tx, ty - ISLE_A.ty);
      const dB = Math.hypot(tx - ISLE_B.tx, ty - ISLE_B.ty);
      if (dA > dB) continue;
      if (ty < minTy) {
        minTy = ty;
        xsAtMin.length = 0;
        xsAtMin.push(tx);
      } else if (ty === minTy) {
        xsAtMin.push(tx);
      }
    }
  }
  if (xsAtMin.length === 0) {
    return { tx: ISLE_A.tx, ty: Math.max(0, ISLE_A.ty - 8) };
  }
  const avgTx = xsAtMin.reduce((a, b) => a + b, 0) / xsAtMin.length;
  return { tx: avgTx, ty: minTy };
}

/** Sand on the first isle (closer to A) next to deep or shallow water — boat dock. */
function findBoatDockTile(): { tx: number; ty: number } {
  const closerToA = (tx: number, ty: number) =>
    Math.hypot(tx - ISLE_A.tx, ty - ISLE_A.ty) < Math.hypot(tx - ISLE_B.tx, ty - ISLE_B.ty);

  const findSandTouching = (want: Terrain): { tx: number; ty: number } | null => {
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (terrainAt(tx, ty) !== 'sand' || !closerToA(tx, ty)) continue;
        const dirs = [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ] as const;
        for (const [dx, dy] of dirs) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          if (terrainAt(nx, ny) === want) {
            return { tx, ty };
          }
        }
      }
    }
    return null;
  };

  return findSandTouching('deep') ?? findSandTouching('water') ?? { tx: ISLE_A.tx + 4, ty: ISLE_A.ty };
}

/** Water + nature pets — Aqua Isles. */
const AQUA_WATER = ['wave', 'puddle', 'brook', 'reef', 'tsunami'];
const AQUA_NATURE = ['leaf', 'sprout', 'fern', 'blossom', 'flora'];
const AQUA_SPAWN_POOL = [...AQUA_WATER, ...AQUA_NATURE];

export class AquaIslesScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private zoneBossNpc: NPC | null = null;
  private zoneBossDialogBlocking = false;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private inBoat = false;
  private nearNpc = false;
  private boatAtDock!: Phaser.GameObjects.Image;
  private boatUnderPlayer!: Phaser.GameObjects.Image;
  private boatDockZone!: Phaser.GameObjects.Zone;
  private boatSignText!: Phaser.GameObjects.Text;
  private deepWaterCollider!: Phaser.Physics.Arcade.Collider;
  /** Invisible bodies on dark blue (deep) tiles — disabled while `inBoat` so you can sail them. */
  private aquaDeepWalls!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'AquaIslesScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.aquaDeepWalls = this.physics.add.staticGroup();

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const px = x * TILE_SIZE + 16;
        const py = y * TILE_SIZE + 16;
        const t = terrainAt(x, y);
        let tileKey: string;
        if (t === 'grass') {
          tileKey = (x + y) % 5 === 0 ? 'tile-grass-dark' : 'tile-grass';
        } else if (t === 'sand') {
          tileKey = 'tile-sand';
        } else if (t === 'water') {
          tileKey = 'tile-water';
        } else {
          tileKey = 'tile-water-deep';
          const wall = this.aquaDeepWalls.create(px, py, 'tile-water-deep');
          wall.setAlpha(0);
          wall.refreshBody();
        }
        this.add.image(px, py, tileKey);
      }
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

    const exitTile = getShrubExitAnchorTile();
    const exitWorldX = exitTile.tx * TILE_SIZE + TILE_SIZE / 2;
    // Zone straddles the north beach edge (toward shallow water / Shrub)
    const exitWorldY = exitTile.ty * TILE_SIZE + TILE_SIZE / 4;
    const exitNorth = this.add.zone(exitWorldX, exitWorldY, TILE_SIZE * 4, 28);
    this.physics.add.existing(exitNorth, true);
    this.add.text(exitWorldX, exitWorldY - 26, '↑ Shrub Woodlands', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
    }).setOrigin(0.5).setDepth(10);

    const aquaSave = (() => { const s = GameState.getInstance().getState(); return s.playerPosition && s.currentScene === 'AquaIslesScene' ? s.playerPosition : null; })();
    const spawnX = aquaSave ? aquaSave.x : ISLE_A.tx * TILE_SIZE;
    const spawnY = aquaSave ? aquaSave.y : ISLE_A.ty * TILE_SIZE;
    this.player = new Player(this, spawnX, spawnY);
    this.player.setDepth(8);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.deepWaterCollider = this.physics.add.collider(this.player, this.aquaDeepWalls);
    this.physics.add.overlap(this.player, exitNorth, fadeBack);

    const dock = findBoatDockTile();
    const dockX = dock.tx * TILE_SIZE + TILE_SIZE / 2;
    const dockY = dock.ty * TILE_SIZE + TILE_SIZE / 2;
    this.boatAtDock = this.add
      .image(dockX, dockY + 2, 'sprite-boat')
      .setDepth(5)
      .setScale(1.1);
    this.boatDockZone = this.add.zone(dockX, dockY, 72, 56);
    this.physics.add.existing(this.boatDockZone, true);
    const dockZb = this.boatDockZone.body as Phaser.Physics.Arcade.StaticBody;
    dockZb.updateFromGameObject();
    this.boatSignText = this.add
      .text(dockX, dockY - 36, 'Boat — Press E', {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#fff9c4',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.boatUnderPlayer = this.add
      .image(spawnX, spawnY, 'sprite-boat')
      .setDepth(6)
      .setScale(1.1)
      .setVisible(false);

    const islesChest = new Chest(this, ISLE_B.tx * TILE_SIZE, ISLE_B.ty * TILE_SIZE, 'aqua-isles-1', 60, {
      itemId: 'health-potion',
      quantity: 3,
    });
    this.physics.add.overlap(this.player, islesChest, () => islesChest.open());

    const walkable: { x: number; y: number }[] = [];
    const deepCells: { x: number; y: number }[] = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = terrainAt(x, y);
        if (t === 'grass' || t === 'sand') {
          walkable.push({ x: x * TILE_SIZE, y: y * TILE_SIZE });
        } else if (t === 'deep') {
          deepCells.push({ x: x * TILE_SIZE, y: y * TILE_SIZE });
        }
      }
    }

    const landCount = 8;
    for (let i = 0; i < landCount; i++) {
      const tid = AQUA_SPAWN_POOL[randomInt(0, AQUA_SPAWN_POOL.length - 1)];
      const template = PET_TEMPLATES[tid];
      const cell = walkable[randomInt(0, Math.max(0, walkable.length - 1))];
      const level = randomInt(5, 15);
      this.wildPets.push(new WildPet(this, cell.x + 8, cell.y + 8, template, level));
    }

    const deepCount = Math.min(14, Math.max(0, deepCells.length));
    for (let i = 0; i < deepCount; i++) {
      const tid = AQUA_WATER[randomInt(0, AQUA_WATER.length - 1)];
      const template = PET_TEMPLATES[tid];
      const cell = deepCells[randomInt(0, Math.max(0, deepCells.length - 1))];
      const level = randomInt(6, 16);
      this.wildPets.push(new WildPet(this, cell.x + 8, cell.y + 8, template, level, 100, 48));
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
    if (!gsBoss.getFlag('boss-defeated-tidemother')) {
      this.zoneBossNpc = new NPC(
        this,
        (ISLE_B.tx - 2) * TILE_SIZE,
        ISLE_B.ty * TILE_SIZE,
        'npc-quest',
        'aqua-zone-boss',
        () => {
          if (this.zoneBossDialogBlocking) return;
          this.zoneBossDialogBlocking = true;
          const end = () => {
            this.zoneBossDialogBlocking = false;
          };
          const d = new DialogueBox(this);
          d.show('Tidecaller', [
            'Tidemother rises when the isles grow still.',
            'Cross her tide only if you will not be swept away.',
            'Visit as often as you like. Press R near me when you want to face the Tidemother.',
          ], end);
        },
        'E: talk   R: fight',
      );
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    GameState.getInstance().setCurrentScene('AquaIslesScene');
    this.applyDeepWaterBlocking(true);
  }

  /** When solid, dark blue (deep) tiles block the player; when false, the boat can cross them. */
  private applyDeepWaterBlocking(solid: boolean): void {
    this.aquaDeepWalls.getChildren().forEach((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      const body = sprite.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.enable = solid;
      }
    });
    if (this.deepWaterCollider) {
      this.deepWaterCollider.active = solid;
    }
  }

  update(_time: number, delta: number): void {
    this.player.update();
    GameState.getInstance().setPlayerPosition(this.player.x, this.player.y);

    const ptx = Math.floor(this.player.x / TILE_SIZE);
    const pty = Math.floor(this.player.y / TILE_SIZE);
    const playerTerrain =
      ptx >= 0 && pty >= 0 && ptx < MAP_W && pty < MAP_H ? terrainAt(ptx, pty) : 'grass';

    if (this.inBoat) {
      this.boatUnderPlayer.setVisible(true);
      this.boatUnderPlayer.setPosition(this.player.x, this.player.y + 4);
      this.boatUnderPlayer.setFlipX(this.player.flipX);
    } else {
      this.boatUnderPlayer.setVisible(false);
    }

    if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      if (this.inBoat) {
        if (playerTerrain === 'grass' || playerTerrain === 'sand') {
          this.inBoat = false;
          this.applyDeepWaterBlocking(true);
          this.boatAtDock.setVisible(true);
          this.boatSignText.setVisible(true);
          this.player.stopMoving();
          Toast.show(this, 'You moored the boat.');
        }
      } else if (this.physics.overlap(this.player, this.boatDockZone)) {
        this.inBoat = true;
        this.applyDeepWaterBlocking(false);
        this.boatAtDock.setVisible(false);
        this.boatSignText.setVisible(false);
        this.player.stopMoving();
        Toast.show(this, 'You boarded — you can cross the dark blue sea. Press E on a beach to disembark.');
      }
    }
    this.boatSignText.setVisible(!this.inBoat);

    if (this.zoneBossNpc) {
      const near = this.physics.overlap(this.player, this.zoneBossNpc.getZone());
      if (near) {
        this.zoneBossNpc.showPrompt();
        if (
          !this.zoneBossDialogBlocking &&
          !this.inBoat &&
          this.interactKey &&
          Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
          this.zoneBossNpc.interact();
        }
        if (
          !this.zoneBossDialogBlocking &&
          !this.inBoat &&
          this.fightKey &&
          Phaser.Input.Keyboard.JustDown(this.fightKey)
        ) {
          this.startTidemotherBossBattle();
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
    if (this.zoneBossNpc && !this.zoneBossDialogBlocking && !this.inBoat) {
      this.zoneBossNpc.interact();
    }
  }

  private onMobileFight(): void {
    if (!this.zoneBossDialogBlocking && !this.inBoat) {
      this.startTidemotherBossBattle();
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
        returnScene: 'AquaIslesScene',
      } as BattleConfig,
    });
  }

  private startTidemotherBossBattle(): void {
    const boss = BOSSES.tidemother;
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
        returnScene: 'AquaIslesScene',
      } as BattleConfig,
    });
  }
}
