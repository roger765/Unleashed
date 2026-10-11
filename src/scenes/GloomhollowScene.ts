import { LightShadowZoneScene } from './LightShadowZoneScene';

export class GloomhollowScene extends LightShadowZoneScene {
  constructor() {
    super({
      key: 'GloomhollowScene',
      title: 'Gloomhollow',
      floorTiles: ['tile-stone-dark', 'tile-stone'],
      floorTint: 0x6f5f9a,
      obstacleTile: 'tile-rock',
      obstacleTint: 0x4a3f78,
      wildPool: [
        ['gloam', 4],
        ['dusklet', 4],
        ['shade', 2],
        ['murkfang', 2],
        ['eclipsor', 1],
      ],
      wildCount: 10,
      levelMin: 35,
      levelMax: 45,
      bossId: 'gloom-sovereign',
      bossNpcName: 'Keeper of the Dusk',
      bossDialogue: [
        'Nothing grows in the hollow, but plenty lives here.',
        'The Gloom Sovereign guards the second half of the Eclipse Sanctum key.',
        'Linger if you dare. Press R near me to wake the Sovereign.',
      ],
      chests: [
        { id: 'gloom-1', tx: 28, ty: 8, coins: 300, item: { itemId: 'shadow-lure', quantity: 2 } },
        { id: 'gloom-2', tx: 7, ty: 14, coins: 400, item: { itemId: 'shadow-stone', quantity: 1 } },
      ],
    });
  }
}
