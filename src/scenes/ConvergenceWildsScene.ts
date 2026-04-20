import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { Player } from '../entities/Player';
import { WildPet } from '../entities/WildPet';
import { GameState } from '../state/GameState';
import { PET_TEMPLATES } from '../data/pets';
import { IPetInstance, IPetTemplate, PetType } from '../types/pet';
import { createPlayerCombatant, createPetCombatant } from '../battle/Combatant';
import { BattleConfig } from '../battle/BattleManager';
import { randomInt } from '../utils/math';
import { AudioManager } from '../audio/AudioManager';

const MAP_W = 52;
const MAP_H = 40;

type Biome = 'nature' | 'water' | 'rock' | 'wood';

function biomeAt(tx: number, ty: number): Biome {
  const midX = MAP_W / 2;
  const midY = MAP_H / 2;
  if (tx < midX && ty < midY) return 'nature';
  if (tx >= midX && ty < midY) return 'water';
  if (tx < midX && ty >= midY) return 'rock';
  return 'wood';
}

/** Cross-shaped walkable hub between the four biomes. */
function corridorTile(tx: number, ty: number): boolean {
  const mx = Math.floor(MAP_W / 2);
  const my = Math.floor(MAP_H / 2);
  const inV = tx >= mx - 2 && tx <= mx + 1;
  const inH = ty >= my - 2 && ty <= my + 1;
  return inV || inH;
}

function wildPoolsByBiome(): Record<Biome, IPetTemplate[]> {
  const pools: Record<Biome, IPetTemplate[]> = {
    nature: [],
    water: [],
    rock: [],
    wood: [],
  };
  for (const t of Object.values(PET_TEMPLATES)) {
    if (t.captureCost >= 999) continue;
    switch (t.type) {
      case PetType.Nature:
        pools.nature.push(t);
        break;
      case PetType.Water:
        pools.water.push(t);
        break;
      case PetType.Rock:
        pools.rock.push(t);
        break;
      case PetType.Wood:
        pools.wood.push(t);
        break;
      default:
        break;
    }
  }
  return pools;
}

