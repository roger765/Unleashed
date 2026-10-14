import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { Chest } from '../entities/Chest';
import { DialogueBox } from '../ui/DialogueBox';
import { Toast } from '../ui/Toast';
import { GameState } from '../state/GameState';
import { AudioManager } from '../audio/AudioManager';
import { BOSSES } from '../data/bosses';
import { buildPlayerTeamFromState } from '../battle/Combatant';
import { buildBossEnemyTeam, applyBossSpecialMoves } from '../battle/bossUtils';
import { BattleConfig } from '../battle/BattleManager';
import { initSceneMultiplayer, tickSceneMultiplayer, cleanupSceneMultiplayer } from '../multiplayer/sceneMultiplayer';
import { FIRE_ICE_SCALING, ZoneLevelScaling, scaledLevel, scaleBossToLevel } from '../utils/zoneLevels';
import { BossRewards, claimBossRewards } from '../utils/bossRewards';

const MAP_W = 20;
const MAP_H = 16;

export type RoomId =
  | 'boots' | 'chest' | 'helmet'
  | 'basement-1' | 'basement-2' | 'basement-3'
  | 'sanctum' | 'wyrm';

const ROOM_IDS: RoomId[] = [
  'boots', 'chest', 'helmet', 'basement-1', 'basement-2', 'basement-3', 'sanctum', 'wyrm',
];

interface RoomConfig {
  bossId: string;
  bossName: string;
  /** Reward chest. Omit for rooms that only reward coins. */
  chestId?: string;
  itemId?: string;
  itemName?: string;
  label: string;
  intro: string[];
  /** Scene the south exit leads to (defaults to the Castle hall). */
  exitScene?: string;
  exitLabel?: string;
  /** Tint applied to floor and wall tiles. */
  tint?: number;
  /** Boss level follows the player: scaling rules plus the offset from the player's level. */
  scaling?: ZoneLevelScaling;
  bossOffset?: number;
  /** Paid out once, the first time the boss is beaten. */
  rewards?: BossRewards;
}

const ROOM_CONFIGS: Record<RoomId, RoomConfig> = {
  boots: {
    bossId: 'castle-guardian-boots',
    bossName: 'Stone Warden',
    chestId: 'castle-boots',
    itemId: 'champion-boots',
    itemName: 'Champion Boots',
    label: 'Boots Chamber',
    intro: [
      'You dare enter the Boots Chamber?',
      'My stone will crush you before you lay a finger on those greaves.',
      'Press R to challenge me. Prepare yourself.',
    ],
  },
  chest: {
    bossId: 'castle-guardian-chest',
    bossName: 'Grove Sovereign',
    chestId: 'castle-chest',
    itemId: 'champion-chest',
    itemName: 'Champion Chest Plate',
    label: 'Chest Chamber',
    intro: [
      'The Champion Chest Plate is not for the weak.',
      'My grove has stood for a thousand years. You will not pass.',
      'Press R when you are ready to prove yourself.',
    ],
  },
  helmet: {
    bossId: 'castle-guardian-helmet',
    bossName: 'Tide Sovereign',
    chestId: 'castle-helmet',
    itemId: 'champion-helmet',
    itemName: 'Champion Helmet',
    label: 'Helm Chamber',
    intro: [
      'The Champion Helmet crowns only the mightiest.',
      'My tides have drowned legions of challengers.',
      'Press R to face the deep. Your final test.',
    ],
  },
  'basement-1': {
    bossId: 'basement-1',
    bossName: 'Warden of the Four',
    label: 'Chamber of the Four',
    exitScene: 'CastleBasementScene',
    exitLabel: '↓ Basement',
    tint: 0x9aa4b8,
    intro: [
      'Rock, Nature, Wood and Water. I command all four.',
      'The old elements are only the first lock on this door.',
      'Press R to begin.',
    ],
  },
  'basement-2': {
    bossId: 'basement-2',
    bossName: 'Lumina the Radiant',
    label: 'Chamber of Light',
    exitScene: 'CastleBasementScene',
    exitLabel: '↓ Basement',
    tint: 0xfff3b0,
    intro: [
      'Even this deep, the light finds a way in.',
      'My pets burn bright. Shadow alone can dim them.',
      'Press R when your eyes have adjusted.',
    ],
  },
  'basement-3': {
    bossId: 'basement-3',
    bossName: 'Umbra the Veiled',
    label: 'Chamber of Shadow',
    exitScene: 'CastleBasementScene',
    exitLabel: '↓ Basement',
    tint: 0x6a5a9c,
    intro: [
      'You have come far, little light.',
      'My pets thrive where the lamps go out. Light alone can pierce them.',
      'Press R to step into the dark.',
    ],
  },
  sanctum: {
    bossId: 'twilight-sovereign',
    bossName: 'Twilight Sovereign',
    label: 'Eclipse Sanctum',
    exitScene: 'CastleBasementScene',
    exitLabel: '↓ Basement',
    tint: 0x8e7cc3,
    intro: [
      'Sun and shadow, side by side. Few ever bring both here.',
      'I wield every element you have learned, and the two you have mastered.',
      'Press R. This is the last fight.',
    ],
  },
  wyrm: {
    bossId: 'twilight-wyrm',
    bossName: 'Twilight Wyrm',
    label: 'Steam Sanctum',
    exitScene: 'ShrubWoodlandsScene',
    exitLabel: '↓ Back to Shrub Woodlands',
    tint: 0xcfd8dc,
    scaling: FIRE_ICE_SCALING,
    bossOffset: 5,
    rewards: { petTemplateId: 'steamwyrm' },
    intro: [
      'Steam rises where fire and ice collide.',
      'You carry both halves of the key. Both were earned the hard way.',
      'I am fire and frost in one body. Press R. This is the last fight.',
    ],
  },
};

