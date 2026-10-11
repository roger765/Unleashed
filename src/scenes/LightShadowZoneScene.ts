import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { initSceneMultiplayer, tickSceneMultiplayer, cleanupSceneMultiplayer } from '../multiplayer/sceneMultiplayer';
import { WildPet } from '../entities/WildPet';
import { GameState } from '../state/GameState';
import { EventBus } from '../state/EventBus';
import { isTouchDevice } from '../utils/mobile';
import { PET_TEMPLATES } from '../data/pets';
import { IPetInstance } from '../types/pet';
import { createPetCombatant, buildPlayerTeamFromState } from '../battle/Combatant';
import { BattleConfig } from '../battle/BattleManager';
import { randomInt, weightedRandom } from '../utils/math';
import { AudioManager } from '../audio/AudioManager';
import { Chest } from '../entities/Chest';
import { NPC } from '../entities/NPC';
import { DialogueBox } from '../ui/DialogueBox';
import { BOSSES } from '../data/bosses';
import { applyBossSpecialMoves, buildBossEnemyTeam } from '../battle/bossUtils';

const MAP_W = 42;
const MAP_H = 28;

export interface ZoneChestConfig {
  id: string;
  tx: number;
  ty: number;
  coins: number;
  item?: { itemId: string; quantity: number };
}

export interface LightShadowZoneConfig {
  key: string;
  title: string;
  /** Floor tile keys; alternates by checkerboard. */
  floorTiles: [string, string];
  floorTint: number;
  /** Texture used for scattered obstacles. */
  obstacleTile: string;
  obstacleTint: number;
  /** Wild pool as [templateId, weight]. */
  wildPool: [string, number][];
  wildCount: number;
  levelMin: number;
  levelMax: number;
  bossId: string;
  bossNpcName: string;
  bossDialogue: string[];
  chests: ZoneChestConfig[];
}

/**
 * Shared implementation of the Light and Shadow zones. Subclasses supply only a config.
 * Players arrive through the Castle basement portals and leave by the portal at the bottom.
 */
