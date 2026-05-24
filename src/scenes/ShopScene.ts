import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { ITEMS } from '../data/items';
import { SHOP_ITEMS } from '../data/shop';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { AudioManager } from '../audio/AudioManager';

type TabKey = 'Weapons' | 'Armour' | 'Items';

const TAB_CATEGORIES: Record<TabKey, string[]> = {
  Weapons: ['Weapons'],
  Armour: ['Armor'],
  Items: ['Healing', 'Food'],
};

const TAB_COLOR_ACTIVE = 0xb8860b;
const TAB_COLOR_INACTIVE = 0x2c3e50;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    const cx = SCREEN_WIDTH / 2;

    AudioManager.playMusic('calm');

    this.add.rectangle(cx, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e);

    this.add.image(cx, 60, 'npc-shopkeeper').setScale(2.5);

    this.add.text(cx, 120, 'Welcome to the Shop!', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    const gs = GameState.getInstance();

    const coinsText = this.add.text(cx, 155, `Coins: ${gs.getState().coins}`, {
      fontSize: '18px', fontFamily: 'Arial', color: '#ffd700',
    }).setOrigin(0.5);

    // ── Tab buttons ──────────────────────────────────────────────
    const tabs: TabKey[] = ['Weapons', 'Armour', 'Items'];
    const tabButtons: Partial<Record<TabKey, Button>> = {};
    const tabSpacing = 180;
    const tabY = 200;

    // ── Tab content containers ───────────────────────────────────
    const tabContainers: Partial<Record<TabKey, Phaser.GameObjects.Container>> = {};

    for (const tab of tabs) {
      tabContainers[tab] = this.buildTabContent(tab, gs, coinsText);
      tabContainers[tab]!.setVisible(false);
    }

    const showTab = (selected: TabKey) => {
      for (const tab of tabs) {
        tabContainers[tab]!.setVisible(tab === selected);
        tabButtons[tab]!.setColor(tab === selected ? TAB_COLOR_ACTIVE : TAB_COLOR_INACTIVE);
      }
    };

    tabs.forEach((tab, i) => {
      const x = cx + (i - 1) * tabSpacing;
      tabButtons[tab] = new Button(this, x, tabY, tab, () => showTab(tab), {
        width: 160, height: 38, fontSize: '16px', fillColor: TAB_COLOR_INACTIVE,
      });
    });

    // Show Weapons by default
    showTab('Weapons');

    // ── Back button ──────────────────────────────────────────────
    new Button(this, cx, SCREEN_HEIGHT - 40, 'Back to Town', () => {
      this.scene.start('TownScene');
    }, { width: 200, height: 45, fontSize: '16px' });
  }

  private buildTabContent(
    tab: TabKey,
    gs: GameState,
    coinsText: Phaser.GameObjects.Text,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const cx = SCREEN_WIDTH / 2;
    const categories = TAB_CATEGORIES[tab];
    const entries = SHOP_ITEMS.filter(e => categories.includes(e.category));

    let yOff = 240;
    let lastCategory = '';

    for (const shopEntry of entries) {
      const item = ITEMS[shopEntry.itemId];
      if (!item) continue;

      if (shopEntry.category !== lastCategory) {
        lastCategory = shopEntry.category;
        const catLabel = this.add.text(cx - 300, yOff, shopEntry.category, {
          fontSize: '15px', fontFamily: 'Arial Black', color: '#3498DB',
        });
        container.add(catLabel);
        yOff += 26;
      }

      const nameText = this.add.text(cx - 280, yOff, `${item.name} — ${item.description}`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
        wordWrap: { width: 400 },
      });
      container.add(nameText);

      const priceText = this.add.text(cx + 160, yOff, `${item.buyPrice} coins`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffd700',
      });
      container.add(priceText);

      const buyBtn = new Button(this, cx + 285, yOff + 7, 'Buy', () => {
        if (gs.removeCoins(item.buyPrice)) {
          gs.addItem(item.id, 1);
          coinsText.setText(`Coins: ${gs.getState().coins}`);
          Toast.show(this, `Bought ${item.name}!`);
        } else {
          Toast.show(this, 'Not enough coins!');
        }
      }, { width: 70, height: 28, fontSize: '12px', fillColor: 0x27ae60 });
      container.add(buyBtn);

      yOff += 36;
    }

    return container;
  }
}
