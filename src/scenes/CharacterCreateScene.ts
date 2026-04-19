import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { GameState } from '../state/GameState';
import { AssetFactory } from '../assets/AssetFactory';
import { AudioManager } from '../audio/AudioManager';
import { isTouchDevice } from '../utils/mobile';

interface ColorOption {
  hex: number;    // For Phaser drawing / AssetFactory
  css: string;    // For GameState appearance (stored as string)
}

const HAIR_COLORS: ColorOption[] = [
  { hex: 0x8b4513, css: '#8B4513' },
  { hex: 0xffd700, css: '#FFD700' },
  { hex: 0x000000, css: '#000000' },
  { hex: 0xc0392b, css: '#C0392B' },
  { hex: 0xff8c00, css: '#FF8C00' },
  { hex: 0x800080, css: '#800080' },
];

const SKIN_COLORS: ColorOption[] = [
  { hex: 0xffdab9, css: '#FFDAB9' },
  { hex: 0xdeb887, css: '#DEB887' },
  { hex: 0xc68642, css: '#C68642' },
  { hex: 0x8d5524, css: '#8D5524' },
  { hex: 0x4b3621, css: '#4B3621' },
];

const MAX_NAME_LENGTH = 12;

export class CharacterCreateScene extends Phaser.Scene {
  private playerName: string = '';
  private nameText!: Phaser.GameObjects.Text;
  private cursorVisible: boolean = true;
  private cursorTimer!: Phaser.Time.TimerEvent;

  private selectedHairIndex: number = -1;
  private selectedSkinIndex: number = -1;
  private hairRings: Phaser.GameObjects.Graphics[] = [];
  private skinRings: Phaser.GameObjects.Graphics[] = [];

  private previewSprite!: Phaser.GameObjects.Image;
  private confirmButton!: Button;
  private domInput: HTMLInputElement | null = null;

  constructor() {
    super({ key: 'CharacterCreateScene' });
  }

  create(): void {
    const cx = SCREEN_WIDTH / 2;

    AudioManager.playMusic('calm');

    // ── Title ──
    this.add.text(cx, 40, 'Create Your Wizard', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // ── Panel ──
    const panelW = 500;
    const panelH = 480;
    const panelY = SCREEN_HEIGHT / 2 + 20;
    new Panel(this, cx, panelY, panelW, panelH);

    const topY = panelY - panelH / 2 + 30;

    // ── Name input ──
    this.add.text(cx, topY, 'Name', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Input background
    const inputW = 260;
    const inputH = 36;
    const inputY = topY + 30;
    const inputBg = this.add.graphics();
    inputBg.fillStyle(0x0d0d1a, 1);
    inputBg.fillRoundedRect(cx - inputW / 2, inputY - inputH / 2, inputW, inputH, 6);
    inputBg.lineStyle(1, 0x3498db);
    inputBg.strokeRoundedRect(cx - inputW / 2, inputY - inputH / 2, inputW, inputH, 6);

    this.nameText = this.add.text(cx, inputY, '|', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Blinking cursor
    this.cursorTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this.refreshNameDisplay();
      },
    });

    if (isTouchDevice()) {
      this.setupDomInput(cx, inputY);
    } else {
      this.setupKeyboardInput();
    }

    // ── Hair Color ──
    const hairY = inputY + 55;
    this.add.text(cx, hairY, 'Hair Color', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(0.5);

    this.createColorRow(HAIR_COLORS, cx, hairY + 30, 'hair');

    // ── Skin Color ──
    const skinY = hairY + 80;
    this.add.text(cx, skinY, 'Skin Color', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(0.5);

    this.createColorRow(SKIN_COLORS, cx, skinY + 30, 'skin');

    // ── Preview ──
    const previewY = skinY + 100;
    this.add.text(cx, previewY - 20, 'Preview', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(0.5);

    this.previewSprite = this.add.image(cx, previewY + 30, 'player').setScale(3);

    // ── Confirm button ──
    const buttonY = panelY + panelH / 2 - 40;
    this.confirmButton = new Button(this, cx, buttonY, 'Begin Adventure', () => {
      this.onConfirm();
    }, { width: 220, height: 44, fontSize: '18px' });
    this.confirmButton.setEnabled(false);
  }

  // ── Input setup ──

  private setupKeyboardInput(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
      } else if (event.key.length === 1 && this.playerName.length < MAX_NAME_LENGTH) {
        if (/^[a-zA-Z0-9 ]$/.test(event.key)) {
          this.playerName += event.key;
        }
      }
      this.refreshNameDisplay();
      this.updateConfirmButton();
    });
  }

