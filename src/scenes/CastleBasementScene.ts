import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { AudioManager } from '../audio/AudioManager';
import { GameState } from '../state/GameState';
import { Toast } from '../ui/Toast';
import {
  areAllBasementTrainersDefeated,
  areBothZoneBossesDefeated,
} from '../battle/bossUtils';
import { initSceneMultiplayer, tickSceneMultiplayer, cleanupSceneMultiplayer } from '../multiplayer/sceneMultiplayer';
import type { RoomId } from './CastleRoomScene';

const MAP_W = 40;
const MAP_H = 23;

// South stairwell back up to the Castle hall
const STAIR_COL_START = 19;
const STAIR_COL_END = 20;

interface Door {
  colStart: number;
  colEnd: number;
  roomId: RoomId;
  label: string;
  /** Returns a message when the door is locked, or null when it is open. */
  lockedReason: () => string | null;
  /** Boss id whose defeat marks the room as cleared (for the label). */
  bossId: string;
}

const isDefeated = (bossId: string): boolean =>
  GameState.getInstance().getFlag(`boss-defeated-${bossId}`);

const DOORS: Door[] = [
  {
    colStart: 5, colEnd: 6, roomId: 'basement-1', label: 'Four Elements', bossId: 'basement-1',
    lockedReason: () => null,
  },
  {
    colStart: 14, colEnd: 15, roomId: 'basement-2', label: 'Light Chamber', bossId: 'basement-2',
    lockedReason: () => (isDefeated('basement-1') ? null : 'Defeat the Warden of the Four first.'),
  },
  {
    colStart: 24, colEnd: 25, roomId: 'basement-3', label: 'Shadow Chamber', bossId: 'basement-3',
    lockedReason: () => (isDefeated('basement-2') ? null : 'Defeat Lumina the Radiant first.'),
  },
  {
    colStart: 33, colEnd: 35, roomId: 'sanctum', label: 'Sealed Gate', bossId: 'twilight-sovereign',
    lockedReason: () => (areBothZoneBossesDefeated()
      ? null
      : 'The gate is sealed. Defeat the bosses of both the Light and Shadow zones.'),
  },
];

interface Portal {
  x: number;
  y: number;
  color: number;
  label: string;
  target: string;
}

