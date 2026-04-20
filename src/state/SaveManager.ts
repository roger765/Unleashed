import { IPlayerState } from '../types/player';

const SAVE_KEY = 'unleashed-save';

export class SaveManager {
  static save(state: IPlayerState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  static load(): IPlayerState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw) as IPlayerState;
      // Migration: old saves lack playerPosition
      if (state.playerPosition === undefined) state.playerPosition = null;
      return state;
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
