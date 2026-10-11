import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { ITEMS } from '../data/items';
import { SHOP_ITEMS, TM_CATEGORIES } from '../data/shop';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { AudioManager } from '../audio/AudioManager';

type TabKey = 'Weapons' | 'Armour' | 'Items' | 'Charms' | 'TMs';

const TAB_CATEGORIES: Record<TabKey, string[]> = {
  Weapons: ['Weapons'],
  Armour: ['Armor'],
  Items: ['Healing', 'Food'],
  Charms: ['Charms', 'Lures', 'Stones'],
  TMs: TM_CATEGORIES,
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
    const tabs: TabKey[] = ['Weapons', 'Armour', 'Items', 'Charms', 'TMs'];
    const tabButtons: Partial<Record<TabKey, Button>> = {};
    const tabSpacing = 170;
    const tabY = 200;

    // ── Tab content containers ───────────────────────────────────
    const tabContainers: Partial<Record<TabKey, Phaser.GameObjects.Container>> = {};

    for (const tab of tabs) {
      tabContainers[tab] = tab === 'TMs'
        ? this.buildTmTab(gs, coinsText)
        : this.buildTabContent(TAB_CATEGORIES[tab], gs, coinsText);
      tabContainers[tab]!.setVisible(false);
    }

    const showTab = (selected: TabKey) => {
      for (const tab of tabs) {
        tabContainers[tab]!.setVisible(tab === selected);
        tabButtons[tab]!.setColor(tab === selected ? TAB_COLOR_ACTIVE : TAB_COLOR_INACTIVE);
      }
    };

    tabs.forEach((tab, i) => {
      const x = cx + (i - (tabs.length - 1) / 2) * tabSpacing;
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

  /** TMs tab: one sub-tab per move type, so 37 rows never share a screen. */
  private buildTmTab(gs: GameState, coinsText: Phaser.GameObjects.Text): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const cx = SCREEN_WIDTH / 2;
    const subContainers = TM_CATEGORIES.map((cat) => {
      const c = this.buildTabContent([cat], gs, coinsText, 285, false);
      container.add(c);
      return c;
    });
    const subButtons: Button[] = [];
    const show = (idx: number) => {
      subContainers.forEach((c, i) => c.setVisible(i === idx));
      subButtons.forEach((b, i) => b.setColor(i === idx ? TAB_COLOR_ACTIVE : TAB_COLOR_INACTIVE));
    };
    const spacing = 110;
    TM_CATEGORIES.forEach((cat, i) => {
      const x = cx + (i - (TM_CATEGORIES.length - 1) / 2) * spacing;
      const b = new Button(this, x, 250, cat.replace('TM ', ''), () => show(i), {
        width: 100, height: 28, fontSize: '13px', fillColor: TAB_COLOR_INACTIVE,
      });
      subButtons.push(b);
      container.add(b);
    });
    show(0);
    return container;
  }

  private buildTabContent(
    categories: string[],
    gs: GameState,
    coinsText: Phaser.GameObjects.Text,
    startY = 240,
    showCategoryHeaders = true,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const cx = SCREEN_WIDTH / 2;
    const entries = SHOP_ITEMS.filter(e => categories.includes(e.category));

    let yOff = startY;
    let lastCategory = '';

    // Shrink row pitch for long lists so they stay clear of the Back button.
    const categoryCount = new Set(entries.map(e => e.category)).size;
    const headerCount = showCategoryHeaders ? categoryCount : 0;
    const rowPitch = Math.min(36, Math.floor((380 - (startY - 240) - headerCount * 26) / Math.max(1, entries.length)));

    for (const shopEntry of entries) {
      const item = ITEMS[shopEntry.itemId];
      if (!item) continue;

      if (showCategoryHeaders && shopEntry.category !== lastCategory) {
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

      yOff += rowPitch;
    }

    return container;
  }
}
