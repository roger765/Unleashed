import Phaser from 'phaser';
import { TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { Player } from '../entities/Player';
import { AudioManager } from '../audio/AudioManager';
import { GameState } from '../state/GameState';
import { initSceneMultiplayer, tickSceneMultiplayer, cleanupSceneMultiplayer } from '../multiplayer/sceneMultiplayer';

// Fill the screen: 40 cols × 1280px, 23 rows × 736px (16px taller than viewport — negligible scroll)
const MAP_W = Math.floor(SCREEN_WIDTH / TILE_SIZE);   // 40
const MAP_H = Math.ceil(SCREEN_HEIGHT / TILE_SIZE) + 1; // 23

// Pillar pairs (col, topRow) — two aisle columns, four rows deep
const PILLARS: [number, number][] = [
  [6,  3], [6,  9], [6, 15], [6, 19],
  [33, 3], [33, 9], [33, 15], [33, 19],
];

// South doorway columns (centre of 40-col map)
const DOOR_COL_START = 19;
const DOOR_COL_END   = 20;

// North room doorways: evenly spaced for Boots / Chest / Helmet chambers
const NORTH_DOORS = [
  { colStart: 8,  colEnd: 9,  roomId: 'boots'  as const, label: 'Boots Chamber'  },
  { colStart: 19, colEnd: 20, roomId: 'chest'  as const, label: 'Chest Chamber'  },
  { colStart: 30, colEnd: 31, roomId: 'helmet' as const, label: 'Helm Chamber'   },
];

export class CastleOfMastersScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private transitioning = false;

  constructor() {
    super({ key: 'CastleOfMastersScene' });
  }

  create(): void {
    this.transitioning = false;

    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');

    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.walls = this.physics.add.staticGroup();

    this.drawFloor();
    this.drawWalls(worldW, worldH);
    this.drawPillars();
    this.drawDecor(worldW);

    // Create north room entry zones (overlaps registered after player is created)
    const northEntryZones: { zone: Phaser.GameObjects.Zone; roomId: 'boots' | 'chest' | 'helmet' }[] = [];
    for (const door of NORTH_DOORS) {
      const zoneX = ((door.colStart + door.colEnd) / 2 + 0.5) * TILE_SIZE;
      const zoneW = (door.colEnd - door.colStart + 1) * TILE_SIZE;
      const zone = this.add.zone(zoneX, 8, zoneW, 24);
      this.physics.add.existing(zone, true);
      (zone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      northEntryZones.push({ zone, roomId: door.roomId });
    }

    // South exit zone — returns to TownScene
    const exitX = worldW / 2;
    const exitZone = this.add.zone(exitX, worldH - 8, 3 * TILE_SIZE, 24);
    this.physics.add.existing(exitZone, true);
    (exitZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.add.text(exitX, worldH - TILE_SIZE - 4, '↓ Town', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // Player spawns just inside the south entrance
    this.player = new Player(this, exitX, worldH - 80);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, this.walls);

    // Register north room overlaps now that player exists
    for (const { zone, roomId } of northEntryZones) {
      this.physics.add.overlap(this.player, zone, () => {
        if (this.transitioning) return;
        this.transitioning = true;
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.stop('UIScene');
          this.scene.start('CastleRoomScene', { roomId });
        });
      });
    }

    this.physics.add.overlap(this.player, exitZone, () => {
      if (this.transitioning) return;
      this.transitioning = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('UIScene');
        this.scene.start('TownScene');
      });
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    GameState.getInstance().setCurrentScene('CastleOfMastersScene');
    this.scene.launch('UIScene');

    initSceneMultiplayer(this);
    this.events.once('shutdown', () => cleanupSceneMultiplayer(this));
  }

  update(): void {
    this.player.update();
    tickSceneMultiplayer(this, this.player);
  }

  private drawFloor(): void {
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;
        const key = (r + c) % 2 === 0 ? 'tile-stone' : 'tile-stone-dark';
        this.add.image(x, y, key);
      }
    }
  }

  private drawWalls(worldW: number, worldH: number): void {
    const addWall = (c: number, r: number) => {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = r * TILE_SIZE + TILE_SIZE / 2;
      this.add.image(x, y, 'tile-stone-dark');
      this.walls.add(
        this.physics.add.staticImage(x, y, 'tile-stone-dark')
          .setSize(TILE_SIZE, TILE_SIZE).refreshBody(),
      );
    };

    // Top border — leave gaps for the three chamber doors
    for (let c = 0; c < MAP_W; c++) {
      const isNorthDoor = NORTH_DOORS.some(d => c >= d.colStart && c <= d.colEnd);
      if (!isNorthDoor) addWall(c, 0);
    }

    // Bottom border — leave south doorway open
    for (let c = 0; c < MAP_W; c++) {
      if (c < DOOR_COL_START || c > DOOR_COL_END) addWall(c, MAP_H - 1);
    }

    // Left and right borders
    for (let r = 1; r < MAP_H - 1; r++) {
      addWall(0, r);
      addWall(MAP_W - 1, r);
    }
  }

  private drawPillars(): void {
    for (const [c, r] of PILLARS) {
      for (let dr = 0; dr < 2; dr++) {
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = (r + dr) * TILE_SIZE + TILE_SIZE / 2;
        this.add.image(x, y, 'tile-rock');
        this.walls.add(
          this.physics.add.staticImage(x, y, 'tile-rock')
            .setSize(TILE_SIZE, TILE_SIZE).refreshBody(),
        );
      }
    }
  }

  private drawDecor(worldW: number): void {
    // Door tiles in south opening
    for (let c = DOOR_COL_START; c <= DOOR_COL_END; c++) {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = (MAP_H - 1) * TILE_SIZE + TILE_SIZE / 2;
      this.add.image(x, y, 'tile-door');
    }

    // Door tiles and labels for north chamber openings
    for (const door of NORTH_DOORS) {
      for (let c = door.colStart; c <= door.colEnd; c++) {
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = 0 * TILE_SIZE + TILE_SIZE / 2;
        this.add.image(x, y, 'tile-door').setDepth(5);
      }
      const labelX = ((door.colStart + door.colEnd) / 2 + 0.5) * TILE_SIZE;
      this.add.text(labelX, TILE_SIZE + 4, `↑ ${door.label}`, {
        fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(10);
    }

    // Title banner
    this.add.text(worldW / 2, TILE_SIZE + 6, 'Castle of Masters', {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);
  }
}
