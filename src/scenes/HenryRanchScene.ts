import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { DialogueBox } from '../ui/DialogueBox';
import { GameState } from '../state/GameState';
import { EventBus } from '../state/EventBus';
import { isTouchDevice } from '../utils/mobile';
import { PET_TEMPLATES } from '../data/pets';
import { IPetInstance } from '../types/pet';
import { createPlayerCombatant, createPetCombatant } from '../battle/Combatant';
import { BattleConfig } from '../battle/BattleManager';
import { AudioManager } from '../audio/AudioManager';
import { BOSSES } from '../data/bosses';
import { applyBossSpecialMoves, buildBossEnemyTeam } from '../battle/bossUtils';
import { randomInt } from '../utils/math';

const MAP_W = 36;
const MAP_H = 26;

const BARN_COL = 14;
const BARN_ROW = 2;
const BARN_W = 8;
const BARN_H = 5; // 2 roof rows + 3 wall rows

const PEN_COL = 13;
const PEN_ROW = 8;
const PEN_W = 10;
const PEN_H = 8;

// Gap in south pen fence (gate entrance)
const GATE_COL_START = 17;
const GATE_COL_END = 18;

const HENRY_COL = 18;
const HENRY_ROW = 10;

export class HenryRanchScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private henryNpc: NPC | null = null;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private dialogueBlocking = false;
  private nearNpc = false;
  private transitioning = false;

  constructor() {
    super({ key: 'HenryRanchScene' });
  }

  create(): void {
    this.transitioning = false;
    this.dialogueBlocking = false;
    this.nearNpc = false;

    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');

    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.walls = this.physics.add.staticGroup();

    this.drawGround();
    this.drawBarn();
    this.drawPen();
    this.drawPath();
    this.drawTrees();

    // South exit → Town
    const exitX = worldW / 2;
    const exitZone = this.add.zone(exitX, worldH - 8, 3 * TILE_SIZE, 32);
    this.physics.add.existing(exitZone, true);
    (exitZone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.add.text(exitX, worldH - 40, '↓ Town', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // Player spawns at south center, above exit zone
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
        this.scene.start('TownScene');
      });
    });

    // Award Henry's pets the first time the player returns after beating him
    const gs = GameState.getInstance();
    if (gs.getFlag('boss-defeated-henry') && !gs.getFlag('henry-pets-awarded')) {
      gs.setFlag('henry-pets-awarded', true);
      this.time.delayedCall(700, () => this.awardHenryPets());
    }

    // Henry NPC — only present before defeat
    const henryX = HENRY_COL * TILE_SIZE + TILE_SIZE / 2;
    const henryY = HENRY_ROW * TILE_SIZE + TILE_SIZE / 2;

    if (!gs.getFlag('boss-defeated-henry')) {
      this.henryNpc = new NPC(this, henryX, henryY, 'npc-quest', 'henry',
        () => this.onHenryTalk());
    } else {
      this.add.text(henryX, henryY - 20, 'Henry\n(Retired)', {
        fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa',
        stroke: '#000', strokeThickness: 2, align: 'center',
      }).setOrigin(0.5).setDepth(5);
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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    GameState.getInstance().setCurrentScene('HenryRanchScene');
  }

  update(_time: number, _delta: number): void {
    this.player.update();

    if (this.henryNpc) {
      const near = this.physics.overlap(this.player, this.henryNpc.getZone());
      if (near) {
        this.henryNpc.setInteractHint('E: talk   R: fight');
        this.henryNpc.showPrompt();
        if (!this.dialogueBlocking && this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.henryNpc.interact();
        }
        if (!this.dialogueBlocking && this.fightKey && Phaser.Input.Keyboard.JustDown(this.fightKey)) {
          this.startBossBattle();
        }
        if (!this.nearNpc && isTouchDevice()) {
          EventBus.emit('mobile-action-show', { showE: true, showR: true });
        }
        this.nearNpc = true;
      } else {
        if (this.nearNpc && isTouchDevice()) EventBus.emit('mobile-action-hide');
        this.nearNpc = false;
        this.henryNpc.hidePrompt();
      }
    }
  }

  private onHenryTalk(): void {
    if (this.dialogueBlocking) return;
    this.dialogueBlocking = true;
    const dialogue = new DialogueBox(this);
    dialogue.show('Henry Beast Master', [
      "Welcome to my ranch, stranger.",
      "Mustang, Bullhorn, and Coyote — my three. The finest this side of anywhere.",
      "Think you can take all four of us? Press R when you're ready.",
    ], () => { this.dialogueBlocking = false; });
  }

  private onMobileInteract(): void {
    if (this.henryNpc && !this.dialogueBlocking) this.henryNpc.interact();
  }

  private onMobileFight(): void {
    if (!this.dialogueBlocking) this.startBossBattle();
  }

  private startBossBattle(): void {
    const boss = BOSSES['henry'];
    if (!boss) return;
    const gs = GameState.getInstance();
    const state = gs.getState();

    const playerTeam = [createPlayerCombatant(state.name, state.level, state.equippedWeaponId)];
    for (let i = 0; i < state.team.length; i++) {
      playerTeam.push(createPetCombatant(state.team[i], `pet-${i}`));
    }

    const enemyTeam = buildBossEnemyTeam(boss);
    applyBossSpecialMoves(enemyTeam, boss);

    gs.setFlag('fighting-boss-henry', true);

    const config: BattleConfig = {
      playerTeam,
      enemyTeam,
      isBoss: true,
      isWild: false,
      returnScene: 'HenryRanchScene',
    };

    this.scene.start('BattleScene', { battleConfig: config });
  }

  private awardHenryPets(): void {
    const gs = GameState.getInstance();
    const petsToAward = [
      { id: 'mustang', nickname: 'Mustang' },
      { id: 'bullhorn', nickname: 'Bullhorn' },
      { id: 'coyote', nickname: 'Coyote' },
    ];

    const awarded: string[] = [];
    for (const { id, nickname } of petsToAward) {
      const template = PET_TEMPLATES[id];
      const level = 10;
      const hp = Math.floor(template.baseHp + level * template.baseHp * 0.1);
      const atk = Math.floor(template.baseAttack + level * template.baseAttack * 0.1);
      const def = Math.floor(template.baseDefense + level * template.baseDefense * 0.1);
      const pet: IPetInstance = {
        templateId: id,
        nickname,
        level,
        currentHp: hp,
        maxHp: hp,
        xp: 0,
        attack: atk,
        defense: def,
      };
      const addedToTeam = gs.addPetToTeam(pet);
      if (!addedToTeam) {
        gs.addPetToStorage(pet);
        awarded.push(`${nickname} (storage)`);
      } else {
        awarded.push(nickname);
      }
    }

    const dialogue = new DialogueBox(this);
    dialogue.show('Henry Beast Master', [
      "...You beat all four of us. I'll be damned.",
      "A deal's a deal — they're yours now.",
      `You received: ${awarded.join(', ')}.`,
    ], () => {});
  }

  // ── Terrain helpers ──────────────────────────────────────────────

  private drawGround(): void {
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;
        const inPen = c >= PEN_COL && c < PEN_COL + PEN_W && r >= PEN_ROW && r < PEN_ROW + PEN_H;
        this.add.image(x, y, inPen ? 'tile-dirt' : ((c + r) % 6 === 0 ? 'tile-grass-dark' : 'tile-grass'));
      }
    }
  }

  private drawBarn(): void {
    for (let rr = 0; rr < BARN_H; rr++) {
      for (let cc = 0; cc < BARN_W; cc++) {
        const gc = BARN_COL + cc;
        const gr = BARN_ROW + rr;
        const x = gc * TILE_SIZE + TILE_SIZE / 2;
        const y = gr * TILE_SIZE + TILE_SIZE / 2;
        if (rr < 2) {
          this.add.image(x, y, 'tile-roof-red').setDepth(2);
        } else {
          this.walls.create(x, y, 'tile-wall').setSize(TILE_SIZE, TILE_SIZE).refreshBody().setDepth(2);
        }
      }
    }
    const barnCx = (BARN_COL + BARN_W / 2) * TILE_SIZE;
    this.add.text(barnCx, BARN_ROW * TILE_SIZE - 8, "Henry's Barn", {
      fontSize: '13px', fontFamily: 'Arial', color: '#fff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(10);
  }

  private drawPen(): void {
    const southRow = PEN_ROW + PEN_H - 1;

    // North fence
    for (let c = PEN_COL; c < PEN_COL + PEN_W; c++) {
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = PEN_ROW * TILE_SIZE + TILE_SIZE / 2;
      this.walls.create(x, y, 'tile-wall').setSize(TILE_SIZE, TILE_SIZE).refreshBody();
    }

    // South fence with gate opening
    for (let c = PEN_COL; c < PEN_COL + PEN_W; c++) {
      if (c >= GATE_COL_START && c <= GATE_COL_END) continue;
      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = southRow * TILE_SIZE + TILE_SIZE / 2;
      this.walls.create(x, y, 'tile-wall').setSize(TILE_SIZE, TILE_SIZE).refreshBody();
    }

    // West and east fence (inner rows only)
    for (let r = PEN_ROW + 1; r < southRow; r++) {
      const y = r * TILE_SIZE + TILE_SIZE / 2;
      this.walls.create(PEN_COL * TILE_SIZE + TILE_SIZE / 2, y, 'tile-wall').setSize(TILE_SIZE, TILE_SIZE).refreshBody();
      this.walls.create((PEN_COL + PEN_W - 1) * TILE_SIZE + TILE_SIZE / 2, y, 'tile-wall').setSize(TILE_SIZE, TILE_SIZE).refreshBody();
    }
  }

  private drawPath(): void {
    const pathRowStart = PEN_ROW + PEN_H;
    for (let r = pathRowStart; r < MAP_H; r++) {
      for (let c = GATE_COL_START; c <= GATE_COL_END; c++) {
        const x = c * TILE_SIZE + TILE_SIZE / 2;
        const y = r * TILE_SIZE + TILE_SIZE / 2;
        this.add.image(x, y, 'tile-path').setDepth(1);
      }
    }
  }

  private drawTrees(): void {
    const spots = [
      ...Array.from({ length: 10 }, () => ({ r: 0, c: randomInt(0, MAP_W - 1) })),
      ...Array.from({ length: 8 }, () => ({ r: MAP_H - 1, c: randomInt(0, MAP_W - 1) })),
      ...Array.from({ length: 8 }, () => ({ r: randomInt(0, MAP_H - 1), c: 0 })),
      ...Array.from({ length: 8 }, () => ({ r: randomInt(0, MAP_H - 1), c: MAP_W - 1 })),
      ...Array.from({ length: 12 }, () => ({ r: randomInt(2, MAP_H - 2), c: randomInt(2, MAP_W - 2) })),
    ];

    for (const { r, c } of spots) {
      // Skip barn, pen, and path corridor
      if (c >= BARN_COL && c < BARN_COL + BARN_W && r >= BARN_ROW && r < BARN_ROW + BARN_H) continue;
      if (c >= PEN_COL && c < PEN_COL + PEN_W && r >= PEN_ROW && r < PEN_ROW + PEN_H) continue;
      if (c >= GATE_COL_START && c <= GATE_COL_END && r >= PEN_ROW + PEN_H) continue;

      const x = c * TILE_SIZE + TILE_SIZE / 2;
      const y = r * TILE_SIZE + TILE_SIZE / 2;
      this.walls.create(x, y, 'tile-tree').setDepth(4);
    }
  }
}
