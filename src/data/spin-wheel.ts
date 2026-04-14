export const SPIN_WHEEL_SEGMENTS: {
  label: string;
  color: string;
  weight: number;
  reward: { type: string; itemId?: string; amount?: number };
}[] = [
  // Common (60% total)
  {
    label: '50 Coins',
    color: '#f59e0b',
    weight: 20,
    reward: { type: 'coins', amount: 50 },
  },
  {
    label: 'Apple',
    color: '#22c55e',
    weight: 20,
    reward: { type: 'item', itemId: 'apple', amount: 1 },
  },
  {
    label: 'Health Potion',
    color: '#ef4444',
    weight: 20,
    reward: { type: 'item', itemId: 'health-potion', amount: 1 },
  },

  // Uncommon (30% total)
  {
    label: '150 Coins',
    color: '#a855f7',
    weight: 10,
    reward: { type: 'coins', amount: 150 },
  },
  {
    label: 'Super Health Potion',
    color: '#ec4899',
    weight: 10,
    reward: { type: 'item', itemId: 'super-health-potion', amount: 1 },
  },
  {
    label: '5 Spirits',
    color: '#6366f1',
    weight: 10,
    reward: { type: 'spirits', amount: 5 },
  },

  // Rare (10% total)
  {
    label: '300 Coins',
    color: '#eab308',
    weight: 5,
    reward: { type: 'coins', amount: 300 },
  },
  {
    label: 'Random Weapon',
    color: '#14b8a6',
    weight: 5,
    reward: { type: 'random-weapon' },
  },
];