export class ConvergenceWildsScene extends Phaser.Scene {
  private player!: Player;
  private wildPets: WildPet[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'ConvergenceWildsScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    AudioManager.playMusic('calm');
    this.wildPets = [];
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const px = tx * TILE_SIZE + TILE_SIZE / 2;
        const py = ty * TILE_SIZE + TILE_SIZE / 2;
        let key = 'tile-grass';
        if (corridorTile(tx, ty)) {
          key = 'tile-path';
        } else {
          const b = biomeAt(tx, ty);
          if (b === 'nature') {
            key = (tx + ty) % 5 === 0 ? 'tile-grass-dark' : 'tile-grass';
          } else if (b === 'water') {
            key = (tx + ty) % 4 === 0 ? 'tile-water-deep' : 'tile-water';
          } else if (b === 'rock') {
            key = (tx + ty) % 5 === 0 ? 'tile-stone-dark' : 'tile-stone';
          } else {
            key = (tx + ty) % 6 === 0 ? 'tile-grass-dark' : 'tile-grass';
          }
        }
        this.add.image(px, py, key);
      }
    }

    this.walls = this.physics.add.staticGroup();
    for (let i = 0; i < 70; i++) {
      const tx = randomInt(2, MAP_W - 3);
      const ty = randomInt(2, MAP_H - 3);
      if (corridorTile(tx, ty)) continue;
      const b = biomeAt(tx, ty);
      const px = tx * TILE_SIZE + TILE_SIZE / 2;
      const py = ty * TILE_SIZE + TILE_SIZE / 2;
      if (b === 'nature' || b === 'wood') {
        this.walls.create(px, py, 'tile-tree').setDepth(3);
      } else if (b === 'rock') {
        this.walls.create(px, py, 'tile-rock').setDepth(3);
      }
    }

    const labelStyle = {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#000000aa',
    };
    this.add
      .text((MAP_W * 0.25) * TILE_SIZE, (MAP_H * 0.22) * TILE_SIZE, 'Nature', labelStyle)
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text((MAP_W * 0.75) * TILE_SIZE, (MAP_H * 0.22) * TILE_SIZE, 'Water', labelStyle)
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text((MAP_W * 0.25) * TILE_SIZE, (MAP_H * 0.78) * TILE_SIZE, 'Rock', labelStyle)
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text((MAP_W * 0.75) * TILE_SIZE, (MAP_H * 0.78) * TILE_SIZE, 'Wood', labelStyle)
      .setOrigin(0.5)
      .setDepth(10);

    const exitWest = this.add.zone(16, worldH / 2, 32, 128);
    this.physics.add.existing(exitWest, true);
    this.add.text(32, worldH / 2 - 20, '← Town', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#ffd700',
    }).setDepth(10);

    const savedPos = (() => { const s = GameState.getInstance().getState(); return s.playerPosition && s.currentScene === 'ConvergenceWildsScene' ? s.playerPosition : null; })();
    this.player = new Player(this, savedPos ? savedPos.x : 96, savedPos ? savedPos.y : worldH / 2);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, this.walls);

    let transitioning = false;
    const fadeToScene = (target: string, stopUI = false) => {
      if (transitioning) return;
      transitioning = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (stopUI) this.scene.stop('UIScene');
        this.scene.start(target);
      });
    };

    this.physics.add.overlap(this.player, exitWest, () => fadeToScene('TownScene', true));

    const pools = wildPoolsByBiome();
    const targetWild = 36;
    let placed = 0;
    let guard = 0;
    while (placed < targetWild && guard < 500) {
      guard += 1;
      const tx = randomInt(2, MAP_W - 3);
      const ty = randomInt(2, MAP_H - 3);
      if (corridorTile(tx, ty)) continue;
      const b = biomeAt(tx, ty);
      const pool = pools[b];
      if (pool.length === 0) continue;
      const template = pool[randomInt(0, pool.length - 1)];
      const px = tx * TILE_SIZE + TILE_SIZE / 2;
      const py = ty * TILE_SIZE + TILE_SIZE / 2;
      const level = randomInt(18, 30);
      this.wildPets.push(new WildPet(this, px, py, template, level));
      placed += 1;
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.player.moveTo(pointer.worldX, pointer.worldY);
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    GameState.getInstance().setCurrentScene('ConvergenceWildsScene');
  }

  update(_time: number, delta: number): void {
    this.player.update();
    GameState.getInstance().setPlayerPosition(this.player.x, this.player.y);
    for (const wp of this.wildPets) {
      if (wp.isDefeated()) continue;
      if (wp.updateAI(this.player.x, this.player.y, delta)) {
        this.startBattle(wp);
        break;
      }
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

    const hp = Math.floor(
      wildPet.petTemplate.baseHp + wildPet.petLevel * wildPet.petTemplate.baseHp * 0.1,
    );
    const atk = Math.floor(
      wildPet.petTemplate.baseAttack + wildPet.petLevel * wildPet.petTemplate.baseAttack * 0.1,
    );
    const def = Math.floor(
      wildPet.petTemplate.baseDefense + wildPet.petLevel * wildPet.petTemplate.baseDefense * 0.1,
    );

    const enemyPet: IPetInstance = {
      templateId: wildPet.petTemplate.id,
      nickname: `Wild ${wildPet.petTemplate.name}`,
      level: wildPet.petLevel,
      currentHp: hp,
      maxHp: hp,
      xp: 0,
      attack: atk,
      defense: def,
    };

    this.scene.start('BattleScene', {
      battleConfig: {
        playerTeam,
        enemyTeam: [createPetCombatant(enemyPet, 'enemy-0')],
        isBoss: false,
        isWild: true,
        returnScene: 'ConvergenceWildsScene',
      } as BattleConfig,
    });
  }
}
