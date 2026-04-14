import { IPetInstance } from '../types';

export interface IBossDefinition {
  id: string;
  name: string;
  level: number;
  team: { petTemplateId: string; level: number }[];
  specialMoveIds: string[];
  coinsReward: number;
}

export const BOSSES: Record<string, IBossDefinition> = {
  'thornguard': {
    id: 'thornguard',
    name: 'Thornguard',
    level: 15,
    team: [
      { petTemplateId: 'willow', level: 15 },
      { petTemplateId: 'cedar', level: 13 },
      { petTemplateId: 'fern', level: 12 },
    ],
    specialMoveIds: ['thorn-barrage', 'forest-fury'],
    coinsReward: 200,
  },
  'boss-tower-1': {
    id: 'boss-tower-1',
    name: 'Rocky',
    level: 8,
    team: [
      { petTemplateId: 'slate', level: 8 },
      { petTemplateId: 'cobble', level: 7 },
    ],
    specialMoveIds: ['grand-slam'],
    coinsReward: 80,
  },
  'boss-tower-2': {
    id: 'boss-tower-2',
    name: 'Marina',
    level: 12,
    team: [
      { petTemplateId: 'brook', level: 12 },
      { petTemplateId: 'reef', level: 11 },
    ],
    specialMoveIds: ['tidal-wave'],
    coinsReward: 120,
  },
  'boss-tower-3': {
    id: 'boss-tower-3',
    name: 'Oakhart',
    level: 16,
    team: [
      { petTemplateId: 'ironwood', level: 16 },
      { petTemplateId: 'willow', level: 15 },
      { petTemplateId: 'cedar', level: 14 },
    ],
    specialMoveIds: ['thorn-barrage', 'forest-fury'],
    coinsReward: 180,
  },
  'boss-tower-4': {
    id: 'boss-tower-4',
    name: 'Verdant',
    level: 20,
    team: [
      { petTemplateId: 'flora', level: 20 },
      { petTemplateId: 'blossom', level: 18 },
      { petTemplateId: 'fern', level: 17 },
    ],
    specialMoveIds: ['solar-beam', 'thorn-barrage'],
    coinsReward: 250,
  },
  'boss-tower-5': {
    id: 'boss-tower-5',
    name: 'The Grand Wizard',
    level: 25,
    team: [
      { petTemplateId: 'obsidian', level: 25 },
      { petTemplateId: 'flora', level: 24 },
      { petTemplateId: 'ironwood', level: 23 },
      { petTemplateId: 'tsunami', level: 22 },
    ],
    specialMoveIds: ['arcane-blast', 'grand-slam', 'thorn-barrage'],
    coinsReward: 500,
  },

  // ── Open-world zone bosses ─────────────────────────────────────
  grovekeeper: {
    id: 'grovekeeper',
    name: 'The Grovekeeper',
    level: 14,
    team: [
      { petTemplateId: 'flora', level: 14 },
      { petTemplateId: 'ironwood', level: 13 },
      { petTemplateId: 'fern', level: 12 },
    ],
    specialMoveIds: ['solar-beam', 'thorn-barrage'],
    coinsReward: 150,
  },
  cragnar: {
    id: 'cragnar',
    name: 'Cragnar',
    level: 15,
    team: [
      { petTemplateId: 'obsidian', level: 15 },
      { petTemplateId: 'marble', level: 14 },
      { petTemplateId: 'slate', level: 13 },
    ],
    specialMoveIds: ['grand-slam', 'earthquake'],
    coinsReward: 160,
  },
  tidemother: {
    id: 'tidemother',
    name: 'Tidemother',
    level: 14,
    team: [
      { petTemplateId: 'tsunami', level: 14 },
      { petTemplateId: 'reef', level: 13 },
      { petTemplateId: 'blossom', level: 12 },
    ],
    specialMoveIds: ['tidal-wave', 'bloom-burst'],
    coinsReward: 155,
  },
  deeprock: {
    id: 'deeprock',
    name: 'Deeprock',
    level: 16,
    team: [
      { petTemplateId: 'obsidian', level: 16 },
      { petTemplateId: 'marble', level: 15 },
    ],
    specialMoveIds: ['grand-slam', 'stone-edge'],
    coinsReward: 140,
  },
  maelstrom: {
    id: 'maelstrom',
    name: 'Maelstrom',
    level: 15,
    team: [
      { petTemplateId: 'tsunami', level: 15 },
      { petTemplateId: 'brook', level: 14 },
      { petTemplateId: 'reef', level: 13 },
    ],
    specialMoveIds: ['tidal-wave', 'torrent'],
    coinsReward: 145,
  },
};

/** All boss ids that count toward "champion" / defeat tracking in battle results. */
export const ALL_REGISTERED_BOSS_IDS: string[] = [
  'boss-tower-1',
  'boss-tower-2',
  'boss-tower-3',
  'boss-tower-4',
  'boss-tower-5',
  'thornguard',
  'grovekeeper',
  'cragnar',
  'tidemother',
  'deeprock',
  'maelstrom',
];

/** Overworld zone guardians only (excludes Boss Tower). Used for Prism Wilds unlock. */
export const OVERWORLD_ZONE_BOSS_IDS: string[] = [
  'thornguard',
  'grovekeeper',
  'cragnar',
  'tidemother',
  'deeprock',
  'maelstrom',
];
