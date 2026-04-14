import Phaser from 'phaser';
import { PLAYER_SPEED } from '../constants';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private playerSpeed: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.playerSpeed = PLAYER_SPEED;

    // Shrink physics body slightly so collisions feel natural
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.6, this.height * 0.6);
    body.setOffset(this.width * 0.2, this.height * 0.4);
  }

  update(): void {
    if (!this.moveTarget) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
    if (dist < 4) {
      this.stopMoving();
    }
  }

  moveTo(x: number, y: number): void {
    this.moveTarget = new Phaser.Math.Vector2(x, y);

    const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;

    this.scene.physics.velocityFromAngle(
      Phaser.Math.RadToDeg(angle),
      this.playerSpeed,
      body.velocity,
    );

    // Flip sprite when moving left
    this.setFlipX(x < this.x);
  }

  stopMoving(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.moveTarget = null;
  }
}