export abstract class LightShadowZoneScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private bossNpc: NPC | null = null;
  private bossDialogBlocking = false;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private nearNpc = false;
  private readonly zone: LightShadowZoneConfig;

  protected constructor(zone: LightShadowZoneConfig) {
    super({ key: zone.key });
    this.zone = zone;
  }

  create(): void {
    const z = this.zone;
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    this.bossNpc = null;
    this.bossDialogBlocking = false;
    this.nearNpc = false;

    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tileKey = (x + y) % 2 === 0 ? z.floorTiles[0] : z.floorTiles[1];
        this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, tileKey).setTint(z.floorTint);
      }
    }

    // Scattered obstacles, kept clear of the portal at the bottom centre
    const walls = this.physics.add.staticGroup();
    for (let i = 0; i < 30; i++) {
      const tx = randomInt(2, MAP_W - 3);
      const ty = randomInt(2, MAP_H - 6);
      walls.create(tx * TILE_SIZE + 16, ty * TILE_SIZE + 16, z.obstacleTile)
        .setTint(z.obstacleTint).setDepth(3);
    }

    // Portal back to the Castle basement
    const exitX = worldW / 2;
    const portalGlow = this.add.ellipse(exitX, worldH - 40, 96, 56, 0xffffff, 0.25)
      .setStrokeStyle(3, 0xffffff).setDepth(4);
    this.tweens.add({ targets: portalGlow, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
    const exitZone = this.add.zone(exitX, worldH - 24, 4 * TILE_SIZE, 32);
    this.physics.add.existing(exitZone, true);
    this.add.text(exitX, worldH - 78, '↓ Portal to Castle Basement', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(worldW / 2, 16, z.title, {
      fontSize: '20px', fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(10);

    this.player = new Player(this, exitX, worldH - 110);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, walls);

    this.physics.add.overlap(this.player, exitZone, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop('UIScene');
        this.scene.start('CastleBasementScene');
      });
    });

    for (const c of z.chests) {
      const chest = new Chest(this, c.tx * TILE_SIZE, c.ty * TILE_SIZE, c.id, c.coins, c.item);
      this.physics.add.overlap(this.player, chest, () => chest.open());
    }

    for (let i = 0; i < z.wildCount; i++) {
      const tid = weightedRandom(z.wildPool.map(([value, weight]) => ({ value, weight })));
      const template = PET_TEMPLATES[tid];
      if (!template) continue;
      const px = randomInt(3, MAP_W - 4) * TILE_SIZE;
      const py = randomInt(3, MAP_H - 8) * TILE_SIZE;
      const level = randomInt(z.levelMin, z.levelMax);
      this.wildPets.push(new WildPet(this, px, py, template, level));
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

    const gs = GameState.getInstance();
    if (!gs.getFlag(`boss-defeated-${z.bossId}`)) {
      this.bossNpc = new NPC(
        this,
        (MAP_W / 2) * TILE_SIZE,
        6 * TILE_SIZE,
        'npc-quest',
        `${z.key}-boss`,
        () => {
          if (this.bossDialogBlocking) return;
          this.bossDialogBlocking = true;
          const d = new DialogueBox(this);
          d.show(z.bossNpcName, z.bossDialogue, () => {
            this.bossDialogBlocking = false;
          });
        },
        'E: talk   R: fight',
      );
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    gs.setCurrentScene(z.key);
    initSceneMultiplayer(this);
    this.events.once('shutdown', () => cleanupSceneMultiplayer(this));
  }

  update(_time: number, delta: number): void {
    this.player.update();
    tickSceneMultiplayer(this, this.player);

    if (this.bossNpc) {
      const near = this.physics.overlap(this.player, this.bossNpc.getZone());
      if (near) {
        this.bossNpc.showPrompt();
        if (!this.bossDialogBlocking && this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          this.bossNpc.interact();
        }
        if (!this.bossDialogBlocking && this.fightKey && Phaser.Input.Keyboard.JustDown(this.fightKey)) {
          this.startBossBattle();
        }
        if (!this.nearNpc && isTouchDevice()) {
          EventBus.emit('mobile-action-show', { showE: true, showR: true });
        }
        this.nearNpc = true;
      } else {
        if (this.nearNpc && isTouchDevice()) EventBus.emit('mobile-action-hide');
        this.nearNpc = false;
        this.bossNpc.hidePrompt();
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
    if (this.bossNpc && !this.bossDialogBlocking) this.bossNpc.interact();
  }

  private onMobileFight(): void {
    if (this.bossNpc && !this.bossDialogBlocking) this.startBossBattle();
  }

  private startBattle(wildPet: WildPet): void {
    wildPet.markDefeated();
    const gs = GameState.getInstance();
    const playerTeam = buildPlayerTeamFromState(gs.getState());

    const t = wildPet.petTemplate;
    const lvl = wildPet.petLevel;
    const hp = Math.floor(t.baseHp + lvl * t.baseHp * 0.1);
    const atk = Math.floor(t.baseAttack + lvl * t.baseAttack * 0.1);
    const def = Math.floor(t.baseDefense + lvl * t.baseDefense * 0.1);

    const enemyPet: IPetInstance = {
      templateId: t.id,
      nickname: `Wild ${t.name}`,
      level: lvl,
      currentHp: hp, maxHp: hp, xp: 0, attack: atk, defense: def,
    };

    this.scene.start('BattleScene', {
      battleConfig: {
        playerTeam,
        enemyTeam: [createPetCombatant(enemyPet, 'enemy-0')],
        isBoss: false,
        isWild: true,
        returnScene: this.zone.key,
      } as BattleConfig,
    });
  }

  private startBossBattle(): void {
    const boss = BOSSES[this.zone.bossId];
    if (!boss) return;

    const gs = GameState.getInstance();
    const playerTeam = buildPlayerTeamFromState(gs.getState());
    const enemyTeam = buildBossEnemyTeam(boss);
    applyBossSpecialMoves(enemyTeam, boss);
    gs.setFlag(`fighting-boss-${boss.id}`, true);

    this.scene.start('BattleScene', {
      battleConfig: {
        playerTeam,
        enemyTeam,
        isBoss: true,
        isWild: false,
        returnScene: this.zone.key,
      } as BattleConfig,
    });
  }
}
