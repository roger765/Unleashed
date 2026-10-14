import { IBossDefinition } from './bosses';

export type TrainingMode = 'standard' | 'sparring' | 'handicap' | 'endurance';

export interface ITrainingModeInfo {
  id: TrainingMode;
  label: string;
  description: string;
  coinMult: number;
  xpMult: number;
}

export const TRAINING_MODES: ITrainingModeInfo[] = [
  {
    id: 'standard', label: 'Standard',
    description: 'A normal fight. Full coins and XP.',
    coinMult: 1, xpMult: 1,
  },
  {
    id: 'sparring', label: 'Sparring',
    description: 'Safe practice. HP and AA are restored afterwards. No coins, half XP.',
    coinMult: 0, xpMult: 0.5,
  },
  {
    id: 'handicap', label: 'Handicap',
    description: 'You and your lead pet only, no items. 1.5x coins and XP.',
    coinMult: 1.5, xpMult: 1.5,
  },
  {
    id: 'endurance', label: 'Endurance',
    description: 'Three rounds in a row, HP carries over. Paid once at the end at 2x.',
    coinMult: 2, xpMult: 2,
  },
];

export const ENDURANCE_ROUNDS = 3;

export interface ITrainerFirstWin {
  /** TM item id, e.g. 'tm-stone-edge'. */
  tmItemId: string;
  items?: { itemId: string; quantity: number }[];
  /** A pet gift, created at the trainer's level. */
  petTemplateId?: string;
}

export interface ITrainerDefinition {
  id: string;
  name: string;
  /** NPC texture key, also used for the trainer's battle sprite. */
  texture: string;
  /** Staff the trainer fights with (an item id from items.ts). */
  weaponId: string;
  intro: string[];
  /** Trainer lead level = player level + this (clamped to 1-50). */
  levelOffset: number;
  /** Lead pet first; each following pet is one level lower than the one before. */
  team: string[];
  specialMoveIds: string[];
  firstWin: ITrainerFirstWin;
}

export const TRAINERS: ITrainerDefinition[] = [
  {
    id: 'trainer-1',
    name: 'Coach Fern',
    texture: 'npc-quest',
    weaponId: 'star-staff',
    intro: [
      'Welcome to the Training Zone. Everyone starts somewhere.',
      'I will go easy on you. One pet, a fair fight.',
      'Press R to pick how we train.',
    ],
    levelOffset: -3,
    team: ['sprout'],
    specialMoveIds: [],
    firstWin: {
      tmItemId: 'tm-stone-edge',
      items: [{ itemId: 'pet-food', quantity: 3 }],
    },
  },
  {
    id: 'trainer-2',
    name: 'Drillmaster Reef',
    texture: 'npc-shopkeeper',
    weaponId: 'star-staff',
    intro: [
      'So Fern did not break you. Good.',
      'I run two pets in tandem. Keep up.',
      'Press R to pick how we train.',
    ],
    levelOffset: 0,
    team: ['reef', 'fern'],
    specialMoveIds: ['tidal-wave'],
    firstWin: {
      tmItemId: 'tm-solar-beam',
      items: [{ itemId: 'super-health-potion', quantity: 3 }],
    },
  },
  {
    id: 'trainer-3',
    name: 'Master Ironbark',
    texture: 'npc-edward',
    weaponId: 'wood-staff',
    intro: [
      'Few reach me. Fewer leave undefeated.',
      'Three pets, all of them stronger than you.',
      'Press R when you are ready to be tested.',
    ],
    levelOffset: 4,
    team: ['ironwood', 'obsidian', 'tsunami'],
    specialMoveIds: ['forest-fury'],
    firstWin: {
      tmItemId: 'tm-tidal-wave',
      petTemplateId: 'brook',
    },
  },
];

export function getTrainer(id: string): ITrainerDefinition | undefined {
  return TRAINERS.find((t) => t.id === id);
}

export function getTrainingMode(id: TrainingMode): ITrainingModeInfo {
  return TRAINING_MODES.find((m) => m.id === id) ?? TRAINING_MODES[0];
}

/** Trainer lead level for a given player level. */
export function trainerLevel(trainer: ITrainerDefinition, playerLevel: number): number {
  return Math.max(1, Math.min(50, playerLevel + trainer.levelOffset));
}

/** Turn a trainer into a boss definition so the existing boss team builder can be reused. */
export function buildTrainerBoss(trainer: ITrainerDefinition, playerLevel: number): IBossDefinition {
  const lead = trainerLevel(trainer, playerLevel);
  return {
    id: trainer.id,
    name: trainer.name,
    level: lead,
    team: trainer.team.map((petTemplateId, i) => ({
      petTemplateId,
      level: Math.max(1, lead - i),
    })),
    specialMoveIds: trainer.specialMoveIds,
    coinsReward: 0,
  };
}
