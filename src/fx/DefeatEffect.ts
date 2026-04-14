import Phaser from 'phaser';

export function playDefeatEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onComplete: () => void,
): void {
  const g = scene.add.graphics().setDepth(500);

  // Blue ball collapse
  g.fillStyle(0x4fc3f7, 1);
  g.fillCircle(x, y, 24);

  scene.tweens.add({
    targets: { scale: 1 },
    scale: 0.3,
    duration: 300,
    onUpdate: (tween) => {
      const s = tween.getValue() as number;
      g.clear();
      g.fillStyle(0x4fc3f7, 1);
      g.fillCircle(x, y, 24 * s);
    },
    onComplete: () => {
      // Beam shooting upward
      const beam = scene.add.graphics().setDepth(500);
      const beamTarget = { progress: 0 };

      scene.tweens.add({
        targets: beamTarget,
        progress: 1,
        duration: 400,
        onUpdate: () => {
          beam.clear();
          beam.lineStyle(4, 0x4fc3f7, 1);
          beam.lineBetween(x, y, x, y - 200 * beamTarget.progress);
          // Small glow at base
          beam.fillStyle(0x4fc3f7, 0.5);
          beam.fillCircle(x, y, 8);
        },
        onComplete: () => {
          // Fade out
          scene.tweens.add({
            targets: { alpha: 1 },
            alpha: 0,
            duration: 200,
            onUpdate: (tween) => {
              const a = tween.getValue() as number;
              g.setAlpha(a);
              beam.setAlpha(a);
            },
            onComplete: () => {
              g.destroy();
              beam.destroy();
              onComplete();
            },
          });
        },
      });
    },
  });
}
