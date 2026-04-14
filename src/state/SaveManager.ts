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
      return JSON.parse(raw) as IPlayerState;
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
