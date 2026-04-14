import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { SaveManager } from '../state/SaveManager';
import { GameState } from '../state/GameState';
import { AssetFactory } from '../assets/AssetFactory';
import { AudioManager } from '../audio/AudioManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    AudioManager.playMusic('calm');

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(cx, cy - 140, 'UNLEASHED', {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, cy - 70, 'A creature collector RPG', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // New Game button
    new Button(this, cx, cy + 20, 'New Game', () => {
      this.scene.start('CharacterCreateScene');
    }, {
      width: 240,
      height: 54,
      fontSize: '24px',
    });

    // Continue button
    const hasSave = SaveManager.hasSave();
    const continueBtn = new Button(this, cx, cy + 90, 'Continue', () => {
      const saved = SaveManager.load();
      if (saved) {
        GameState.getInstance().setState(saved);
        // Regenerate player sprite with saved appearance
        const app = saved.appearance;
        const hairHex = parseInt(app.hairColor.replace('#', ''), 16);
        const skinHex = parseInt(app.skinColor.replace('#', ''), 16);
        AssetFactory.generatePlayerSprite(this, hairHex, skinHex);
        this.scene.start(saved.currentScene || 'TownScene');
      }
    }, {
      width: 240,
      height: 54,
      fontSize: '24px',
    });
    continueBtn.setEnabled(hasSave);

    // Version text
    this.add.text(cx, SCREEN_HEIGHT - 30, 'v0.1.0', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#555555',
    }).setOrigin(0.5);
  }

}
