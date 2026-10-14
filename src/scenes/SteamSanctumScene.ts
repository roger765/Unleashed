import { CastleRoomScene } from './CastleRoomScene';

/** The fusion arena: a single boss room with its own scene key, so the world map can open it directly. */
export class SteamSanctumScene extends CastleRoomScene {
  constructor() {
    super('SteamSanctumScene');
  }

  init(): void {
    super.init({ roomId: 'wyrm' });
  }
}
