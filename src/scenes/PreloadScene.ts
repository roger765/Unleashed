import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { AssetFactory } from '../assets/AssetFactory';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  create(): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    // Title
    this.add.text(cx, cy - 60, 'UNLEASHED', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Status label
    const statusText = this.add.text(cx, cy + 60, 'Generating assets...', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Loading bar background
    const barWidth = 300;
    const barHeight = 20;
    const barX = cx - barWidth / 2;
    const barY = cy;

    const bgBar = this.add.graphics();
    bgBar.fillStyle(0x333333);
    bgBar.fillRoundedRect(barX, barY, barWidth, barHeight, 6);

    // Loading bar fill
    const fillBar = this.add.graphics();

    // Generate all assets synchronously
    AssetFactory.generateAll(this);

    // Animate the bar to 100%
    this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 600,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const val = tween.getValue();
        fillBar.clear();
        fillBar.fillStyle(0x4caf50);
        fillBar.fillRoundedRect(barX + 2, barY + 2, (barWidth - 4) * (val / 100), barHeight - 4, 4);
      },
      onComplete: () => {
        statusText.setText('Ready!');
        this.time.delayedCall(400, () => {
          this.scene.start('MainMenuScene');
        });
      },
    });
  }
}
