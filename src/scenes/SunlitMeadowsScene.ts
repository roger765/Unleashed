import { LightShadowZoneScene } from './LightShadowZoneScene';

export class SunlitMeadowsScene extends LightShadowZoneScene {
  constructor() {
    super({
      key: 'SunlitMeadowsScene',
      title: 'Sunlit Meadows',
      floorTiles: ['tile-grass', 'tile-grass-dark'],
      floorTint: 0xfff7c2,
      obstacleTile: 'tile-tree',
      obstacleTint: 0xffe28a,
      wildPool: [
        ['glimmer', 4],
        ['dawnling', 4],
        ['halo', 2],
        ['prismoth', 2],
        ['aurelion', 1],
      ],
      wildCount: 10,
      levelMin: 35,
      levelMax: 45,
      bossId: 'sunlit-sovereign',
      bossNpcName: 'Keeper of the Dawn',
      bossDialogue: [
        'The meadow glows because the Sovereign wills it.',
        'The Sunlit Sovereign guards the first half of the Eclipse Sanctum key.',
        'Talk as long as you like. Press R near me to call the Sovereign.',
      ],
      chests: [
        { id: 'sunlit-1', tx: 6, ty: 8, coins: 300, item: { itemId: 'light-lure', quantity: 2 } },
        { id: 'sunlit-2', tx: 29, ty: 14, coins: 400, item: { itemId: 'light-stone', quantity: 1 } },
      ],
    });
  }
}