export class CastleRoomScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private bossNpc: NPC | null = null;
  private chest: Chest | null = null;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private dialogueBlocking = false;
  private nearBoss = false;
  private transitioning = false;
  private roomId: RoomId = 'boots';
  private config!: RoomConfig;

  constructor(key = 'CastleRoomScene') {
    super({ key });
  }

  init(data: { roomId?: RoomId }): void {
    if (data?.roomId) {
      this.roomId = data.roomId;
    } else {
      // Returning from BattleScene — restore room from the flag we set before battle
      const gs = GameState.getInstance();
      this.roomId = ROOM_IDS.find((id) => gs.getFlag(`castle-room-${id}`)) ?? 'boots';
    }
    this.config = ROOM_CONFIGS[this.roomId];
  }

  create(): void {
    this.dialogueBlocking = false;
    this.nearBoss = false;
    this.transitioning = false;
    this.bossNpc = null;
    this.chest = null;

    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');

    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.walls = this.physics.add.staticGroup();

    this.drawFloor();
    this.drawWalls(worldW, worldH);

    const gs = GameState.getInstance();
    const bossDefeated = gs.getFlag(`boss-defeated-${this.config.bossId}`);

    // Boss NPC — only present if not yet defeated
    if (!bossDefeated) {
      const bossX = (MAP_W / 2) * TILE_SIZE;
      const bossY = 4 * TILE_SIZE + TILE_SIZE / 2;
      this.bossNpc = new NPC(this, bossX, bossY, 'npc-edward', this.config.bossId,
        () => this.onBossTalk());
    }

    // Chest — locked until boss defeated (rooms without a reward chest skip this)
    if (this.config.chestId && this.config.itemId) {
      const chestX = (MAP_W / 2) * TILE_SIZE;
      const chestY = 2 * TILE_SIZE + TILE_SIZE / 2;
      this.chest = new Chest(this, chestX, chestY, this.config.chestId, 0,
        { itemId: this.config.itemId, quantity: 1 });
    }

    // South exit — back to Castle of Masters
    const exitX = worldW / 2;
    const exitZone = this.add.zone(exitX, worldH - 8, 3 * TILE_SIZE, 24);
    this.physics.add.existing(exitZone, true);
    (exitZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.add.text(exitX, worldH - TILE_SIZE - 4, this.config.exitLabel ?? '↓ Castle Hall', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // Room label
    this.add.text(worldW / 2, TILE_SIZE + 6, this.config.label, {
      fontSize: '20px', fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);

    // Player spawns at south entrance
    this.player = new Player(this, exitX, worldH - 80);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, this.walls);

    // Chest overlap — only opens if boss defeated
    if (this.chest) {
      this.physics.add.overlap(this.player, this.chest, () => {
        if (gs.getFlag(`boss-defeated-${this.config.bossId}`)) {
          this.chest!.open();
        } else {
          Toast.show(this, 'Defeat the guardian first!');
        }
      });
    }

    // Exit overlap
    this.physics.add.overlap(this.player, exitZone, () => {
      if (this.transitioning) return;
      this.transitioning = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('UIScene');
        this.scene.start(this.config.exitScene ?? 'CastleOfMastersScene');
      });
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null;
    this.fightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) ?? null;

    GameState.getInstance().setCurrentScene(this.scene.key);
    this.scene.launch('UIScene');
    this.announceRewards();

    initSceneMultiplayer(this);
    this.events.once('shutdown', () => cleanupSceneMultiplayer(this));
  }

  update(): void {
    this.player.update();
    tickSceneMultiplayer(this, this.player);

    if (this.bossNpc) {
      const near = this.physics.overlap(this.player, this.bossNpc.getZone());
      if (near) {
        this.bossNpc.setInteractHint('E: talk   R: fight');
        this.bossNpc.showPrompt();
        if (!this.dialogueBlocking && this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.bossNpc.interact();
        }
        if (!this.dialogueBlocking && this.fightKey && Phaser.Input.Keyboard.JustDown(this.fightKey)) {
          this.startBossBattle();
        }
        this.nearBoss = true;
      } else {
        if (this.nearBoss) this.bossNpc.hidePrompt();
        this.nearBoss = false;
      }
    }
  }

  /** After a boss win, hands over its first-time rewards and tells the player what they got. */
  private announceRewards(): void {
    if (!this.config.rewards) return;
    const lines = claimBossRewards(this.config.bossId, this.config.rewards);
    if (lines.length === 0) return;
    this.dialogueBlocking = true;
    new DialogueBox(this).show(this.config.bossName, lines, () => {
      this.dialogueBlocking = false;
    });
  }

  private onBossTalk(): void {
    if (this.dialogueBlocking) return;
    this.dialogueBlocking = true;
    const dialogue = new DialogueBox(this);
    dialogue.show(this.config.bossName, this.config.intro, () => {
      this.dialogueBlocking = false;
    });
  }

  private startBossBattle(): void {
    let boss = BOSSES[this.config.bossId];
    if (!boss) return;
    const gs = GameState.getInstance();
    if (gs.getFlag(`boss-defeated-${this.config.bossId}`)) {
      Toast.show(this, 'Guardian already defeated!');
      return;
    }

    const state = gs.getState();
    const { scaling } = this.config;
    if (scaling) {
      boss = scaleBossToLevel(boss, scaledLevel(state.level, this.config.bossOffset ?? 0, scaling), scaling);
    }
    const playerTeam = buildPlayerTeamFromState(state);
    const enemyTeam = buildBossEnemyTeam(boss);
    applyBossSpecialMoves(enemyTeam, boss);

    gs.setFlag(`fighting-boss-${this.config.bossId}`, true);

    // Persist current room so init() can restore it when BattleScene returns
    for (const id of ROOM_IDS) gs.setFlag(`castle-room-${id}`, id === this.roomId);

    const config: BattleConfig = {
      playerTeam,
      enemyTeam,
      isBoss: true,
      isWild: false,
      returnScene: this.scene.key,
    };

    this.scene.start('BattleScene', { battleConfig: config });
  }

  private drawFloor(): void {
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;
        const key = (r + c) % 2 === 0 ? 'tile-stone' : 'tile-stone-dark';
        const tile = this.add.image(x, y, key);
        if (this.config.tint !== undefined) tile.setTint(this.config.tint);
      }
    }
  }

  private drawWalls(worldW: number, worldH: number): void {
    const addWall = (c: number, r: number) => {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = r * TILE_SIZE + TILE_SIZE / 2;
      const wallImg = this.add.image(x, y, 'tile-stone-dark');
      if (this.config.tint !== undefined) wallImg.setTint(this.config.tint);
      this.walls.add(
        this.physics.add.staticImage(x, y, 'tile-stone-dark')
          .setSize(TILE_SIZE, TILE_SIZE).refreshBody(),
      );
    };

    for (let c = 0; c < MAP_W; c++) addWall(c, 0);
    for (let c = 0; c < MAP_W; c++) {
      // South doorway at cols 9-10
      if (c < 9 || c > 10) addWall(c, MAP_H - 1);
    }
    for (let r = 1; r < MAP_H - 1; r++) {
      addWall(0, r);
      addWall(MAP_W - 1, r);
    }

    // Decorative door tiles in south opening
    for (let c = 9; c <= 10; c++) {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = (MAP_H - 1) * TILE_SIZE + TILE_SIZE / 2;
      this.add.image(x, y, 'tile-door');
    }
  }
}
