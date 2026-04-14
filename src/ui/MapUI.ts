import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { areAllOverworldZoneBossesDefeated } from '../battle/bossUtils';
import { Panel } from './Panel';
import { Button } from './Button';

export class MapUI {
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
    const currentScene = GameState.getInstance().getState().currentScene;

    const bg = this.scene.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.7);
    bg.setInteractive();
    this.container.add(bg);

    const panel = new Panel(this.scene, cx, cy, 560, 420, { fillColor: 0x0d1117, borderColor: 0x3498db });
    this.container.add(panel);

    const title = this.scene.add.text(cx, cy - 180, 'World Map', {
      fontSize: '24px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);
    this.container.add(title);

    const closeBtn = new Button(this.scene, cx + 250, cy - 180, 'X', () => this.hide(), {
      width: 40, height: 40, fontSize: '18px', fillColor: 0xc0392b,
    });
    this.container.add(closeBtn);

    // Map nodes
    const prismUnlocked = areAllOverworldZoneBossesDefeated();
    const zones = [
      { name: 'Starting Town', x: cx - 220, y: cy, color: 0xffd700, scene: 'TownScene' },
      {
        name: prismUnlocked ? 'Prism Wilds' : 'Prism Wilds (locked)',
        x: cx - 220,
        y: cy - 110,
        color: prismUnlocked ? 0xce93d8 : 0x666666,
        scene: 'ConvergenceWildsScene',
      },
      { name: 'Deep Forest', x: cx - 70, y: cy, color: 0x4caf50, scene: 'ForestScene' },
      { name: 'Shrub Woodlands', x: cx + 90, y: cy, color: 0x66bb6a, scene: 'ShrubWoodlandsScene' },
      { name: 'Stony Mountains', x: cx + 90, y: cy - 100, color: 0x78909c, scene: 'StonyMountainsScene' },
      { name: 'Aqua Isles', x: cx + 90, y: cy + 100, color: 0x29b6f6, scene: 'AquaIslesScene' },
      { name: 'Rocky Cave', x: cx + 20, y: cy - 78, color: 0x607d8b, scene: 'CaveScene' },
      { name: 'Forest Pond', x: cx + 20, y: cy + 78, color: 0x2196f3, scene: 'PondScene' },
    ];

    // Draw connections (Deep Forest is the first wild zone east of town)
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0x555555);
    g.lineBetween(zones[0].x, zones[0].y, zones[2].x, zones[2].y);
    g.lineBetween(zones[0].x, zones[0].y, zones[1].x, zones[1].y);
    g.lineBetween(zones[2].x, zones[2].y, zones[3].x, zones[3].y);
    g.lineBetween(zones[3].x, zones[3].y, zones[4].x, zones[4].y);
    g.lineBetween(zones[3].x, zones[3].y, zones[5].x, zones[5].y);
    g.lineBetween(zones[2].x, zones[2].y, zones[6].x, zones[6].y);
    g.lineBetween(zones[2].x, zones[2].y, zones[7].x, zones[7].y);
    this.container.add(g);

    for (const zone of zones) {
      const isCurrent = currentScene === zone.scene;
      const isLockedPrism = zone.scene === 'ConvergenceWildsScene' && !prismUnlocked;
      const circle = this.scene.add.graphics();
      const fillAlpha = isCurrent ? 1 : isLockedPrism ? 0.35 : 0.5;
      circle.fillStyle(zone.color, fillAlpha);
      circle.fillCircle(zone.x, zone.y, isCurrent ? 18 : 14);
      if (isCurrent) {
        circle.lineStyle(2, 0xffffff);
        circle.strokeCircle(zone.x, zone.y, 18);
      }
      this.container.add(circle);

      const labelColor = isCurrent ? '#ffffff' : isLockedPrism ? '#666666' : '#888888';
      const label = this.scene.add.text(zone.x, zone.y + 28, zone.name, {
        fontSize: '11px', fontFamily: 'Arial', color: labelColor,
      }).setOrigin(0.5);
      this.container.add(label);

      if (isCurrent) {
        const youLabel = this.scene.add.text(zone.x, zone.y - 30, 'YOU', {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#ffd700',
        }).setOrigin(0.5);
        this.container.add(youLabel);
      }
    }
  }
}
