import Phaser from 'phaser';
import { PET_TEMPLATES } from '../data/pets';
import { PetType } from '../types';
import { TILE_SIZE } from '../constants';

/**
 * AssetFactory generates ALL game textures programmatically using
 * Phaser's Graphics API + generateTexture(). No external image files needed.
 */
export class AssetFactory {
  // ────────────────────────────────────────────────────────────────
  //  PUBLIC ENTRY POINT
  // ────────────────────────────────────────────────────────────────

  static generateAll(scene: Phaser.Scene): void {
    AssetFactory.generatePlayerSprite(scene, 0xcc8833, 0xf5cba7);
    AssetFactory.generatePetSprites(scene);
    AssetFactory.generateNPCSprites(scene);
    AssetFactory.generateTileTextures(scene);
    AssetFactory.generateUITextures(scene);
    AssetFactory.generateItemIcons(scene);
    AssetFactory.generateChestTexture(scene);
    AssetFactory.generateTypeIcons(scene);
    AssetFactory.generateBoatSprite(scene);
  }

  // ────────────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────────────

  private static gfx(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
    return scene.make.graphics({ x: 0, y: 0 });
  }

  private static finish(
    g: Phaser.GameObjects.Graphics,
    key: string,
    w: number,
    h: number,
  ): void {
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Draw two-circle eyes on a pet graphic. */
  private static drawEyes(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    spacing: number = 10,
    size: number = 4,
  ): void {
    // white sclera
    g.fillStyle(0xffffff);
    g.fillCircle(cx - spacing / 2, cy, size);
    g.fillCircle(cx + spacing / 2, cy, size);
    // black pupil
    g.fillStyle(0x000000);
    g.fillCircle(cx - spacing / 2 + 1, cy, size * 0.45);
    g.fillCircle(cx + spacing / 2 + 1, cy, size * 0.45);
  }

  // ────────────────────────────────────────────────────────────────
  //  PLAYER
  // ────────────────────────────────────────────────────────────────

  static generatePlayerSprite(
    scene: Phaser.Scene,
    hairColor: number,
    skinColor: number,
  ): void {
    const w = 32;
    const h = 48;
    const g = AssetFactory.gfx(scene);

    // Body — purple wizard robe
    g.fillStyle(0x6b3fa0);
    g.fillRect(8, 18, 16, 24);

    // Robe bottom flare
    g.fillStyle(0x5a2d8e);
    g.fillRect(6, 36, 20, 6);

    // Head
    g.fillStyle(skinColor);
    g.fillCircle(16, 12, 8);

    // Hair
    g.fillStyle(hairColor);
    g.fillCircle(16, 8, 7);

    // Eyes
    g.fillStyle(0xffffff);
    g.fillCircle(13, 12, 2);
    g.fillCircle(19, 12, 2);
    g.fillStyle(0x000000);
    g.fillCircle(14, 12, 1);
    g.fillCircle(20, 12, 1);

    // Staff (right side)
    g.fillStyle(0x8b4513);
    g.fillRect(26, 10, 2, 30);
    // Staff star
    g.fillStyle(0xffd700);
    g.fillCircle(27, 8, 3);

    AssetFactory.finish(g, 'player', w, h);
  }

  // ────────────────────────────────────────────────────────────────
  //  PETS
  // ────────────────────────────────────────────────────────────────

  static generatePetSprites(scene: Phaser.Scene): void {
    for (const template of Object.values(PET_TEMPLATES)) {
      switch (template.type) {
        case PetType.Rock:
          AssetFactory.drawRockPet(scene, template.id);
          break;
        case PetType.Nature:
          AssetFactory.drawNaturePet(scene, template.id);
          break;
        case PetType.Wood:
          AssetFactory.drawWoodPet(scene, template.id);
          break;
        case PetType.Water:
          AssetFactory.drawWaterPet(scene, template.id);
          break;
      }
    }
  }

  // --- ROCK PETS ---

  private static drawRockPet(scene: Phaser.Scene, id: string): void {
    const g = AssetFactory.gfx(scene);
    const s = 48;

    switch (id) {
      case 'gravel': {
        // Scrappy pile of pebbles — cluster of circles
        g.fillStyle(0x9e9e9e);
        g.fillCircle(24, 32, 10);
        g.fillCircle(16, 28, 8);
        g.fillCircle(32, 28, 7);
        g.fillStyle(0x757575);
        g.fillCircle(20, 22, 6);
        g.fillCircle(28, 24, 5);
        g.fillStyle(0xbdbdbd);
        g.fillCircle(24, 18, 5);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'cobble': {
        // Round cobblestone — big round body
        g.fillStyle(0x8d6e63);
        g.fillCircle(24, 28, 16);
        g.fillStyle(0xa1887f);
        g.fillCircle(24, 24, 12);
        // spots
        g.fillStyle(0x6d4c41);
        g.fillCircle(18, 22, 3);
        g.fillCircle(30, 28, 2);
        AssetFactory.drawEyes(g, 24, 22, 10, 3);
        // tiny feet
        g.fillStyle(0x6d4c41);
        g.fillCircle(17, 42, 4);
        g.fillCircle(31, 42, 4);
        break;
      }
      case 'slate': {
        // Flat, sharp-edged — angular diamond shape
        g.fillStyle(0x607d8b);
        g.fillTriangle(24, 6, 6, 30, 42, 30);
        g.fillTriangle(24, 44, 6, 30, 42, 30);
        g.fillStyle(0x78909c);
        g.fillTriangle(24, 10, 12, 28, 36, 28);
        AssetFactory.drawEyes(g, 24, 24, 10, 3);
        // sharp edges accent
        g.lineStyle(1, 0x455a64);
        g.lineBetween(24, 6, 6, 30);
        g.lineBetween(24, 6, 42, 30);
        break;
      }
      case 'marble': {
        // Polished sphere with swirl patterns
        g.fillStyle(0xe0e0e0);
        g.fillCircle(24, 26, 16);
        g.fillStyle(0xbdbdbd);
        g.fillCircle(24, 26, 12);
        // swirl lines
        g.lineStyle(2, 0x9e9e9e);
        g.beginPath();
        g.arc(24, 26, 8, 0, Math.PI, false);
        g.strokePath();
        g.lineStyle(1, 0x757575);
        g.beginPath();
        g.arc(24, 26, 5, Math.PI, Math.PI * 2, false);
        g.strokePath();
        // polish shine
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(18, 20, 4);
        AssetFactory.drawEyes(g, 24, 24, 10, 3);
        break;
      }
      case 'obsidian': {
        // Fearsome volcanic glass — jagged dark crystal
        g.fillStyle(0x1a1a2e);
        g.fillTriangle(24, 4, 4, 38, 44, 38);
        g.fillStyle(0x2d1b69);
        g.fillTriangle(24, 10, 10, 36, 38, 36);
        // inner glow
        g.fillStyle(0x6a1b9a, 0.6);
        g.fillTriangle(24, 16, 16, 34, 32, 34);
        // red energy cracks
        g.lineStyle(1, 0xff1744);
        g.lineBetween(24, 14, 18, 30);
        g.lineBetween(24, 14, 30, 30);
        g.lineBetween(20, 22, 28, 28);
        AssetFactory.drawEyes(g, 24, 24, 10, 3);
        break;
      }
      case 'chalk': {
        g.fillStyle(0xf5f5f5);
        g.fillRoundedRect(10, 16, 28, 26, 6);
        g.fillStyle(0xe0e0e0);
        g.fillRoundedRect(12, 18, 24, 22, 4);
        g.fillStyle(0x9e9e9e, 0.4);
        g.fillCircle(18, 24, 4);
        g.fillCircle(30, 30, 3);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'grit': {
        g.fillStyle(0x8d6e63);
        g.fillCircle(20, 30, 9);
        g.fillCircle(28, 28, 8);
        g.fillCircle(24, 22, 7);
        g.fillStyle(0x6d4c41);
        g.fillCircle(24, 26, 5);
        AssetFactory.drawEyes(g, 24, 24, 8, 2);
        break;
      }
      case 'shale': {
        g.fillStyle(0x78909c);
        g.fillRect(8, 20, 32, 18);
        g.fillStyle(0xb0bec5);
        g.fillRect(10, 22, 28, 4);
        g.fillRect(10, 28, 28, 4);
        g.lineStyle(1, 0x455a64);
        g.strokeRect(8, 20, 32, 18);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'basalt': {
        g.fillStyle(0x37474f);
        g.fillRect(14, 10, 20, 30);
        g.fillStyle(0x546e7a);
        g.fillRect(16, 12, 6, 26);
        g.fillRect(26, 12, 6, 26);
        g.lineStyle(2, 0x263238);
        g.strokeRect(12, 8, 24, 34);
        AssetFactory.drawEyes(g, 24, 20, 8, 2);
        break;
      }
      case 'limestone': {
        g.fillStyle(0xd7ccc8);
        g.fillCircle(24, 28, 17);
        g.fillStyle(0xefebe9);
        g.fillCircle(20, 24, 5);
        g.fillStyle(0x8d6e63, 0.5);
        g.fillCircle(30, 30, 4);
        g.lineStyle(2, 0xa1887f);
        g.strokeCircle(24, 28, 19);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'monolith': {
        g.fillStyle(0x757575);
        g.fillRect(12, 14, 24, 28);
        g.fillStyle(0x9e9e9e);
        g.fillRect(14, 16, 20, 24);
        g.lineStyle(3, 0xffd700);
        g.strokeRoundedRect(8, 10, 32, 34, 4);
        AssetFactory.drawEyes(g, 24, 24, 10, 3);
        break;
      }
      case 'tumbler': {
        g.fillStyle(0x8d6e63);
        g.fillCircle(24, 28, 18);
        g.fillStyle(0xa1887f);
        g.fillCircle(24, 26, 14);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 28, 21);
        g.fillStyle(0x6d4c41);
        g.fillCircle(18, 22, 3);
        g.fillCircle(30, 28, 2);
        AssetFactory.drawEyes(g, 24, 22, 10, 3);
        g.fillCircle(17, 42, 4);
        g.fillCircle(31, 42, 4);
        break;
      }
      case 'razorslate': {
        g.fillStyle(0x546e7a);
        g.fillTriangle(24, 4, 4, 40, 44, 40);
        g.fillStyle(0x78909c);
        g.fillTriangle(24, 12, 12, 34, 36, 34);
        g.lineStyle(3, 0xffd700);
        g.strokeTriangle(24, 4, 4, 40, 44, 40);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'marblemarch': {
        g.fillStyle(0xeceff1);
        g.fillCircle(24, 28, 18);
        g.fillStyle(0xb0bec5);
        g.fillCircle(24, 26, 13);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 28, 21);
        AssetFactory.drawEyes(g, 24, 24, 10, 3);
        break;
      }
      case 'megalith': {
        g.fillStyle(0x616161);
        g.fillRect(8, 8, 32, 36);
        g.fillStyle(0x9e9e9e);
        g.fillRect(10, 10, 28, 32);
        g.lineStyle(4, 0xffe082);
        g.strokeRect(6, 6, 36, 40);
        AssetFactory.drawEyes(g, 24, 24, 10, 3);
        break;
      }
      case 'rockslide': {
        g.fillStyle(0x6d4c41);
        g.fillCircle(24, 30, 20);
        g.fillStyle(0x8d6e63);
        g.fillCircle(22, 28, 14);
        g.lineStyle(3, 0xffe082);
        g.strokeCircle(24, 30, 23);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
    }

    AssetFactory.finish(g, id, s, s);
  }

  // --- NATURE PETS ---

  private static drawNaturePet(scene: Phaser.Scene, id: string): void {
    const g = AssetFactory.gfx(scene);
    const s = 48;

    switch (id) {
      case 'leaf': {
        // Lively leaf spirit — leaf-shaped body
        g.fillStyle(0x66bb6a);
        g.fillCircle(24, 28, 14);
        // leaf tip top
        g.fillStyle(0x43a047);
        g.fillTriangle(24, 6, 14, 20, 34, 20);
        // vein
        g.lineStyle(1, 0x2e7d32);
        g.lineBetween(24, 10, 24, 38);
        g.lineBetween(24, 22, 16, 28);
        g.lineBetween(24, 26, 32, 32);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'sprout': {
        // Tiny seedling — small round body with sprout on top
        g.fillStyle(0x8d6e63);
        g.fillCircle(24, 34, 10);
        g.fillStyle(0xa1887f);
        g.fillCircle(24, 32, 8);
        // sprout
        g.fillStyle(0x4caf50);
        g.fillRect(22, 18, 4, 10);
        // two leaves
        g.fillStyle(0x66bb6a);
        g.fillCircle(18, 16, 5);
        g.fillCircle(30, 16, 5);
        AssetFactory.drawEyes(g, 24, 32, 8, 2);
        break;
      }
      case 'fern': {
        // Ancient fern — tall oval body with fronds
        g.fillStyle(0x388e3c);
        g.fillCircle(24, 30, 12);
        g.fillRect(18, 18, 12, 20);
        // fronds left
        g.fillStyle(0x4caf50);
        g.fillTriangle(8, 14, 18, 22, 14, 28);
        // fronds right
        g.fillTriangle(40, 14, 30, 22, 34, 28);
        // top frond
        g.fillTriangle(24, 4, 18, 18, 30, 18);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'blossom': {
        // Flower creature — petal ring around center
        // petals
        const petalColors = [0xe91e63, 0xff5722, 0xff9800, 0xffeb3b, 0xe91e63];
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const px = 24 + Math.cos(angle) * 12;
          const py = 26 + Math.sin(angle) * 12;
          g.fillStyle(petalColors[i]);
          g.fillCircle(px, py, 7);
        }
        // center
        g.fillStyle(0xfdd835);
        g.fillCircle(24, 26, 8);
        AssetFactory.drawEyes(g, 24, 26, 8, 2);
        break;
      }
      case 'flora': {
        // Majestic garden guardian — large with crown of flowers
        g.fillStyle(0x2e7d32);
        g.fillCircle(24, 30, 16);
        // flower crown
        g.fillStyle(0xe91e63);
        g.fillCircle(14, 14, 5);
        g.fillCircle(34, 14, 5);
        g.fillStyle(0xffeb3b);
        g.fillCircle(24, 10, 5);
        g.fillStyle(0xff9800);
        g.fillCircle(18, 12, 4);
        g.fillCircle(30, 12, 4);
        // vine arms
        g.lineStyle(3, 0x4caf50);
        g.lineBetween(8, 30, 4, 40);
        g.lineBetween(40, 30, 44, 40);
        // leaf tips
        g.fillStyle(0x66bb6a);
        g.fillCircle(4, 40, 4);
        g.fillCircle(44, 40, 4);
        AssetFactory.drawEyes(g, 24, 28, 12, 4);
        break;
      }
      case 'moss': {
        g.fillStyle(0x558b2f);
        g.fillEllipse(24, 30, 22, 14);
        g.fillStyle(0x7cb342);
        g.fillCircle(16, 26, 6);
        g.fillCircle(32, 28, 5);
        g.fillCircle(24, 22, 5);
        AssetFactory.drawEyes(g, 24, 28, 8, 2);
        break;
      }
      case 'clover': {
        g.fillStyle(0x43a047);
        g.fillCircle(18, 22, 8);
        g.fillCircle(30, 22, 8);
        g.fillCircle(24, 14, 8);
        g.fillStyle(0x8d6e63);
        g.fillCircle(24, 30, 6);
        AssetFactory.drawEyes(g, 24, 24, 8, 2);
        break;
      }
      case 'orchid': {
        g.fillStyle(0xce93d8);
        g.fillEllipse(18, 20, 12, 16);
        g.fillEllipse(30, 20, 12, 16);
        g.fillStyle(0xab47bc);
        g.fillCircle(24, 28, 10);
        g.fillStyle(0xffd700);
        g.fillCircle(24, 24, 4);
        AssetFactory.drawEyes(g, 24, 30, 6, 2);
        break;
      }
      case 'thistle': {
        g.fillStyle(0x5e35b1);
        g.fillCircle(24, 30, 12);
        g.fillStyle(0x9575cd);
        g.fillTriangle(24, 4, 14, 22, 34, 22);
        g.lineStyle(2, 0x4a148c);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(24 + Math.cos(a) * 8, 30 + Math.sin(a) * 8, 24 + Math.cos(a) * 14, 30 + Math.sin(a) * 14);
        }
        AssetFactory.drawEyes(g, 24, 32, 6, 2);
        break;
      }
      case 'myrtle': {
        g.fillStyle(0x1b5e20);
        g.fillCircle(24, 30, 15);
        g.fillStyle(0xffffff);
        g.fillCircle(14, 18, 5);
        g.fillCircle(34, 18, 5);
        g.fillStyle(0xffeb3b);
        g.fillCircle(24, 12, 4);
        g.lineStyle(2, 0x33691e);
        g.strokeCircle(24, 30, 17);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'canopy': {
        g.fillStyle(0x43a047);
        g.fillCircle(24, 28, 18);
        g.fillStyle(0x66bb6a);
        g.fillTriangle(24, 4, 10, 18, 38, 18);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 28, 22);
        g.lineStyle(1, 0x2e7d32);
        g.lineBetween(24, 10, 24, 40);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'thornthrall': {
        g.fillStyle(0x6d4c41);
        g.fillCircle(24, 34, 12);
        g.fillStyle(0x2e7d32);
        g.fillRect(20, 14, 8, 16);
        g.fillTriangle(14, 14, 24, 4, 34, 14);
        g.lineStyle(2, 0xffd700);
        g.lineBetween(10, 20, 8, 36);
        g.lineBetween(38, 20, 40, 36);
        AssetFactory.drawEyes(g, 24, 32, 8, 2);
        break;
      }
      case 'primeval': {
        g.fillStyle(0x1b5e20);
        g.fillCircle(24, 30, 16);
        g.fillStyle(0x388e3c);
        g.fillTriangle(24, 4, 8, 22, 40, 22);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 30, 19);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'fullbloom': {
        g.fillStyle(0xf48fb1);
        g.fillCircle(24, 28, 16);
        g.fillStyle(0xffb74d);
        g.fillCircle(14, 20, 8);
        g.fillCircle(34, 20, 8);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 28, 19);
        AssetFactory.drawEyes(g, 24, 28, 8, 2);
        break;
      }
      case 'edenguard': {
        g.fillStyle(0x2e7d32);
        g.fillCircle(24, 30, 18);
        g.fillStyle(0xe91e63);
        g.fillCircle(12, 12, 6);
        g.fillCircle(36, 12, 6);
        g.fillStyle(0xffeb3b);
        g.fillCircle(24, 8, 5);
        g.lineStyle(3, 0xffe082);
        g.strokeCircle(24, 30, 22);
        AssetFactory.drawEyes(g, 24, 28, 12, 4);
        break;
      }
      case 'skylarch': {
        g.fillStyle(0x2e7d32);
        g.fillCircle(24, 32, 17);
        g.fillStyle(0x66bb6a);
        g.fillTriangle(24, 2, 10, 20, 38, 20);
        g.lineStyle(3, 0xffe082);
        g.strokeCircle(24, 32, 20);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'brambleking': {
        g.fillStyle(0x4e342e);
        g.fillCircle(24, 34, 14);
        g.fillStyle(0xc62828);
        g.fillTriangle(24, 6, 12, 18, 36, 18);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 34, 17);
        AssetFactory.drawEyes(g, 24, 32, 8, 2);
        break;
      }
    }

    AssetFactory.finish(g, id, s, s);
  }

  // --- WOOD PETS ---

  private static drawWoodPet(scene: Phaser.Scene, id: string): void {
    const g = AssetFactory.gfx(scene);
    const s = 48;

    switch (id) {
      case 'twig': {
        // Nimble stick creature — thin, branchy
        g.fillStyle(0x8d6e63);
        g.fillRect(20, 8, 8, 32);
        // branch arms
        g.fillStyle(0x6d4c41);
        g.fillRect(8, 16, 12, 4);
        g.fillRect(28, 16, 12, 4);
        // branch tips (leaves)
        g.fillStyle(0x66bb6a);
        g.fillCircle(8, 16, 3);
        g.fillCircle(40, 16, 3);
        // legs
        g.fillStyle(0x8d6e63);
        g.fillRect(18, 38, 4, 8);
        g.fillRect(26, 38, 4, 8);
        AssetFactory.drawEyes(g, 24, 14, 6, 2);
        break;
      }
      case 'bark': {
        // Tough bark-covered — wide, sturdy rectangle
        g.fillStyle(0x5d4037);
        g.fillRect(8, 10, 32, 30);
        g.fillStyle(0x795548);
        g.fillRect(10, 12, 28, 26);
        // bark texture lines
        g.lineStyle(1, 0x4e342e);
        g.lineBetween(14, 12, 14, 38);
        g.lineBetween(24, 12, 24, 38);
        g.lineBetween(34, 12, 34, 38);
        // moss accent
        g.fillStyle(0x66bb6a);
        g.fillCircle(12, 12, 3);
        g.fillCircle(36, 12, 3);
        // feet
        g.fillStyle(0x5d4037);
        g.fillRect(10, 40, 10, 4);
        g.fillRect(28, 40, 10, 4);
        AssetFactory.drawEyes(g, 24, 20, 12, 3);
        break;
      }
      case 'cedar': {
        // Fragrant wood — triangular tree shape
        g.fillStyle(0x6d4c41);
        g.fillRect(20, 28, 8, 14);
        g.fillStyle(0x33691e);
        g.fillTriangle(24, 6, 6, 30, 42, 30);
        g.fillStyle(0x558b2f);
        g.fillTriangle(24, 12, 12, 28, 36, 28);
        AssetFactory.drawEyes(g, 24, 22, 10, 3);
        break;
      }
      case 'willow': {
        // Graceful willow — drooping branches
        g.fillStyle(0x795548);
        g.fillRect(20, 12, 8, 28);
        // canopy
        g.fillStyle(0x7cb342);
        g.fillCircle(24, 14, 12);
        // drooping branches
        g.lineStyle(2, 0x558b2f);
        g.lineBetween(14, 14, 6, 38);
        g.lineBetween(18, 16, 10, 40);
        g.lineBetween(34, 14, 42, 38);
        g.lineBetween(30, 16, 38, 40);
        // leaf tips
        g.fillStyle(0x8bc34a);
        g.fillCircle(6, 38, 3);
        g.fillCircle(10, 40, 3);
        g.fillCircle(42, 38, 3);
        g.fillCircle(38, 40, 3);
        AssetFactory.drawEyes(g, 24, 14, 8, 2);
        break;
      }
      case 'ironwood': {
        // Legendary tree warrior — armored trunk
        g.fillStyle(0x4e342e);
        g.fillRect(10, 10, 28, 32);
        // metal plates
        g.fillStyle(0x78909c);
        g.fillRect(12, 12, 10, 10);
        g.fillRect(26, 12, 10, 10);
        g.fillRect(12, 26, 10, 10);
        g.fillRect(26, 26, 10, 10);
        // rivets
        g.fillStyle(0xb0bec5);
        g.fillCircle(17, 17, 2);
        g.fillCircle(31, 17, 2);
        g.fillCircle(17, 31, 2);
        g.fillCircle(31, 31, 2);
        // crown
        g.fillStyle(0x33691e);
        g.fillTriangle(24, 2, 8, 14, 40, 14);
        // arms
        g.fillStyle(0x5d4037);
        g.fillRect(2, 18, 8, 6);
        g.fillRect(38, 18, 8, 6);
        AssetFactory.drawEyes(g, 24, 20, 12, 3);
        break;
      }
      case 'driftwood': {
        g.fillStyle(0xa1887f);
        g.fillEllipse(24, 28, 26, 12);
        g.fillStyle(0xd7ccc8);
        g.fillEllipse(20, 26, 8, 6);
        g.lineStyle(2, 0x6d4c41);
        g.strokeEllipse(24, 28, 26, 12);
        AssetFactory.drawEyes(g, 24, 26, 8, 2);
        break;
      }
      case 'acorn': {
        g.fillStyle(0x5d4037);
        g.fillEllipse(24, 30, 14, 16);
        g.fillStyle(0x8d6e63);
        g.fillEllipse(24, 22, 10, 8);
        g.fillStyle(0xffcc80);
        g.fillCircle(24, 16, 6);
        AssetFactory.drawEyes(g, 24, 28, 6, 2);
        break;
      }
      case 'pine': {
        g.fillStyle(0x5d4037);
        g.fillRect(20, 24, 8, 20);
        g.fillStyle(0x2e7d32);
        g.fillTriangle(24, 4, 10, 26, 38, 26);
        g.fillTriangle(24, 12, 12, 28, 36, 28);
        AssetFactory.drawEyes(g, 24, 22, 6, 2);
        break;
      }
      case 'bamboo': {
        g.fillStyle(0x689f38);
        g.fillRect(18, 8, 5, 34);
        g.fillRect(24, 6, 5, 36);
        g.fillRect(30, 10, 5, 32);
        g.lineStyle(1, 0x33691e);
        g.lineBetween(18, 18, 23, 18);
        g.lineBetween(24, 20, 29, 20);
        g.lineBetween(30, 22, 35, 22);
        AssetFactory.drawEyes(g, 24, 14, 6, 2);
        break;
      }
      case 'birch': {
        g.fillStyle(0xd7ccc8);
        g.fillRect(18, 12, 12, 28);
        g.lineStyle(2, 0x212121);
        g.lineBetween(20, 14, 20, 38);
        g.lineBetween(24, 12, 24, 40);
        g.lineBetween(28, 16, 28, 36);
        g.fillStyle(0x8bc34a);
        g.fillCircle(10, 10, 6);
        g.fillCircle(38, 14, 5);
        AssetFactory.drawEyes(g, 24, 20, 8, 2);
        break;
      }
      case 'groveward': {
        g.fillStyle(0x6d4c41);
        g.fillRect(18, 6, 12, 36);
        g.fillStyle(0x66bb6a);
        g.fillCircle(8, 14, 5);
        g.fillCircle(40, 14, 5);
        g.lineStyle(3, 0xffd700);
        g.strokeRect(14, 4, 20, 40);
        g.fillRect(16, 36, 6, 10);
        g.fillRect(26, 36, 6, 10);
        AssetFactory.drawEyes(g, 24, 14, 6, 2);
        break;
      }
      case 'bulwark': {
        g.fillStyle(0x5d4037);
        g.fillRect(6, 8, 36, 34);
        g.fillStyle(0x795548);
        g.fillRect(8, 10, 32, 30);
        g.lineStyle(3, 0xffd700);
        g.strokeRect(4, 6, 40, 38);
        g.fillStyle(0x66bb6a);
        g.fillCircle(12, 12, 4);
        g.fillCircle(36, 12, 4);
        AssetFactory.drawEyes(g, 24, 20, 12, 3);
        g.fillRect(8, 42, 12, 4);
        g.fillRect(28, 42, 12, 4);
        break;
      }
      case 'sequoia': {
        g.fillStyle(0x5d4037);
        g.fillRect(18, 20, 12, 24);
        g.fillStyle(0x33691e);
        g.fillTriangle(24, 2, 4, 28, 44, 28);
        g.lineStyle(3, 0xffd700);
        g.strokeTriangle(24, 2, 4, 28, 44, 28);
        AssetFactory.drawEyes(g, 24, 24, 10, 3);
        break;
      }
      case 'weepgiant': {
        g.fillStyle(0x6d4c41);
        g.fillRect(18, 16, 12, 28);
        g.fillStyle(0x558b2f);
        g.fillCircle(24, 12, 14);
        g.lineStyle(3, 0xffd700);
        g.strokeRect(14, 8, 20, 38);
        AssetFactory.drawEyes(g, 24, 16, 8, 2);
        break;
      }
      case 'adamantbark': {
        g.fillStyle(0x37474f);
        g.fillRect(8, 8, 32, 34);
        g.fillStyle(0x78909c);
        g.fillRect(12, 12, 8, 8);
        g.fillRect(28, 12, 8, 8);
        g.lineStyle(3, 0xffe082);
        g.strokeRect(6, 6, 36, 38);
        g.fillStyle(0x33691e);
        g.fillTriangle(24, 0, 10, 12, 38, 12);
        AssetFactory.drawEyes(g, 24, 22, 12, 3);
        break;
      }
      case 'wildwood': {
        g.fillStyle(0x4e342e);
        g.fillRect(16, 8, 16, 34);
        g.fillStyle(0x66bb6a);
        g.fillCircle(8, 12, 6);
        g.fillCircle(40, 12, 6);
        g.lineStyle(3, 0xffe082);
        g.strokeRect(12, 4, 24, 40);
        AssetFactory.drawEyes(g, 24, 14, 6, 2);
        break;
      }
      case 'citadel': {
        g.fillStyle(0x3e2723);
        g.fillRect(4, 6, 40, 36);
        g.fillStyle(0x5d4037);
        g.fillRect(8, 10, 32, 28);
        g.lineStyle(4, 0xffd700);
        g.strokeRect(2, 4, 44, 40);
        AssetFactory.drawEyes(g, 24, 22, 12, 3);
        break;
      }
    }

    AssetFactory.finish(g, id, s, s);
  }

  // --- WATER PETS ---

  private static drawWaterPet(scene: Phaser.Scene, id: string): void {
    const g = AssetFactory.gfx(scene);
    const s = 48;

    switch (id) {
      case 'wave': {
        // Playful wave — wave/teardrop shape
        g.fillStyle(0x42a5f5);
        g.fillCircle(24, 30, 14);
        // wave top
        g.fillStyle(0x64b5f6);
        g.fillTriangle(24, 8, 12, 24, 36, 24);
        // foam
        g.fillStyle(0xbbdefb);
        g.fillCircle(16, 24, 4);
        g.fillCircle(32, 24, 4);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'puddle': {
        // Small wobbling puddle — flat oval
        g.fillStyle(0x90caf9);
        g.fillCircle(24, 34, 14);
        g.fillCircle(24, 34, 10);
        g.fillStyle(0x64b5f6);
        g.fillCircle(24, 32, 10);
        // ripples
        g.lineStyle(1, 0x42a5f5);
        g.beginPath();
        g.arc(24, 34, 8, 0, Math.PI, false);
        g.strokePath();
        // bubble
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(30, 26, 3);
        AssetFactory.drawEyes(g, 24, 30, 8, 2);
        break;
      }
      case 'brook': {
        // Babbling brook — flowing elongated shape
        g.fillStyle(0x29b6f6);
        g.fillCircle(20, 28, 12);
        g.fillCircle(30, 26, 10);
        g.fillStyle(0x4fc3f7);
        g.fillCircle(22, 24, 8);
        // flow lines
        g.lineStyle(1, 0x81d4fa);
        g.lineBetween(10, 28, 18, 24);
        g.lineBetween(26, 22, 38, 26);
        // splash drops
        g.fillStyle(0xb3e5fc);
        g.fillCircle(38, 20, 3);
        g.fillCircle(8, 22, 2);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'reef': {
        // Coral reef creature — spiky/bumpy
        g.fillStyle(0x1e88e5);
        g.fillCircle(24, 30, 14);
        // coral branches
        g.fillStyle(0xef5350);
        g.fillRect(10, 12, 4, 14);
        g.fillCircle(12, 12, 4);
        g.fillStyle(0xff7043);
        g.fillRect(22, 8, 4, 14);
        g.fillCircle(24, 8, 4);
        g.fillStyle(0xffa726);
        g.fillRect(34, 12, 4, 14);
        g.fillCircle(36, 12, 4);
        // shell details
        g.fillStyle(0xffecb3);
        g.fillCircle(18, 36, 4);
        g.fillCircle(30, 38, 3);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'tsunami': {
        // Unstoppable force — huge wave
        g.fillStyle(0x1565c0);
        g.fillCircle(24, 30, 18);
        // crest
        g.fillStyle(0x1976d2);
        g.fillTriangle(24, 4, 6, 24, 42, 24);
        // foam crest
        g.fillStyle(0xbbdefb);
        g.fillCircle(12, 22, 5);
        g.fillCircle(24, 14, 5);
        g.fillCircle(36, 22, 5);
        // power lines
        g.lineStyle(2, 0x0d47a1);
        g.lineBetween(12, 30, 36, 30);
        g.lineBetween(10, 36, 38, 36);
        AssetFactory.drawEyes(g, 24, 26, 12, 4);
        break;
      }
      case 'droplet': {
        g.fillStyle(0x29b6f6);
        g.fillCircle(24, 28, 12);
        g.fillStyle(0x81d4fa);
        g.fillCircle(24, 24, 6);
        g.fillStyle(0xffffff, 0.7);
        g.fillEllipse(20, 22, 6, 4);
        AssetFactory.drawEyes(g, 24, 28, 6, 2);
        break;
      }
      case 'mist': {
        g.fillStyle(0xb3e5fc, 0.85);
        g.fillCircle(18, 28, 10);
        g.fillCircle(28, 26, 12);
        g.fillCircle(24, 32, 9);
        g.fillStyle(0xe1f5fe, 0.6);
        g.fillCircle(24, 28, 8);
        AssetFactory.drawEyes(g, 24, 28, 8, 2);
        break;
      }
      case 'geyser': {
        g.fillStyle(0x0277bd);
        g.fillEllipse(24, 34, 14, 10);
        g.fillStyle(0xb3e5fc);
        g.fillTriangle(24, 4, 14, 34, 34, 34);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(20, 12, 3);
        g.fillCircle(28, 16, 2);
        AssetFactory.drawEyes(g, 24, 30, 6, 2);
        break;
      }
      case 'lagoon': {
        g.fillStyle(0x00838f);
        g.fillCircle(24, 30, 16);
        g.fillStyle(0x4dd0e1);
        g.fillCircle(24, 28, 11);
        g.fillStyle(0x80deea, 0.5);
        g.fillCircle(16, 24, 5);
        g.fillCircle(32, 32, 4);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'riptide': {
        g.fillStyle(0x01579b);
        g.fillCircle(24, 30, 17);
        g.lineStyle(3, 0x4fc3f7);
        g.beginPath();
        g.arc(24, 30, 20, -0.3, Math.PI + 0.3, false);
        g.strokePath();
        g.beginPath();
        g.arc(24, 30, 14, Math.PI - 0.3, -0.3, false);
        g.strokePath();
        g.fillStyle(0xe1f5fe);
        g.fillCircle(12, 26, 3);
        g.fillCircle(36, 34, 3);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'breaker': {
        g.fillStyle(0x1976d2);
        g.fillCircle(24, 30, 18);
        g.fillStyle(0x42a5f5);
        g.fillTriangle(24, 2, 8, 22, 40, 22);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 30, 22);
        g.fillStyle(0xe3f2fd);
        g.fillCircle(14, 22, 4);
        g.fillCircle(34, 22, 4);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'depthling': {
        g.fillStyle(0x1565c0);
        g.fillCircle(24, 34, 16);
        g.fillStyle(0x42a5f5);
        g.fillCircle(24, 32, 11);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 34, 19);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(28, 24, 4);
        AssetFactory.drawEyes(g, 24, 30, 8, 2);
        break;
      }
      case 'rapidsoul': {
        g.fillStyle(0x0288d1);
        g.fillCircle(22, 28, 14);
        g.fillCircle(30, 26, 12);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(26, 28, 18);
        AssetFactory.drawEyes(g, 24, 26, 10, 3);
        break;
      }
      case 'atollward': {
        g.fillStyle(0x1565c0);
        g.fillCircle(24, 30, 16);
        g.fillStyle(0xff7043);
        g.fillRect(10, 10, 6, 12);
        g.fillRect(32, 10, 6, 12);
        g.lineStyle(3, 0xffd700);
        g.strokeCircle(24, 30, 19);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'deluge': {
        g.fillStyle(0x0d47a1);
        g.fillCircle(24, 30, 19);
        g.fillStyle(0x42a5f5);
        g.fillTriangle(24, 0, 8, 20, 40, 20);
        g.lineStyle(3, 0xffe082);
        g.strokeCircle(24, 30, 22);
        AssetFactory.drawEyes(g, 24, 28, 10, 3);
        break;
      }
      case 'trench': {
        g.fillStyle(0x01579b);
        g.fillCircle(24, 34, 17);
        g.fillStyle(0x0277bd);
        g.fillCircle(24, 32, 11);
        g.lineStyle(3, 0xffe082);
        g.strokeCircle(24, 34, 20);
        AssetFactory.drawEyes(g, 24, 30, 8, 2);
        break;
      }
    }

    AssetFactory.finish(g, id, s, s);
  }

  // ────────────────────────────────────────────────────────────────
  //  NPCs
  // ────────────────────────────────────────────────────────────────

  static generateNPCSprites(scene: Phaser.Scene): void {
    // Edward — wise NPC, red robe, taller
    {
      const g = AssetFactory.gfx(scene);
      // Body — red robe
      g.fillStyle(0xc0392b);
      g.fillRect(6, 22, 20, 28);
      // Yellow trim
      g.fillStyle(0xf1c40f);
      g.fillRect(6, 22, 20, 3);
      g.fillRect(6, 47, 20, 3);
      // Head
      g.fillStyle(0xf5cba7);
      g.fillCircle(16, 14, 9);
      // Beard
      g.fillStyle(0xcccccc);
      g.fillCircle(16, 20, 5);
      // Hat/hood
      g.fillStyle(0xc0392b);
      g.fillTriangle(16, 0, 6, 12, 26, 12);
      // Eyes
      g.fillStyle(0x000000);
      g.fillCircle(13, 12, 1);
      g.fillCircle(19, 12, 1);
      AssetFactory.finish(g, 'npc-edward', 32, 56);
    }

    // Shopkeeper — green apron
    {
      const g = AssetFactory.gfx(scene);
      // Body
      g.fillStyle(0x795548);
      g.fillRect(8, 18, 16, 24);
      // Green apron
      g.fillStyle(0x27ae60);
      g.fillRect(10, 22, 12, 20);
      // Apron string
      g.lineStyle(1, 0x1e8449);
      g.lineBetween(10, 24, 22, 24);
      // Head
      g.fillStyle(0xf5cba7);
      g.fillCircle(16, 12, 8);
      // Hair
      g.fillStyle(0x5d4037);
      g.fillCircle(16, 8, 7);
      // Eyes
      g.fillStyle(0x000000);
      g.fillCircle(13, 11, 1);
      g.fillCircle(19, 11, 1);
      // Smile
      g.lineStyle(1, 0x000000);
      g.beginPath();
      g.arc(16, 14, 3, 0, Math.PI, false);
      g.strokePath();
      AssetFactory.finish(g, 'npc-shopkeeper', 32, 48);
    }

    // Quest NPC — blue outfit
    {
      const g = AssetFactory.gfx(scene);
      // Body — blue outfit
      g.fillStyle(0x2980b9);
      g.fillRect(8, 18, 16, 24);
      // Belt
      g.fillStyle(0x8b4513);
      g.fillRect(8, 28, 16, 3);
      // Head
      g.fillStyle(0xf5cba7);
      g.fillCircle(16, 12, 8);
      // Hair
      g.fillStyle(0x2c3e50);
      g.fillCircle(16, 8, 7);
      // Eyes
      g.fillStyle(0x000000);
      g.fillCircle(13, 11, 1);
      g.fillCircle(19, 11, 1);
      // Exclamation mark
      g.fillStyle(0xf1c40f);
      g.fillRect(15, 0, 3, 5);
      g.fillCircle(16.5, 7, 1.5);
      AssetFactory.finish(g, 'npc-quest', 32, 48);
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  TILES
  // ────────────────────────────────────────────────────────────────

  static generateTileTextures(scene: Phaser.Scene): void {
    const T = TILE_SIZE;

    // tile-grass
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x4caf50);
      g.fillRect(0, 0, T, T);
      // variation dots
      g.fillStyle(0x43a047);
      g.fillCircle(6, 8, 1);
      g.fillCircle(18, 4, 1);
      g.fillCircle(26, 20, 1);
      g.fillCircle(10, 24, 1);
      g.fillCircle(22, 14, 1);
      AssetFactory.finish(g, 'tile-grass', T, T);
    }

    // tile-grass-dark
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x388e3c);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0x2e7d32);
      g.fillCircle(8, 12, 1);
      g.fillCircle(20, 6, 1);
      g.fillCircle(28, 22, 1);
      AssetFactory.finish(g, 'tile-grass-dark', T, T);
    }

    // tile-dirt
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x8d6e63);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0x795548);
      g.fillCircle(5, 10, 2);
      g.fillCircle(22, 6, 1);
      g.fillCircle(14, 26, 2);
      AssetFactory.finish(g, 'tile-dirt', T, T);
    }

    // tile-stone
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x78909c);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0x607d8b);
      g.lineBetween(0, 10, T, 10);
      g.lineBetween(16, 0, 16, 10);
      g.lineBetween(8, 10, 8, 20);
      g.lineBetween(24, 10, 24, 20);
      g.lineBetween(0, 20, T, 20);
      g.lineBetween(16, 20, 16, T);
      AssetFactory.finish(g, 'tile-stone', T, T);
    }

    // tile-stone-dark
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x546e7a);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0x455a64);
      g.lineBetween(0, 12, T, 12);
      g.lineBetween(14, 0, 14, 12);
      g.lineBetween(0, 24, T, 24);
      g.lineBetween(20, 12, 20, 24);
      AssetFactory.finish(g, 'tile-stone-dark', T, T);
    }

    // tile-water
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x2196f3);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0x1e88e5);
      g.beginPath();
      g.arc(8, 12, 6, 0, Math.PI, false);
      g.strokePath();
      g.beginPath();
      g.arc(24, 20, 6, Math.PI, 0, false);
      g.strokePath();
      AssetFactory.finish(g, 'tile-water', T, T);
    }

    // tile-water-deep
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x1565c0);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0x0d47a1);
      g.beginPath();
      g.arc(10, 16, 8, 0, Math.PI, false);
      g.strokePath();
      AssetFactory.finish(g, 'tile-water-deep', T, T);
    }

    // tile-sand
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xd7ccc8);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0xbcaaa4);
      g.fillCircle(10, 8, 1);
      g.fillCircle(24, 18, 1);
      g.fillCircle(6, 28, 1);
      AssetFactory.finish(g, 'tile-sand', T, T);
    }

    // tile-wall
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xd7ccc8);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0xbcaaa4);
      g.strokeRect(1, 1, T - 2, T - 2);
      AssetFactory.finish(g, 'tile-wall', T, T);
    }

    // tile-roof-red
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xc0392b);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0xa93226);
      g.lineBetween(0, 8, T, 8);
      g.lineBetween(0, 16, T, 16);
      g.lineBetween(0, 24, T, 24);
      AssetFactory.finish(g, 'tile-roof-red', T, T);
    }

    // tile-roof-blue
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x1976d2);
      g.fillRect(0, 0, T, T);
      g.lineStyle(1, 0x1565c0);
      g.lineBetween(0, 8, T, 8);
      g.lineBetween(0, 16, T, 16);
      g.lineBetween(0, 24, T, 24);
      AssetFactory.finish(g, 'tile-roof-blue', T, T);
    }

    // tile-door
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xd7ccc8);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0x5d4037);
      g.fillRect(6, 4, 20, 28);
      // doorknob
      g.fillStyle(0xffd700);
      g.fillCircle(22, 18, 2);
      AssetFactory.finish(g, 'tile-door', T, T);
    }

    // tile-tree
    {
      const g = AssetFactory.gfx(scene);
      // trunk
      g.fillStyle(0x6d4c41);
      g.fillRect(12, 18, 8, 14);
      // canopy
      g.fillStyle(0x388e3c);
      g.fillCircle(16, 14, 12);
      g.fillStyle(0x4caf50);
      g.fillCircle(16, 12, 8);
      AssetFactory.finish(g, 'tile-tree', T, T);
    }

    // tile-rock
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x78909c);
      g.fillCircle(16, 20, 12);
      g.fillStyle(0x90a4ae);
      g.fillCircle(16, 18, 8);
      // highlight
      g.fillStyle(0xb0bec5, 0.5);
      g.fillCircle(12, 14, 3);
      AssetFactory.finish(g, 'tile-rock', T, T);
    }

    // tile-path
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xe8d5b7);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0xd4c4a8);
      g.fillCircle(8, 10, 2);
      g.fillCircle(24, 22, 2);
      g.fillCircle(14, 28, 1);
      AssetFactory.finish(g, 'tile-path', T, T);
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  UI TEXTURES
  // ────────────────────────────────────────────────────────────────

  static generateUITextures(scene: Phaser.Scene): void {
    // icon-coin
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xffd700);
      g.fillCircle(12, 12, 10);
      g.fillStyle(0xffa000);
      g.fillCircle(12, 12, 7);
      g.fillStyle(0xffd700);
      // 'C' approximation — just a thicker arc
      g.lineStyle(2, 0xfff176);
      g.beginPath();
      g.arc(12, 12, 4, -0.6, Math.PI + 0.6, false);
      g.strokePath();
      AssetFactory.finish(g, 'icon-coin', 24, 24);
    }

    // icon-spirit
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x9c27b0);
      // diamond shape
      g.fillTriangle(12, 2, 2, 12, 12, 22);
      g.fillTriangle(12, 2, 22, 12, 12, 22);
      g.fillStyle(0xce93d8, 0.5);
      g.fillTriangle(12, 6, 6, 12, 12, 18);
      AssetFactory.finish(g, 'icon-spirit', 24, 24);
    }

    // icon-petbook
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x6d4c41);
      g.fillRect(4, 2, 24, 28);
      g.fillStyle(0x8d6e63);
      g.fillRect(6, 4, 20, 24);
      // pages
      g.fillStyle(0xfff8e1);
      g.fillRect(8, 4, 16, 24);
      // spine
      g.fillStyle(0x5d4037);
      g.fillRect(4, 2, 4, 28);
      // paw print
      g.fillStyle(0x6d4c41);
      g.fillCircle(18, 16, 3);
      g.fillCircle(14, 12, 2);
      g.fillCircle(22, 12, 2);
      AssetFactory.finish(g, 'icon-petbook', 32, 32);
    }

    // icon-map
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xd7ccc8);
      g.fillRect(4, 6, 24, 20);
      // scroll ends
      g.fillStyle(0xbcaaa4);
      g.fillCircle(4, 16, 3);
      g.fillCircle(28, 16, 3);
      // map lines
      g.lineStyle(1, 0x8d6e63);
      g.lineBetween(8, 12, 20, 12);
      g.lineBetween(10, 16, 24, 16);
      g.lineBetween(8, 20, 18, 20);
      // X mark
      g.lineStyle(2, 0xc62828);
      g.lineBetween(20, 18, 24, 22);
      g.lineBetween(24, 18, 20, 22);
      AssetFactory.finish(g, 'icon-map', 32, 32);
    }

    // icon-shop
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x8d6e63);
      g.fillTriangle(16, 4, 4, 16, 28, 16);
      g.fillRect(6, 16, 20, 14);
      g.fillStyle(0x6d4c41);
      g.fillRect(6, 16, 20, 3);
      // coin symbol
      g.fillStyle(0xffd700);
      g.fillCircle(16, 24, 3);
      AssetFactory.finish(g, 'icon-shop', 32, 32);
    }

    // icon-bag
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x8d6e63);
      g.fillRect(6, 12, 20, 18);
      g.fillStyle(0x6d4c41);
      g.fillRect(6, 12, 20, 4);
      // straps
      g.lineStyle(2, 0x5d4037);
      g.beginPath();
      g.arc(16, 12, 8, Math.PI, 0, false);
      g.strokePath();
      // buckle
      g.fillStyle(0xffd700);
      g.fillRect(14, 14, 4, 3);
      AssetFactory.finish(g, 'icon-bag', 32, 32);
    }

    // icon-peace — Calm Mode (wild pets do not aggro)
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x81c784);
      g.fillCircle(16, 16, 13);
      g.lineStyle(2, 0x2e7d32);
      g.strokeCircle(16, 16, 13);
      // simple dove / leaf silhouette
      g.fillStyle(0xffffff);
      g.fillEllipse(16, 16, 14, 8);
      g.fillCircle(22, 12, 4);
      AssetFactory.finish(g, 'icon-peace', 32, 32);
    }

    // btn-bg
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x2c3e50);
      g.fillRoundedRect(0, 0, 200, 50, 8);
      AssetFactory.finish(g, 'btn-bg', 200, 50);
    }

    // panel-bg
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x1a1a2e, 0.9);
      g.fillRoundedRect(0, 0, 400, 300, 12);
      g.lineStyle(2, 0x3498db);
      g.strokeRoundedRect(0, 0, 400, 300, 12);
      AssetFactory.finish(g, 'panel-bg', 400, 300);
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  ITEM ICONS
  // ────────────────────────────────────────────────────────────────

  static generateItemIcons(scene: Phaser.Scene): void {
    const S = 32;

    // item-star-staff
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x8b4513);
      g.fillRect(14, 12, 4, 18);
      // star
      g.fillStyle(0xffd700);
      AssetFactory.drawStar(g, 16, 8, 6, 3, 5);
      AssetFactory.finish(g, 'item-star-staff', S, S);
    }

    // item-rock-hammer
    {
      const g = AssetFactory.gfx(scene);
      // handle
      g.fillStyle(0x8b4513);
      g.fillRect(14, 14, 4, 16);
      // head
      g.fillStyle(0x78909c);
      g.fillRect(6, 6, 20, 10);
      AssetFactory.finish(g, 'item-rock-hammer', S, S);
    }

    // item-nature-wand
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x8d6e63);
      g.fillRect(14, 10, 4, 20);
      // leaf tip
      g.fillStyle(0x4caf50);
      g.fillTriangle(16, 2, 8, 12, 24, 12);
      AssetFactory.finish(g, 'item-nature-wand', S, S);
    }

    // item-wood-staff
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0x6d4c41);
      g.fillRect(14, 8, 4, 22);
      // green gem
      g.fillStyle(0x4caf50);
      g.fillCircle(16, 6, 5);
      g.fillStyle(0x81c784, 0.5);
      g.fillCircle(14, 4, 2);
      AssetFactory.finish(g, 'item-wood-staff', S, S);
    }

    // item-water-trident
    {
      const g = AssetFactory.gfx(scene);
      // shaft
      g.fillStyle(0x1976d2);
      g.fillRect(14, 10, 4, 20);
      // prongs
      g.fillStyle(0x42a5f5);
      g.fillRect(14, 4, 4, 8);
      g.fillRect(6, 2, 4, 10);
      g.fillRect(22, 2, 4, 10);
      // tips
      g.fillStyle(0x90caf9);
      g.fillTriangle(8, 0, 6, 4, 10, 4);
      g.fillTriangle(16, 0, 14, 4, 18, 4);
      g.fillTriangle(24, 0, 22, 4, 26, 4);
      AssetFactory.finish(g, 'item-water-trident', S, S);
    }

    // item-health-potion
    {
      const g = AssetFactory.gfx(scene);
      // bottle body
      g.fillStyle(0xe53935);
      g.fillRoundedRect(8, 14, 16, 16, 4);
      // neck
      g.fillStyle(0xef5350);
      g.fillRect(12, 8, 8, 8);
      // cork
      g.fillStyle(0x8d6e63);
      g.fillRect(12, 4, 8, 5);
      // shine
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(10, 16, 3, 8);
      AssetFactory.finish(g, 'item-health-potion', S, S);
    }

    // item-super-health-potion
    {
      const g = AssetFactory.gfx(scene);
      // bottle body — bigger
      g.fillStyle(0xc62828);
      g.fillRoundedRect(6, 12, 20, 18, 4);
      // neck
      g.fillStyle(0xe53935);
      g.fillRect(11, 6, 10, 8);
      // cork
      g.fillStyle(0x8d6e63);
      g.fillRect(11, 2, 10, 5);
      // glow
      g.fillStyle(0xffcdd2, 0.4);
      g.fillCircle(16, 20, 6);
      // shine
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(8, 14, 3, 10);
      AssetFactory.finish(g, 'item-super-health-potion', S, S);
    }

    // item-apple
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xe53935);
      g.fillCircle(16, 20, 10);
      // stem
      g.fillStyle(0x6d4c41);
      g.fillRect(15, 6, 2, 6);
      // leaf
      g.fillStyle(0x4caf50);
      g.fillTriangle(17, 8, 24, 6, 20, 12);
      AssetFactory.finish(g, 'item-apple', S, S);
    }

    // item-feast
    {
      const g = AssetFactory.gfx(scene);
      // plate
      g.fillStyle(0xd7ccc8);
      g.fillCircle(16, 20, 12);
      g.fillStyle(0xefebe9);
      g.fillCircle(16, 20, 9);
      // food items
      g.fillStyle(0xe53935);
      g.fillCircle(12, 18, 3);
      g.fillStyle(0xff9800);
      g.fillCircle(20, 18, 3);
      g.fillStyle(0x4caf50);
      g.fillCircle(16, 22, 3);
      g.fillStyle(0x8d6e63);
      g.fillCircle(16, 16, 2);
      AssetFactory.finish(g, 'item-feast', S, S);
    }
  }

  /** Draw a star polygon. */
  private static drawStar(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number,
  ): void {
    const step = Math.PI / points;
    const path: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      path.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      g.lineTo(path[i].x, path[i].y);
    }
    g.closePath();
    g.fillPath();
  }

  // ────────────────────────────────────────────────────────────────
  //  CHEST
  // ────────────────────────────────────────────────────────────────

  static generateChestTexture(scene: Phaser.Scene): void {
    const S = 32;

    // chest (closed)
    {
      const g = AssetFactory.gfx(scene);
      // body
      g.fillStyle(0x8d6e63);
      g.fillRect(4, 12, 24, 16);
      // lid
      g.fillStyle(0xa1887f);
      g.fillRect(4, 8, 24, 6);
      // metal bands
      g.fillStyle(0xffd700);
      g.fillRect(4, 14, 24, 2);
      // lock
      g.fillStyle(0xffd700);
      g.fillCircle(16, 18, 3);
      g.fillStyle(0x8d6e63);
      g.fillCircle(16, 18, 1.5);
      AssetFactory.finish(g, 'chest', S, S);
    }

    // chest-open
    {
      const g = AssetFactory.gfx(scene);
      // body
      g.fillStyle(0x8d6e63);
      g.fillRect(4, 16, 24, 14);
      // inside (dark)
      g.fillStyle(0x3e2723);
      g.fillRect(6, 18, 20, 10);
      // lid (tilted up)
      g.fillStyle(0xa1887f);
      g.fillRect(4, 4, 24, 6);
      // lid hinge line
      g.lineStyle(1, 0x6d4c41);
      g.lineBetween(4, 10, 4, 16);
      g.lineBetween(28, 10, 28, 16);
      // sparkle inside
      g.fillStyle(0xffd700);
      g.fillCircle(12, 22, 2);
      g.fillCircle(20, 20, 2);
      g.fillCircle(16, 24, 2);
      AssetFactory.finish(g, 'chest-open', S, S);
    }
  }

  // ────────────────────────────────────────────────────────────────
  //  TYPE ICONS
  // ────────────────────────────────────────────────────────────────

  static generateTypeIcons(scene: Phaser.Scene): void {
    const S = 24;
    const defs: { key: string; color: number; label: string }[] = [
      { key: 'type-rock', color: 0x78909c, label: 'R' },
      { key: 'type-nature', color: 0x4caf50, label: 'N' },
      { key: 'type-wood', color: 0x8d6e63, label: 'W' },
      { key: 'type-water', color: 0x2196f3, label: 'Wa' },
      { key: 'type-normal', color: 0xbdbdbd, label: '-' },
    ];

    for (const def of defs) {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(def.color);
      g.fillCircle(12, 12, 10);
      g.fillStyle(0xffffff);
      g.fillCircle(12, 12, 7);
      g.fillStyle(def.color);
      g.fillCircle(12, 12, 6);
      // We can't draw text with Graphics — generate the badge circle only.
      // Text labels are added at runtime by consumers.
      AssetFactory.finish(g, def.key, S, S);
    }
  }

  /** Small rowboat for Aqua Isles (dock + sailing on deep water). */
  static generateBoatSprite(scene: Phaser.Scene): void {
    const w = 48;
    const h = 32;
    const g = AssetFactory.gfx(scene);
    g.fillStyle(0x4e342e);
    g.fillEllipse(24, 22, 38, 14);
    g.fillStyle(0x6d4c41);
    g.fillEllipse(24, 21, 32, 7);
    g.fillStyle(0x3e2723);
    g.fillRect(22, 9, 3, 15);
    g.fillStyle(0xfffde7, 0.95);
    g.fillTriangle(25, 9, 40, 17, 25, 21);
    g.lineStyle(1, 0x2e1b14);
    g.strokeEllipse(24, 22, 38, 14);
    AssetFactory.finish(g, 'sprite-boat', w, h);
  }
}
