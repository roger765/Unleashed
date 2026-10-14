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
import { ZoneLevelScaling, scaledLevel } from '../utils/zoneLevels';

/** Lava hurts the lead pet a little on a timer; ice makes the player slide. */
const LAVA_TICK_MS = 1500;
const LAVA_DAMAGE_PERCENT = 5;

const MAP_W = 42;
const MAP_H = 28;

export interface ZoneChestConfig {
  id: string;
  tx: number;
  ty: number;
  coins: number;
  item?: { itemId: string; quantity: number };
}

export interface ZoneHazard {
  kind: 'lava' | 'ice';
  /** Number of rectangular patches scattered across the map. */
  patches: number;
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
  /** Fixed wild level range. Ignored when `scaling` is set. */
  levelMin?: number;
  levelMax?: number;
  /** Wild and boss levels follow the player's level instead of the fixed range. */
  scaling?: ZoneLevelScaling;
  hazard?: ZoneHazard;
  /** Scene the exit portal leads to (default: the Castle basement). */
  exitScene?: string;
  exitLabel?: string;
  bossId: string;
  bossNpcName: string;
  bossDialogue: string[];
  chests: ZoneChestConfig[];
}

/**
 * Shared implementation of the themed zones (Light, Shadow, Fire, Ice). Subclasses supply only a config.
 * Players leave by the portal at the bottom (back to the Castle basement unless the config says otherwise).
 */
export abstract class LightShadowZoneScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private bossNpc: NPC | null = null;
  private bossDialogBlocking = false;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private nearNpc = false;
  private hazardGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private hazardCells = new Set<string>();
  private nextLavaTick = 0;
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
    this.hazardGroup = null;
    this.hazardCells = new Set();
    this.nextLavaTick = 0;

    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tileKey = (x + y) % 2 === 0 ? z.floorTiles[0] : z.floorTiles[1];
        this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, tileKey).setTint(z.floorTint);
      }
    }

    this.buildHazards();

    // Scattered obstacles, kept clear of the portal at the bottom centre and of hazards
    const walls = this.physics.add.staticGroup();
    for (let i = 0; i < 30; i++) {
      const tx = randomInt(2, MAP_W - 3);
      const ty = randomInt(2, MAP_H - 6);
      if (this.hazardCells.has(`${tx},${ty}`)) continue;
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
    this.add.text(exitX, worldH - 78, z.exitLabel ?? '↓ Portal to Castle Basement', {
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
        this.scene.start(z.exitScene ?? 'CastleBasementScene');
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
      const level = this.wildLevel();
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
    if (BOSSES[z.bossId] && !gs.getFlag(`boss-defeated-${z.bossId}`)) {
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

  update(time: number, delta: number): void {
    this.player.update();
    this.updateHazards(time);
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

  private wildLevel(): number {
    const z = this.zone;
    if (z.scaling) {
      const playerLevel = GameState.getInstance().getState().level;
      return scaledLevel(playerLevel, randomInt(z.scaling.wildMin, z.scaling.wildMax), z.scaling);
    }
    return randomInt(z.levelMin ?? 1, z.levelMax ?? 1);
  }

  /** Tile rectangles hazards must keep clear of: the portal and spawn, the boss, and every chest. */
  private reservedRects(): { x0: number; y0: number; x1: number; y1: number }[] {
    const cx = Math.floor(MAP_W / 2);
    return [
      { x0: cx - 4, y0: MAP_H - 6, x1: cx + 4, y1: MAP_H - 1 },
      { x0: cx - 3, y0: 3, x1: cx + 3, y1: 9 },
      ...this.zone.chests.map((c) => ({ x0: c.tx - 2, y0: c.ty - 2, x1: c.tx + 2, y1: c.ty + 2 })),
    ];
  }

  private buildHazards(): void {
    const hazard = this.zone.hazard;
    if (!hazard) return;
    const texture = hazard.kind === 'lava' ? 'tile-lava' : 'tile-ice';
    const reserved = this.reservedRects();
    const group = this.physics.add.staticGroup();
    let placed = 0;
    for (let attempt = 0; attempt < 300 && placed < hazard.patches; attempt++) {
      const w = randomInt(3, 5);
      const h = randomInt(2, 4);
      const tx = randomInt(2, MAP_W - 2 - w);
      const ty = randomInt(2, MAP_H - 6 - h);
      if (!this.patchFits(tx, ty, w, h, reserved)) continue;
      for (let y = ty; y < ty + h; y++) {
        for (let x = tx; x < tx + w; x++) {
          this.hazardCells.add(`${x},${y}`);
          group.create(x * TILE_SIZE + 16, y * TILE_SIZE + 16, texture);
        }
      }
      placed++;
    }
    this.hazardGroup = group;
  }

  /** A patch fits if it misses every reserved rectangle and sits a tile away from other patches. */
  private patchFits(
    tx: number, ty: number, w: number, h: number,
    reserved: { x0: number; y0: number; x1: number; y1: number }[],
  ): boolean {
    for (const r of reserved) {
      if (tx <= r.x1 && tx + w - 1 >= r.x0 && ty <= r.y1 && ty + h - 1 >= r.y0) return false;
    }
    for (let y = ty - 1; y <= ty + h; y++) {
      for (let x = tx - 1; x <= tx + w; x++) {
        if (this.hazardCells.has(`${x},${y}`)) return false;
      }
    }
    return true;
  }

  private updateHazards(time: number): void {
    const hazard = this.zone.hazard;
    if (!hazard || !this.hazardGroup) return;
    const onHazard = this.physics.overlap(this.player, this.hazardGroup);
    if (hazard.kind === 'ice') {
      this.player.setSlippery(onHazard);
      return;
    }
    if (!onHazard || time < this.nextLavaTick) return;
    this.nextLavaTick = time + LAVA_TICK_MS;
    const loss = GameState.getInstance().damageLeadPet(LAVA_DAMAGE_PERCENT);
    if (loss <= 0) return;
    this.cameras.main.shake(120, 0.003);
    this.player.setTint(0xff6a2a);
    this.time.delayedCall(180, () => this.player.clearTint());
    const num = this.add.text(this.player.x, this.player.y - 30, `-${loss}`, {
      fontSize: '18px', fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ff8a50', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: num, y: num.y - 28, alpha: 0, duration: 700, onComplete: () => num.destroy() });
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
