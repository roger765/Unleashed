import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { ITEMS } from '../data/items';
import { ItemType, ArmorSlot } from '../types/item';
import { Panel } from './Panel';
import { Button } from './Button';
import { Toast } from './Toast';

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
    const gs = GameState.getInstance();
    const state = gs.getState();

    // Backdrop
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

    // Equipped weapon
    const equippedId = state.equippedWeaponId;
    const equippedName = equippedId ? ITEMS[equippedId]?.name ?? 'Unknown' : 'None';
    const eqText = this.scene.add.text(cx - 270, cy - 180, `Weapon: ${equippedName}`, {
      fontSize: '13px', fontFamily: 'Arial', color: '#4CAF50',
    });
    this.container.add(eqText);

    // Equipped armor summary
    const armor = state.equippedArmor;
    const helmetName = armor.helmet ? ITEMS[armor.helmet]?.name ?? 'Unknown' : 'None';
    const chestName = armor.chest ? ITEMS[armor.chest]?.name ?? 'Unknown' : 'None';
    const bootsName = armor.boots ? ITEMS[armor.boots]?.name ?? 'Unknown' : 'None';
    const totalDef = gs.getTotalArmorDefenseBonus();
    const totalHp = gs.getArmorHpBoostPercent();
    const resistances = gs.getArmorResistances();
    const resistKeys = Object.keys(resistances) as unknown as number[];
    const resistSummary = resistKeys.length > 0
      ? '  |  Resists: ' + resistKeys.map((t) => `${['Rock','Nature','Wood','Water','Normal'][t]} ${resistances[t as keyof typeof resistances]}%`).join(', ')
      : '';
    const hpSummary = totalHp > 0 ? `  +${totalHp}% HP` : '';

    const armorHeader = this.scene.add.text(cx - 270, cy - 158,
      `Armor: +${totalDef} def${hpSummary}${resistSummary}`, {
      fontSize: '12px', fontFamily: 'Arial', color: '#e67e22',
      wordWrap: { width: 540 },
    });
    this.container.add(armorHeader);

    const armorSlots = this.scene.add.text(cx - 270, cy - 140,
      `Helm: ${helmetName}  |  Chest: ${chestName}  |  Boots: ${bootsName}`, {
      fontSize: '11px', fontFamily: 'Arial', color: '#d4a87a',
    });
    this.container.add(armorSlots);

    // List items
    let yOff = cy - 110;
    if (state.inventory.length === 0) {
      const empty = this.scene.add.text(cx, cy, 'Your bag is empty.', {
        fontSize: '16px', fontFamily: 'Arial', color: '#888888',
      }).setOrigin(0.5);
      this.container.add(empty);
      return;
    }

    for (const slot of state.inventory) {
      const item = ITEMS[slot.itemId];
      if (!item) continue;

      const isWeapon = item.itemType === ItemType.Weapon || item.itemType === ItemType.Staff;
      const isArmor = item.itemType === ItemType.ArmorHelmet
        || item.itemType === ItemType.ArmorChest
        || item.itemType === ItemType.ArmorBoots;

      const nameColor = isWeapon ? '#3498DB' : isArmor ? '#e67e22' : '#ffffff';

      const text = this.scene.add.text(cx - 250, yOff,
        `${item.name} x${slot.quantity} — ${item.description}`, {
        fontSize: '13px', fontFamily: 'Arial', color: nameColor,
        wordWrap: { width: 370 },
      });
      this.container.add(text);

      // Equip button for weapons/staffs
      if (isWeapon) {
        const isEquipped = state.equippedWeaponId === slot.itemId;
        const btn = new Button(this.scene, cx + 230, yOff + 8,
          isEquipped ? 'Unequip' : 'Equip',
          () => {
            if (isEquipped) gs.unequipWeapon(); else gs.equipWeapon(slot.itemId);
            this.show();
          },
          { width: 80, height: 28, fontSize: '11px', fillColor: isEquipped ? 0xc0392b : 0x2c3e50 },
        );
        this.container.add(btn);
      }

      // Equip button for armor
      if (isArmor) {
        const slot2armorSlot: Record<number, ArmorSlot> = {
          [ItemType.ArmorHelmet]: 'helmet',
          [ItemType.ArmorChest]: 'chest',
          [ItemType.ArmorBoots]: 'boots',
        };
        const armorSlot = slot2armorSlot[item.itemType];
        const isEquipped = armor[armorSlot] === slot.itemId;
        const btn = new Button(this.scene, cx + 230, yOff + 8,
          isEquipped ? 'Unequip' : 'Equip',
          () => {
            if (isEquipped) gs.unequipArmor(armorSlot); else gs.equipArmor(armorSlot, slot.itemId);
            this.show();
          },
          { width: 80, height: 28, fontSize: '11px', fillColor: isEquipped ? 0xc0392b : 0x8e44ad },
        );
        this.container.add(btn);
      }

      yOff += 35;
    }
  }
}