export class CastleBasementScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private transitioning = false;
  private toastCooldownUntil = 0;

  constructor() {
    super({ key: 'CastleBasementScene' });
  }

  create(): void {
    this.transitioning = false;
    this.toastCooldownUntil = 0;

    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');

    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.walls = this.physics.add.staticGroup();

    this.drawFloor();
    this.drawWalls();

    // Trainer doors and the sealed gate (overlaps registered once the player exists)
    const doorZones: { zone: Phaser.GameObjects.Zone; door: Door }[] = [];
    for (const door of DOORS) {
      const widthTiles = door.colEnd - door.colStart + 1;
      const zoneX = ((door.colStart + door.colEnd) / 2 + 0.5) * TILE_SIZE;
      const zone = this.add.zone(zoneX, 8, widthTiles * TILE_SIZE, 24);
      this.physics.add.existing(zone, true);
      (zone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      doorZones.push({ zone, door });

      for (let c = door.colStart; c <= door.colEnd; c++) {
        this.add.image(c * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2, 'tile-door').setDepth(5);
      }
      const locked = door.lockedReason() !== null;
      const cleared = isDefeated(door.bossId);
      const status = cleared ? ' (cleared)' : locked ? ' (locked)' : '';
      this.add.text(zoneX, TILE_SIZE + 4, `↑ ${door.label}${status}`, {
        fontSize: '12px', fontFamily: 'Arial',
        color: locked ? '#888888' : cleared ? '#4caf50' : '#ffd700',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(10);
    }

    // Portals to the Light and Shadow zones
    const open = areAllBasementTrainersDefeated();
    const portals: Portal[] = [
      { x: 10 * TILE_SIZE, y: 12 * TILE_SIZE, color: 0xfff176, label: 'Sunlit Meadows', target: 'SunlitMeadowsScene' },
      { x: 29 * TILE_SIZE, y: 12 * TILE_SIZE, color: 0x9575cd, label: 'Gloomhollow', target: 'GloomhollowScene' },
    ];
    const portalZones: { zone: Phaser.GameObjects.Zone; portal: Portal }[] = [];
    for (const portal of portals) {
      const ring = this.add.ellipse(portal.x, portal.y, 76, 96, portal.color, open ? 0.35 : 0.08)
        .setStrokeStyle(4, open ? portal.color : 0x555555).setDepth(4);
      if (open) {
        this.tweens.add({
          targets: ring, scaleX: 1.12, scaleY: 1.08, alpha: 0.7,
          duration: 900, yoyo: true, repeat: -1,
        });
      }
      this.add.text(portal.x, portal.y + 62, open ? portal.label : `${portal.label} (sealed)`, {
        fontSize: '13px', fontFamily: 'Arial', color: open ? '#ffd700' : '#888888',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(10);

      const zone = this.add.zone(portal.x, portal.y, 56, 80);
      this.physics.add.existing(zone, true);
      (zone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      portalZones.push({ zone, portal });
    }

    // Stairs back up
    const exitX = ((STAIR_COL_START + STAIR_COL_END) / 2 + 0.5) * TILE_SIZE;
    const exitZone = this.add.zone(exitX, worldH - 8, 3 * TILE_SIZE, 24);
    this.physics.add.existing(exitZone, true);
    (exitZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.add.text(exitX, worldH - TILE_SIZE - 4, '↓ Castle Hall', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(worldW / 2, TILE_SIZE + 26, 'Castle Basement', {
      fontSize: '22px', fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#c9b6ff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);

    this.player = new Player(this, exitX, worldH - 80);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, this.walls);

    for (const { zone, door } of doorZones) {
      this.physics.add.overlap(this.player, zone, () => {
        if (this.transitioning) return;
        const reason = door.lockedReason();
        if (reason) {
          this.notify(reason);
          return;
        }
        this.changeScene(() => this.scene.start('CastleRoomScene', { roomId: door.roomId }));
      });
    }

    for (const { zone, portal } of portalZones) {
      this.physics.add.overlap(this.player, zone, () => {
        if (this.transitioning) return;
        if (!areAllBasementTrainersDefeated()) {
          this.notify('The portal is sealed. Defeat all three basement trainers.');
          return;
        }
        this.changeScene(() => this.scene.start(portal.target));
      });
    }

    this.physics.add.overlap(this.player, exitZone, () => {
      if (this.transitioning) return;
      this.changeScene(() => this.scene.start('CastleOfMastersScene'));
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    GameState.getInstance().setCurrentScene('CastleBasementScene');
    this.scene.launch('UIScene');

    initSceneMultiplayer(this);
    this.events.once('shutdown', () => cleanupSceneMultiplayer(this));
  }

  update(): void {
    this.player.update();
    tickSceneMultiplayer(this, this.player);
  }

  /** Show a toast at most once every 2 seconds so standing in a doorway doesn't spam. */
  private notify(message: string): void {
    const now = this.time.now;
    if (now < this.toastCooldownUntil) return;
    this.toastCooldownUntil = now + 2000;
    Toast.show(this, message);
  }

  private changeScene(start: () => void): void {
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UIScene');
      start();
    });
  }

  private drawFloor(): void {
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const key = (r + c) % 2 === 0 ? 'tile-stone' : 'tile-stone-dark';
        this.add.image(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, key)
          .setTint(0x8a86a8);
      }
    }
  }

  private drawWalls(): void {
    const addWall = (c: number, r: number) => {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = r * TILE_SIZE + TILE_SIZE / 2;
      this.add.image(x, y, 'tile-stone-dark').setTint(0x6a6688);
      this.walls.add(
        this.physics.add.staticImage(x, y, 'tile-stone-dark')
          .setSize(TILE_SIZE, TILE_SIZE).refreshBody(),
      );
    };

    for (let c = 0; c < MAP_W; c++) {
      const isDoor = DOORS.some(d => c >= d.colStart && c <= d.colEnd);
      if (!isDoor) addWall(c, 0);
    }
    for (let c = 0; c < MAP_W; c++) {
      if (c < STAIR_COL_START || c > STAIR_COL_END) addWall(c, MAP_H - 1);
    }
    for (let r = 1; r < MAP_H - 1; r++) {
      addWall(0, r);
      addWall(MAP_W - 1, r);
    }
    for (let c = STAIR_COL_START; c <= STAIR_COL_END; c++) {
      this.add.image(c * TILE_SIZE + TILE_SIZE / 2, (MAP_H - 1) * TILE_SIZE + TILE_SIZE / 2, 'tile-door');
    }
  }
}
