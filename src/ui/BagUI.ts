import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { ITEMS } from '../data/items';
import { ItemType, ArmorSlot } from '../types/item';
import { Panel } from './Panel';
import { Button } from './Button';
import { Toast } from './Toast';

type BagTab = 'Weapons' | 'Armour' | 'Items';

const TAB_COLOR_ACTIVE = 0xb8860b;
const TAB_COLOR_INACTIVE = 0x2c3e50;

const WEAPON_TYPES = new Set([ItemType.Weapon, ItemType.Staff]);
const ARMOR_TYPES = new Set([ItemType.ArmorHelmet, ItemType.ArmorChest, ItemType.ArmorBoots]);

const ARMOR_SLOT_MAP: Record<number, ArmorSlot> = {
  [ItemType.ArmorHelmet]: 'helmet',
  [ItemType.ArmorChest]: 'chest',
  [ItemType.ArmorBoots]: 'boots',
};

export class BagUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(800).setVisible(false);
  }

  show(): void {
    this.container.removeAll(true);
    this.build();
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  private build(): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    const bg = this.scene.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.7);
    bg.setInteractive();
    this.container.add(bg);

    const panel = new Panel(this.scene, cx, cy, 620, 500, { fillColor: 0x0d1117, borderColor: 0x3498db });
    this.container.add(panel);

    const title = this.scene.add.text(cx, cy - 220, 'Bag', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);
    this.container.add(title);

    const closeBtn = new Button(this.scene, cx + 270, cy - 220, 'X', () => this.hide(), {
      width: 40, height: 40, fontSize: '18px', fillColor: 0xc0392b,
    });
    this.container.add(closeBtn);

    // ── Tabs ────────────────────────────────────────────────────────
    const tabs: BagTab[] = ['Weapons', 'Armour', 'Items'];
    const tabButtons: Partial<Record<BagTab, Button>> = {};
    const tabContainers: Partial<Record<BagTab, Phaser.GameObjects.Container>> = {};
    const tabSpacing = 170;
    const tabY = cy - 175;

    for (const tab of tabs) {
      tabContainers[tab] = this.buildTabContent(tab, cx, cy);
      tabContainers[tab]!.setVisible(false);
      this.container.add(tabContainers[tab]!);
    }

    const showTab = (selected: BagTab) => {
      for (const tab of tabs) {
        tabContainers[tab]!.setVisible(tab === selected);
        tabButtons[tab]!.setColor(tab === selected ? TAB_COLOR_ACTIVE : TAB_COLOR_INACTIVE);
      }
    };

    tabs.forEach((tab, i) => {
      const x = cx + (i - 1) * tabSpacing;
      tabButtons[tab] = new Button(this.scene, x, tabY, tab, () => showTab(tab), {
        width: 155, height: 36, fontSize: '15px', fillColor: TAB_COLOR_INACTIVE,
      });
      this.container.add(tabButtons[tab]!);
    });

    showTab('Weapons');
  }

  private buildTabContent(
    tab: BagTab,
    cx: number,
    cy: number,
  ): Phaser.GameObjects.Container {
    const gs = GameState.getInstance();
    const state = gs.getState();
    const container = this.scene.add.container(0, 0);
    const contentTop = cy - 140;

    if (tab === 'Weapons') {
      const equippedId = state.equippedWeaponId;
      const equippedName = equippedId ? (ITEMS[equippedId]?.name ?? 'Unknown') : 'None';
      const summary = this.scene.add.text(cx - 270, contentTop,
        `Equipped: ${equippedName}`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#4CAF50',
      });
      container.add(summary);

      const items = state.inventory.filter(s => {
        const item = ITEMS[s.itemId];
        return item && WEAPON_TYPES.has(item.itemType);
      });

      if (items.length === 0) {
        container.add(this.emptyText(cx, cy, 'No weapons in bag.'));
      } else {
        let yOff = contentTop + 28;
        for (const slot of items) {
          const item = ITEMS[slot.itemId]!;
          const isEquipped = state.equippedWeaponId === slot.itemId;

          container.add(this.scene.add.text(cx - 250, yOff,
            `${item.name} x${slot.quantity} — ${item.description}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#3498DB',
            wordWrap: { width: 370 },
          }));

          const btn = new Button(this.scene, cx + 230, yOff + 8,
            isEquipped ? 'Unequip' : 'Equip',
            () => {
              if (isEquipped) gs.unequipWeapon(); else gs.equipWeapon(slot.itemId);
              this.show();
            },
            { width: 80, height: 28, fontSize: '11px', fillColor: isEquipped ? 0xc0392b : 0x2c3e50 },
          );
          container.add(btn);
          yOff += 35;
        }
      }
    }

    if (tab === 'Armour') {
      const armor = state.equippedArmor;
      const helmetName = armor.helmet ? (ITEMS[armor.helmet]?.name ?? 'Unknown') : 'None';
      const chestName = armor.chest ? (ITEMS[armor.chest]?.name ?? 'Unknown') : 'None';
      const bootsName = armor.boots ? (ITEMS[armor.boots]?.name ?? 'Unknown') : 'None';
      const totalDef = gs.getTotalArmorDefenseBonus();
      const totalHp = gs.getArmorHpBoostPercent();
      const resistances = gs.getArmorResistances();
      const resistKeys = Object.keys(resistances) as unknown as number[];
      const resistSummary = resistKeys.length > 0
        ? '  |  Resists: ' + resistKeys.map(t =>
            `${['Rock', 'Nature', 'Wood', 'Water', 'Normal'][t as number]} ${resistances[t as keyof typeof resistances]}%`
          ).join(', ')
        : '';
      const hpSummary = totalHp > 0 ? `  +${totalHp}% HP` : '';

      container.add(this.scene.add.text(cx - 270, contentTop,
        `Armor: +${totalDef} def${hpSummary}${resistSummary}`, {
        fontSize: '12px', fontFamily: 'Arial', color: '#e67e22',
        wordWrap: { width: 540 },
      }));

      container.add(this.scene.add.text(cx - 270, contentTop + 18,
        `Helm: ${helmetName}  |  Chest: ${chestName}  |  Boots: ${bootsName}`, {
        fontSize: '11px', fontFamily: 'Arial', color: '#d4a87a',
      }));

      const items = state.inventory.filter(s => {
        const item = ITEMS[s.itemId];
        return item && ARMOR_TYPES.has(item.itemType);
      });

      if (items.length === 0) {
        container.add(this.emptyText(cx, cy, 'No armour in bag.'));
      } else {
        let yOff = contentTop + 50;
        for (const slot of items) {
          const item = ITEMS[slot.itemId]!;
          const armorSlot = ARMOR_SLOT_MAP[item.itemType];
          const isEquipped = armor[armorSlot] === slot.itemId;

          container.add(this.scene.add.text(cx - 250, yOff,
            `${item.name} x${slot.quantity} — ${item.description}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#e67e22',
            wordWrap: { width: 370 },
          }));

          const btn = new Button(this.scene, cx + 230, yOff + 8,
            isEquipped ? 'Unequip' : 'Equip',
            () => {
              if (isEquipped) gs.unequipArmor(armorSlot); else gs.equipArmor(armorSlot, slot.itemId);
              this.show();
            },
            { width: 80, height: 28, fontSize: '11px', fillColor: isEquipped ? 0xc0392b : 0x8e44ad },
          );
          container.add(btn);
          yOff += 35;
        }
      }
    }

    if (tab === 'Items') {
      const items = state.inventory.filter(s => {
        const item = ITEMS[s.itemId];
        return item && !WEAPON_TYPES.has(item.itemType) && !ARMOR_TYPES.has(item.itemType);
      });

      if (items.length === 0) {
        container.add(this.emptyText(cx, cy, 'No items in bag.'));
      } else {
        let yOff = contentTop;
        for (const slot of items) {
          const item = ITEMS[slot.itemId]!;
          container.add(this.scene.add.text(cx - 250, yOff,
            `${item.name} x${slot.quantity} — ${item.description}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
            wordWrap: { width: 460 },
          }));
          yOff += 35;
        }
      }
    }

    return container;
  }

  private emptyText(cx: number, cy: number, msg: string): Phaser.GameObjects.Text {
    return this.scene.add.text(cx, cy, msg, {
      fontSize: '16px', fontFamily: 'Arial', color: '#888888',
    }).setOrigin(0.5);
  }
}
