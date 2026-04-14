import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { GameState } from '../state/GameState';
import { EventBus } from '../state/EventBus';
import { PetBookUI } from '../ui/PetBookUI';
import { BagUI } from '../ui/BagUI';
import { MapUI } from '../ui/MapUI';
import { Button } from '../ui/Button';
import { AudioManager } from '../audio/AudioManager';

const ICON_SIZE = 32;
const HUD_PADDING = 12;
const BUTTON_GAP = 8;

export class UIScene extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private spiritText!: Phaser.GameObjects.Text;
  private petBook!: PetBookUI;
  private bagUI!: BagUI;
  private mapUI!: MapUI;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private paused = false;
  /** Mini-menu Calm Mode button (wild pets ignore player). */
  private calmModeMenuButton: Phaser.GameObjects.Image | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // Ensure HUD renders above world scenes
    this.scene.bringToTop('UIScene');

    const state = GameState.getInstance().getState();

    // ── Top-left: Coins ───────────────────────────────────────────
    const coinIcon = this.add.image(HUD_PADDING + 12, HUD_PADDING + 12, 'icon-coin');
    coinIcon.setScrollFactor(0);

    this.coinText = this.add.text(HUD_PADDING + 28, HUD_PADDING + 4, `${state.coins}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    }).setScrollFactor(0);

    // ── Top-left: Spirits (next to coins) ─────────────────────────
    const spiritIcon = this.add.image(HUD_PADDING + 80, HUD_PADDING + 12, 'icon-spirit');
    spiritIcon.setScrollFactor(0);

    this.spiritText = this.add.text(HUD_PADDING + 96, HUD_PADDING + 4, `${state.spirits}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#bb99ff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setScrollFactor(0);

    // ── Bottom center: Mini menu bar ──────────────────────────────
    const menuItems: { key: string; label: string }[] = [
      { key: 'icon-petbook', label: 'Pet Book' },
      { key: 'icon-map', label: 'Map' },
      { key: 'icon-shop', label: 'Shop' },
      { key: 'icon-bag', label: 'Bag' },
      { key: 'icon-peace', label: 'Calm Mode' },
    ];

    const totalWidth = menuItems.length * ICON_SIZE + (menuItems.length - 1) * BUTTON_GAP;
    const barPanelWidth = totalWidth + 24;
    const barPanelHeight = ICON_SIZE + 16;
    const barX = SCREEN_WIDTH / 2;
    const barY = this.scale.height - HUD_PADDING - barPanelHeight / 2;

    // Background panel for menu bar
    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 0.85);
    barBg.fillRoundedRect(
      barX - barPanelWidth / 2,
      barY - barPanelHeight / 2,
      barPanelWidth,
      barPanelHeight,
      8,
    );
    barBg.lineStyle(1, 0x3498db, 0.6);
    barBg.strokeRoundedRect(
      barX - barPanelWidth / 2,
      barY - barPanelHeight / 2,
      barPanelWidth,
      barPanelHeight,
      8,
    );
    barBg.setScrollFactor(0);

    const startX = barX - totalWidth / 2 + ICON_SIZE / 2;

    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      const bx = startX + i * (ICON_SIZE + BUTTON_GAP);
      const btn = this.add.image(bx, barY, item.key)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      if (item.label === 'Calm Mode') {
        this.calmModeMenuButton = btn;
        this.syncCalmModeMenuIcon(btn);
        btn.on('pointerover', () => {
          const on = GameState.getInstance().getFlag('peaceful-roam');
          btn.setTint(on ? 0xccffcc : 0xaaaaff);
        });
        btn.on('pointerout', () => this.syncCalmModeMenuIcon(btn));
      } else {
        btn.on('pointerover', () => btn.setTint(0xaaaaff));
        btn.on('pointerout', () => btn.clearTint());
      }
      btn.on('pointerdown', () => this.onMenuButton(item.label));
    }

    // ── UI Overlays ──────────────────────────────────────────────
    this.petBook = new PetBookUI(this);
    this.bagUI = new BagUI(this);
    this.mapUI = new MapUI(this);

    // ── Event listeners ───────────────────────────────────────────
    EventBus.on('coins-changed', this.onCoinsChanged, this);
    EventBus.on('spirits-changed', this.onSpiritsChanged, this);

    // Escape key for pause menu
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.paused) {
        this.closePauseMenu();
      } else {
        this.openPauseMenu();
      }
    });

    // Clean up listeners when scene shuts down
    this.events.on('shutdown', () => {
      EventBus.off('coins-changed', this.onCoinsChanged, this);
      EventBus.off('spirits-changed', this.onSpiritsChanged, this);
    });
  }

  private onCoinsChanged(coins: number): void {
    this.coinText.setText(`${coins}`);
  }

  private onSpiritsChanged(spirits: number): void {
    this.spiritText.setText(`${spirits}`);
  }

  private onMenuButton(label: string): void {
    // Close any open overlay first
    this.petBook.hide();
    this.bagUI.hide();
    this.mapUI.hide();

    switch (label) {
      case 'Pet Book':
        this.petBook.show();
        break;
      case 'Map':
        this.mapUI.show();
        break;
      case 'Shop':
        this.showToast('Visit the Shop building in town!');
        break;
      case 'Bag':
        this.bagUI.show();
        break;
      case 'Calm Mode': {
        const gs = GameState.getInstance();
        const next = !gs.getFlag('peaceful-roam');
        gs.setFlag('peaceful-roam', next);
        if (this.calmModeMenuButton) {
          this.syncCalmModeMenuIcon(this.calmModeMenuButton);
        }
        this.showToast(
          next
            ? 'Calm Mode on — wild creatures will not attack you.'
            : 'Calm Mode off — wild creatures can attack again.',
        );
        break;
      }
    }
  }

  /** Green tint when Calm Mode is active so the bar shows state at a glance. */
  private syncCalmModeMenuIcon(btn: Phaser.GameObjects.Image): void {
    const on = GameState.getInstance().getFlag('peaceful-roam');
    if (on) {
      btn.setTint(0x99e699);
    } else {
      btn.clearTint();
    }
  }

  private showToast(message: string): void {
    const toast = this.add.text(SCREEN_WIDTH / 2, 40, message, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      duration: 500,
      delay: 1500,
      onComplete: () => toast.destroy(),
    });
  }

  private getActiveWorldScene(): string | null {
    const worldScenes = [
      'TownScene',
      'ForestScene',
      'ShrubWoodlandsScene',
      'StonyMountainsScene',
      'AquaIslesScene',
      'CaveScene',
      'PondScene',
      'ConvergenceWildsScene',
    ];
    for (const key of worldScenes) {
      if (this.scene.isActive(key)) return key;
    }
    return null;
  }

  private openPauseMenu(): void {
    if (this.paused) return;
    this.paused = true;

    // Pause the world scene
    const worldScene = this.getActiveWorldScene();
    if (worldScene) this.scene.pause(worldScene);

    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    this.pauseOverlay = this.add.container(0, 0).setDepth(2000).setScrollFactor(0);

    const bg = this.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.7);
    this.pauseOverlay.add(bg);

    const title = this.add.text(cx, cy - 120, 'PAUSED', {
      fontSize: '42px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5);
    this.pauseOverlay.add(title);

    const resumeBtn = new Button(this, cx, cy - 40, 'Resume', () => {
      this.closePauseMenu();
    }, { width: 220, height: 48, fontSize: '20px', fillColor: 0x27ae60 });
    resumeBtn.setDepth(2001);
    this.pauseOverlay.add(resumeBtn);

    const saveBtn = new Button(this, cx, cy + 20, 'Save Game', () => {
      GameState.getInstance().autoSave();
      this.showToast('Game saved!');
    }, { width: 220, height: 48, fontSize: '20px', fillColor: 0x2980b9 });
    saveBtn.setDepth(2001);
    this.pauseOverlay.add(saveBtn);

    const muteLabel = AudioManager.isMuted() ? 'Unmute' : 'Mute';
    const muteBtn = new Button(this, cx, cy + 80, muteLabel, () => {
      const muted = AudioManager.toggleMute();
      muteBtn.setText(muted ? 'Unmute' : 'Mute');
    }, { width: 220, height: 48, fontSize: '20px', fillColor: 0x8e44ad });
    muteBtn.setDepth(2001);
    this.pauseOverlay.add(muteBtn);

    const quitBtn = new Button(this, cx, cy + 140, 'Quit to Menu', () => {
      GameState.getInstance().saveOnExitIfNeeded();
      this.closePauseMenu();
      this.scene.stop('UIScene');
      const ws = this.getActiveWorldScene();
      if (ws) this.scene.stop(ws);
      this.scene.start('MainMenuScene');
    }, { width: 220, height: 48, fontSize: '20px', fillColor: 0xc0392b });
    quitBtn.setDepth(2001);
    this.pauseOverlay.add(quitBtn);
  }

  private closePauseMenu(): void {
    if (!this.paused) return;
    this.paused = false;

    if (this.pauseOverlay) {
      this.pauseOverlay.destroy(true);
      this.pauseOverlay = null;
    }

    const worldScene = this.getActiveWorldScene();
    if (worldScene) this.scene.resume(worldScene);
  }
}
