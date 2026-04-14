import Phaser from 'phaser';
import { IPetTemplate } from '../types/pet';
import { randomInt } from '../utils/math';
import { GameState } from '../state/GameState';

type WildPetState = 'idle' | 'roaming' | 'chasing';

export class WildPet extends Phaser.Physics.Arcade.Sprite {
  petTemplate: IPetTemplate;
  petLevel: number;
  private petState: WildPetState = 'idle';
  private aggroRadius: number;
  private roamRadius: number;
  private originPos: Phaser.Math.Vector2;
  private roamTarget: Phaser.Math.Vector2 | null = null;
  private idleTimer = 0;
  private defeated = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    template: IPetTemplate,
    level: number,
    aggroRadius = 120,
    roamRadius = 80,
  ) {
    super(scene, x, y, template.id);
    this.petTemplate = template;
    this.petLevel = level;
    this.aggroRadius = aggroRadius;
    this.roamRadius = roamRadius;
    this.originPos = new Phaser.Math.Vector2(x, y);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.5);
    this.setDepth(4);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.6, this.height * 0.6);
    body.setCollideWorldBounds(true);

    this.idleTimer = randomInt(1000, 3000);
  }

  updateAI(playerX: number, playerY: number, delta: number): boolean {
    if (this.defeated) return false;

    const peacefulRoam = GameState.getInstance().getFlag('peaceful-roam');

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (peacefulRoam && this.petState === 'chasing') {
      this.petState = 'idle';
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }

    // Aggro check (skipped while Calm Mode is on — no wild encounters)
    if (!peacefulRoam && distToPlayer < this.aggroRadius) {
      this.petState = 'chasing';
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.scene.physics.velocityFromAngle(
        Phaser.Math.RadToDeg(angle), 120, body.velocity,
      );
      this.setFlipX(playerX < this.x);

      // Contact — trigger battle
      if (distToPlayer < 24) {
        body.setVelocity(0, 0);
        return true; // signal: battle should start
      }
      return false;
    }

    // Normal behavior
    if (this.petState === 'chasing') {
      this.petState = 'idle';
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }

    if (this.petState === 'idle') {
      this.idleTimer -= delta;
      if (this.idleTimer <= 0) {
        // Pick roam target
        const rx = this.originPos.x + randomInt(-this.roamRadius, this.roamRadius);
        const ry = this.originPos.y + randomInt(-this.roamRadius, this.roamRadius);
        this.roamTarget = new Phaser.Math.Vector2(rx, ry);
        this.petState = 'roaming';
      }
    } else if (this.petState === 'roaming' && this.roamTarget) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.roamTarget.x, this.roamTarget.y);
      if (dist < 8) {
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.petState = 'idle';
        this.idleTimer = randomInt(1500, 4000);
        this.roamTarget = null;
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.roamTarget.x, this.roamTarget.y);
        this.scene.physics.velocityFromAngle(
          Phaser.Math.RadToDeg(angle), 40, (this.body as Phaser.Physics.Arcade.Body).velocity,
        );
        this.setFlipX(this.roamTarget.x < this.x);
      }
    }

    return false;
  }

  markDefeated(): void {
    this.defeated = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.setVisible(false);
    this.setActive(false);
  }

  isDefeated(): boolean {
    return this.defeated;
  }
}
