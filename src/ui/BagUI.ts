import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { ITEMS } from '../data/items';
import { ItemType } from '../types/item';
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

    const panel = new Panel(this.scene, cx, cy, 600, 450, { fillColor: 0x0d1117, borderColor: 0x3498db });
    this.container.add(panel);

    const title = this.scene.add.text(cx, cy - 195, 'Bag', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);
    this.container.add(title);

    const closeBtn = new Button(this.scene, cx + 260, cy - 195, 'X', () => this.hide(), {
      width: 40, height: 40, fontSize: '18px', fillColor: 0xc0392b,
    });
    this.container.add(closeBtn);

    // Equipped weapon
    const equippedId = state.equippedWeaponId;
    const equippedName = equippedId ? ITEMS[equippedId]?.name ?? 'Unknown' : 'None';
    const eqText = this.scene.add.text(cx - 260, cy - 155, `Equipped: ${equippedName}`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#4CAF50',
    });
    this.container.add(eqText);

    // List items
    let yOff = cy - 120;
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

      const nameColor = item.itemType === ItemType.Weapon || item.itemType === ItemType.Staff
        ? '#3498DB' : '#ffffff';

      const text = this.scene.add.text(cx - 240, yOff,
        `${item.name} x${slot.quantity} — ${item.description}`, {
        fontSize: '13px', fontFamily: 'Arial', color: nameColor,
        wordWrap: { width: 380 },
      });
      this.container.add(text);

      // Equip button for weapons/staffs
      if (item.itemType === ItemType.Weapon || item.itemType === ItemType.Staff) {
        const isEquipped = state.equippedWeaponId === slot.itemId;
        const btn = new Button(this.scene, cx + 220, yOff + 8,
          isEquipped ? 'Unequip' : 'Equip',
          () => {
            if (isEquipped) {
              gs.unequipWeapon();
            } else {
              gs.equipWeapon(slot.itemId);
            }
            this.show(); // refresh
          },
          { width: 80, height: 28, fontSize: '11px', fillColor: isEquipped ? 0xc0392b : 0x2c3e50 },
        );
        this.container.add(btn);
      }

      yOff += 35;
    }
  }
}
