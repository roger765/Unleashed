import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { Button } from '../ui/Button';
import { SaveManager } from '../state/SaveManager';
import { GameState } from '../state/GameState';
import { AssetFactory } from '../assets/AssetFactory';
import { AudioManager } from '../audio/AudioManager';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager';

export class MainMenuScene extends Phaser.Scene {
  private multiplayerOverlay: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    AudioManager.playMusic('calm');

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

    // New Game
    new Button(this, cx, cy + 0, 'New Game', () => {
      this.scene.start('CharacterCreateScene');
    }, { width: 240, height: 54, fontSize: '24px' });

    // Continue
    const hasSave = SaveManager.hasSave();
    const continueBtn = new Button(this, cx, cy + 70, 'Continue', () => {
      const saved = SaveManager.load();
      if (saved) {
        GameState.getInstance().setState(saved);
        const app = saved.appearance;
        const hairHex = parseInt(app.hairColor.replace('#', ''), 16);
        const skinHex = parseInt(app.skinColor.replace('#', ''), 16);
        AssetFactory.generatePlayerSprite(this, hairHex, skinHex);
        this.scene.start(saved.currentScene || 'TownScene');
      }
    }, { width: 240, height: 54, fontSize: '24px' });
    continueBtn.setEnabled(hasSave);

    // Multiplayer
    new Button(this, cx, cy + 140, 'Multiplayer', () => {
      this.showMultiplayerPanel();
    }, {
      width: 240,
      height: 54,
      fontSize: '24px',
      fillColor: 0x1a472a,
      hoverColor: 0x2d6a4f,
    });

    // Version
    this.add.text(cx, SCREEN_HEIGHT - 30, 'v0.1.0', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#555555',
    }).setOrigin(0.5);

    // Clean up any leftover overlay from a previous visit
    this.events.on('shutdown', () => this.removeOverlay());
  }

  // ── Multiplayer Panel ────────────────────────────────────────

  private showMultiplayerPanel(): void {
    this.removeOverlay();

    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'display:flex',
      'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.82)', 'z-index:9999',
    ].join(';');

    const panel = document.createElement('div');
    panel.style.cssText = [
      'background:#1a1a2e', 'border:2px solid #ffd700',
      'border-radius:14px', 'padding:36px 44px',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'gap:14px',
      'min-width:340px', 'font-family:Arial,sans-serif',
    ].join(';');

    const title = document.createElement('h2');
    title.textContent = 'Multiplayer';
    title.style.cssText = 'margin:0 0 6px;color:#ffd700;font-size:26px;';
    panel.appendChild(title);

    // Saved player name (pre-fill if available)
    const savedName = SaveManager.load()?.name ?? '';

    const makeLabel = (text: string) => {
      const lbl = document.createElement('label');
      lbl.textContent = text;
      lbl.style.cssText = 'color:#cccccc;font-size:13px;align-self:flex-start;';
      return lbl;
    };

    const makeInput = (placeholder: string, value = '') => {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = placeholder;
      inp.value = value;
      inp.maxLength = 20;
      inp.style.cssText = [
        'width:100%', 'padding:8px 12px', 'border-radius:8px',
        'border:1px solid #444', 'background:#0d0d1a',
        'color:#ffffff', 'font-size:16px', 'box-sizing:border-box',
        'outline:none',
      ].join(';');
      return inp;
    };

    panel.appendChild(makeLabel('Your name'));
    const myNameInput = makeInput('Enter your name', savedName);
    panel.appendChild(myNameInput);

    panel.appendChild(makeLabel("Partner's name"));
    const partnerInput = makeInput("Enter partner's name");
    panel.appendChild(partnerInput);

    // Status message area
    const status = document.createElement('p');
    status.style.cssText = 'margin:0;color:#ff6b6b;font-size:13px;min-height:18px;text-align:center;';
    panel.appendChild(status);

    // Buttons row
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;margin-top:4px;';

    const makeBtn = (label: string, bg: string, fg = '#fff') => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = [
        `background:${bg}`, `color:${fg}`,
        'border:none', 'border-radius:8px',
        'padding:10px 28px', 'font-size:16px',
        'font-family:Arial,sans-serif', 'cursor:pointer',
        'font-weight:bold',
      ].join(';');
      return btn;
    };

    const joinBtn = makeBtn('Join', '#1a472a', '#fff');
    const cancelBtn = makeBtn('Cancel', '#333', '#aaa');
    row.appendChild(joinBtn);
    row.appendChild(cancelBtn);
    panel.appendChild(row);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.multiplayerOverlay = overlay;

    // Focus first empty input
    if (!savedName) { myNameInput.focus(); } else { partnerInput.focus(); }

    cancelBtn.onclick = () => this.removeOverlay();

    joinBtn.onclick = async () => {
      const myName = myNameInput.value.trim();
      const partnerName = partnerInput.value.trim();

      if (!myName) { status.textContent = 'Enter your name.'; return; }
      if (!partnerName) { status.textContent = "Enter your partner's name."; return; }
      if (myName === partnerName) { status.textContent = "Names must be different."; return; }

      joinBtn.disabled = true;
      joinBtn.style.opacity = '0.5';
      status.style.color = '#aaaaaa';
      status.textContent = 'Connecting…';

      const mp = MultiplayerManager.getInstance();

      try {
        await mp.register(myName);
        const peer = await mp.join(partnerName);

        status.style.color = '#52b788';
        status.textContent = `Found ${partnerName}! Joining…`;

        // Load or create game state
        const saved = SaveManager.load();
        if (saved) {
          GameState.getInstance().setState(saved);
          const app = saved.appearance;
          const hairHex = parseInt(app.hairColor.replace('#', ''), 16);
          const skinHex = parseInt(app.skinColor.replace('#', ''), 16);
          AssetFactory.generatePlayerSprite(this, hairHex, skinHex);
        } else {
          GameState.getInstance().reset(myName, { hairColor: '#8B4513', skinColor: '#F4C89A' });
          AssetFactory.generatePlayerSprite(this, 0x8B4513, 0xF4C89A);
        }

        // Briefly show success, then start game in peer's scene
        this.time.delayedCall(600, () => {
          this.removeOverlay();
          this.scene.start(peer.scene || 'TownScene');
        });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        status.style.color = '#ff6b6b';
        status.textContent = msg;
        joinBtn.disabled = false;
        joinBtn.style.opacity = '1';
      }
    };

    // Allow Enter key to trigger join
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') joinBtn.click();
      if (e.key === 'Escape') this.removeOverlay();
    };
    overlay.addEventListener('keydown', onKey);
  }

  private removeOverlay(): void {
    this.multiplayerOverlay?.remove();
    this.multiplayerOverlay = null;
  }
}
