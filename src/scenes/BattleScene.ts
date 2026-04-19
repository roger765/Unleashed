import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { IBattleCombatant, IDamageResult } from '../types/battle';
import { AttackCategory } from '../types/move';
import { BattleManager, BattlePhase, BattleConfig } from '../battle/BattleManager';
import { playPetAttackAnimation } from '../battle/petAttackAnimations';
import { getCaptureInfo, performCapture, CaptureInfo } from '../battle/CaptureManager';
import { GameState } from '../state/GameState';
import { PET_TEMPLATES } from '../data/pets';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { HealthBar } from '../ui/HealthBar';
import { Toast } from '../ui/Toast';
import { playDefeatEffect } from '../fx/DefeatEffect';
import { playHitEffect } from '../fx/HitEffect';
import { randomInt } from '../utils/math';
import { MAX_TEAM_SIZE } from '../constants';
import { AudioManager } from '../audio/AudioManager';
import { ITEMS } from '../data/items';
import { ALL_REGISTERED_BOSS_IDS } from '../data/bosses';
import { ItemType } from '../types/item';
import { isTouchDevice } from '../utils/mobile';

const TYPE_COLORS: Record<number, number> = {
  0: 0x78909c, // Rock
  1: 0x4caf50, // Nature
  2: 0x795548, // Wood
  3: 0x2196f3, // Water
  4: 0x9e9e9e, // Normal
};

const TYPE_COLOR_STR: Record<number, string> = {
  0: '#78909C',
  1: '#4CAF50',
  2: '#795548',
  3: '#2196F3',
  4: '#9E9E9E',
};

interface SpriteEntry {
  sprite: Phaser.GameObjects.Image;
  hpBar: HealthBar;
  nameText: Phaser.GameObjects.Text;
  highlight: Phaser.GameObjects.Graphics;
  combatant: IBattleCombatant;
}

