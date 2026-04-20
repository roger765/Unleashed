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

const MAP_W = 35;
const MAP_H = 30;

export class PondScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private zoneBossNpc: NPC | null = null;
  private zoneBossDialogBlocking = false;
  private interactKey: Phaser.Input.Keyboard.Key | null = null;
  private fightKey: Phaser.Input.Keyboard.Key | null = null;
  private nearNpc = false;

  constructor() {
    super({ key: 'PondScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Sand/grass border with water center
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const distCenter = Math.sqrt(
          Math.pow(x - MAP_W / 2, 2) + Math.pow(y - MAP_H / 2, 2),
        );
        let tileKey: string;
        if (distCenter < 6) tileKey = 'tile-water-deep';
        else if (distCenter < 9) tileKey = 'tile-water';
        else if (distCenter < 11) tileKey = 'tile-sand';
        else tileKey = (x + y) % 6 === 0 ? 'tile-grass-dark' : 'tile-grass';

        this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, tileKey);
      }
    }

    // Water collision (inner pond — can't walk in deep water)
    const waterWalls = this.physics.add.staticGroup();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const d = Math.sqrt(Math.pow(x - MAP_W / 2, 2) + Math.pow(y - MAP_H / 2, 2));
        if (d < 6) {
          const wall = waterWalls.create(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'tile-water-deep');
          wall.setAlpha(0); // invisible collision
          wall.refreshBody();
        }
      }
    }

    // Exit back to forest (top edge)
    const exitZone = this.add.zone(worldW / 2, 16, 128, 32);
    this.physics.add.existing(exitZone, true);
    this.add.text(worldW / 2, 32, '↑ Back to Forest', {
      fontSize: '12px', fontFamily: 'Arial', color: '#ffd700',
    }).setOrigin(0.5).setDepth(10);

    // Player
    const savedPos = (() => { const s = GameState.getInstance().getState(); return s.playerPosition && s.currentScene === 'PondScene' ? s.playerPosition : null; })();
    this.player = new Player(this, savedPos ? savedPos.x : worldW / 2, savedPos ? savedPos.y : 80);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, waterWalls);

    this.physics.add.overlap(this.player, exitZone, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('ForestScene');
      });
    });

    // Chests
    const pondChest = new Chest(this, 5 * TILE_SIZE, 5 * TILE_SIZE, 'pond-1', 50, { itemId: 'health-potion', quantity: 3 });
    this.physics.add.overlap(this.player, pondChest, () => pondChest.open());

    // Spawn Water-type pets around the pond's edge
    const waterPets = ['wave', 'puddle', 'brook', 'reef', 'tsunami'];
    for (let i = 0; i < 6; i++) {
      const tid = waterPets[randomInt(0, waterPets.length - 1)];
      const template = PET_TEMPLATES[tid];
      // Place around pond edge (ring at distance ~10-12 from center)
      const angle = (i / 6) * Math.PI * 2;
      const r = 10 * TILE_SIZE;
      const px = MAP_W / 2 * TILE_SIZE + Math.cos(angle) * r;
      const py = MAP_H / 2 * TILE_SIZE + Math.sin(angle) * r;
      const level = randomInt(5, 14);
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

    const gsBoss = GameState.getInstance();
    if (!gsBoss.getFlag('boss-defeated-maelstrom')) {
      this.zoneBossNpc = new NPC(
        this,
        Math.floor(MAP_W / 2) * TILE_SIZE,
        8 * TILE_SIZE,
        'npc-quest',
        'pond-zone-boss',
        () => {
          if (this.zoneBossDialogBlocking) return;
          this.zoneBossDialogBlocking = true;
          const end = () => {
            this.zoneBossDialogBlocking = false;
          };
          const d = new DialogueBox(this);
          d.show('Shore Watcher', [
            'When the ripples stop, Maelstrom hunts the shallows.',
            'Face the whirlpool master — if you must.',
            'Chat anytime. Press R near me when you want Maelstrom on the surface.',
          ], end);
        },
        'E: talk   R: fight',
      );
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    GameState.getInstance().setCurrentScene('PondScene');
  }

  update(_time: number, delta: number): void {
    this.player.update();
    GameState.getInstance().setPlayerPosition(this.player.x, this.player.y);

    if (this.zoneBossNpc) {
      const near = this.physics.overlap(this.player, this.zoneBossNpc.getZone());
      if (near) {
        this.zoneBossNpc.showPrompt();
        if (
          !this.zoneBossDialogBlocking &&
          this.interactKey &&
          Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
          this.zoneBossNpc.interact();
        }
        if (
          !this.zoneBossDialogBlocking &&
          this.fightKey &&
          Phaser.Input.Keyboard.JustDown(this.fightKey)
        ) {
          this.startMaelstromBossBattle();
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
    if (this.zoneBossNpc && !this.zoneBossDialogBlocking) {
      this.zoneBossNpc.interact();
    }
  }

  private onMobileFight(): void {
    if (!this.zoneBossDialogBlocking) {
      this.startMaelstromBossBattle();
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
      currentHp: hp, maxHp: hp, xp: 0, attack: atk, defense: def,
    };

    this.scene.start('BattleScene', {
      battleConfig: {
        playerTeam,
        enemyTeam: [createPetCombatant(enemyPet, 'enemy-0')],
        isBoss: false,
        isWild: true,
        returnScene: 'PondScene',
      } as BattleConfig,
    });
  }

  private startMaelstromBossBattle(): void {
    const boss = BOSSES.maelstrom;
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
        returnScene: 'PondScene',
      } as BattleConfig,
    });
  }
}
