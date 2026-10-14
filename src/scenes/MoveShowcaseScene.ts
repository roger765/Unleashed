import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants';
import { MOVES } from '../data/moves';
import { PetType } from '../types/pet';
import { IBattleCombatant } from '../types/battle';
import { playMoveAnimation } from '../battle/petAttackAnimations';
import { getMoveFx } from '../fx/moveEffects';
import { playHitEffect } from '../fx/HitEffect';

const TYPE_NAMES: Record<number, string> = {
  [PetType.Rock]: 'Rock', [PetType.Nature]: 'Nature', [PetType.Wood]: 'Wood',
  [PetType.Water]: 'Water', [PetType.Normal]: 'Normal', [PetType.Light]: 'Light',
  [PetType.Shadow]: 'Shadow', [PetType.Fire]: 'Fire', [PetType.Ice]: 'Ice',
};
const ATTACKER_TEX: Record<number, string> = {
  [PetType.Rock]: 'gravel', [PetType.Nature]: 'leaf', [PetType.Wood]: 'twig',
  [PetType.Water]: 'wave', [PetType.Normal]: 'player', [PetType.Light]: 'glimmer',
  [PetType.Shadow]: 'gloam',
  // Placeholders until the Fire and Ice pet sprites exist (Phase 3).
  [PetType.Fire]: 'glimmer', [PetType.Ice]: 'wave',
};
const ORDER = [PetType.Normal, PetType.Rock, PetType.Nature, PetType.Wood, PetType.Water, PetType.Light, PetType.Shadow, PetType.Fire, PetType.Ice];

/** Dev-only: plays every move's animation in sequence (open the game with ?showcase). */
export class MoveShowcaseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MoveShowcaseScene' });
  }

  create(): void {
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1a1a2e);
    this.add.rectangle(SCREEN_WIDTH / 2, 80, SCREEN_WIDTH, 160, 0x10102a);

    const ax = 330;
    const ay = 520;
    const tx = 880;
    const ty = 270;
    const attacker = this.add.image(ax, ay, 'player').setScale(3).setDepth(2);
    const target = this.add.image(tx, ty, 'cobble').setScale(3).setDepth(2);
    const title = this.add.text(SCREEN_WIDTH / 2, 50, '', {
      fontSize: '44px', fontFamily: 'Arial Black', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);
    const sub = this.add.text(SCREEN_WIDTH / 2, 100, '', {
      fontSize: '22px', fontFamily: 'Arial', color: '#b0b8d0',
    }).setOrigin(0.5).setDepth(10);
    const counter = this.add.text(SCREEN_WIDTH - 20, SCREEN_HEIGHT - 20, '', {
      fontSize: '18px', fontFamily: 'Arial', color: '#808aa8',
    }).setOrigin(1, 1).setDepth(10);

    const moves = Object.values(MOVES).sort(
      (a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type),
    );
    const w = window as unknown as { __showcase: { done: boolean; total: number; index: number } };
    w.__showcase = { done: false, total: moves.length, index: 0 };

    const combatant = { isPlayer: false, pet: undefined } as unknown as IBattleCombatant;
    let i = 0;
    const next = (): void => {
      if (i >= moves.length) {
        title.setText('That\'s every attack!');
        sub.setText('');
        this.time.delayedCall(1200, () => { w.__showcase.done = true; });
        return;
      }
      const m = moves[i];
      w.__showcase.index = i;
      attacker.setTexture(ATTACKER_TEX[m.type] ?? 'player');
      title.setText(m.name);
      sub.setText(`${TYPE_NAMES[m.type]}  ·  ${getMoveFx(m).mode}  ·  power ${m.power}`);
      counter.setText(`${i + 1} / ${moves.length}`);
      i++;
      this.time.delayedCall(450, () => {
        playMoveAnimation(this, attacker, combatant, m, { x: tx, y: ty }, () => {
          playHitEffect(this, target);
          const dmg = this.add.text(tx, ty - 60, `-${m.power}`, {
            fontSize: '30px', fontFamily: 'Arial Black', color: '#ffffff',
          }).setOrigin(0.5).setDepth(100);
          this.tweens.add({ targets: dmg, y: dmg.y - 40, alpha: 0, duration: 800, onComplete: () => dmg.destroy() });
          this.tweens.add({
            targets: target, x: tx + 10, duration: 50, yoyo: true, repeat: 3,
            onComplete: () => target.setX(tx),
          });
          this.time.delayedCall(850, next);
        });
      });
    };
    const params = new URLSearchParams(window.location.search);
    if (params.has('record')) {
      const stream = this.game.canvas.captureStream(60);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 12_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e): void => { chunks.push(e.data); };
      rec.onstop = (): void => {
        void fetch('http://localhost:5199/', { method: 'POST', body: new Blob(chunks, { type: 'video/webm' }) })
          .then(() => { (w.__showcase as { uploaded?: boolean }).uploaded = true; });
      };
      rec.start(500);
      const poll = window.setInterval(() => {
        if (w.__showcase.done) { window.clearInterval(poll); rec.stop(); }
      }, 300);
    }
    next();
  }
}
