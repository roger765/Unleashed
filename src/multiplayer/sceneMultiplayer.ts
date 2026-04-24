import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { MultiplayerManager } from './MultiplayerManager';

interface SceneMultiplayerState {
  remotePlayer: RemotePlayer | null;
}

const stateMap = new WeakMap<Phaser.Scene, SceneMultiplayerState>();

/**
 * Call once in a world scene's create(), after the Player is instantiated.
 * Sets up the RemotePlayer avatar and wires up peer-update callbacks.
 */
export function initSceneMultiplayer(scene: Phaser.Scene): void {
  const mp = MultiplayerManager.getInstance();
  if (!mp.isConnected()) return;

  const state: SceneMultiplayerState = { remotePlayer: null };
  stateMap.set(scene, state);

  mp.onPeerUpdate(({ scene: peerScene, x, y }) => {
    if (peerScene !== scene.scene.key) {
      state.remotePlayer?.setVisible(false);
      return;
    }

    if (!state.remotePlayer) {
      state.remotePlayer = new RemotePlayer(scene, x, y, mp.getPeerName());
    }
    state.remotePlayer.setVisible(true);
    state.remotePlayer.setTargetPosition(x, y);
  });

  mp.onPeerLeft(() => {
    state.remotePlayer?.destroy();
    state.remotePlayer = null;
  });
}

/**
 * Call every frame in a world scene's update().
 * Sends the local player's position and lerps the remote avatar.
 */
export function tickSceneMultiplayer(scene: Phaser.Scene, player: Player): void {
  const mp = MultiplayerManager.getInstance();
  if (!mp.isConnected()) return;

  mp.sendPosition(scene.scene.key, player.x, player.y);

  stateMap.get(scene)?.remotePlayer?.update();
}

/**
 * Call in a scene's shutdown/destroy to free resources.
 */
export function cleanupSceneMultiplayer(scene: Phaser.Scene): void {
  const state = stateMap.get(scene);
  if (!state) return;
  state.remotePlayer?.destroy();
  state.remotePlayer = null;
  stateMap.delete(scene);
}
