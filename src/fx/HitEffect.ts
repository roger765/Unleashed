import Phaser from 'phaser';

export function playHitEffect(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
): void {
  // Flash white
  target.setTint(0xffffff);
  scene.time.delayedCall(100, () => {
    target.clearTint();
  });

  // Camera shake
  scene.cameras.main.shake(80, 0.003);

  // Spark at target position
  const spark = scene.add.graphics().setDepth(600);
  const sx = target.x;
  const sy = target.y - 10;

  spark.fillStyle(0xffd700, 1);
  // Small star shape
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const dx = Math.cos(angle) * 12;
    const dy = Math.sin(angle) * 12;
    spark.fillCircle(sx + dx, sy + dy, 3);
  }
  spark.fillCircle(sx, sy, 5);

  scene.tweens.add({
    targets: spark,
    alpha: 0,
    scaleX: 1.5,
    scaleY: 1.5,
    duration: 300,
    onComplete: () => spark.destroy(),
  });
}
