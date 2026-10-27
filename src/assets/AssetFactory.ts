import Phaser from 'phaser';
import { PET_TEMPLATES } from '../data/pets';
import { PetType } from '../types';
import { TILE_SIZE } from '../constants';
import { drawPolygonPet } from './petArt';

/**
 * AssetFactory generates ALL game textures programmatically using
 * Phaser's Graphics API + generateTexture(). No external image files needed.
 */
/** Supersampling factor for smooth pet art (see drawSmoothPet). */
const PET_ART_SCALE = 3;

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
        case PetType.Normal:
          AssetFactory.drawNormalPet(scene, template.id);
          break;
        case PetType.Light:
          AssetFactory.drawLightPet(scene, template.id);
          break;
        case PetType.Shadow:
          AssetFactory.drawShadowPet(scene, template.id);
          break;
        case PetType.Fire:
          AssetFactory.drawFirePet(scene, template.id);
          break;
        case PetType.Ice:
          AssetFactory.drawIcePet(scene, template.id);
          break;
      }
    }
  }

  /**
   * Smooth, high-resolution pet art (Rock / Nature / Wood / Water / Light / Shadow). The texture is drawn
   * PET_ART_SCALE times larger than its logical 48x48 size, then the frame is told it is
   * still 48x48 — so every setScale(), physics body and layout that assumes a 48px pet
   * keeps working while edges stay crisp instead of blocky.
   */
  private static drawSmoothPet(scene: Phaser.Scene, id: string): void {
    const k = PET_ART_SCALE;
    const g = AssetFactory.gfx(scene);
    if (!drawPolygonPet(g, id, k)) {
      g.fillStyle(0x9e9e9e);
      g.fillCircle(24 * k, 28 * k, 16 * k);
      AssetFactory.drawEyes(g, 24 * k, 26 * k, 10 * k, 3 * k);
    }
    g.generateTexture(id, 48 * k, 48 * k);
    g.destroy();

    // Phaser's typings mark some of these read-only; they are plain fields at runtime.
    // WebGL sizes the quad from cutWidth/cutHeight but takes UVs computed earlier from the
    // full texture, so shrinking the cut size leaves the hi-res sampling untouched.
    // Canvas reads canvasData instead: sample the whole texture, draw it 48x48.
    const frame = scene.textures.get(id).get() as unknown as {
      width: number; height: number; cutWidth: number; cutHeight: number;
      halfWidth: number; halfHeight: number; centerX: number; centerY: number;
      canvasData: { sx: number; sy: number; sWidth: number; sHeight: number; dWidth: number; dHeight: number };
      data: {
        sourceSize: { w: number; h: number };
        spriteSourceSize: { w: number; h: number };
        drawImage: { width: number; height: number };
      };
    };
    frame.width = frame.height = frame.cutWidth = frame.cutHeight = 48;
    frame.halfWidth = frame.halfHeight = frame.centerX = frame.centerY = 24;
    frame.data.sourceSize.w = frame.data.sourceSize.h = 48;
    frame.data.spriteSourceSize.w = frame.data.spriteSourceSize.h = 48;
    frame.data.drawImage.width = frame.data.drawImage.height = 48;
    frame.canvasData.sx = frame.canvasData.sy = 0;
    frame.canvasData.sWidth = frame.canvasData.sHeight = 48 * k;
    frame.canvasData.dWidth = frame.canvasData.dHeight = 48;
  }

  // --- ROCK PETS ---

  private static drawRockPet(scene: Phaser.Scene, id: string): void {
    AssetFactory.drawSmoothPet(scene, id);
  }

  // --- NATURE PETS ---

  private static drawNaturePet(scene: Phaser.Scene, id: string): void {
    AssetFactory.drawSmoothPet(scene, id);
  }

  // --- WOOD PETS ---

  private static drawWoodPet(scene: Phaser.Scene, id: string): void {
    AssetFactory.drawSmoothPet(scene, id);
  }

  // --- WATER PETS ---

  private static drawWaterPet(scene: Phaser.Scene, id: string): void {
    AssetFactory.drawSmoothPet(scene, id);
  }

  // --- NORMAL PETS (Henry's Ranch exclusives) ---

  private static drawNormalPet(scene: Phaser.Scene, id: string): void {
    const g = AssetFactory.gfx(scene);
    const s = 48;

    switch (id) {
      // ── Mustang — chestnut horse, profile facing right ──────────
      case 'mustang': {
        // Tail (far left, drawn first so body covers base)
        g.fillStyle(0x3B1A08);
        g.fillEllipse(5, 28, 7, 22);
        g.fillStyle(0x5C2A10);
        g.fillEllipse(5, 30, 4, 16);
        // Body
        g.fillStyle(0x8B4513);
        g.fillEllipse(20, 32, 30, 16);
        // Neck
        g.fillRect(26, 20, 9, 14);
        // Head
        g.fillStyle(0xA0522D);
        g.fillEllipse(37, 17, 15, 11);
        // Mane along neck
        g.fillStyle(0x3B1A08);
        g.fillRect(26, 14, 5, 12);
        g.fillEllipse(28, 13, 8, 7);
        // Ear
        g.fillStyle(0x8B4513);
        g.fillTriangle(33, 8, 30, 16, 36, 16);
        g.fillStyle(0xFFB3B3);
        g.fillTriangle(33, 10, 31, 15, 35, 15);
        // Nostril
        g.fillStyle(0x3B1A08);
        g.fillCircle(43, 18, 2);
        // Legs
        g.fillStyle(0x6B3410);
        g.fillRect(10, 37, 4, 11);
        g.fillRect(16, 37, 4, 10);
        g.fillRect(23, 37, 4, 10);
        g.fillRect(29, 37, 4, 11);
        // Hooves
        g.fillStyle(0x2E1B00);
        g.fillRect(9, 45, 6, 3);
        g.fillRect(15, 44, 6, 3);
        g.fillRect(22, 44, 6, 3);
        g.fillRect(28, 45, 6, 3);
        // Eyes
        AssetFactory.drawEyes(g, 36, 15, 7, 2.5);
        break;
      }

      // ── Bullhorn — stocky dark bull with ivory horns ─────────────
      case 'bullhorn': {
        // Tail
        g.fillStyle(0x2E1B15);
        g.fillEllipse(5, 28, 5, 18);
        // Body
        g.fillStyle(0x3E2723);
        g.fillEllipse(20, 33, 32, 18);
        // Head
        g.fillEllipse(35, 21, 18, 15);
        // Horns (ivory, sweeping outward)
        g.fillStyle(0xFFFDE7);
        g.fillTriangle(30, 15, 24, 2, 33, 12);
        g.fillTriangle(40, 15, 47, 2, 38, 12);
        // Horn shading
        g.fillStyle(0xE8E0C0);
        g.fillTriangle(31, 15, 26, 5, 33, 13);
        g.fillTriangle(39, 15, 45, 5, 37, 13);
        // Snout
        g.fillStyle(0x5D4037);
        g.fillEllipse(37, 25, 11, 8);
        // Nostrils
        g.fillStyle(0x2E1B15);
        g.fillCircle(34, 25, 2);
        g.fillCircle(40, 25, 2);
        // Legs (short, stout)
        g.fillStyle(0x2E1B15);
        g.fillRect(8, 38, 5, 10);
        g.fillRect(15, 38, 5, 9);
        g.fillRect(23, 38, 5, 9);
        g.fillRect(30, 38, 5, 10);
        // Angry brow
        g.lineStyle(2, 0x000000);
        g.beginPath(); g.moveTo(30, 14); g.lineTo(34, 17); g.strokePath();
        g.beginPath(); g.moveTo(41, 14); g.lineTo(37, 17); g.strokePath();
        // Eyes
        AssetFactory.drawEyes(g, 35, 19, 9, 3);
        break;
      }

      // ── Coyote — lean tan predator with pointed ears ─────────────
      case 'coyote': {
        // Bushy tail (far left)
        g.fillStyle(0xC8A87E);
        g.fillEllipse(5, 26, 9, 24);
        g.fillStyle(0xF5ECD7);
        g.fillEllipse(5, 28, 5, 16);
        // Body (lean)
        g.fillStyle(0xC8A87E);
        g.fillEllipse(19, 31, 24, 13);
        // Head
        g.fillCircle(29, 19, 10);
        // Ears (pointed)
        g.fillStyle(0xB8966A);
        g.fillTriangle(24, 7, 20, 18, 27, 18);
        g.fillTriangle(33, 7, 29, 18, 36, 18);
        // Inner ear pink
        g.fillStyle(0xFFB3C6);
        g.fillTriangle(24, 10, 22, 17, 27, 17);
        g.fillTriangle(33, 10, 30, 17, 35, 17);
        // Snout (elongated, pointing right)
        g.fillStyle(0xC8A87E);
        g.fillEllipse(37, 22, 14, 8);
        // Nose
        g.fillStyle(0x2E1B00);
        g.fillCircle(43, 21, 3);
        g.fillStyle(0x000000);
        g.fillCircle(43, 21, 2);
        // Legs (thin)
        g.fillStyle(0xB8966A);
        g.fillRect(11, 36, 3, 12);
        g.fillRect(17, 36, 3, 11);
        g.fillRect(23, 36, 3, 11);
        g.fillRect(29, 36, 3, 12);
        // Paws
        g.fillStyle(0xA07850);
        g.fillEllipse(12, 47, 5, 3);
        g.fillEllipse(18, 46, 5, 3);
        g.fillEllipse(24, 46, 5, 3);
        g.fillEllipse(30, 47, 5, 3);
        // Eyes (sharp, angular)
        AssetFactory.drawEyes(g, 28, 18, 8, 2.5);
        break;
      }

      // ── Henry Beast Master — cowboy human fighter ────────────────
      case 'henry-beast-master': {
        // Hat crown
        g.fillStyle(0x4E342E);
        g.fillRect(17, 1, 15, 9);
        // Hat brim
        g.fillRect(10, 8, 28, 4);
        // Hat band
        g.fillStyle(0x8B6914);
        g.fillRect(17, 7, 15, 3);
        // Hat buckle
        g.fillStyle(0xFFD700);
        g.fillRect(22, 7, 5, 3);
        // Head (skin tone)
        g.fillStyle(0xF5CBA7);
        g.fillCircle(24, 18, 9);
        // Mustache
        g.fillStyle(0x5C3A1E);
        g.fillEllipse(21, 22, 7, 3);
        g.fillEllipse(28, 22, 7, 3);
        // Neck
        g.fillStyle(0xF5CBA7);
        g.fillRect(21, 26, 6, 4);
        // Flannel shirt
        g.fillStyle(0x8D4A3C);
        g.fillRect(13, 28, 22, 12);
        // Shirt stripes
        g.fillStyle(0x7B3B30);
        g.fillRect(13, 31, 22, 2);
        g.fillRect(13, 35, 22, 2);
        // Arms
        g.fillStyle(0x8D4A3C);
        g.fillRect(7, 28, 6, 10);
        g.fillRect(35, 28, 6, 10);
        // Hands
        g.fillStyle(0xF5CBA7);
        g.fillCircle(10, 39, 3);
        g.fillCircle(38, 39, 3);
        // Belt
        g.fillStyle(0x3E2723);
        g.fillRect(13, 39, 22, 4);
        // Buckle
        g.fillStyle(0xFFD700);
        g.fillRect(20, 39, 8, 4);
        // Jeans
        g.fillStyle(0x1565C0);
        g.fillRect(14, 42, 8, 6);
        g.fillRect(26, 42, 8, 6);
        // Boots
        g.fillStyle(0x3E2723);
        g.fillRect(12, 44, 10, 4);
        g.fillRect(26, 44, 10, 4);
        // Eyes
        AssetFactory.drawEyes(g, 24, 17, 9, 2.5);
        break;
      }

      default: {
        // Fallback for any future Normal-type pet
        g.fillStyle(0x9E9E9E);
        g.fillCircle(24, 28, 16);
        g.fillStyle(0xBDBDBD);
        g.fillCircle(24, 22, 10);
        AssetFactory.drawEyes(g, 24, 22, 8, 3);
        break;
      }
    }

    AssetFactory.finish(g, id, s, s);
  }

  /** Glowing slit-style eyes for Shadow pets (dark socket + coloured glint). */
  private static drawGlintEyes(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    spacing: number,
    size: number,
    color: number,
  ): void {
    g.fillStyle(0x0a0010);
    g.fillCircle(cx - spacing / 2, cy, size);
    g.fillCircle(cx + spacing / 2, cy, size);
    g.fillStyle(color);
    g.fillCircle(cx - spacing / 2, cy, size * 0.6);
    g.fillCircle(cx + spacing / 2, cy, size * 0.6);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx - spacing / 2 - size * 0.25, cy - size * 0.25, size * 0.2);
    g.fillCircle(cx + spacing / 2 - size * 0.25, cy - size * 0.25, size * 0.2);
  }

  // --- FIRE PETS ---

  private static drawFirePet(scene: Phaser.Scene, id: string): void {
    const g = AssetFactory.gfx(scene);
    const s = 48;

    switch (id) {
      case 'cinder': {
        // Smouldering coal — dark lump with glowing cracks and a small flame
        g.fillStyle(0xff7043, 0.3);
        g.fillCircle(24, 30, 17);
        g.fillStyle(0x4e342e);
        g.fillCircle(24, 30, 13);
        g.fillStyle(0x6d4c41);
        g.fillCircle(21, 26, 7);
        g.lineStyle(2, 0xff6d00);
        g.lineBetween(14, 34, 20, 30);
        g.lineBetween(34, 34, 29, 31);
        g.lineBetween(24, 42, 24, 37);
        g.fillStyle(0xff7043);
        g.fillTriangle(24, 8, 18, 19, 30, 19);
        g.fillStyle(0xffca28);
        g.fillTriangle(24, 12, 21, 19, 27, 19);
        g.fillStyle(0x3e2723);
        g.fillCircle(17, 43, 4);
        g.fillCircle(31, 43, 4);
        AssetFactory.drawEyes(g, 24, 29, 10, 3);
        break;
      }
      case 'ashwing': {
        // Evolved cinder — ash-grey body, ember wings, flame crest
        g.fillStyle(0xff7043, 0.25);
        g.fillCircle(24, 26, 22);
        g.fillStyle(0xff6d00);
        g.fillTriangle(2, 20, 17, 18, 15, 34);
        g.fillTriangle(46, 20, 31, 18, 33, 34);
        g.fillStyle(0xffca28);
        g.fillTriangle(6, 22, 16, 21, 15, 31);
        g.fillTriangle(42, 22, 32, 21, 33, 31);
        g.fillStyle(0x757575);
        g.fillCircle(24, 28, 13);
        g.fillStyle(0x9e9e9e);
        g.fillCircle(24, 25, 9);
        g.fillStyle(0xff7043);
        g.fillTriangle(24, 3, 18, 15, 30, 15);
        g.fillStyle(0xffca28);
        g.fillTriangle(24, 7, 21, 15, 27, 15);
        g.lineStyle(2, 0xff6d00);
        g.lineBetween(18, 36, 22, 32);
        g.lineBetween(30, 36, 26, 32);
        AssetFactory.drawEyes(g, 24, 27, 10, 3);
        break;
      }
      case 'kindle': {
        // Fox kit — orange body, cream cheeks, tail tipped with flame
        g.fillStyle(0xff7043);
        g.fillCircle(37, 32, 8);
        g.fillStyle(0xffca28);
        g.fillTriangle(37, 16, 32, 26, 42, 26);
        g.fillStyle(0xff7043);
        g.fillTriangle(37, 19, 34, 26, 40, 26);
        g.fillStyle(0xff8a50);
        g.fillCircle(22, 34, 11);
        g.fillCircle(22, 22, 11);
        g.fillStyle(0xff7043);
        g.fillTriangle(12, 14, 14, 4, 20, 13);
        g.fillTriangle(32, 14, 30, 4, 24, 13);
        g.fillStyle(0x3e2723);
        g.fillTriangle(14, 12, 15, 6, 18, 12);
        g.fillTriangle(30, 12, 29, 6, 26, 12);
        g.fillStyle(0xfff3e0);
        g.fillCircle(15, 26, 5);
        g.fillCircle(29, 26, 5);
        g.fillCircle(22, 38, 6);
        g.fillStyle(0x3e2723);
        g.fillCircle(22, 26, 2);
        AssetFactory.drawEyes(g, 22, 21, 10, 3);
        break;
      }
      case 'blazeling': {
        // Evolved kindle — fox with a flaming mane and a huge burning tail
        g.fillStyle(0xff7043, 0.25);
        g.fillCircle(24, 26, 22);
        g.fillStyle(0xff6d00);
        g.fillCircle(38, 33, 9);
        g.fillStyle(0xffca28);
        g.fillTriangle(40, 8, 33, 26, 47, 26);
        g.fillStyle(0xff7043);
        g.fillTriangle(40, 13, 36, 26, 45, 26);
        g.fillStyle(0xff6d00);
        g.fillTriangle(10, 22, 6, 6, 18, 16);
        g.fillTriangle(22, 14, 22, 0, 28, 14);
        g.fillTriangle(38, 20, 32, 4, 26, 16);
        g.fillStyle(0xffca28);
        g.fillTriangle(11, 20, 9, 10, 16, 17);
        g.fillTriangle(23, 14, 23, 5, 26, 14);
        g.fillStyle(0xff8a50);
        g.fillCircle(21, 36, 10);
        g.fillCircle(22, 24, 11);
        g.fillStyle(0xfff3e0);
        g.fillCircle(15, 28, 5);
        g.fillCircle(29, 28, 5);
        g.fillCircle(21, 40, 5);
        g.fillStyle(0x3e2723);
        g.fillCircle(22, 28, 2);
        AssetFactory.drawEyes(g, 22, 23, 10, 3);
        break;
      }
      case 'magmite': {
        // Lava-skinned crawler — dark rocky shell with glowing seams and stubby legs
        g.fillStyle(0xff6d00, 0.3);
        g.fillEllipse(24, 30, 42, 26);
        g.lineStyle(3, 0x3e2723);
        g.lineBetween(10, 36, 6, 44);
        g.lineBetween(18, 38, 16, 46);
        g.lineBetween(30, 38, 32, 46);
        g.lineBetween(38, 36, 42, 44);
        g.fillStyle(0x5d4037);
        g.fillEllipse(24, 30, 36, 22);
        g.fillStyle(0x6d4c41);
        g.fillEllipse(22, 26, 22, 12);
        g.lineStyle(2, 0xff6d00);
        g.lineBetween(12, 30, 20, 28);
        g.lineBetween(20, 28, 24, 34);
        g.lineBetween(24, 34, 32, 30);
        g.lineBetween(32, 30, 36, 33);
        g.fillStyle(0xffca28);
        g.fillCircle(20, 28, 2);
        g.fillCircle(32, 30, 2);
        AssetFactory.drawEyes(g, 36, 25, 7, 3);
        break;
      }
      case 'calderon': {
        // Evolved magmite — walking volcano with a glowing crater on its back
        g.fillStyle(0xff6d00, 0.3);
        g.fillEllipse(24, 30, 46, 28);
        g.lineStyle(4, 0x3e2723);
        g.lineBetween(10, 38, 6, 46);
        g.lineBetween(20, 40, 18, 47);
        g.lineBetween(30, 40, 32, 47);
        g.lineBetween(40, 38, 44, 46);
        g.fillStyle(0x5d4037);
        g.fillEllipse(24, 32, 40, 22);
        g.fillStyle(0x4e342e);
        g.fillTriangle(24, 4, 8, 30, 40, 30);
        g.fillStyle(0x6d4c41);
        g.fillTriangle(24, 8, 14, 28, 30, 28);
        g.fillStyle(0xff6d00);
        g.fillTriangle(24, 4, 19, 12, 29, 12);
        g.fillStyle(0xffca28);
        g.fillTriangle(24, 6, 22, 11, 26, 11);
        g.fillStyle(0xff7043, 0.9);
        g.fillCircle(17, 2, 1);
        g.fillCircle(31, 3, 1);
        g.lineStyle(2, 0xff6d00);
        g.lineBetween(16, 24, 20, 20);
        g.lineBetween(32, 24, 28, 20);
        AssetFactory.drawEyes(g, 24, 34, 12, 3);
        break;
      }
      case 'insinerix': {
        // Crow — charcoal body, ember-red wing tips and tail, yellow beak
        g.fillStyle(0xff7043, 0.25);
        g.fillCircle(24, 26, 19);
        g.fillStyle(0xe64a19);
        g.fillTriangle(34, 34, 46, 40, 40, 46);
        g.fillTriangle(34, 34, 46, 32, 44, 40);
        g.fillStyle(0xffca28);
        g.fillTriangle(38, 36, 45, 38, 41, 42);
        g.fillStyle(0x263238);
        g.fillEllipse(23, 30, 28, 20);
        g.fillCircle(18, 20, 10);
        g.fillStyle(0x37474f);
        g.fillEllipse(24, 32, 18, 12);
        g.fillStyle(0xe64a19);
        g.fillTriangle(24, 28, 40, 22, 38, 36);
        g.fillTriangle(26, 30, 44, 30, 36, 40);
        g.fillStyle(0xffca28);
        g.fillTriangle(8, 20, 1, 22, 8, 25);
        g.fillStyle(0xff7043);
        g.fillTriangle(14, 11, 16, 3, 20, 11);
        g.fillStyle(0xffca28);
        g.fillTriangle(15, 11, 16, 6, 18, 11);
        AssetFactory.drawEyes(g, 18, 19, 8, 3);
        break;
      }
      case 'phoenyx': {
        // Evolved insinerix — golden phoenix, spread flame wings, tail plumes
        g.fillStyle(0xffca28, 0.25);
        g.fillCircle(24, 24, 23);
        g.fillStyle(0xe64a19);
        g.fillTriangle(1, 8, 17, 20, 15, 36);
        g.fillTriangle(47, 8, 31, 20, 33, 36);
        g.fillStyle(0xff7043);
        g.fillTriangle(5, 14, 17, 22, 16, 34);
        g.fillTriangle(43, 14, 31, 22, 32, 34);
        g.fillStyle(0xffca28);
        g.fillTriangle(10, 20, 17, 25, 16, 33);
        g.fillTriangle(38, 20, 31, 25, 32, 33);
        g.fillStyle(0xe64a19);
        g.fillTriangle(20, 38, 16, 47, 24, 40);
        g.fillTriangle(28, 38, 32, 47, 24, 40);
        g.fillStyle(0xff7043);
        g.fillTriangle(24, 40, 21, 47, 27, 47);
        g.fillStyle(0xff8f00);
        g.fillEllipse(24, 28, 16, 22);
        g.fillCircle(24, 18, 8);
        g.fillStyle(0xffca28);
        g.fillEllipse(24, 30, 9, 13);
        g.fillStyle(0xff6d00);
        g.fillTriangle(24, 2, 20, 11, 28, 11);
        g.fillTriangle(18, 6, 18, 12, 22, 11);
        g.fillTriangle(30, 6, 30, 12, 26, 11);
        g.fillStyle(0xffeb3b);
        g.fillTriangle(24, 21, 21, 18, 27, 18);
        AssetFactory.drawEyes(g, 24, 17, 8, 2);
        break;
      }
      case 'infernal': {
        // Stag with antlers of living flame
        g.fillStyle(0xff6d00, 0.25);
        g.fillCircle(24, 26, 23);
        g.fillStyle(0xe64a19);
        g.fillTriangle(14, 14, 6, 4, 12, 18);
        g.fillTriangle(34, 14, 42, 4, 36, 18);
        g.fillTriangle(12, 12, 2, 12, 12, 17);
        g.fillTriangle(36, 12, 46, 12, 36, 17);
        g.fillTriangle(16, 10, 14, 0, 20, 10);
        g.fillTriangle(32, 10, 34, 0, 28, 10);
        g.fillStyle(0xffca28);
        g.fillTriangle(7, 7, 7, 12, 11, 15);
        g.fillTriangle(41, 7, 41, 12, 37, 15);
        g.fillTriangle(15, 5, 15, 9, 18, 9);
        g.fillTriangle(33, 5, 33, 9, 30, 9);
        g.fillStyle(0xbf360c);
        g.fillEllipse(24, 38, 28, 16);
        g.fillStyle(0xd84315);
        g.fillCircle(24, 25, 11);
        g.fillStyle(0xffccbc);
        g.fillEllipse(24, 31, 10, 7);
        g.fillStyle(0x3e2723);
        g.fillCircle(21, 31, 1);
        g.fillCircle(27, 31, 1);
        g.fillStyle(0xff6d00);
        g.fillCircle(24, 45, 2);
        AssetFactory.drawEyes(g, 24, 23, 10, 3);
        break;
      }
      case 'steamwyrm': {
        // Wyrm split down the middle: fire half, ice half, steam where they meet
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(24, 26, 22);
        // coiled body
        g.fillStyle(0xd84315);
        g.fillEllipse(15, 41, 26, 11);
        g.fillStyle(0x0288d1);
        g.fillEllipse(33, 41, 26, 11);
        g.fillStyle(0xff7043);
        g.fillEllipse(17, 39, 18, 6);
        g.fillStyle(0x4fc3f7);
        g.fillEllipse(31, 39, 18, 6);
        // neck
        g.fillStyle(0xff7043);
        g.fillTriangle(24, 22, 11, 41, 24, 41);
        g.fillStyle(0x4fc3f7);
        g.fillTriangle(24, 22, 37, 41, 24, 41);
        // head, one half-disc each side
        g.fillStyle(0xff7043);
        g.beginPath();
        g.arc(24, 22, 12, Math.PI / 2, Math.PI * 1.5, false);
        g.closePath();
        g.fillPath();
        g.fillStyle(0x4fc3f7);
        g.beginPath();
        g.arc(24, 22, 12, -Math.PI / 2, Math.PI / 2, false);
        g.closePath();
        g.fillPath();
        // horns
        g.fillStyle(0xffca28);
        g.fillTriangle(13, 15, 7, 5, 19, 11);
        g.fillStyle(0xe1f5fe);
        g.fillTriangle(35, 15, 41, 5, 29, 11);
        // seam where fire meets ice
        g.lineStyle(2, 0xffffff, 0.9);
        g.lineBetween(24, 10, 24, 41);
        // teeth
        g.fillStyle(0xffffff);
        g.fillTriangle(18, 30, 21, 30, 19, 34);
        g.fillTriangle(27, 30, 30, 30, 29, 34);
        // steam above the snout
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(20, 7, 3);
        g.fillCircle(24, 4, 3);
        g.fillCircle(28, 7, 3);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(24, 8, 3);
        AssetFactory.drawEyes(g, 24, 21, 10, 3);
        break;
      }
      default: {
        // Fallback for any Fire-type pet without a bespoke drawing
        g.fillStyle(0xff7043, 0.35);
        g.fillCircle(24, 28, 17);
        g.fillStyle(0xff7043);
        g.fillCircle(24, 30, 12);
        g.fillStyle(0xffca28);
        g.fillTriangle(24, 6, 17, 22, 31, 22);
        AssetFactory.drawEyes(g, 24, 29, 8, 3);
        break;
      }
    }

    AssetFactory.finish(g, id, s, s);
  }

  // --- ICE PETS ---

  private static drawIcePet(scene: Phaser.Scene, id: string): void {
    const g = AssetFactory.gfx(scene);
    const s = 48;

    switch (id) {
      case 'flurry': {
        // Snowball with stubby arms and a snowflake mark
        g.fillStyle(0xb3e5fc, 0.35);
        g.fillCircle(24, 28, 19);
        g.fillStyle(0xe1f5fe);
        g.fillCircle(24, 28, 15);
        g.fillStyle(0xffffff);
        g.fillCircle(21, 24, 9);
        g.fillStyle(0xe1f5fe);
        g.fillCircle(8, 30, 4);
        g.fillCircle(40, 30, 4);
        g.lineStyle(2, 0x81d4fa);
        g.lineBetween(24, 12, 24, 18);
        g.lineBetween(20, 14, 28, 16);
        g.lineBetween(28, 14, 20, 16);
        g.fillStyle(0xb3e5fc);
        g.fillCircle(18, 43, 4);
        g.fillCircle(30, 43, 4);
        AssetFactory.drawEyes(g, 24, 29, 10, 3);
        break;
      }
      case 'blizzard': {
        // Evolved flurry — big snowball with an ice crown and swirling wind
        g.fillStyle(0xb3e5fc, 0.3);
        g.fillCircle(24, 28, 22);
        g.lineStyle(2, 0x81d4fa);
        g.beginPath();
        g.arc(24, 28, 20, 0.2, 2.2, false);
        g.strokePath();
        g.beginPath();
        g.arc(24, 28, 20, 3.4, 5.4, false);
        g.strokePath();
        g.fillStyle(0xe1f5fe);
        g.fillCircle(24, 29, 16);
        g.fillStyle(0xffffff);
        g.fillCircle(20, 24, 10);
        g.fillStyle(0x4fc3f7);
        g.fillTriangle(24, 2, 19, 14, 29, 14);
        g.fillTriangle(14, 8, 14, 16, 21, 14);
        g.fillTriangle(34, 8, 34, 16, 27, 14);
        g.fillStyle(0xb3e5fc);
        g.fillTriangle(24, 5, 22, 13, 26, 13);
        g.fillStyle(0xe1f5fe);
        g.fillCircle(7, 32, 4);
        g.fillCircle(41, 32, 4);
        AssetFactory.drawEyes(g, 24, 30, 10, 3);
        break;
      }
      case 'frostix': {
        // Snow wolf — pale blue-grey fur, pointed ears, small fangs
        g.fillStyle(0xb3e5fc, 0.3);
        g.fillCircle(24, 26, 20);
        g.fillStyle(0x90a4ae);
        g.fillEllipse(24, 38, 30, 14);
        g.fillStyle(0xcfd8dc);
        g.fillCircle(24, 24, 13);
        g.fillStyle(0x90a4ae);
        g.fillTriangle(11, 18, 12, 4, 20, 14);
        g.fillTriangle(37, 18, 36, 4, 28, 14);
        g.fillStyle(0xeceff1);
        g.fillTriangle(13, 15, 13, 8, 18, 14);
        g.fillTriangle(35, 15, 35, 8, 30, 14);
        g.fillStyle(0xeceff1);
        g.fillEllipse(24, 31, 14, 10);
        g.fillStyle(0x263238);
        g.fillCircle(24, 28, 2);
        g.fillStyle(0xffffff);
        g.fillTriangle(20, 33, 22, 33, 21, 37);
        g.fillTriangle(26, 33, 28, 33, 27, 37);
        g.lineStyle(2, 0x4fc3f7);
        g.lineBetween(24, 13, 24, 18);
        g.lineBetween(19, 14, 21, 18);
        g.lineBetween(29, 14, 27, 18);
        g.lineStyle(2, 0xb0bec5);
        g.lineBetween(10, 44, 14, 47);
        g.lineBetween(38, 44, 34, 47);
        AssetFactory.drawEyes(g, 24, 22, 11, 3);
        break;
      }
      case 'mammothox': {
        // Evolved frostix — shaggy, horned and tusked beast
        g.fillStyle(0xb3e5fc, 0.3);
        g.fillCircle(24, 26, 23);
        g.fillStyle(0x78909c);
        g.fillEllipse(24, 34, 42, 24);
        g.fillStyle(0x90a4ae);
        g.fillEllipse(24, 32, 36, 20);
        g.lineStyle(2, 0x607d8b);
        g.lineBetween(8, 36, 6, 44);
        g.lineBetween(14, 40, 13, 47);
        g.lineBetween(34, 40, 35, 47);
        g.lineBetween(40, 36, 42, 44);
        g.fillStyle(0xcfd8dc);
        g.fillCircle(24, 22, 13);
        g.fillStyle(0xeceff1);
        g.fillCircle(24, 18, 9);
        g.fillStyle(0xfff8e1);
        g.fillTriangle(8, 22, 14, 14, 16, 22);
        g.fillTriangle(40, 22, 34, 14, 32, 22);
        g.fillStyle(0xb3e5fc);
        g.fillTriangle(4, 34, 11, 26, 17, 34);
        g.fillTriangle(44, 34, 37, 26, 31, 34);
        g.fillStyle(0xffffff);
        g.fillTriangle(10, 36, 13, 28, 15, 38);
        g.fillTriangle(38, 36, 35, 28, 33, 38);
        g.fillStyle(0x4fc3f7);
        g.fillTriangle(24, 2, 19, 11, 29, 11);
        g.fillStyle(0x263238);
        g.fillEllipse(24, 28, 10, 6);
        AssetFactory.drawEyes(g, 24, 21, 12, 3);
        break;
      }
      case 'glacet': {
        // Seal — smooth blue body, flippers, whisker dots, sliding on an ice patch
        g.fillStyle(0xe1f5fe, 0.9);
        g.fillEllipse(24, 43, 40, 8);
        g.fillStyle(0x81d4fa, 0.5);
        g.fillEllipse(24, 43, 30, 5);
        g.fillStyle(0x4fc3f7);
        g.fillEllipse(24, 30, 34, 22);
        g.fillCircle(32, 20, 11);
        g.fillStyle(0x81d4fa);
        g.fillEllipse(22, 34, 24, 10);
        g.fillStyle(0x4fc3f7);
        g.fillTriangle(8, 34, 2, 44, 14, 40);
        g.fillTriangle(14, 38, 10, 46, 20, 42);
        g.fillStyle(0xe1f5fe);
        g.fillEllipse(35, 25, 12, 8);
        g.fillStyle(0x263238);
        g.fillCircle(38, 22, 2);
        g.fillStyle(0x01579b);
        g.fillCircle(33, 26, 1);
        g.fillCircle(36, 27, 1);
        g.fillCircle(39, 26, 1);
        AssetFactory.drawEyes(g, 31, 17, 7, 3);
        break;
      }
      case 'glaciarch': {
        // Evolved glacet — bigger seal with an arch of glacier ice on its back
        g.fillStyle(0xe1f5fe, 0.9);
        g.fillEllipse(24, 44, 44, 7);
        g.fillStyle(0x0288d1);
        g.fillEllipse(24, 32, 38, 22);
        g.fillCircle(33, 22, 11);
        g.fillStyle(0x4fc3f7);
        g.fillEllipse(22, 36, 26, 10);
        g.fillStyle(0xb3e5fc);
        g.fillTriangle(8, 28, 12, 6, 20, 26);
        g.fillTriangle(16, 28, 22, 2, 28, 26);
        g.fillStyle(0xe1f5fe);
        g.fillTriangle(10, 26, 12, 12, 16, 25);
        g.fillTriangle(19, 25, 22, 8, 25, 25);
        g.fillStyle(0x81d4fa);
        g.fillTriangle(2, 36, 6, 28, 12, 38);
        g.fillStyle(0xfff8e1);
        g.fillTriangle(38, 28, 43, 36, 36, 31);
        g.fillStyle(0xe1f5fe);
        g.fillEllipse(37, 27, 12, 8);
        g.fillStyle(0x263238);
        g.fillCircle(40, 24, 2);
        AssetFactory.drawEyes(g, 33, 19, 7, 3);
        break;
      }
      case 'snowhare': {
        // Hare — white body, long upright ears with blue insides, pom-pom tail
        g.fillStyle(0xb3e5fc, 0.3);
        g.fillCircle(24, 30, 18);
        g.fillStyle(0xffffff);
        g.fillCircle(38, 38, 5);
        g.fillEllipse(23, 37, 26, 18);
        g.fillCircle(22, 26, 11);
        g.fillEllipse(15, 10, 7, 22);
        g.fillEllipse(29, 10, 7, 22);
        g.fillStyle(0x81d4fa);
        g.fillEllipse(15, 11, 3, 15);
        g.fillEllipse(29, 11, 3, 15);
        g.fillStyle(0xe1f5fe);
        g.fillEllipse(22, 32, 12, 8);
        g.fillStyle(0xf48fb1);
        g.fillCircle(22, 29, 2);
        g.fillStyle(0xb3e5fc);
        g.fillEllipse(14, 45, 12, 5);
        g.fillEllipse(30, 45, 12, 5);
        AssetFactory.drawEyes(g, 22, 24, 9, 3);
        break;
      }
      case 'whitewind': {
        // Evolved snowhare — sleek hare in a streaming cloak of wind
        g.fillStyle(0xb3e5fc, 0.3);
        g.fillCircle(24, 28, 22);
        g.lineStyle(3, 0x81d4fa);
        g.lineBetween(2, 24, 14, 28);
        g.lineBetween(0, 32, 14, 34);
        g.lineBetween(3, 40, 15, 40);
        g.lineStyle(2, 0xe1f5fe);
        g.lineBetween(4, 28, 14, 31);
        g.lineBetween(4, 36, 14, 37);
        g.fillStyle(0xffffff);
        g.fillCircle(40, 36, 5);
        g.fillEllipse(26, 35, 28, 18);
        g.fillCircle(27, 24, 11);
        g.fillStyle(0xb3e5fc);
        g.fillTriangle(4, 34, 18, 28, 18, 42);
        g.fillStyle(0xffffff);
        g.fillEllipse(17, 8, 7, 24);
        g.fillEllipse(32, 8, 7, 24);
        g.fillStyle(0x4fc3f7);
        g.fillEllipse(17, 9, 3, 17);
        g.fillEllipse(32, 9, 3, 17);
        g.fillStyle(0xe1f5fe);
        g.fillEllipse(27, 30, 12, 8);
        g.fillStyle(0x0288d1);
        g.fillCircle(27, 27, 2);
        g.fillStyle(0xb3e5fc);
        g.fillEllipse(34, 45, 12, 4);
        AssetFactory.drawEyes(g, 27, 23, 9, 3);
        break;
      }
      case 'permafrost': {
        // Mammoth — heavy shaggy body, huge glacier tusks, trunk
        g.fillStyle(0xb3e5fc, 0.3);
        g.fillCircle(24, 26, 23);
        g.fillStyle(0x546e7a);
        g.fillEllipse(24, 34, 44, 26);
        g.fillStyle(0x78909c);
        g.fillEllipse(24, 32, 38, 22);
        g.lineStyle(2, 0x455a64);
        g.lineBetween(8, 38, 7, 46);
        g.lineBetween(15, 42, 14, 47);
        g.lineBetween(33, 42, 34, 47);
        g.lineBetween(40, 38, 41, 46);
        g.fillStyle(0x90a4ae);
        g.fillCircle(24, 22, 14);
        g.fillStyle(0x78909c);
        g.fillCircle(11, 20, 8);
        g.fillCircle(37, 20, 8);
        g.fillStyle(0xcfd8dc);
        g.fillTriangle(24, 4, 14, 14, 34, 14);
        g.fillStyle(0xeceff1);
        g.fillTriangle(24, 7, 19, 14, 29, 14);
        g.fillStyle(0x4fc3f7);
        g.fillTriangle(14, 26, 2, 40, 12, 38);
        g.fillTriangle(34, 26, 46, 40, 36, 38);
        g.fillStyle(0xe1f5fe);
        g.fillTriangle(14, 28, 5, 38, 12, 36);
        g.fillTriangle(34, 28, 43, 38, 36, 36);
        g.fillStyle(0x607d8b);
        g.fillRect(21, 26, 6, 14);
        g.fillStyle(0x78909c);
        g.fillRect(22, 26, 3, 14);
        AssetFactory.drawEyes(g, 24, 20, 11, 3);
        break;
      }
      default: {
        // Fallback for any Ice-type pet without a bespoke drawing
        g.fillStyle(0xb3e5fc, 0.4);
        g.fillCircle(24, 28, 17);
        g.fillStyle(0xe1f5fe);
        g.fillCircle(24, 28, 13);
        g.fillStyle(0x4fc3f7);
        g.fillTriangle(24, 4, 19, 16, 29, 16);
        AssetFactory.drawEyes(g, 24, 28, 8, 3);
        break;
      }
    }

    AssetFactory.finish(g, id, s, s);
  }

  // --- LIGHT PETS ---

  private static drawLightPet(scene: Phaser.Scene, id: string): void {
    AssetFactory.drawSmoothPet(scene, id);
  }

  // --- SHADOW PETS ---

  private static drawShadowPet(scene: Phaser.Scene, id: string): void {
    AssetFactory.drawSmoothPet(scene, id);
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

    // tile-lava
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xff5722);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0xbf360c);
      g.fillRect(2, 4, 10, 6);
      g.fillRect(19, 18, 11, 7);
      g.fillRect(5, 23, 7, 5);
      g.fillStyle(0xff8a50);
      g.fillCircle(22, 8, 4);
      g.fillCircle(9, 17, 3);
      g.fillStyle(0xffca28);
      g.fillCircle(22, 8, 2);
      g.fillCircle(9, 17, 1);
      g.fillCircle(26, 28, 1);
      AssetFactory.finish(g, 'tile-lava', T, T);
    }

    // tile-ice
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xb3e5fc);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0xe1f5fe);
      g.fillTriangle(0, 18, 18, 0, 26, 0);
      g.fillTriangle(0, 30, 30, 0, 32, 4);
      g.lineStyle(1, 0x81d4fa);
      g.lineBetween(6, 28, 14, 18);
      g.lineBetween(14, 18, 12, 10);
      g.lineBetween(14, 18, 24, 20);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(24, 26, 1);
      AssetFactory.finish(g, 'tile-ice', T, T);
    }

    // tile-snow and tile-snow-b (alternating floor)
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xf5fbff);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0xdcecf5);
      g.fillCircle(8, 10, 1);
      g.fillCircle(22, 20, 1);
      g.fillCircle(14, 28, 1);
      AssetFactory.finish(g, 'tile-snow', T, T);
    }
    {
      const g = AssetFactory.gfx(scene);
      g.fillStyle(0xe8f3fa);
      g.fillRect(0, 0, T, T);
      g.fillStyle(0xcfe3ee);
      g.fillCircle(24, 8, 1);
      g.fillCircle(10, 22, 1);
      g.fillCircle(28, 28, 1);
      AssetFactory.finish(g, 'tile-snow-b', T, T);
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

    // item-pet-food
    {
      const g = AssetFactory.gfx(scene);
      // bowl
      g.fillStyle(0x1e88e5);
      g.fillRoundedRect(4, 18, 24, 10, 4);
      g.fillStyle(0x1565c0);
      g.fillRect(6, 26, 20, 2);
      // kibble heap
      g.fillStyle(0x8d6e63);
      g.fillCircle(11, 17, 4);
      g.fillCircle(17, 15, 4);
      g.fillCircle(22, 17, 4);
      g.fillStyle(0xa1887f);
      g.fillCircle(16, 12, 3);
      AssetFactory.finish(g, 'item-pet-food', S, S);
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
      { key: 'type-light', color: 0xffd54f, label: 'L' },
      { key: 'type-shadow', color: 0x4a148c, label: 'S' },
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
