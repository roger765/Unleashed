import { LightShadowZoneScene } from './LightShadowZoneScene';
import { FIRE_ICE_SCALING } from '../utils/zoneLevels';

export class FrostmoorScene extends LightShadowZoneScene {
  constructor() {
    super({
      key: 'FrostmoorScene',
      title: 'Frostmoor',
      floorTiles: ['tile-snow', 'tile-snow-b'],
      floorTint: 0xffffff,
      obstacleTile: 'tile-rock',
      obstacleTint: 0xb9dcef,
      wildPool: [
        ['flurry', 4],
        ['frostix', 4],
        ['glacet', 2],
        ['snowhare', 2],
        ['permafrost', 1],
      ],
      wildCount: 10,
      scaling: FIRE_ICE_SCALING,
      hazard: { kind: 'ice', patches: 8 },
      exitScene: 'ShrubWoodlandsScene',
      exitData: { entry: 'frost' },
      exitLabel: '↓ Back to Shrub Woodlands',
      bossId: 'frostqueen-hailey',
      bossRewards: {
        keyHalf: 'the Ice half of the Steam Sanctum key',
        tmMoveId: 'absolute-zero',
        petTemplateId: 'permafrost',
      },
      bossNpcName: 'Frostqueen Hailey',
      bossDialogue: [
        'The moor is quiet because I like it that way.',
        'I hold the other half of the key to the Steam Sanctum.',
        'Press R near me, if your toes are not too cold to fight.',
      ],
      chests: [
        { id: 'frost-1', tx: 28, ty: 8, coins: 300, item: { itemId: 'ice-lure', quantity: 2 } },
        { id: 'frost-2', tx: 7, ty: 14, coins: 400, item: { itemId: 'ice-stone', quantity: 1 } },
      ],
    });
  }
}
