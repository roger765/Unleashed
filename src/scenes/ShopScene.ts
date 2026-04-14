import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { ITEMS } from '../data/items';
import { SHOP_ITEMS } from '../data/shop';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { AudioManager } from '../audio/AudioManager';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    AudioManager.playMusic('calm');

    this.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e);

    this.add.image(cx, 80, 'npc-shopkeeper').setScale(2.5);

    this.add.text(cx, 140, 'Welcome to the Shop!', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    const gs = GameState.getInstance();

    // Coins display
    const coinsText = this.add.text(cx, 175, `Coins: ${gs.getState().coins}`, {
      fontSize: '18px', fontFamily: 'Arial', color: '#ffd700',
    }).setOrigin(0.5);

    // Items grid
    let yOff = 210;
    let lastCategory = '';

    for (const shopEntry of SHOP_ITEMS) {
      const item = ITEMS[shopEntry.itemId];
      if (!item) continue;

      if (shopEntry.category !== lastCategory) {
        lastCategory = shopEntry.category;
        this.add.text(cx - 300, yOff, shopEntry.category, {
          fontSize: '16px', fontFamily: 'Arial Black', color: '#3498DB',
        });
        yOff += 28;
      }

      this.add.text(cx - 280, yOff, `${item.name} — ${item.description}`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
        wordWrap: { width: 400 },
      });

      this.add.text(cx + 160, yOff, `${item.buyPrice} coins`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffd700',
      });

      new Button(this, cx + 280, yOff + 5, 'Buy', () => {
        if (gs.removeCoins(item.buyPrice)) {
          gs.addItem(item.id, 1);
          coinsText.setText(`Coins: ${gs.getState().coins}`);
          Toast.show(this, `Bought ${item.name}!`);
        } else {
          Toast.show(this, 'Not enough coins!');
        }
      }, { width: 70, height: 28, fontSize: '12px', fillColor: 0x27ae60 });

      yOff += 35;
    }

    // Back button
    new Button(this, cx, SCREEN_HEIGHT - 50, 'Back to Town', () => {
      this.scene.start('TownScene');
    }, { width: 200, height: 45, fontSize: '16px' });
  }
}
