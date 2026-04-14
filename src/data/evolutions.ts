import { IPetInstance } from '../types/pet';

/** Cost in spirits to evolve (not available in the wild — Pet Book only). */
export const EVOLUTION_SPIRIT_COST = 5;

/**
 * Template id → evolved form (new species) and minimum level.
 * Evolved ids exist only here + PET_TEMPLATES; wild spawn lists never use them.
 *
 * Apex species with no evolution: obsidian, tsunami (final forms in their lines).
 */
export const PET_EVOLUTION: Record<string, { into: string; minLevel: number }> = {
  // Commons → tier 1 (Lv 15)
  gravel: { into: 'monolith', minLevel: 15 },
  cobble: { into: 'tumbler', minLevel: 15 },
  leaf: { into: 'canopy', minLevel: 15 },
  sprout: { into: 'thornthrall', minLevel: 15 },
  twig: { into: 'groveward', minLevel: 15 },
  bark: { into: 'bulwark', minLevel: 15 },
  wave: { into: 'breaker', minLevel: 15 },
  puddle: { into: 'depthling', minLevel: 15 },
  // Uncommons → tier 1 (Lv 20)
  slate: { into: 'razorslate', minLevel: 20 },
  marble: { into: 'marblemarch', minLevel: 20 },
  fern: { into: 'primeval', minLevel: 20 },
  blossom: { into: 'fullbloom', minLevel: 20 },
  cedar: { into: 'sequoia', minLevel: 20 },
  willow: { into: 'weepgiant', minLevel: 20 },
  brook: { into: 'rapidsoul', minLevel: 20 },
  reef: { into: 'atollward', minLevel: 20 },
  // Rares → tier 1 (Lv 25) — obsidian & tsunami excluded
  flora: { into: 'edenguard', minLevel: 25 },
  ironwood: { into: 'adamantbark', minLevel: 25 },
  // Tier 1 (common evos) → tier 2 (Lv 28)
  monolith: { into: 'megalith', minLevel: 28 },
  tumbler: { into: 'rockslide', minLevel: 28 },
  canopy: { into: 'skylarch', minLevel: 28 },
  thornthrall: { into: 'brambleking', minLevel: 28 },
  groveward: { into: 'wildwood', minLevel: 28 },
  bulwark: { into: 'citadel', minLevel: 28 },
  breaker: { into: 'deluge', minLevel: 28 },
  depthling: { into: 'trench', minLevel: 28 },
};

export function getEvolutionDef(fromTemplateId: string): { into: string; minLevel: number } | undefined {
  return PET_EVOLUTION[fromTemplateId];
}

export function canPetEvolve(pet: IPetInstance, spiritCount: number): boolean {
  const d = getEvolutionDef(pet.templateId);
  if (!d) return false;
  return pet.level >= d.minLevel && spiritCount >= EVOLUTION_SPIRIT_COST;
}
