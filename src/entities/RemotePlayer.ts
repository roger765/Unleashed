import Phaser from 'phaser';

export class RemotePlayer extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, playerName: string) {
    super(scene, x, y);

    this.targetX = x;
    this.targetY = y;

    this.sprite = scene.add.image(0, 0, 'player').setAlpha(0.9);

    this.nameTag = scene.add.text(0, -28, playerName, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000077',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    this.add([this.sprite, this.nameTag]);
    scene.add.existing(this);
    this.setDepth(10);
  }

  setTargetPosition(x: number, y: number): void {
    this.sprite.setFlipX(x < this.x);
    this.targetX = x;
    this.targetY = y;
  }

  update(): void {
    this.x = Phaser.Math.Linear(this.x, this.targetX, 0.25);
    this.y = Phaser.Math.Linear(this.y, this.targetY, 0.25);
  }
}
