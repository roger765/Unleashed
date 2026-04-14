import { playBGM, stopBGM, playSFX } from './ToneGenerator';

/** `calm` = exploration, menus, and all non-battle scenes. `battle` = 8-bit combat theme. */
export type MusicStyle = 'calm' | 'battle';

let currentTrack: MusicStyle | null = null;
let muted = false;

export const AudioManager = {
  playMusic(style: MusicStyle): void {
    if (currentTrack === style) return;

    currentTrack = style;

    if (muted) {
      stopBGM();
      return;
    }

    stopBGM();
    playBGM(style);
  },

  stopMusic(): void {
    currentTrack = null;
    stopBGM();
  },

  playSFX(type: 'hit' | 'miss' | 'levelup' | 'capture' | 'click'): void {
    if (muted) return;
    playSFX(type);
  },

  toggleMute(): boolean {
    muted = !muted;
    if (muted) {
      stopBGM();
    } else if (currentTrack) {
      playBGM(currentTrack);
    }
    return muted;
  },

  isMuted(): boolean {
    return muted;
  },
};
