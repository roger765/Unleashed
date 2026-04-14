/**
 * XP_TABLE[level] = total XP needed to reach that level.
 * Index 0 and 1 are 0 (you start at level 1).
 *
 * Tuned to hit approximate targets:
 *   Level  2 ~  20
 *   Level 10 ~ 100
 *   Level 25 ~ 500
 *   Level 50 ~ 2000
 */

function generateXpTable(): number[] {
  const table: number[] = new Array(51);
  table[0] = 0;
  table[1] = 0;

  for (let level = 2; level <= 50; level++) {
    const t = (level - 1) / 49;
    const xp = Math.floor(20 + 1980 * Math.pow(t, 2.1));
    table[level] = xp;
  }

  return table;
}

export const XP_TABLE: number[] = generateXpTable();

/**
 * Calculate XP gained from defeating an enemy.
 * Base XP scales with enemy level.
 * Bonus multiplier when player is underlevelled.
 */
export function xpForDefeating(enemyLevel: number, myLevel: number): number {
  const baseXp = 5 + enemyLevel * 3;
  const levelDiff = enemyLevel - myLevel;

  let multiplier = 1.0;
  if (levelDiff > 0) {
    // Underlevelled bonus: up to 2x at 10+ levels below
    multiplier = 1.0 + Math.min(levelDiff * 0.1, 1.0);
  } else if (levelDiff < 0) {
    // Overlevelled penalty: down to 0.25x
    multiplier = Math.max(1.0 + levelDiff * 0.15, 0.25);
  }

  return Math.max(1, Math.floor(baseXp * multiplier));
}
