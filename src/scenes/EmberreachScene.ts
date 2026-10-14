import { LightShadowZoneScene } from './LightShadowZoneScene';
import { FIRE_ICE_SCALING } from '../utils/zoneLevels';

export class EmberreachScene extends LightShadowZoneScene {
  constructor() {
    super({
      key: 'EmberreachScene',
      title: 'Emberreach',
      floorTiles: ['tile-stone-dark', 'tile-stone'],
      floorTint: 0xa8503a,
      obstacleTile: 'tile-rock',
      obstacleTint: 0x5a2a20,
      wildPool: [
        ['cinder', 4],
        ['kindle', 4],
        ['magmite', 2],
        ['insinerix', 2],
        ['infernal', 1],
      ],
      wildCount: 10,
      scaling: FIRE_ICE_SCALING,
      hazard: { kind: 'lava', patches: 7 },
      exitScene: 'ShrubWoodlandsScene',
      exitData: { entry: 'ember' },
      exitLabel: '↓ Back to Shrub Woodlands',
      bossId: 'emberlord-vulkar',
      bossRewards: {
        keyHalf: 'the Fire half of the Steam Sanctum key',
        tmMoveId: 'inferno',
        petTemplateId: 'infernal',
      },
      bossNpcName: 'Emberlord Vulkar',
      bossDialogue: [
        'Few cross Emberreach without a scorch or two.',
        'I hold half of the key to the Steam Sanctum.',
        'Press R near me if you are brave enough to take it.',
      ],
      chests: [
        { id: 'ember-1', tx: 6, ty: 8, coins: 300, item: { itemId: 'fire-lure', quantity: 2 } },
        { id: 'ember-2', tx: 29, ty: 14, coins: 400, item: { itemId: 'fire-stone', quantity: 1 } },
      ],
    });
  }
}
