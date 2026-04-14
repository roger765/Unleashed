import Phaser from 'phaser';
import { SCREEN_WIDTH } from '../constants';

export class Toast {
  static show(scene: Phaser.Scene, message: string, duration = 2000): void {
    const cx = SCREEN_WIDTH / 2;
    const y = -40;

    const bg = scene.add.graphics().setDepth(1000);
    const text = scene.add
      .text(cx, y, message, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(1001);

    const drawBg = (ty: number) => {
      bg.clear();
      bg.fillStyle(0x000000, 0.8);
      const w = text.width + 32;
      const h = text.height + 16;
      bg.fillRoundedRect(cx - w / 2, ty - h / 2, w, h, 8);
    };

    drawBg(y);

    const targetY = 50;
    scene.tweens.add({
      targets: text,
      y: targetY,
      duration: 300,
      ease: 'Back.easeOut',
      onUpdate: () => drawBg(text.y),
      onComplete: () => {
        scene.time.delayedCall(duration, () => {
          scene.tweens.add({
            targets: text,
            y: -40,
            duration: 300,
            ease: 'Back.easeIn',
            onUpdate: () => drawBg(text.y),
            onComplete: () => {
              text.destroy();
              bg.destroy();
            },
          });
        });
      },
    });
  }
}