export class BattleScene extends Phaser.Scene {
  private manager!: BattleManager;
  private playerEntries: SpriteEntry[] = [];
  private enemyEntries: SpriteEntry[] = [];
  private actionPanel!: Panel;
  private actionContent: Phaser.GameObjects.GameObject[] = [];
  private logTexts: Phaser.GameObjects.Text[] = [];
  private keyboardEnabled = false;
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  private btnH = 40;
  private btnStep = 52;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { battleConfig: BattleConfig }): void {
    this.manager = new BattleManager(data.battleConfig);
  }

  create(): void {
    AudioManager.playMusic('battle');
    this.playerEntries = [];
    this.enemyEntries = [];
    this.actionContent = [];
    this.logTexts = [];

    // Background
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e);

    // Divider line
    this.add.graphics()
      .lineStyle(1, 0x3498db, 0.3)
      .lineBetween(0, SCREEN_HEIGHT * 0.45, SCREEN_WIDTH * 0.65, SCREEN_HEIGHT * 0.45);

    // Create combatant sprites
    this.createEnemySprites();
    this.createPlayerSprites();

    // Action panel (right side, bottom)
    this.actionPanel = new Panel(this, SCREEN_WIDTH - 220, SCREEN_HEIGHT - 160, 400, 280, {
      fillColor: 0x0d1117,
      fillAlpha: 0.95,
      borderColor: 0x3498db,
    });

    // Keyboard shortcuts
    if (this.input.keyboard) {
      this.numberKeys = [
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      ];
    }

    this.btnH = isTouchDevice() ? 52 : 40;
    this.btnStep = this.btnH + 12;

    // Start
    this.showSelectAttacker();
  }

  update(): void {
    if (!this.keyboardEnabled) return;
    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        this.handleKeyPress(i);
      }
    }
  }

  // --- Sprite creation ---

  private createEnemySprites(): void {
    const team = this.manager.config.enemyTeam;
    const startX = 120;
    const y = 100;
    const spacing = 140;

    for (let i = 0; i < team.length; i++) {
      const c = team[i];
      const x = startX + i * spacing;

      const highlight = this.add.graphics().setDepth(1);
      const sprite = this.add.image(x, y, c.pet?.templateId ?? 'player').setScale(2).setDepth(2);
      const nameText = this.add.text(x, y + 55, `${c.name} Lv${c.pet?.level ?? 1}`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
      }).setOrigin(0.5).setDepth(2);
      const hpBar = new HealthBar(this, x - 50, y + 70, 100, 12);
      hpBar.setHealth(c.currentHp, c.maxHp);
      hpBar.setDepth(2);

      this.enemyEntries.push({ sprite, hpBar, nameText, highlight, combatant: c });
    }
  }

  private createPlayerSprites(): void {
    const team = this.manager.config.playerTeam;
    const startX = 120;
    const y = SCREEN_HEIGHT * 0.45 + 100;
    const spacing = 140;

    for (let i = 0; i < team.length; i++) {
      const c = team[i];
      const x = startX + i * spacing;

      const textureKey = c.isPlayer ? 'player' : (c.pet?.templateId ?? 'player');
      const highlight = this.add.graphics().setDepth(1);
      const sprite = this.add.image(x, y, textureKey).setScale(2).setDepth(2);
      const nameText = this.add.text(x, y + 55, `${c.name} Lv${c.pet?.level ?? 1}`, {
        fontSize: '13px', fontFamily: 'Arial', color: '#ffffff',
      }).setOrigin(0.5).setDepth(2);
      const hpBar = new HealthBar(this, x - 50, y + 70, 100, 12);
      hpBar.setHealth(c.currentHp, c.maxHp);
      hpBar.setDepth(2);

      this.playerEntries.push({ sprite, hpBar, nameText, highlight, combatant: c });
    }
  }

  // --- Phase UI ---

  private clearActionContent(): void {
    for (const obj of this.actionContent) obj.destroy();
    this.actionContent = [];
    this.keyboardEnabled = false;
  }

  private clearHighlights(): void {
    for (const e of [...this.playerEntries, ...this.enemyEntries]) {
      e.highlight.clear();
    }
  }

  private showSelectAttacker(): void {
    this.manager.phase = BattlePhase.SelectAttacker;
    this.clearActionContent();
    this.clearHighlights();

    const px = SCREEN_WIDTH - 220;
    const py = SCREEN_HEIGHT - 280;

    const title = this.add.text(px, py, 'Choose your attacker:', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);
    this.actionContent.push(title);

    const alive = this.manager.config.playerTeam;
    for (let i = 0; i < alive.length; i++) {
      const c = alive[i];
      if (c.currentHp <= 0) continue;

      // Highlight player sprites
      const entry = this.playerEntries[i];
      if (entry) {
        entry.highlight.clear();
        entry.highlight.lineStyle(2, 0xffd700);
        entry.highlight.strokeRect(
          entry.sprite.x - 30, entry.sprite.y - 30, 60, 60,
        );
      }

      const btn = new Button(this, px, py + 35 + i * this.btnStep, `${i + 1}. ${c.name} (${c.currentHp}/${c.maxHp})`, () => {
        this.onSelectAttacker(i);
      }, { width: 350, height: this.btnH, fontSize: '14px', fillColor: 0x2c3e50 });
      btn.setDepth(10);
      this.actionContent.push(btn);
    }

    this.keyboardEnabled = true;
  }

  private showSelectMove(): void {
    this.manager.phase = BattlePhase.SelectMove;
    this.clearActionContent();
    this.clearHighlights();

    const attacker = this.manager.config.playerTeam[this.manager.selectedAttackerIndex];
    const px = SCREEN_WIDTH - 220;
    const py = SCREEN_HEIGHT - 280;

    // Highlight selected attacker
    const entry = this.playerEntries[this.manager.selectedAttackerIndex];
    if (entry) {
      entry.highlight.clear();
      entry.highlight.lineStyle(3, 0x00ff00);
      entry.highlight.strokeRect(entry.sprite.x - 30, entry.sprite.y - 30, 60, 60);
    }

    const title = this.add.text(px, py, `${attacker.name}'s move:`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);
    this.actionContent.push(title);

    const categoryLabel = (cat: AttackCategory) => {
      if (cat === AttackCategory.Direct) return '[D]';
      if (cat === AttackCategory.Ranged) return '[R]';
      return '[C]';
    };

    for (let i = 0; i < attacker.moves.length; i++) {
      const move = attacker.moves[i];
      const color = TYPE_COLORS[move.type] ?? 0x9e9e9e;
      const btn = new Button(
        this, px, py + 35 + i * this.btnStep,
        `${i + 1}. ${move.name} ${categoryLabel(move.category)} Pow:${move.power}`,
        () => this.onSelectMove(i),
        { width: 350, height: this.btnH, fontSize: '14px', fillColor: color },
      );
      btn.setDepth(10);
      this.actionContent.push(btn);
    }

    // Items button (only if player has usable items)
    const gs = GameState.getInstance();
    const usable = gs.getState().inventory.filter((slot) => {
      const item = ITEMS[slot.itemId];
      return item && (item.itemType === ItemType.Potion || item.itemType === ItemType.Food);
    });
    if (usable.length > 0) {
      const itemBtn = new Button(
        this, px, py + 35 + attacker.moves.length * this.btnStep,
        'Items',
        () => this.showItemSelect(),
        { width: 350, height: this.btnH, fontSize: '14px', fillColor: 0x8e44ad },
      );
      itemBtn.setDepth(10);
      this.actionContent.push(itemBtn);
    }

    this.keyboardEnabled = true;
  }

  private showSelectTarget(): void {
    this.manager.phase = BattlePhase.SelectTarget;
    this.clearActionContent();
    this.clearHighlights();

    const px = SCREEN_WIDTH - 220;
    const py = SCREEN_HEIGHT - 280;

    const title = this.add.text(px, py, 'Choose a target:', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);
    this.actionContent.push(title);

    const enemies = this.manager.config.enemyTeam;
    let btnIdx = 0;
    for (let i = 0; i < enemies.length; i++) {
      const c = enemies[i];
      if (c.currentHp <= 0) continue;

      // Highlight enemy
      const entry = this.enemyEntries[i];
      if (entry) {
        entry.highlight.clear();
        entry.highlight.lineStyle(2, 0xff4444);
        entry.highlight.strokeRect(entry.sprite.x - 30, entry.sprite.y - 30, 60, 60);

        // Make sprite clickable
        entry.sprite.setInteractive({ useHandCursor: true });
        entry.sprite.once('pointerdown', () => this.onSelectTarget(i));
      }

      const idx = btnIdx;
      const btn = new Button(
        this, px, py + 35 + btnIdx * this.btnStep,
        `${btnIdx + 1}. ${c.name} (${c.currentHp}/${c.maxHp})`,
        () => this.onSelectTarget(i),
        { width: 350, height: this.btnH, fontSize: '14px', fillColor: 0xc0392b },
      );
      btn.setDepth(10);
      this.actionContent.push(btn);
      btnIdx++;
    }

    this.keyboardEnabled = true;
  }

  private showLog(lines: string[]): void {
    for (const t of this.logTexts) t.destroy();
    this.logTexts = [];

    const px = SCREEN_WIDTH - 220;
    const py = SCREEN_HEIGHT - 280;

    for (let i = 0; i < lines.length; i++) {
      let color = '#ffffff';
      if (lines[i].includes('super effective')) color = '#4CAF50';
      if (lines[i].includes('Not very')) color = '#FF9800';
      if (lines[i].includes('MISS')) color = '#CCCCCC';
      if (lines[i].includes('defeated')) color = '#E53935';

      const t = this.add.text(px, py + i * 22, lines[i], {
        fontSize: '14px', fontFamily: 'Arial', color,
      }).setOrigin(0.5).setDepth(10);
      this.logTexts.push(t);
    }
  }

  // --- Actions ---

  private handleKeyPress(index: number): void {
    if (this.manager.phase === BattlePhase.SelectAttacker) {
      this.onSelectAttacker(index);
    } else if (this.manager.phase === BattlePhase.SelectMove) {
      this.onSelectMove(index);
    } else if (this.manager.phase === BattlePhase.SelectTarget) {
      // Map key index to alive enemy index
      const alive = this.manager.config.enemyTeam
        .map((c, i) => ({ c, i }))
        .filter((e) => e.c.currentHp > 0);
      if (index < alive.length) {
        this.onSelectTarget(alive[index].i);
      }
    }
  }

  private onSelectAttacker(index: number): void {
    if (!this.manager.selectAttacker(index)) return;
    this.showSelectMove();
  }

  private onSelectMove(moveIndex: number): void {
    const attacker = this.manager.config.playerTeam[this.manager.selectedAttackerIndex];
    if (!attacker || moveIndex >= attacker.moves.length) return;

    const nextPhase = this.manager.selectMove(moveIndex);
    const move = attacker.moves[moveIndex];

    if (nextPhase === BattlePhase.SelectTarget) {
      this.showSelectTarget();
    } else {
      // Ranged or Chance — execute immediately
      this.clearActionContent();
      this.clearHighlights();
      this.keyboardEnabled = false;

      let targets: IBattleCombatant[];
      if (move.category === AttackCategory.Ranged) {
        targets = this.manager.config.enemyTeam.filter((c) => c.currentHp > 0);
      } else {
        // Chance: random enemy
        const alive = this.manager.config.enemyTeam.filter((c) => c.currentHp > 0);
        targets = alive.length > 0 ? [alive[randomInt(0, alive.length - 1)]] : [];
      }

      this.manager.selectTarget(-1); // just advances phase
      this.executePlayerAttack(move, targets);
    }
  }

  private onSelectTarget(targetIndex: number): void {
    this.clearActionContent();
    this.clearHighlights();
    this.keyboardEnabled = false;

    // Remove sprite interactivity
    for (const e of this.enemyEntries) {
      e.sprite.removeInteractive();
    }

    const attacker = this.manager.config.playerTeam[this.manager.selectedAttackerIndex];
    const move = attacker.moves[this.manager.selectedMoveIndex];
    const target = this.manager.config.enemyTeam[targetIndex];

    this.manager.selectTarget(targetIndex);
    this.executePlayerAttack(move, target ? [target] : []);
  }

  private executePlayerAttack(move: import('../types/move').IMove, targets: IBattleCombatant[]): void {
    const results = this.manager.executePlayerMove(move, targets);
    const attackerEntry = this.playerEntries[this.manager.selectedAttackerIndex];
    const aim = this.getAimPointForTargets(targets, this.enemyEntries);

    const afterAttackAnim = (): void => {
      this.showLog(this.manager.turnLog);
      this.animateAttackResults(results, 'player', () => {
        const outcome = this.manager.checkBattleEnd();
        if (outcome !== 'ongoing') {
          this.showBattleOver(outcome === 'win');
        } else {
          this.doEnemyTurn();
        }
      });
    };

    if (!attackerEntry) {
      afterAttackAnim();
      return;
    }

    playPetAttackAnimation(
      this,
      attackerEntry.sprite,
      attackerEntry.combatant,
      { targetX: aim.x, targetY: aim.y, moveCategory: move.category },
      afterAttackAnim,
    );
  }

  private doEnemyTurn(): void {
    this.time.delayedCall(600, () => {
      const { results, decision } = this.manager.executeEnemyTurn();
      const attacker = this.manager.config.enemyTeam[decision.attackerIndex];
      const enemyEntry = this.enemyEntries[decision.attackerIndex];
      const move = attacker?.moves[decision.moveIndex];
      const aim = this.getAimPointFromDamageResults(results, this.playerEntries);

      const afterAttackAnim = (): void => {
        this.showLog(this.manager.turnLog);
        this.animateAttackResults(results, 'enemy', () => {
          // Process status effects
          this.manager.processStatusEffects(this.manager.config.playerTeam);
          this.manager.processStatusEffects(this.manager.config.enemyTeam);
          this.updateAllHealthBars();

          const outcome = this.manager.checkBattleEnd();
          if (outcome !== 'ongoing') {
            this.time.delayedCall(400, () => this.showBattleOver(outcome === 'win'));
          } else {
            this.time.delayedCall(400, () => this.showSelectAttacker());
          }
        });
      };

      if (!enemyEntry || !attacker || !move) {
        afterAttackAnim();
        return;
      }

      playPetAttackAnimation(
        this,
        enemyEntry.sprite,
        enemyEntry.combatant,
        { targetX: aim.x, targetY: aim.y, moveCategory: move.category },
        afterAttackAnim,
      );
    });
  }

  /** Aim at centroid of target combatants' sprites (enemy side when player attacks). */
  private getAimPointForTargets(
    targets: IBattleCombatant[],
    targetEntries: SpriteEntry[],
  ): { x: number; y: number } {
    if (targets.length === 0) {
      const list =
        targetEntries.filter((e) => e.combatant.currentHp > 0).length > 0
          ? targetEntries.filter((e) => e.combatant.currentHp > 0)
          : targetEntries;
      if (list.length === 0) {
        return { x: SCREEN_WIDTH * 0.35, y: SCREEN_HEIGHT * 0.28 };
      }
      const sx = list.reduce((s, e) => s + e.sprite.x, 0);
      const sy = list.reduce((s, e) => s + e.sprite.y, 0);
      return { x: sx / list.length, y: sy / list.length };
    }
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const t of targets) {
      const e = targetEntries.find((ent) => ent.combatant.id === t.id);
      if (e) {
        sx += e.sprite.x;
        sy += e.sprite.y;
        n++;
      }
    }
    if (n === 0) {
      return this.getAimPointForTargets([], targetEntries);
    }
    return { x: sx / n, y: sy / n };
  }

  /** Aim at struck targets (player side when enemy attacks). */
  private getAimPointFromDamageResults(
    results: IDamageResult[],
    targetEntries: SpriteEntry[],
  ): { x: number; y: number } {
    const ids = [...new Set(results.map((r) => r.targetId))];
    if (ids.length === 0) {
      return this.getAimPointForTargets([], targetEntries);
    }
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const id of ids) {
      const e = targetEntries.find((ent) => ent.combatant.id === id);
      if (e) {
        sx += e.sprite.x;
        sy += e.sprite.y;
        n++;
      }
    }
    if (n === 0) {
      return this.getAimPointForTargets([], targetEntries);
    }
    return { x: sx / n, y: sy / n };
  }

  // --- Animation ---

  private animateAttackResults(
    results: IDamageResult[],
    side: 'player' | 'enemy',
    onComplete: () => void,
  ): void {
    if (results.length === 0) {
      onComplete();
      return;
    }

    const entries = side === 'player' ? this.enemyEntries : this.playerEntries;
    let delay = 0;

    for (const r of results) {
      const entry = entries.find((e) => e.combatant.id === r.targetId);
      if (!entry) continue;

      this.time.delayedCall(delay, () => {
        if (r.missed) {
          AudioManager.playSFX('miss');
          const missText = this.add.text(entry.sprite.x, entry.sprite.y - 40, 'MISS!', {
            fontSize: '20px', fontFamily: 'Arial Black', color: '#aaaaaa',
          }).setOrigin(0.5).setDepth(100);
          this.tweens.add({
            targets: missText, y: missText.y - 30, alpha: 0, duration: 800,
            onComplete: () => missText.destroy(),
          });
        } else {
          AudioManager.playSFX('hit');
          playHitEffect(this, entry.sprite as Phaser.GameObjects.Sprite);

          // Damage number
          const dmgText = this.add.text(entry.sprite.x, entry.sprite.y - 40, `-${r.damage}`, {
            fontSize: '22px', fontFamily: 'Arial Black',
            color: r.effectiveness === 'super' ? '#4CAF50' : r.effectiveness === 'weak' ? '#FF9800' : '#ffffff',
          }).setOrigin(0.5).setDepth(100);
          this.tweens.add({
            targets: dmgText, y: dmgText.y - 30, alpha: 0, duration: 800,
            onComplete: () => dmgText.destroy(),
          });

          // Update HP bar
          entry.hpBar.animateTo(entry.combatant.currentHp, entry.combatant.maxHp, 300);

          // Defeat animation
          if (entry.combatant.currentHp <= 0) {
            this.time.delayedCall(350, () => {
              entry.sprite.setVisible(false);
              entry.nameText.setVisible(false);
              playDefeatEffect(this, entry.sprite.x, entry.sprite.y, () => {});
            });
          }
        }
      });

      delay += 300;
    }

    this.time.delayedCall(delay + 400, onComplete);
  }

  private updateAllHealthBars(): void {
    for (const e of [...this.playerEntries, ...this.enemyEntries]) {
      e.hpBar.setHealth(e.combatant.currentHp, e.combatant.maxHp);
    }
  }

  // --- Battle Over ---

  private showItemSelect(): void {
    this.clearActionContent();
    this.keyboardEnabled = false;

    const gs = GameState.getInstance();
    const inventory = gs.getState().inventory;
    const usable = inventory.filter((slot) => {
      const item = ITEMS[slot.itemId];
      return item && (item.itemType === ItemType.Potion || item.itemType === ItemType.Food);
    });

    const px = SCREEN_WIDTH - 220;
    const py = SCREEN_HEIGHT - 280;

    const title = this.add.text(px, py, 'Use item on which pet?', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);
    this.actionContent.push(title);

    // First pick the item
    for (let i = 0; i < usable.length; i++) {
      const slot = usable[i];
      const item = ITEMS[slot.itemId];
      const btn = new Button(
        this, px, py + 35 + i * this.btnStep,
        `${item.name} x${slot.quantity}`,
        () => this.showItemTargetSelect(slot.itemId),
        { width: 350, height: this.btnH, fontSize: '14px', fillColor: 0x8e44ad },
      );
      btn.setDepth(10);
      this.actionContent.push(btn);
    }

    const backBtn = new Button(
      this, px, py + 35 + usable.length * this.btnStep,
      'Back',
      () => this.showSelectMove(),
      { width: 350, height: this.btnH, fontSize: '14px', fillColor: 0x2c3e50 },
    );
    backBtn.setDepth(10);
    this.actionContent.push(backBtn);
  }

  private showItemTargetSelect(itemId: string): void {
    this.clearActionContent();

    const px = SCREEN_WIDTH - 220;
    const py = SCREEN_HEIGHT - 280;
    const item = ITEMS[itemId];

    const title = this.add.text(px, py, `Use ${item.name} on:`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);
    this.actionContent.push(title);

    const team = this.manager.config.playerTeam;
    let btnIdx = 0;
    for (let i = 0; i < team.length; i++) {
      const c = team[i];
      if (c.currentHp <= 0) continue;

      const btn = new Button(
        this, px, py + 35 + btnIdx * this.btnStep,
        `${c.name} (${c.currentHp}/${c.maxHp})`,
        () => this.useItem(itemId, i),
        { width: 350, height: this.btnH, fontSize: '14px', fillColor: 0x27ae60 },
      );
      btn.setDepth(10);
      this.actionContent.push(btn);
      btnIdx++;
    }

    const backBtn = new Button(
      this, px, py + 35 + btnIdx * this.btnStep,
      'Back',
      () => this.showItemSelect(),
      { width: 350, height: this.btnH, fontSize: '14px', fillColor: 0x2c3e50 },
    );
    backBtn.setDepth(10);
    this.actionContent.push(backBtn);
  }

  private useItem(itemId: string, targetIndex: number): void {
    const gs = GameState.getInstance();
    const item = ITEMS[itemId];
    if (!item) return;

    if (!gs.removeItem(itemId, 1)) {
      Toast.show(this, 'No items left!');
      return;
    }

    const target = this.manager.config.playerTeam[targetIndex];
    let healAmount = 0;

    if (item.itemType === ItemType.Food && item.healAmount) {
      healAmount = item.healAmount;
    } else if (item.itemType === ItemType.Potion && item.healPerTurn && item.healDuration) {
      healAmount = item.healPerTurn * item.healDuration;
    }

    target.currentHp = Math.min(target.currentHp + healAmount, target.maxHp);

    // Also update the actual pet in GameState team
    const state = gs.getState();
    if (targetIndex > 0 && targetIndex - 1 < state.team.length) {
      state.team[targetIndex - 1].currentHp = Math.min(
        state.team[targetIndex - 1].currentHp + healAmount,
        state.team[targetIndex - 1].maxHp,
      );
    }

    this.updateAllHealthBars();
    this.clearActionContent();

    this.manager.turnLog = [`Used ${item.name} on ${target.name}! +${healAmount} HP`];
    this.showLog(this.manager.turnLog);

    Toast.show(this, `${target.name} healed for ${healAmount} HP!`);

    // Using an item costs the turn — enemy acts next
    const outcome = this.manager.checkBattleEnd();
    if (outcome !== 'ongoing') {
      this.time.delayedCall(600, () => this.showBattleOver(outcome === 'win'));
    } else {
      this.doEnemyTurn();
    }
  }

  private showBattleOver(won: boolean): void {
    this.clearActionContent();
    this.clearHighlights();
    this.keyboardEnabled = false;
    for (const t of this.logTexts) t.destroy();
    this.logTexts = [];

    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    // Overlay
    const overlay = this.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.6).setDepth(200);
    this.actionContent.push(overlay);

    if (won) {
      const title = this.add.text(cx, cy - 100, 'VICTORY!', {
        fontSize: '56px', fontFamily: 'Arial Black', color: '#ffd700',
        stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(201);
      this.actionContent.push(title);

      const rewards = this.manager.calculateRewards();

      // Apply rewards to game state
      const gs = GameState.getInstance();
      gs.addCoins(rewards.coins);
      if (rewards.wildSpirits > 0) {
        gs.addSpirits(rewards.wildSpirits);
      }

      // Track boss defeat for tower progression
      if (this.manager.config.isBoss) {
        for (const bid of ALL_REGISTERED_BOSS_IDS) {
          if (gs.getFlag(`fighting-boss-${bid}`)) {
            gs.setFlag(`boss-defeated-${bid}`, true);
            gs.setFlag(`fighting-boss-${bid}`, false);
          }
        }
      }

      // Track forest wild wins for quest
      const wildForestProgressScenes = ['ForestScene', 'ShrubWoodlandsScene'];
      if (
        this.manager.config.isWild &&
        wildForestProgressScenes.includes(this.manager.config.returnScene)
      ) {
        if (gs.getFlag('forest-quest-accepted') && !gs.getFlag('forest-boss-unlocked')) {
          const wins = gs.incrementCounter('forest-wins');
          if (wins >= 5) {
            gs.setFlag('forest-boss-unlocked', true);
          }
        }
      }

      // Award XP to alive pets
      const levelUps: string[] = [];
      const state = gs.getState();
      for (let i = 0; i < state.team.length; i++) {
        if (state.team[i].currentHp > 0) {
          const levelled = gs.addXpToPet(i, rewards.xpPerPet);
          if (levelled) {
            levelUps.push(`${state.team[i].nickname} levelled up to ${state.team[i].level}!`);
          }
        }
      }

      // Also give player XP
      const playerLevelled = gs.addXpToPlayer(rewards.xpPerPet);
      if (playerLevelled) {
        levelUps.push(`You reached level ${state.level}!`);
      }

      let infoY = cy - 40;
      const spiritPart =
        rewards.wildSpirits > 0
          ? `    +${rewards.wildSpirits} spirit${rewards.wildSpirits === 1 ? '' : 's'}`
          : '';
      const rewardText = this.add.text(
        cx,
        infoY,
        `+${rewards.coins} coins    +${rewards.xpPerPet} XP${spiritPart}`,
        {
          fontSize: '22px',
          fontFamily: 'Arial',
          color: '#ffffff',
        },
      ).setOrigin(0.5).setDepth(201);
      this.actionContent.push(rewardText);
      infoY += 30;

      if (levelUps.length > 0) AudioManager.playSFX('levelup');
      for (const lu of levelUps) {
        const t = this.add.text(cx, infoY, lu, {
          fontSize: '18px', fontFamily: 'Arial', color: '#4CAF50',
        }).setOrigin(0.5).setDepth(201);
        this.actionContent.push(t);
        infoY += 25;
      }

      infoY += 20;

      // Capture option
      if (this.manager.config.isWild) {
        const captureInfo = getCaptureInfo(this.manager.config.enemyTeam);
        if (captureInfo) {
          const costStr = captureInfo.cost > 0 ? ` (${captureInfo.cost} coins)` : ' (Free!)';
          const capBtn = new Button(this, cx, infoY, `Capture ${captureInfo.petName}${costStr}`, () => {
            this.doCapture(captureInfo);
            capBtn.setEnabled(false);
          }, { width: 350, height: 45, fontSize: '16px', fillColor: 0x2196f3 });
          capBtn.setDepth(201);
          this.actionContent.push(capBtn);
          infoY += 55;
        }
      }

      // Check win condition: all bosses defeated
      const allDefeated = ALL_REGISTERED_BOSS_IDS.every((bid) => gs.getFlag(`boss-defeated-${bid}`));

      if (allDefeated && this.manager.config.isBoss) {
        const winText = this.add.text(cx, infoY, 'You have conquered all bosses! Champion of the realm!', {
          fontSize: '20px', fontFamily: 'Arial Black', color: '#ffd700',
          wordWrap: { width: 500 },
          align: 'center',
        }).setOrigin(0.5).setDepth(201);
        this.actionContent.push(winText);
        infoY += 50;
      }

      // Continue button
      const contBtn = new Button(this, cx, infoY, 'Continue', () => {
        this.returnToWorld();
      }, { width: 200, height: 45, fontSize: '18px' });
      contBtn.setDepth(201);
      this.actionContent.push(contBtn);
    } else {
      const title = this.add.text(cx, cy - 40, 'DEFEATED...', {
        fontSize: '48px', fontFamily: 'Arial Black', color: '#e53935',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(201);
      this.actionContent.push(title);

      // Heal team on loss (health fully regenerates after battle per spec)
      const gs = GameState.getInstance();
      for (const pet of gs.getState().team) {
        const template = PET_TEMPLATES[pet.templateId];
        if (template) {
          pet.currentHp = Math.floor(template.baseHp + pet.level * template.baseHp * 0.1);
        }
      }

      const btn = new Button(this, cx, cy + 40, 'Return to Town', () => {
        this.scene.stop('UIScene');
        this.scene.start('TownScene');
      }, { width: 250, height: 50, fontSize: '18px', fillColor: 0xc0392b });
      btn.setDepth(201);
      this.actionContent.push(btn);
    }
  }

  private doCapture(info: CaptureInfo): void {
    const gs = GameState.getInstance();

    if (info.cost > 0 && !gs.removeCoins(info.cost)) {
      Toast.show(this, 'Not enough coins!');
      return;
    }

    AudioManager.playSFX('capture');
    const pet = performCapture(info);
    const added = gs.addPetToTeam(pet);
    if (!added) {
      gs.addPetToStorage(pet);
      Toast.show(this, `${info.petName} was sent to Pet Book storage!`);
    } else {
      Toast.show(this, `${info.petName} joined your team!`);
    }
  }

  private returnToWorld(): void {
    // Heal all pets (health fully regenerates after battle)
    const gs = GameState.getInstance();
    for (const pet of gs.getState().team) {
      pet.currentHp = pet.maxHp;
    }

    gs.autoSave();

    const returnScene = this.manager.config.returnScene;
    this.scene.stop('BattleScene');
    this.scene.start(returnScene);
  }
}
