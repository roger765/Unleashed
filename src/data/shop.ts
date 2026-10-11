import { PetType } from '../types/pet';
import { MOVES, BOSS_MOVE_IDS } from './moves';

export const SHOP_ITEMS = [
  { itemId: 'rock-hammer', category: 'Weapons' },
  { itemId: 'nature-wand', category: 'Weapons' },
  { itemId: 'wood-staff', category: 'Weapons' },
  { itemId: 'water-trident', category: 'Weapons' },
  { itemId: 'light-staff', category: 'Weapons' },
  { itemId: 'shadow-scythe', category: 'Weapons' },
  { itemId: 'leather-cap', category: 'Armor' },
  { itemId: 'leather-vest', category: 'Armor' },
  { itemId: 'leather-boots', category: 'Armor' },
  { itemId: 'iron-helm', category: 'Armor' },
  { itemId: 'iron-chestplate', category: 'Armor' },
  { itemId: 'iron-boots', category: 'Armor' },
  { itemId: 'rock-plate', category: 'Armor' },
  { itemId: 'nature-vest', category: 'Armor' },
  { itemId: 'wood-cuirass', category: 'Armor' },
  { itemId: 'water-mail', category: 'Armor' },
  { itemId: 'radiant-mail', category: 'Armor' },
  { itemId: 'umbral-cloak', category: 'Armor' },
  { itemId: 'health-potion', category: 'Healing' },
  { itemId: 'super-health-potion', category: 'Healing' },
  { itemId: 'apple', category: 'Food' },
  { itemId: 'feast', category: 'Food' },
  { itemId: 'light-charm-1', category: 'Charms' },
  { itemId: 'light-charm-2', category: 'Charms' },
  { itemId: 'light-charm-3', category: 'Charms' },
  { itemId: 'shadow-charm-1', category: 'Charms' },
  { itemId: 'shadow-charm-2', category: 'Charms' },
  { itemId: 'shadow-charm-3', category: 'Charms' },
  { itemId: 'light-lure', category: 'Lures' },
  { itemId: 'shadow-lure', category: 'Lures' },
  { itemId: 'light-stone', category: 'Stones' },
  { itemId: 'shadow-stone', category: 'Stones' },
];

// ── TMs: one per move, grouped by move type (boss specials separate) ──
const TM_TYPE_NAMES: Record<number, string> = {
  [PetType.Normal]: 'Normal', [PetType.Rock]: 'Rock', [PetType.Nature]: 'Nature',
  [PetType.Wood]: 'Wood', [PetType.Water]: 'Water', [PetType.Light]: 'Light', [PetType.Shadow]: 'Shadow',
};
export const TM_CATEGORIES = [...Object.values(TM_TYPE_NAMES), 'Boss'].map((n) => `TM ${n}`);

for (const move of Object.values(MOVES)) {
  const group = BOSS_MOVE_IDS.includes(move.id) ? 'Boss' : TM_TYPE_NAMES[move.type];
  SHOP_ITEMS.push({ itemId: `tm-${move.id}`, category: `TM ${group}` });
}
