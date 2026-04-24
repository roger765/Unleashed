import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { GameState } from '../state/GameState';
import { Player } from '../entities/Player';
import { AudioManager } from '../audio/AudioManager';
import { areAllOverworldZoneBossesDefeated } from '../battle/bossUtils';

const MAP_COLS = 40;
const MAP_ROWS = 30;
const MAP_WIDTH = MAP_COLS * TILE_SIZE;
const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

/* Tile legend (internal) */
const T = {
  GRASS: 0,
  GRASS_DARK: 1,
  PATH: 2,
  WALL: 3,
  ROOF_RED: 4,
  ROOF_BLUE: 5,
  DOOR: 6,
  TREE: 7,
} as const;

const TILE_KEY: Record<number, string> = {
  [T.GRASS]: 'tile-grass',
  [T.GRASS_DARK]: 'tile-grass-dark',
  [T.PATH]: 'tile-path',
  [T.WALL]: 'tile-wall',
  [T.ROOF_RED]: 'tile-roof-red',
  [T.ROOF_BLUE]: 'tile-roof-blue',
  [T.DOOR]: 'tile-door',
  [T.TREE]: 'tile-tree',
};

interface BuildingDef {
  label: string;
  col: number;
  row: number;
  w: number;
  h: number;
  roofTile: number;
  doorCol: number; // relative to building col
  doorRow: number; // relative to building row (bottom wall)
  sceneKey: string | null; // null = toast only
}

const BUILDINGS: BuildingDef[] = [
  { label: 'Shop', col: 3, row: 3, w: 6, h: 5, roofTile: T.ROOF_RED, doorCol: 2, doorRow: 4, sceneKey: null },
  { label: 'Quiz Tower', col: 31, row: 3, w: 6, h: 5, roofTile: T.ROOF_BLUE, doorCol: 2, doorRow: 4, sceneKey: null },
  { label: 'Boss Tower', col: 31, row: 22, w: 6, h: 5, roofTile: T.ROOF_RED, doorCol: 2, doorRow: 4, sceneKey: null },
  { label: 'Spin Wheel', col: 3, row: 23, w: 3, h: 3, roofTile: T.ROOF_RED, doorCol: 1, doorRow: 2, sceneKey: null },
];

function townMidRow(): number {
  return Math.floor(MAP_ROWS / 2);
}

/** East-side path cells — Deep Forest (first wild zone) entrance. */
function isDeepForestDoorCell(c: number, r: number): boolean {
  const mr = townMidRow();
  return r === mr && (c === MAP_COLS - 2 || c === MAP_COLS - 1);
}

/** West-side gate — Prism Wilds (unlocked after all registered bosses are defeated). */
function isPrismWildsDoorCell(c: number, r: number): boolean {
  const mr = townMidRow();
  return r === mr && (c === 0 || c === 1);
}

export class TownScene extends Phaser.Scene {
  private player!: Player;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private doorZones: Phaser.GameObjects.Zone[] = [];
  private toastText: Phaser.GameObjects.Text | null = null;
  private forestTransitioning = false;
  private prismGateTransitioning = false;

  constructor() {
    super({ key: 'TownScene' });
  }

