import Phaser from 'phaser';

export class HealthBar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private barWidth: number;
  private barHeight: number;
  private current = 0;
  private max = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, width = 100, height = 10) {
    super(scene, x, y);
    this.barWidth = width;
    this.barHeight = height;

    this.bg = scene.add.graphics();
    this.bg.fillStyle(0x333333);
    this.bg.fillRoundedRect(0, 0, width, height, 3);
    this.add(this.bg);

    this.fill = scene.add.graphics();
    this.add(this.fill);

    this.label = scene.add.text(width / 2, height / 2, '', {
      fontSize: `${Math.max(9, height - 2)}px`,
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(this.label);

    scene.add.existing(this);
  }

  setHealth(current: number, max: number): void {
    this.current = current;
    this.max = max;
    this.drawFill();
  }

  animateTo(current: number, max: number, duration = 300): void {
    const startCurrent = this.current;
    this.max = max;
    this.scene.tweens.addCounter({
      from: startCurrent,
      to: current,
      duration,
      onUpdate: (tween) => {
        this.current = Math.round(tween.getValue());
        this.drawFill();
      },
      onComplete: () => {
        this.current = current;
        this.drawFill();
      },
    });
  }

  private drawFill(): void {
    this.fill.clear();
    const pct = Math.max(0, this.current / this.max);
    let color = 0x4caf50; // green
    if (pct <= 0.25) color = 0xe53935; // red
    else if (pct <= 0.5) color = 0xffc107; // yellow

    this.fill.fillStyle(color);
    const w = Math.max(0, (this.barWidth - 4) * pct);
    this.fill.fillRoundedRect(2, 2, w, this.barHeight - 4, 2);

    this.label.setText(`${this.current} / ${this.max}`);
  }
}
