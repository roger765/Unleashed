import { IPetInstance, IPetMoveSlot, PetType } from '../types/pet';
import { IMove } from '../types/move';
import { PET_TEMPLATES } from '../data/pets';

/** The pet's move slots: its own list if a TM has been used, otherwise the species template's. */
export function getPetMoveSlots(pet: IPetInstance): IPetMoveSlot[] {
  if (pet.moves) return pet.moves;
  const template = PET_TEMPLATES[pet.templateId];
  if (!template) return [];
  return template.moveIds.map((id, i) => ({ id, level: template.moveLevels[i] ?? 1 }));
}

/** TM rule: a pet can learn moves of its own type, plus Normal moves. */
export function canPetLearnMove(pet: IPetInstance, move: IMove): boolean {
  const petType = PET_TEMPLATES[pet.templateId]?.type ?? PetType.Normal;
  return move.type === petType || move.type === PetType.Normal;
}
