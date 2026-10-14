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

  // ── Henry's Ranch (optional secret boss) ──────────────────────
  henry: {
    id: 'henry',
    name: 'Henry Beast Master',
    level: 22,
    team: [
      { petTemplateId: 'henry-beast-master', level: 22 },
      { petTemplateId: 'mustang', level: 20 },
      { petTemplateId: 'bullhorn', level: 19 },
      { petTemplateId: 'coyote', level: 18 },
    ],
    specialMoveIds: ['grand-slam', 'arcane-blast'],
    coinsReward: 300,
  },

  // ── Castle of Masters guardians ───────────────────────────────────
  'castle-guardian-boots': {
    id: 'castle-guardian-boots',
    name: 'Stone Warden',
    level: 28,
    team: [
      { petTemplateId: 'obsidian', level: 28 },
      { petTemplateId: 'basalt', level: 26 },
      { petTemplateId: 'marble', level: 25 },
    ],
    specialMoveIds: ['boulder-smash', 'earthquake'],
    coinsReward: 350,
  },

  'castle-guardian-chest': {
    id: 'castle-guardian-chest',
    name: 'Grove Sovereign',
    level: 32,
    team: [
      { petTemplateId: 'ironwood', level: 32 },
      { petTemplateId: 'flora', level: 30 },
      { petTemplateId: 'willow', level: 29 },
    ],
    specialMoveIds: ['thorn-barrage', 'forest-fury'],
    coinsReward: 400,
  },

  'castle-guardian-helmet': {
    id: 'castle-guardian-helmet',
    name: 'Tide Sovereign',
    level: 36,
    team: [
      { petTemplateId: 'tsunami', level: 36 },
      { petTemplateId: 'riptide', level: 34 },
      { petTemplateId: 'reef', level: 32 },
    ],
    specialMoveIds: ['tidal-crash', 'aqua-burst'],
    coinsReward: 450,
  },

  // ── Castle basement trainers ──────────────────────────────────────
  'basement-1': {
    id: 'basement-1',
    name: 'Warden of the Four',
    level: 38,
    team: [
      { petTemplateId: 'obsidian', level: 38 },
      { petTemplateId: 'flora', level: 38 },
      { petTemplateId: 'ironwood', level: 37 },
      { petTemplateId: 'tsunami', level: 37 },
    ],
    specialMoveIds: ['earthquake', 'forest-fury', 'tidal-crash'],
    coinsReward: 600,
  },
  'basement-2': {
    id: 'basement-2',
    name: 'Lumina the Radiant',
    level: 41,
    team: [
      { petTemplateId: 'aurelion', level: 41 },
      { petTemplateId: 'solstice', level: 40 },
      { petTemplateId: 'luminar', level: 39 },
      { petTemplateId: 'halo', level: 38 },
    ],
    specialMoveIds: ['holy-nova', 'sunburst'],
    coinsReward: 700,
  },
  'basement-3': {
    id: 'basement-3',
    name: 'Umbra the Veiled',
    level: 42,
    team: [
      { petTemplateId: 'eclipsor', level: 42 },
      { petTemplateId: 'umbraith', level: 40 },
      { petTemplateId: 'nightfall', level: 39 },
      { petTemplateId: 'murkfang', level: 38 },
    ],
    specialMoveIds: ['void-crush', 'eclipse'],
    coinsReward: 800,
  },

  // ── Light & Shadow zone bosses ────────────────────────────────────
  'sunlit-sovereign': {
    id: 'sunlit-sovereign',
    name: 'Sunlit Sovereign',
    level: 45,
    team: [
      { petTemplateId: 'aurelion', level: 45 },
      { petTemplateId: 'solstice', level: 44 },
      { petTemplateId: 'luminar', level: 43 },
      { petTemplateId: 'prismoth', level: 42 },
    ],
    specialMoveIds: ['holy-nova', 'sunburst'],
    coinsReward: 900,
  },
  'gloom-sovereign': {
    id: 'gloom-sovereign',
    name: 'Gloom Sovereign',
    level: 45,
    team: [
      { petTemplateId: 'eclipsor', level: 45 },
      { petTemplateId: 'nightfall', level: 44 },
      { petTemplateId: 'umbraith', level: 43 },
      { petTemplateId: 'murkfang', level: 42 },
    ],
    specialMoveIds: ['void-crush', 'eclipse'],
    coinsReward: 900,
  },

  // ── Eclipse Sanctum final boss ────────────────────────────────────
  'twilight-sovereign': {
    id: 'twilight-sovereign',
    name: 'Twilight Sovereign',
    level: 50,
    team: [
      { petTemplateId: 'aurelion', level: 50 },
      { petTemplateId: 'eclipsor', level: 50 },
      { petTemplateId: 'obsidian', level: 48 },
      { petTemplateId: 'ironwood', level: 48 },
      { petTemplateId: 'flora', level: 48 },
      { petTemplateId: 'tsunami', level: 48 },
    ],
    specialMoveIds: ['holy-nova', 'void-crush', 'eclipse'],
    coinsReward: 2000,
  },

  // ── Fire & Ice zone bosses and the Steam Sanctum fusion boss ──────
  // Levels here are the reference shape (lead level, then how far each pet trails it).
  // The zones and the arena re-level the whole team to the player's level at fight time.
  'emberlord-vulkar': {
    id: 'emberlord-vulkar',
    name: 'Emberlord Vulkar',
    level: 45,
    team: [
      { petTemplateId: 'calderon', level: 45 },
      { petTemplateId: 'phoenyx', level: 44 },
      { petTemplateId: 'infernal', level: 43 },
      { petTemplateId: 'magmite', level: 42 },
    ],
    specialMoveIds: ['inferno', 'magma-fist'],
    coinsReward: 900,
  },
  'frostqueen-hailey': {
    id: 'frostqueen-hailey',
    name: 'Frostqueen Hailey',
    level: 45,
    team: [
      { petTemplateId: 'glaciarch', level: 45 },
      { petTemplateId: 'whitewind', level: 44 },
      { petTemplateId: 'permafrost', level: 43 },
      { petTemplateId: 'frostix', level: 42 },
    ],
    specialMoveIds: ['absolute-zero', 'blizzard-blast'],
    coinsReward: 900,
  },
  'twilight-wyrm': {
    id: 'twilight-wyrm',
    name: 'Twilight Wyrm',
    level: 50,
    team: [
      { petTemplateId: 'steamwyrm', level: 50 },
      { petTemplateId: 'infernal', level: 49 },
      { petTemplateId: 'permafrost', level: 49 },
      { petTemplateId: 'phoenyx', level: 48 },
      { petTemplateId: 'glaciarch', level: 48 },
    ],
    specialMoveIds: ['steam-burst', 'inferno', 'absolute-zero'],
    coinsReward: 2000,
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
  'henry',
  'castle-guardian-boots',
  'castle-guardian-chest',
  'castle-guardian-helmet',
  'basement-1',
  'basement-2',
  'basement-3',
  'sunlit-sovereign',
  'gloom-sovereign',
  'twilight-sovereign',
  'emberlord-vulkar',
  'frostqueen-hailey',
  'twilight-wyrm',
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

/** The three Castle of Masters guardians. Defeating all of them opens the basement. */
export const CASTLE_MASTER_BOSS_IDS: string[] = [
  'castle-guardian-boots',
  'castle-guardian-chest',
  'castle-guardian-helmet',
];

/** Basement trainers, fought in order. Defeating all three opens the portals. */
export const BASEMENT_BOSS_IDS: string[] = ['basement-1', 'basement-2', 'basement-3'];

/** Zone bosses of the Light and Shadow zones. Each grants half of the Eclipse Sanctum key. */
export const LIGHT_SHADOW_ZONE_BOSS_IDS: string[] = ['sunlit-sovereign', 'gloom-sovereign'];

/** Zone bosses of Emberreach and Frostmoor. Each grants half of the Steam Sanctum key. */
export const FIRE_ICE_ZONE_BOSS_IDS: string[] = ['emberlord-vulkar', 'frostqueen-hailey'];
