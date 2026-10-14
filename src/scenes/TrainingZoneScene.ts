import Phaser from 'phaser';
import { TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { DialogueBox } from '../ui/DialogueBox';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { GameState } from '../state/GameState';
import { AudioManager } from '../audio/AudioManager';
import { buildPlayerTeamFromState } from '../battle/Combatant';
import { buildTrainerEnemyTeam } from '../battle/bossUtils';
import { BattleConfig } from '../battle/BattleManager';
import {
  TRAINERS, TRAINING_MODES, ENDURANCE_ROUNDS, ITrainerDefinition, TrainingMode, trainerLevel,
} from '../data/trainers';
import { initSceneMultiplayer, tickSceneMultiplayer, cleanupSceneMultiplayer } from '../multiplayer/sceneMultiplayer';

const MAP_W = 30;
const MAP_H = 16;

// South doorway columns
const DOOR_COL_START = 14;
const DOOR_COL_END = 15;

// Trainer positions (col), weakest on the left, strongest on the right
const TRAINER_COLS = [5, 14.5, 24];

export class TrainingZoneScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private npcs: NPC[] = [];
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private dialogueBlocking = false;
  private modalOpen = false;
  private nearIndex = -1;
  private transitioning = false;
  private modalObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'TrainingZoneScene' });
  }

  create(): void {
    this.npcs = [];
    this.modalObjects = [];
    this.dialogueBlocking = false;
    this.modalOpen = false;
    this.nearIndex = -1;
    this.transitioning = false;

    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');

    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.walls = this.physics.add.staticGroup();

    this.drawFloor();
    this.drawWalls();

    this.add.text(worldW / 2, TILE_SIZE + 6, 'Training Zone', {
      fontSize: '22px', fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);

    const playerLevel = GameState.getInstance().getState().level;
    TRAINERS.forEach((trainer, i) => {
      const x = TRAINER_COLS[i] * TILE_SIZE;
      const y = 6 * TILE_SIZE;
      const npc = new NPC(this, x, y, trainer.texture, trainer.id, () => this.onTalk(trainer));
      this.npcs.push(npc);
      this.add.text(x, y - 72, `${trainer.name}\nLv ${trainerLevel(trainer, playerLevel)}  ·  ${trainer.team.length} pet${trainer.team.length > 1 ? 's' : ''}`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffffff', align: 'center',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10);
    });

    // South exit: back to the Castle hall
    const exitX = worldW / 2;
    const exitZone = this.add.zone(exitX, worldH - 8, 3 * TILE_SIZE, 24);
    this.physics.add.existing(exitZone, true);
    (exitZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.add.text(exitX, worldH - TILE_SIZE - 4, '↓ Castle Hall', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffd700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.player = new Player(this, exitX, worldH - 80);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, this.walls);

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
      if (this.modalOpen) return;
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null;
    this.fightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R) ?? null;

    GameState.getInstance().setCurrentScene('TrainingZoneScene');
    this.scene.launch('UIScene');

    initSceneMultiplayer(this);
    this.events.once('shutdown', () => cleanupSceneMultiplayer(this));
  }

  update(): void {
    this.player.update();
    tickSceneMultiplayer(this, this.player);
    if (this.modalOpen) return;

    let near = -1;
    this.npcs.forEach((npc, i) => {
      if (this.physics.overlap(this.player, npc.getZone())) {
        near = i;
        npc.setInteractHint('E: talk   R: train');
        npc.showPrompt();
      } else {
        npc.hidePrompt();
      }
    });
    this.nearIndex = near;
    if (near < 0 || this.dialogueBlocking) return;

    if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.npcs[near].interact();
    }
    if (this.fightKey && Phaser.Input.Keyboard.JustDown(this.fightKey)) {
      this.openModePicker(TRAINERS[near]);
    }
  }

  private onTalk(trainer: ITrainerDefinition): void {
    if (this.dialogueBlocking) return;
    this.dialogueBlocking = true;
    new DialogueBox(this).show(trainer.name, trainer.intro, () => {
      this.dialogueBlocking = false;
    });
  }

  private openModePicker(trainer: ITrainerDefinition): void {
    this.modalOpen = true;
    this.player.setVelocity(0, 0);
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.modalObjects.push(o);
      return o;
    };

    const overlay = add(this.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.7))
      .setScrollFactor(0).setDepth(950).setInteractive();
    void overlay;
    add(this.add.text(cx, cy - 190, `Train with ${trainer.name}`, {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffd700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(951));

    TRAINING_MODES.forEach((mode, i) => {
      const y = cy - 110 + i * 78;
      const btn = new Button(this, cx, y, mode.label, () => this.startFight(trainer, mode.id),
        { width: 360, height: 44, fontSize: '20px' });
      btn.setScrollFactor(0).setDepth(951);
      add(btn);
      add(this.add.text(cx, y + 30, mode.description, {
        fontSize: '13px', fontFamily: 'Arial', color: '#cfd8dc',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(951));
    });

    const cancel = new Button(this, cx, cy + 190, 'Cancel', () => this.closeModePicker(),
      { width: 180, height: 40, fontSize: '16px', fillColor: 0x7f8c8d });
    cancel.setScrollFactor(0).setDepth(951);
    add(cancel);
  }

  private closeModePicker(): void {
    for (const o of this.modalObjects) o.destroy();
    this.modalObjects = [];
    this.modalOpen = false;
  }

  private startFight(trainer: ITrainerDefinition, mode: TrainingMode): void {
    const gs = GameState.getInstance();
    const state = gs.getState();

    if (mode === 'handicap' && (state.team.length === 0 || state.team[0].currentHp <= 0)) {
      Toast.show(this, 'Handicap needs a healthy lead pet.');
      return;
    }
    if (state.team.length > 0 && state.team.every((p) => p.currentHp <= 0)) {
      Toast.show(this, 'All your pets have fainted. Heal them first.');
      return;
    }

    let playerTeam = buildPlayerTeamFromState(state);
    if (mode === 'handicap') playerTeam = playerTeam.slice(0, 2);

    const config: BattleConfig = {
      playerTeam,
      enemyTeam: buildTrainerEnemyTeam(trainer, state.level),
      isBoss: true,
      isWild: false,
      returnScene: 'TrainingZoneScene',
      training: {
        trainerId: trainer.id,
        mode,
        round: 1,
        totalRounds: mode === 'endurance' ? ENDURANCE_ROUNDS : 1,
        playerLevel: state.level,
        banked: { coins: 0, xp: 0 },
        teamSnapshot: mode === 'sparring' ? JSON.parse(JSON.stringify(state.team)) : undefined,
      },
    };

    this.closeModePicker();
    this.scene.stop('UIScene');
    this.scene.start('BattleScene', { battleConfig: config });
  }

  private drawFloor(): void {
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const key = (r + c) % 2 === 0 ? 'tile-stone' : 'tile-stone-dark';
        this.add.image(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, key);
      }
    }
  }

  private drawWalls(): void {
    const addWall = (c: number, r: number) => {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = r * TILE_SIZE + TILE_SIZE / 2;
      this.add.image(x, y, 'tile-stone-dark');
      this.walls.add(
        this.physics.add.staticImage(x, y, 'tile-stone-dark').setSize(TILE_SIZE, TILE_SIZE).refreshBody(),
      );
    };
    for (let c = 0; c < MAP_W; c++) addWall(c, 0);
    for (let c = 0; c < MAP_W; c++) {
      if (c < DOOR_COL_START || c > DOOR_COL_END) addWall(c, MAP_H - 1);
    }
    for (let r = 1; r < MAP_H - 1; r++) {
      addWall(0, r);
      addWall(MAP_W - 1, r);
    }
    for (let c = DOOR_COL_START; c <= DOOR_COL_END; c++) {
      this.add.image(c * TILE_SIZE + TILE_SIZE / 2, (MAP_H - 1) * TILE_SIZE + TILE_SIZE / 2, 'tile-door');
    }
  }
}
