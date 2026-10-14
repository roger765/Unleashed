import Phaser from 'phaser';
import { PLAYER_SPEED } from '../constants';

/** Ice: how hard the player can push, how quickly sliding slows down, and when to stop pushing. */
const ICE_ACCELERATION = 600;
const ICE_DRAG = 300;
const ICE_COAST_DISTANCE = 24;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private playerSpeed: number;
  private slippery = false;

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
    if (this.slippery) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (dist < ICE_COAST_DISTANCE) {
        // Near the target: stop pushing and let the drag slide us to a halt.
        body.setAcceleration(0, 0);
        this.moveTarget = null;
        return;
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
      this.scene.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), ICE_ACCELERATION, body.acceleration);
      return;
    }
    if (dist < 4) {
      this.stopMoving();
    }
  }

  moveTo(x: number, y: number): void {
    this.moveTarget = new Phaser.Math.Vector2(x, y);
    this.setFlipX(x < this.x);
    // On ice, update() steers by acceleration so the player can't turn or stop on a dime.
    if (this.slippery) return;

    const angle = Phaser.Math.Angle.Between(this.x, this.y, x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;

    this.scene.physics.velocityFromAngle(
      Phaser.Math.RadToDeg(angle),
      this.playerSpeed,
      body.velocity,
    );
  }

  stopMoving(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    this.moveTarget = null;
  }

  /** Ice mode: speed builds up gradually and the player coasts to a stop instead of halting at once. */
  setSlippery(on: boolean): void {
    if (on === this.slippery) return;
    this.slippery = on;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (on) {
      body.setDrag(ICE_DRAG, ICE_DRAG);
      body.setMaxVelocity(this.playerSpeed * 1.25, this.playerSpeed * 1.25);
      return;
    }
    body.setAcceleration(0, 0);
    body.setDrag(0, 0);
    body.setMaxVelocity(10000, 10000);
    if (this.moveTarget) this.moveTo(this.moveTarget.x, this.moveTarget.y);
    else body.setVelocity(0, 0);
  }
}
