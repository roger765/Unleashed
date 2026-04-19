import Phaser from 'phaser';
import { gameConfig } from './config';
import { GameState } from './state/GameState';

if (navigator.maxTouchPoints > 0) {
  document.body.classList.add('touch-device');
}

const game = new Phaser.Game(gameConfig);

function saveWhenLeaving(): void {
  GameState.getInstance().saveOnExitIfNeeded();
}

// Closing the tab, refresh, or navigating away
window.addEventListener('pagehide', saveWhenLeaving);
window.addEventListener('beforeunload', saveWhenLeaving);
// Mobile / background tab — localStorage still works while page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveWhenLeaving();
  }
});

console.log(`Unleashed — Phaser ${Phaser.VERSION} loaded`);
