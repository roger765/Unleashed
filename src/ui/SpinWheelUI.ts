import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { SPIN_WHEEL_SEGMENTS } from '../data/spin-wheel';
import { Button } from './Button';
import { Panel } from './Panel';
import { Toast } from './Toast';
import { weightedRandom, randomInt } from '../utils/math';
import { AudioManager } from '../audio/AudioManager';

export class SpinWheelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SpinWheelScene' });
  }

  create(): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    AudioManager.playMusic('calm');

    this.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e);

    this.add.text(cx, 40, 'Daily Spin Wheel', {
      fontSize: '32px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    // Check cooldown
    const gs = GameState.getInstance();
    const lastSpin = gs.getState().lastSpinDate;
    const today = new Date().toISOString().split('T')[0];
    const alreadySpun = lastSpin === today;

    // Draw wheel
    const wheelRadius = 180;
    const wheelX = cx;
    const wheelY = cy + 20;
    const segCount = SPIN_WHEEL_SEGMENTS.length;
    const segAngle = (Math.PI * 2) / segCount;

    const wheelContainer = this.add.container(wheelX, wheelY);

    for (let i = 0; i < segCount; i++) {
      const seg = SPIN_WHEEL_SEGMENTS[i];
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;
      const midAngle = startAngle + segAngle / 2;

      const g = this.make.graphics({});
      g.fillStyle(parseInt(seg.color.replace('#', '0x')), 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, wheelRadius, startAngle, endAngle, false);
      g.closePath();
      g.fillPath();

      // Segment border
      g.lineStyle(2, 0x000000);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, wheelRadius, startAngle, endAngle, false);
      g.closePath();
      g.strokePath();

      wheelContainer.add(g);

      // Label
      const labelDist = wheelRadius * 0.65;
      const lx = Math.cos(midAngle) * labelDist;
      const ly = Math.sin(midAngle) * labelDist;
      const label = this.add.text(lx, ly, seg.label, {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#ffffff',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setAngle(Phaser.Math.RadToDeg(midAngle));
      wheelContainer.add(label);
    }

    // Pointer arrow at top
    const arrow = this.add.graphics();
    arrow.fillStyle(0xffffff);
    arrow.fillTriangle(wheelX, wheelY - wheelRadius - 20, wheelX - 12, wheelY - wheelRadius - 40, wheelX + 12, wheelY - wheelRadius - 40);
    arrow.setDepth(10);

    // Spin button
    const spinBtn = new Button(this, cx, SCREEN_HEIGHT - 100, alreadySpun ? 'Come back tomorrow!' : 'SPIN!', () => {
      if (alreadySpun) return;
      this.doSpin(wheelContainer, spinBtn);
    }, { width: 250, height: 55, fontSize: '22px', fillColor: alreadySpun ? 0x555555 : 0x27ae60 });
    if (alreadySpun) spinBtn.setEnabled(false);

    // Back button
    new Button(this, cx, SCREEN_HEIGHT - 40, 'Back to Town', () => {
      this.scene.start('TownScene');
    }, { width: 180, height: 35, fontSize: '14px', fillColor: 0x2c3e50 });
  }

  private doSpin(wheelContainer: Phaser.GameObjects.Container, spinBtn: Button): void {
    spinBtn.setEnabled(false);

    // Pick result first (weighted random)
    const items = SPIN_WHEEL_SEGMENTS.map((seg, i) => ({ value: i, weight: seg.weight }));
    const winIndex = weightedRandom(items);
    const segCount = SPIN_WHEEL_SEGMENTS.length;
    const segAngle = 360 / segCount;

    // Calculate target rotation: multiple full spins + land on winning segment
    const targetAngle = 360 * randomInt(5, 8) + (segCount - winIndex) * segAngle + segAngle / 2;

    this.tweens.add({
      targets: wheelContainer,
      angle: targetAngle,
      duration: 4000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.awardPrize(winIndex);
        spinBtn.setText('Come back tomorrow!');
      },
    });
  }

  private awardPrize(index: number): void {
    const seg = SPIN_WHEEL_SEGMENTS[index];
    const gs = GameState.getInstance();
    const reward = seg.reward;

    if (reward.type === 'coins' && reward.amount) {
      gs.addCoins(reward.amount);
    } else if (reward.type === 'spirits' && reward.amount) {
      gs.addSpirits(reward.amount);
    } else if (reward.type === 'item' && reward.itemId) {
      gs.addItem(reward.itemId, reward.amount ?? 1);
    } else if (reward.type === 'random-weapon') {
      const weapons = ['rock-hammer', 'nature-wand', 'wood-staff', 'water-trident'];
      const pick = weapons[randomInt(0, weapons.length - 1)];
      gs.addItem(pick, 1);
    }

    // Record spin date
    gs.getState().lastSpinDate = new Date().toISOString().split('T')[0];

    Toast.show(this, `You won: ${seg.label}!`, 3000);
  }
}
