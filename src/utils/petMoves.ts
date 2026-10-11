import { IPetInstance, IPetMoveSlot, PetType } from '../types/pet';
import { IMove } from '../types/move';
import { PET_TEMPLATES } from '../data/pets';
import { MOVES } from '../data/moves';

/** The pet's move slots: its own list if a TM has been used, otherwise the species template's. */
export function getPetMoveSlots(pet: IPetInstance): IPetMoveSlot[] {
  if (pet.moves) return pet.moves;
  const template = PET_TEMPLATES[pet.templateId];
  if (!template) return [];
  return template.moveIds.map((id, i) => ({ id, level: template.moveLevels[i] ?? 1 }));
}

/** Attack Allowance (AA) a move starts with: weak moves can be used often, strong ones rarely. */
export function getMoveMaxAA(move: IMove): number {
  if (move.power <= 20) return 20;
  if (move.power <= 40) return 12;
  return 6;
}

/** Uses left of a move on this pet (full if it has never been spent). */
export function getPetMoveAA(pet: IPetInstance, move: IMove): number {
  const max = getMoveMaxAA(move);
  return Math.min(max, pet.aa?.[move.id] ?? max);
}

/** Spend one use of a move. */
export function spendPetAA(pet: IPetInstance, move: IMove): void {
  pet.aa = { ...pet.aa, [move.id]: Math.max(0, getPetMoveAA(pet, move) - 1) };
}

/** Refill every move to full. */
export function refillPetAA(pet: IPetInstance): void {
  delete pet.aa;
}

/** True if any unlocked move is below full AA, i.e. feeding the pet would restore something. */
export function petNeedsFeeding(pet: IPetInstance): boolean {
  return getPetMoveSlots(pet).some((slot) => {
    const move = MOVES[slot.id];
    return move && pet.level >= slot.level && getPetMoveAA(pet, move) < getMoveMaxAA(move);
  });
}

/** TM rule: a pet can learn moves of its own type, plus Normal moves. */
export function canPetLearnMove(pet: IPetInstance, move: IMove): boolean {
  const petType = PET_TEMPLATES[pet.templateId]?.type ?? PetType.Normal;
  return move.type === petType || move.type === PetType.Normal;
}