  create(): void {
    // Scene instance is reused on restart; reset per-run state or doors stay broken
    // (e.g. forestTransitioning blocked all entries after returning from ForestScene).
    this.forestTransitioning = false;
    this.prismGateTransitioning = false;
    this.doorZones = [];
    this.toastText = null;

    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    const map = this.buildMapArray();
    this.drawMap(map);
    this.createBuildingLabels();
    this.createDeepForestExitLabel();
    this.createPrismWildsGateLabel();

    // Player at center-bottom of town
    const spawnX = (MAP_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = (MAP_ROWS - 4) * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, spawnX, spawnY);

    // Collisions: player vs walls
    this.physics.add.collider(this.player, this.wallGroup);

    // Door overlaps
    for (const zone of this.doorZones) {
      this.physics.add.overlap(this.player, zone, () => {
        const data = zone.getData('building') as string;
        this.handleDoorEntry(data);
      });
    }

    // Click-to-move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      this.player.moveTo(worldX, worldY);
    });

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.player.setCollideWorldBounds(true);

    // Track current scene
    GameState.getInstance().setCurrentScene('TownScene');

    // Launch UI overlay
    this.scene.launch('UIScene');
  }

  update(): void {
    this.player.update();
  }

  /* ------------------------------------------------------------------ */
  /*  Map generation                                                     */
  /* ------------------------------------------------------------------ */

  private buildMapArray(): number[][] {
    // Start with grass, sprinkle dark grass for variety
    const map: number[][] = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      map[r] = [];
      for (let c = 0; c < MAP_COLS; c++) {
        map[r][c] = Math.random() < 0.2 ? T.GRASS_DARK : T.GRASS;
      }
    }

    // Paths: horizontal center road
    const midRow = Math.floor(MAP_ROWS / 2);
    for (let c = 0; c < MAP_COLS; c++) {
      map[midRow][c] = T.PATH;
      map[midRow - 1][c] = T.PATH;
    }
    // Vertical center road
    const midCol = Math.floor(MAP_COLS / 2);
    for (let r = 0; r < MAP_ROWS; r++) {
      map[r][midCol] = T.PATH;
      map[r][midCol - 1] = T.PATH;
    }

    // Cross paths to buildings
    // Top-left (Shop) connector
    for (let c = 5; c < midCol; c++) map[7][c] = T.PATH;
    // Top-right (Quiz Tower) connector
    for (let c = midCol + 1; c < 34; c++) map[7][c] = T.PATH;
    // Bottom-right (Boss Tower) connector
    for (let c = midCol + 1; c < 34; c++) map[25][c] = T.PATH;
    // Bottom-left (Spin Wheel) connector
    for (let c = 4; c < midCol; c++) map[25][c] = T.PATH;

    // Place buildings
    for (const b of BUILDINGS) {
      // Roof (top 2 rows)
      const roofRows = Math.min(2, b.h - 1);
      for (let rr = 0; rr < roofRows; rr++) {
        for (let cc = 0; cc < b.w; cc++) {
          map[b.row + rr][b.col + cc] = b.roofTile;
        }
      }
      // Walls (remaining rows)
      for (let rr = roofRows; rr < b.h; rr++) {
        for (let cc = 0; cc < b.w; cc++) {
          map[b.row + rr][b.col + cc] = T.WALL;
        }
      }
      // Door
      map[b.row + b.doorRow][b.col + b.doorCol] = T.DOOR;
    }

    // Deep Forest exit — path opening on right edge; door tiles on center row
    for (let r = midRow - 2; r <= midRow + 1; r++) {
      map[r][MAP_COLS - 1] = T.PATH;
      map[r][MAP_COLS - 2] = T.PATH;
    }
    map[midRow][MAP_COLS - 2] = T.DOOR;
    map[midRow][MAP_COLS - 1] = T.DOOR;

    // Prism Wilds — west edge (requires all bosses defeated to enter)
    for (let r = midRow - 2; r <= midRow + 1; r++) {
      map[r][0] = T.PATH;
      map[r][1] = T.PATH;
    }
    map[midRow][0] = T.DOOR;
    map[midRow][1] = T.DOOR;

    // Decorative trees around the edges
    const treeSpots = [
      // top edge
      ...Array.from({ length: 12 }, () => [0, Math.floor(Math.random() * MAP_COLS)]),
      ...Array.from({ length: 12 }, () => [1, Math.floor(Math.random() * MAP_COLS)]),
      // bottom edge
      ...Array.from({ length: 10 }, () => [MAP_ROWS - 1, Math.floor(Math.random() * MAP_COLS)]),
      // left edge
      ...Array.from({ length: 8 }, () => [Math.floor(Math.random() * MAP_ROWS), 0]),
      // scattered interior
      ...Array.from({ length: 15 }, () => [
        Math.floor(Math.random() * MAP_ROWS),
        Math.floor(Math.random() * MAP_COLS),
      ]),
    ];
    for (const [r, c] of treeSpots) {
      // Only place tree on grass tiles (don't overwrite paths/buildings)
      if (map[r][c] === T.GRASS || map[r][c] === T.GRASS_DARK) {
        map[r][c] = T.TREE;
      }
    }

    return map;
  }

  private drawMap(map: number[][]): void {
    this.wallGroup = this.physics.add.staticGroup();

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tileId = map[r][c];
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;

        // Always draw grass underneath wall/roof/door/tree tiles
        if (tileId !== T.GRASS && tileId !== T.GRASS_DARK && tileId !== T.PATH) {
          this.add.image(x, y, 'tile-grass');
        }

        const key = TILE_KEY[tileId];
        if (!key) continue;
        const img = this.add.image(x, y, key);

        // Collision for walls, roofs, trees
        if (tileId === T.WALL || tileId === T.ROOF_RED || tileId === T.ROOF_BLUE || tileId === T.TREE) {
          this.wallGroup.add(
            this.physics.add.staticImage(x, y, key).setSize(TILE_SIZE, TILE_SIZE).refreshBody(),
          );
        }

        // Door zones
        if (tileId === T.DOOR) {
          const zone = this.add.zone(x, y, TILE_SIZE, TILE_SIZE);
          this.physics.add.existing(zone, true); // static body
          const zBody = zone.body as Phaser.Physics.Arcade.StaticBody;
          zBody.updateFromGameObject();
          // Figure out which building this door belongs to
          const building = BUILDINGS.find(
            (b) => c === b.col + b.doorCol && r === b.row + b.doorRow,
          );
          if (building) {
            zone.setData('building', building.label);
          } else if (isDeepForestDoorCell(c, r)) {
            zone.setData('building', 'DeepForest');
          } else if (isPrismWildsDoorCell(c, r)) {
            zone.setData('building', 'PrismWilds');
          }
          this.doorZones.push(zone);
        }
      }
    }
  }

  private createBuildingLabels(): void {
    for (const b of BUILDINGS) {
      const cx = (b.col + b.w / 2) * TILE_SIZE;
      const ty = b.row * TILE_SIZE - 12;
      this.add.text(cx, ty, b.label, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 1);
    }
  }

  private createDeepForestExitLabel(): void {
    const mr = townMidRow();
    const xLeft = (MAP_COLS - 2) * TILE_SIZE + TILE_SIZE / 2;
    const xRight = (MAP_COLS - 1) * TILE_SIZE + TILE_SIZE / 2;
    const cx = (xLeft + xRight) / 2;
    const ty = mr * TILE_SIZE - 12;
    this.add.text(cx, ty, 'Deep Forest', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1);
  }

  private createPrismWildsGateLabel(): void {
    const mr = townMidRow();
    const xLeft = TILE_SIZE / 2;
    const xRight = TILE_SIZE + TILE_SIZE / 2;
    const cx = (xLeft + xRight) / 2;
    const ty = mr * TILE_SIZE - 12;
    this.add.text(cx, ty, 'Prism Wilds', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#e1bee7',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1);
  }

  /* ------------------------------------------------------------------ */
  /*  Door entry / toast                                                 */
  /* ------------------------------------------------------------------ */

  private handleDoorEntry(label: string): void {
    // Debounce: only trigger once per second
    if (this.toastText && this.toastText.alpha > 0) return;

    this.player.moveTo(this.player.x, this.player.y); // stop movement

    switch (label) {
      case 'Shop':
        this.scene.stop('UIScene');
        this.scene.start('ShopScene');
        break;
      case 'Quiz Tower':
        this.scene.stop('UIScene');
        this.scene.start('QuizTowerScene');
        break;
      case 'Boss Tower':
        this.scene.stop('UIScene');
        this.scene.start('BossTowerScene');
        break;
      case 'Spin Wheel':
        this.scene.stop('UIScene');
        this.scene.start('SpinWheelScene');
        break;
      case 'DeepForest':
        if (this.forestTransitioning) return;
        this.forestTransitioning = true;
        this.scene.stop('UIScene');
        this.scene.start('ForestScene', { entry: 'west' });
        break;
      case 'PrismWilds':
        if (!areAllOverworldZoneBossesDefeated()) {
          this.showToast('Defeat all six zone bosses first.');
          break;
        }
        if (this.prismGateTransitioning) return;
        this.prismGateTransitioning = true;
        this.scene.stop('UIScene');
        this.scene.start('ConvergenceWildsScene');
        break;
      default:
        this.showToast(`${label ?? 'This area'} coming soon!`);
    }
  }

  private showToast(message: string): void {
    if (this.toastText) {
      this.toastText.destroy();
    }

    const cam = this.cameras.main;
    this.toastText = this.add.text(
      cam.scrollX + cam.width / 2,
      cam.scrollY + 40,
      message,
      {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 16, y: 8 },
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      duration: 500,
      delay: 1500,
      onComplete: () => {
        this.toastText?.destroy();
        this.toastText = null;
      },
    });
  }
}
