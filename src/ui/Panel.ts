import Phaser from 'phaser';

export interface PanelOptions {
  fillColor?: number;
  fillAlpha?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
}

const DEFAULTS: Required<PanelOptions> = {
  fillColor: 0x1a1a2e,
  fillAlpha: 0.9,
  borderColor: 0x3498db,
  borderWidth: 2,
  borderRadius: 12,
};

export class Panel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private opts: Required<PanelOptions>;
  private panelWidth: number;
  private panelHeight: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: PanelOptions,
  ) {
    super(scene, x, y);
    this.opts = { ...DEFAULTS, ...options };
    this.panelWidth = width;
    this.panelHeight = height;

    this.bg = scene.make.graphics({ x: 0, y: 0 });
    this.drawPanel();
    this.add(this.bg);

    scene.add.existing(this);
  }

  private drawPanel(): void {
    const { fillColor, fillAlpha, borderColor, borderWidth, borderRadius } = this.opts;
    const w = this.panelWidth;
    const h = this.panelHeight;

    this.bg.clear();
    this.bg.fillStyle(fillColor, fillAlpha);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, borderRadius);

    if (borderWidth > 0) {
      this.bg.lineStyle(borderWidth, borderColor);
      this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, borderRadius);
    }
  }

  /** Redraw with new dimensions. */
  resize(width: number, height: number): this {
    this.panelWidth = width;
    this.panelHeight = height;
    this.drawPanel();
    return this;
  }
}
