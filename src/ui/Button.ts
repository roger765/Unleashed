import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: string;
  fontFamily?: string;
  fillColor?: number;
  hoverColor?: number;
  disabledColor?: number;
  textColor?: string;
  borderRadius?: number;
}

const DEFAULTS: Required<ButtonOptions> = {
  width: 200,
  height: 50,
  fontSize: '20px',
  fontFamily: 'Arial, sans-serif',
  fillColor: 0x2c3e50,
  hoverColor: 0x34495e,
  disabledColor: 0x1a252f,
  textColor: '#ffffff',
  borderRadius: 8,
};

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private opts: Required<ButtonOptions>;
  private callback: () => void;
  private enabled: boolean = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    callback: () => void,
    options?: ButtonOptions,
  ) {
    super(scene, x, y);
    this.opts = { ...DEFAULTS, ...options };
    this.callback = callback;

    const { width, height, borderRadius, fillColor } = this.opts;

    // Background
    this.bg = scene.make.graphics({ x: 0, y: 0 });
    this.drawBg(fillColor);
    this.add(this.bg);

    // Label
    this.label = scene.add.text(0, 0, text, {
      fontSize: this.opts.fontSize,
      fontFamily: this.opts.fontFamily,
      color: this.opts.textColor,
    }).setOrigin(0.5);
    this.add(this.label);

    // Hit area — centered on the container
    this.setSize(width, height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerover', this.onHover, this);
    this.on('pointerout', this.onOut, this);
    this.on('pointerdown', this.onDown, this);

    scene.add.existing(this);
  }

  // ── Drawing ──────────────────────────────────────────────────

  private drawBg(color: number): void {
    const { width, height, borderRadius } = this.opts;
    this.bg.clear();
    this.bg.fillStyle(color);
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
  }

  // ── Pointer events ──────────────────────────────────────────

  private onHover(): void {
    if (!this.enabled) return;
    this.drawBg(this.opts.hoverColor);
  }

  private onOut(): void {
    if (!this.enabled) return;
    this.drawBg(this.opts.fillColor);
  }

  private onDown(): void {
    if (!this.enabled) return;
    AudioManager.playSFX('click');
    this.callback();
  }

  // ── Public API ──────────────────────────────────────────────

  setEnabled(value: boolean): this {
    this.enabled = value;
    if (value) {
      this.drawBg(this.opts.fillColor);
      this.label.setAlpha(1);
    } else {
      this.drawBg(this.opts.disabledColor);
      this.label.setAlpha(0.4);
    }
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }
}
