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

const MAP_W = 20;
const MAP_H = 16;

type RoomId = 'boots' | 'chest' | 'helmet';

interface RoomConfig {
  bossId: string;
  bossName: string;
  chestId: string;
  itemId: string;
  itemName: string;
  label: string;
  intro: string[];
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

  constructor() {
    super({ key: 'CastleRoomScene' });
  }

  init(data: { roomId?: RoomId }): void {
    if (data?.roomId) {
      this.roomId = data.roomId;
    } else {
      // Returning from BattleScene — restore room from the flag we set before battle
      const gs = GameState.getInstance();
      if (gs.getFlag('castle-room-chest')) this.roomId = 'chest';
      else if (gs.getFlag('castle-room-helmet')) this.roomId = 'helmet';
      else this.roomId = 'boots';
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

    // Chest — always present; locked until boss defeated
    const chestX = (MAP_W / 2) * TILE_SIZE;
    const chestY = 2 * TILE_SIZE + TILE_SIZE / 2;
    this.chest = new Chest(this, chestX, chestY, this.config.chestId, 0,
      { itemId: this.config.itemId, quantity: 1 });

    // South exit — back to Castle of Masters
    const exitX = worldW / 2;
    const exitZone = this.add.zone(exitX, worldH - 8, 3 * TILE_SIZE, 24);
    this.physics.add.existing(exitZone, true);
    (exitZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.add.text(exitX, worldH - TILE_SIZE - 4, '↓ Castle Hall', {
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
    this.physics.add.overlap(this.player, this.chest, () => {
      if (gs.getFlag(`boss-defeated-${this.config.bossId}`)) {
        this.chest!.open();
      } else {
        Toast.show(this, 'Defeat the guardian first!');
      }
    });

    // Exit overlap
    this.physics.add.overlap(this.player, exitZone, () => {
      if (this.transitioning) return;
      this.transitioning = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('UIScene');
        this.scene.start('CastleOfMastersScene');
      });
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null;
    this.fightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) ?? null;

    GameState.getInstance().setCurrentScene('CastleRoomScene');
    this.scene.launch('UIScene');

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

  private onBossTalk(): void {
    if (this.dialogueBlocking) return;
    this.dialogueBlocking = true;
    const dialogue = new DialogueBox(this);
    dialogue.show(this.config.bossName, this.config.intro, () => {
      this.dialogueBlocking = false;
    });
  }

  private startBossBattle(): void {
    const boss = BOSSES[this.config.bossId];
    if (!boss) return;
    const gs = GameState.getInstance();
    if (gs.getFlag(`boss-defeated-${this.config.bossId}`)) {
      Toast.show(this, 'Guardian already defeated!');
      return;
    }

    const state = gs.getState();
    const playerTeam = buildPlayerTeamFromState(state);
    const enemyTeam = buildBossEnemyTeam(boss);
    applyBossSpecialMoves(enemyTeam, boss);

    gs.setFlag(`fighting-boss-${this.config.bossId}`, true);

    // Persist current room so init() can restore it when BattleScene returns
    gs.setFlag('castle-room-boots',  this.roomId === 'boots');
    gs.setFlag('castle-room-chest',  this.roomId === 'chest');
    gs.setFlag('castle-room-helmet', this.roomId === 'helmet');

    const config: BattleConfig = {
      playerTeam,
      enemyTeam,
      isBoss: true,
      isWild: false,
      returnScene: 'CastleRoomScene',
    };

    this.scene.start('BattleScene', { battleConfig: config });
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
