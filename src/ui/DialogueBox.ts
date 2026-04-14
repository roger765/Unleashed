import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';

export class DialogueBox extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private nameLabel: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text;
  private messages: string[] = [];
  private currentIndex = 0;
  private typing = false;
  private fullText = '';
  private charIndex = 0;
  private typeTimer?: Phaser.Time.TimerEvent;
  private onCompleteCallback?: () => void;
  private promptTween?: Phaser.Tweens.Tween;
  private boxX = 0;
  private boxY = 0;
  private boxW = 0;
  private boxH = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(900);
    this.setScrollFactor(0);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.nameLabel = scene.add.text(0, 0, '', {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd700',
      wordWrap: { width: 400, useAdvancedWrap: true },
    }).setDepth(901);
    this.nameLabel.setScrollFactor(0);
    this.add(this.nameLabel);

    this.bodyText = scene.add.text(0, 0, '', {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      wordWrap: { width: 400, useAdvancedWrap: true },
      lineSpacing: 4,
    }).setDepth(901);
    this.bodyText.setScrollFactor(0);
    this.add(this.bodyText);

    this.promptText = scene.add.text(0, 0, '▼', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#3498db',
    }).setOrigin(0.5).setDepth(901).setAlpha(0);
    this.promptText.setScrollFactor(0);
    this.add(this.promptText);

    this.setVisible(false);
    scene.add.existing(this);

    this.applyLayout();
  }

  /** Size and place the panel using the current game viewport (stays on-screen when scaled). */
  private applyLayout(): void {
    const sw = this.scene.scale?.width ?? SCREEN_WIDTH;
    const sh = this.scene.scale?.height ?? SCREEN_HEIGHT;

    const marginX = Math.max(12, Math.min(48, Math.floor(sw * 0.035)));
    const marginBottom = Math.max(10, Math.min(36, Math.floor(sh * 0.028)));

    this.boxW = Math.max(200, Math.floor(sw - marginX * 2));
    this.boxH = Math.max(120, Math.min(Math.floor(sh * 0.42), 340));
    this.boxX = marginX;
    this.boxY = Math.floor(sh - this.boxH - marginBottom);

    const pad = Math.max(10, Math.min(24, Math.floor(this.boxW * 0.03)));
    const innerW = this.boxW - pad * 2;

    this.bg.clear();
    this.bg.fillStyle(0x0d1117, 0.95);
    this.bg.fillRoundedRect(this.boxX, this.boxY, this.boxW, this.boxH, 10);
    this.bg.lineStyle(2, 0x3498db);
    this.bg.strokeRoundedRect(this.boxX, this.boxY, this.boxW, this.boxH, 10);

    const compact = sw < 640;
    const nameSize = compact ? '14px' : '16px';
    const bodySize = compact ? '13px' : '15px';

    this.nameLabel.setPosition(this.boxX + pad, this.boxY + 10);
    this.nameLabel.setStyle({
      fontSize: nameSize,
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd700',
      wordWrap: { width: innerW, useAdvancedWrap: true },
    });

    const bodyTop = this.boxY + (compact ? 32 : 36);
    this.bodyText.setPosition(this.boxX + pad, bodyTop);
    this.bodyText.setStyle({
      fontSize: bodySize,
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      wordWrap: { width: innerW, useAdvancedWrap: true },
      lineSpacing: compact ? 3 : 4,
    });

    this.promptText.setPosition(this.boxX + this.boxW - pad, this.boxY + this.boxH - 14);
    this.promptText.setStyle({ fontSize: compact ? '12px' : '14px', fontFamily: 'Arial, sans-serif', color: '#3498db' });
  }

  show(speakerName: string, messages: string[], onComplete?: () => void): void {
    this.applyLayout();
    this.messages = messages;
    this.currentIndex = 0;
    this.onCompleteCallback = onComplete;
    this.nameLabel.setText(speakerName);
    this.setVisible(true);
    this.typeMessage(messages[0]);

    this.scene.input.once('pointerdown', () => this.advance());
    const kb = this.scene.input.keyboard;
    if (kb) {
      kb.once('keydown-SPACE', () => this.advance());
      kb.once('keydown-E', () => this.advance());
    }
  }

  private typeMessage(text: string): void {
    this.typing = true;
    this.fullText = text;
    this.charIndex = 0;
    this.bodyText.setText('');
    this.promptText.setAlpha(0);
    this.promptTween?.stop();

    this.typeTimer = this.scene.time.addEvent({
      delay: 25,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.bodyText.setText(this.fullText.substring(0, this.charIndex));
        if (this.charIndex >= this.fullText.length) {
          this.typing = false;
          this.showPrompt();
        }
      },
    });
  }

  private showPrompt(): void {
    this.promptTween?.stop();
    this.promptText.setAlpha(1);
    this.promptTween = this.scene.tweens.add({
      targets: this.promptText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private advance(): void {
    const kb = this.scene.input.keyboard;
    if (this.typing) {
      this.typeTimer?.destroy();
      this.bodyText.setText(this.fullText);
      this.typing = false;
      this.showPrompt();
      this.scene.input.once('pointerdown', () => this.advance());
      if (kb) {
        kb.once('keydown-SPACE', () => this.advance());
        kb.once('keydown-E', () => this.advance());
      }
      return;
    }

    this.currentIndex++;
    if (this.currentIndex < this.messages.length) {
      this.typeMessage(this.messages[this.currentIndex]);
      this.scene.input.once('pointerdown', () => this.advance());
      if (kb) {
        kb.once('keydown-SPACE', () => this.advance());
        kb.once('keydown-E', () => this.advance());
      }
    } else {
      this.promptTween?.stop();
      this.setVisible(false);
      this.onCompleteCallback?.();
    }
  }

  hide(): void {
    this.promptTween?.stop();
    this.setVisible(false);
    this.typeTimer?.destroy();
  }
}
