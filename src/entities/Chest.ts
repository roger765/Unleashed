import Phaser from 'phaser';
import { GameState } from '../state/GameState';
import { Toast } from '../ui/Toast';
import { randomInt } from '../utils/math';

export class Chest extends Phaser.Physics.Arcade.Sprite {
  private chestId: string;
  private opened = false;
  private coinReward: number;
  private itemReward?: { itemId: string; quantity: number };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    chestId: string,
    coinReward?: number,
    itemReward?: { itemId: string; quantity: number },
  ) {
    super(scene, x, y, 'chest');
    this.chestId = chestId;
    this.coinReward = coinReward ?? randomInt(20, 60);
    this.itemReward = itemReward;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setScale(1.5).setDepth(5);

    // Check if already opened
    if (GameState.getInstance().getFlag(`chest-${chestId}`)) {
      this.setTexture('chest-open');
      this.opened = true;
    }
  }

  open(): void {
    if (this.opened) return;
    this.opened = true;
    this.setTexture('chest-open');

    const gs = GameState.getInstance();
    gs.setFlag(`chest-${this.chestId}`, true);
    gs.addCoins(this.coinReward);

    let msg = `Found ${this.coinReward} coins!`;
    if (this.itemReward) {
      gs.addItem(this.itemReward.itemId, this.itemReward.quantity);
      const name = this.itemReward.itemId.replace(/-/g, ' ');
      msg += ` And ${name}!`;
    }

    Toast.show(this.scene, msg);
  }

  isOpened(): boolean {
    return this.opened;
  }
}
