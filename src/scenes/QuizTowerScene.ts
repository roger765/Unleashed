import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { QUIZZES } from '../data/quizzes';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';
import { randomInt } from '../utils/math';
import { AudioManager } from '../audio/AudioManager';

const TOTAL_FLOORS = 5;

export class QuizTowerScene extends Phaser.Scene {
  private currentFloor = 1;
  private questionIndex = 0;
  private usedQuestions: Set<number> = new Set();

  constructor() {
    super({ key: 'QuizTowerScene' });
  }

  create(): void {
    const gs = GameState.getInstance();
    this.currentFloor = 1;
    this.usedQuestions = new Set();

    AudioManager.playMusic('calm');

    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e);

    this.add.text(SCREEN_WIDTH / 2, 40, 'Quiz Tower', {
      fontSize: '32px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    this.showFloor();
  }

  private showFloor(): void {
    // Clear previous question UI (except bg and title)
    const toDestroy = this.children.getAll().filter((c) => (c as any).y > 60);
    toDestroy.forEach((c) => c.destroy());

    const cx = SCREEN_WIDTH / 2;

    this.add.text(cx, 80, `Floor ${this.currentFloor} / ${TOTAL_FLOORS}`, {
      fontSize: '18px', fontFamily: 'Arial', color: '#3498DB',
    }).setOrigin(0.5);

    // Pick a random unused question
    let idx: number;
    do {
      idx = randomInt(0, QUIZZES.length - 1);
    } while (this.usedQuestions.has(idx) && this.usedQuestions.size < QUIZZES.length);
    this.usedQuestions.add(idx);
    this.questionIndex = idx;

    const q = QUIZZES[idx];

    // Category badge
    this.add.text(cx, 120, q.category, {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#27AE60',
    }).setOrigin(0.5);

    // Question
    this.add.text(cx, 180, q.question, {
      fontSize: '20px', fontFamily: 'Arial', color: '#ffffff',
      wordWrap: { width: 600 }, align: 'center',
    }).setOrigin(0.5);

    // Answer buttons
    for (let i = 0; i < q.options.length; i++) {
      new Button(this, cx, 260 + i * 60, q.options[i], () => {
        this.answerQuestion(i);
      }, { width: 500, height: 45, fontSize: '16px' });
    }

    // Leave button
    new Button(this, cx, SCREEN_HEIGHT - 50, 'Leave Tower', () => {
      this.scene.start('TownScene');
    }, { width: 180, height: 40, fontSize: '14px', fillColor: 0xc0392b });
  }

  private answerQuestion(choice: number): void {
    const q = QUIZZES[this.questionIndex];
    const gs = GameState.getInstance();

    if (choice === q.answer) {
      // Correct
      gs.addCoins(10);
      Toast.show(this, 'Correct! +10 coins');

      if (this.currentFloor >= TOTAL_FLOORS) {
        // Top floor — big reward
        this.time.delayedCall(1000, () => {
          this.showReward();
        });
      } else {
        this.currentFloor++;
        this.time.delayedCall(1000, () => {
          this.showFloor();
        });
      }
    } else {
      // Wrong — try again with new question
      Toast.show(this, 'Wrong! Try again...');
      this.time.delayedCall(1000, () => {
        this.showFloor();
      });
    }
  }

  private showReward(): void {
    const toDestroy = this.children.getAll().filter((c) => (c as any).y > 60);
    toDestroy.forEach((c) => c.destroy());

    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    this.add.text(cx, cy - 60, 'Tower Complete!', {
      fontSize: '36px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    const gs = GameState.getInstance();
    gs.addCoins(100);
    gs.addItem('health-potion', 3);

    this.add.text(cx, cy, '+100 coins\n+3 Health Potions', {
      fontSize: '20px', fontFamily: 'Arial', color: '#4CAF50', align: 'center',
    }).setOrigin(0.5);

    new Button(this, cx, cy + 80, 'Return to Town', () => {
      this.scene.start('TownScene');
    }, { width: 220, height: 50, fontSize: '18px' });
  }
}