  private setupDomInput(cx: number, inputY: number): void {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / SCREEN_WIDTH;
    const scaleY = rect.height / SCREEN_HEIGHT;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = MAX_NAME_LENGTH;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'words');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');

    // opacity:0 keeps it invisible; font-size:16px prevents iOS Safari viewport zoom on focus
    input.style.cssText = [
      'position: fixed',
      `left: ${rect.left + (cx - 130) * scaleX}px`,
      `top: ${rect.top + (inputY - 18) * scaleY}px`,
      `width: ${260 * scaleX}px`,
      `height: ${36 * scaleY}px`,
      'opacity: 0',
      'font-size: 16px',
      'border: none',
      'background: transparent',
      'color: transparent',
      'caret-color: transparent',
      'z-index: 100',
      'outline: none',
    ].join('; ');

    input.addEventListener('input', () => {
      this.playerName = input.value
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .slice(0, MAX_NAME_LENGTH);
      input.value = this.playerName;
      this.refreshNameDisplay();
      this.updateConfirmButton();
    });

    document.body.appendChild(input);
    this.domInput = input;

    const zone = this.add.zone(cx, inputY, 260, 36).setInteractive();
    zone.on('pointerdown', () => input.focus());

    this.time.delayedCall(400, () => input.focus());

    this.events.on('shutdown', () => {
      this.domInput?.remove();
      this.domInput = null;
    });
  }

  // ── Helpers ──

  private refreshNameDisplay(): void {
    const cursor = this.cursorVisible ? '|' : '';
    this.nameText.setText(this.playerName + cursor);
  }

  private createColorRow(
    colors: ColorOption[],
    cx: number,
    y: number,
    type: 'hair' | 'skin',
  ): void {
    const radius = 14;
    const spacing = 40;
    const totalWidth = (colors.length - 1) * spacing;
    const startX = cx - totalWidth / 2;

    colors.forEach((color, i) => {
      const x = startX + i * spacing;

      // Filled circle
      const circle = this.add.graphics();
      circle.fillStyle(color.hex, 1);
      circle.fillCircle(0, 0, radius);
      circle.setPosition(x, y);

      // Selection ring (hidden initially)
      const ring = this.add.graphics();
      ring.lineStyle(3, 0xffffff);
      ring.strokeCircle(0, 0, radius + 3);
      ring.setPosition(x, y);
      ring.setVisible(false);

      if (type === 'hair') {
        this.hairRings.push(ring);
      } else {
        this.skinRings.push(ring);
      }

      // Hit area
      const hitZone = this.add.zone(x, y, radius * 2 + 6, radius * 2 + 6).setInteractive();
      hitZone.on('pointerdown', () => {
        if (type === 'hair') {
          this.selectHair(i);
        } else {
          this.selectSkin(i);
        }
      });
    });
  }

  private selectHair(index: number): void {
    this.selectedHairIndex = index;
    this.hairRings.forEach((r, i) => r.setVisible(i === index));
    this.updatePreview();
    this.updateConfirmButton();
  }

  private selectSkin(index: number): void {
    this.selectedSkinIndex = index;
    this.skinRings.forEach((r, i) => r.setVisible(i === index));
    this.updatePreview();
    this.updateConfirmButton();
  }

  private updatePreview(): void {
    if (this.selectedHairIndex < 0 || this.selectedSkinIndex < 0) return;

    const hairHex = HAIR_COLORS[this.selectedHairIndex].hex;
    const skinHex = SKIN_COLORS[this.selectedSkinIndex].hex;

    AssetFactory.generatePlayerSprite(this, hairHex, skinHex);
    this.previewSprite.setTexture('player');
  }

  private updateConfirmButton(): void {
    const ready =
      this.playerName.trim().length > 0 &&
      this.selectedHairIndex >= 0 &&
      this.selectedSkinIndex >= 0;
    this.confirmButton.setEnabled(ready);
  }

  private onConfirm(): void {
    const hairColor = HAIR_COLORS[this.selectedHairIndex].css;
    const skinColor = SKIN_COLORS[this.selectedSkinIndex].css;
    const hairHex = HAIR_COLORS[this.selectedHairIndex].hex;
    const skinHex = SKIN_COLORS[this.selectedSkinIndex].hex;

    GameState.getInstance().reset(this.playerName.trim(), { hairColor, skinColor });
    AssetFactory.generatePlayerSprite(this, hairHex, skinHex);
    this.scene.start('TutorialScene');
  }
}
