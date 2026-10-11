import { IPlayerAppearance, IPlayerState } from '../types/player';
import { ArmorSlot, ItemType } from '../types/item';
import { ITEMS } from '../data/items';
import { MOVES } from '../data/moves';
import { canPetLearnMove, getPetMoveSlots } from '../utils/petMoves';
import { PetType } from '../types/pet';
import { IPetInstance } from '../types/pet';
import { IBattleCombatant } from '../types/battle';
import { MAX_TEAM_SIZE, LEVEL_CAP } from '../constants';
import { XP_TABLE } from '../data/xp-table';
import { PET_TEMPLATES } from '../data/pets';
import { EVOLUTION_SPIRIT_COST, getEvolutionDef } from '../data/evolutions';
import { EventBus } from './EventBus';
import { SaveManager } from './SaveManager';

function defaultState(name: string, appearance: IPlayerAppearance): IPlayerState {
  return {
    name,
    appearance,
    level: 1,
    xp: 0,
    coins: 0,
    spirits: 0,
    equippedWeaponId: null,
    equippedArmor: { helmet: null, chest: null, boots: null },
    equippedCharmId: null,
    team: [],
    storage: [],
    inventory: [],
    flags: {},
    counters: {},
    currentScene: 'TitleScene',
    lastSpinDate: null,
    quizTowerFloor: 1,
    bossTowerFloor: 1,
  };
}

/**
 * Recalculate a pet's stats from its template base stats and current level.
 * Formula: stat = baseStat + (level * baseStat * 0.1)
 */
function recalcPetStats(pet: IPetInstance): void {
  const template = PET_TEMPLATES[pet.templateId];
  if (!template) return;

  const oldMaxHp = pet.maxHp;
  pet.maxHp = Math.floor(template.baseHp + pet.level * template.baseHp * 0.1);
  // Damage is kept: a higher max HP raises current HP by the same amount, never a full heal.
  // Fainted pets stay fainted.
  if (pet.currentHp > 0) {
    pet.currentHp = Math.min(pet.maxHp, pet.currentHp + Math.max(0, pet.maxHp - oldMaxHp));
  }
  pet.attack = Math.floor(template.baseAttack + pet.level * template.baseAttack * 0.1);
  pet.defense = Math.floor(template.baseDefense + pet.level * template.baseDefense * 0.1);
}

export class GameState {
  private static instance: GameState;
  private static readonly AUTO_SAVE_DEBOUNCE_MS = 400;
  private state!: IPlayerState;
  private pendingPersistTimer: number | null = null;

  private constructor() {
    // Initialize with a throwaway state; real init happens via reset() or setState().
    this.state = defaultState('', { hairColor: '', skinColor: '' });
  }

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  // ---- Core state access ----

  reset(name: string, appearance: IPlayerAppearance): void {
    this.state = defaultState(name, appearance);
    this.state.currentScene = 'TutorialScene';
    this.schedulePersist();
  }

  getState(): IPlayerState {
    return this.state;
  }

  setState(state: IPlayerState): void {
    this.clearPendingPersist();
    // Migrate saves that predate the armor system
    if (!state.equippedArmor) {
      state.equippedArmor = { helmet: null, chest: null, boots: null };
    }
    // Migrate saves that predate charms
    if (state.equippedCharmId === undefined) {
      state.equippedCharmId = null;
    }
    this.state = state;
  }

  // ---- Coins ----

  addCoins(amount: number): void {
    this.state.coins += amount;
    EventBus.emit('coins-changed', this.state.coins);
    this.schedulePersist();
  }

  removeCoins(amount: number): boolean {
    if (this.state.coins < amount) return false;
    this.state.coins -= amount;
    EventBus.emit('coins-changed', this.state.coins);
    this.schedulePersist();
    return true;
  }

  // ---- Spirits ----

  addSpirits(amount: number): void {
    this.state.spirits += amount;
    EventBus.emit('spirits-changed', this.state.spirits);
    this.schedulePersist();
  }

  removeSpirits(amount: number): boolean {
    if (this.state.spirits < amount) return false;
    this.state.spirits -= amount;
    EventBus.emit('spirits-changed', this.state.spirits);
    this.schedulePersist();
    return true;
  }

  /** Trade spirits for coins. Returns false (and changes nothing) if the player lacks the spirits. */
  exchangeSpiritsForCoins(spirits: number, coinsPerSpirit: number): boolean {
    if (!this.removeSpirits(spirits)) return false;
    this.addCoins(spirits * coinsPerSpirit);
    return true;
  }

  // ---- Inventory ----

  addItem(itemId: string, quantity: number): void {
    const slot = this.state.inventory.find((s) => s.itemId === itemId);
    if (slot) {
      slot.quantity += quantity;
    } else {
      this.state.inventory.push({ itemId, quantity });
    }
    EventBus.emit('inventory-changed', this.state.inventory);
    this.schedulePersist();
  }

  removeItem(itemId: string, quantity: number): boolean {
    const slot = this.state.inventory.find((s) => s.itemId === itemId);
    if (!slot || slot.quantity < quantity) return false;
    slot.quantity -= quantity;
    if (slot.quantity <= 0) {
      this.state.inventory = this.state.inventory.filter((s) => s.itemId !== itemId);
    }
    EventBus.emit('inventory-changed', this.state.inventory);
    this.schedulePersist();
    return true;
  }

  getItemCount(itemId: string): number {
    const slot = this.state.inventory.find((s) => s.itemId === itemId);
    return slot ? slot.quantity : 0;
  }

  // ---- Equipment ----

  equipWeapon(itemId: string): void {
    this.state.equippedWeaponId = itemId;
    this.schedulePersist();
  }

  unequipWeapon(): void {
    this.state.equippedWeaponId = null;
    this.schedulePersist();
  }

  equipArmor(slot: ArmorSlot, itemId: string): void {
    this.state.equippedArmor[slot] = itemId;
    this.schedulePersist();
  }

  unequipArmor(slot: ArmorSlot): void {
    this.state.equippedArmor[slot] = null;
    this.schedulePersist();
  }

  equipCharm(itemId: string): void {
    this.state.equippedCharmId = itemId;
    this.schedulePersist();
  }

  unequipCharm(): void {
    this.state.equippedCharmId = null;
    this.schedulePersist();
  }

  /** Spawn-chance multiplier for a type from the equipped charm (1 if none/different type). */
  getCharmSpawnMultiplier(type: PetType): number {
    const id = this.state.equippedCharmId;
    const item = id ? ITEMS[id] : undefined;
    if (item && item.boostType === type) return item.spawnMultiplier ?? 1;
    return 1;
  }

  /** Start a timed lure for a type. Re-using a lure refreshes the timer. */
  activateLure(itemId: string): boolean {
    const item = ITEMS[itemId];
    if (!item || item.boostType === undefined || !item.lureDurationMs) return false;
    this.state.counters[`lure-until-${item.boostType}`] = Date.now() + item.lureDurationMs;
    this.state.counters[`lure-mult-${item.boostType}`] = item.spawnMultiplier ?? 1;
    this.schedulePersist();
    return true;
  }

  /** Spawn-chance multiplier for a type from an active lure (1 if expired). */
  getLureSpawnMultiplier(type: PetType): number {
    const until = this.state.counters[`lure-until-${type}`] ?? 0;
    if (Date.now() >= until) return 1;
    return this.state.counters[`lure-mult-${type}`] ?? 1;
  }

  getTotalArmorDefenseBonus(): number {
    const armor = this.state.equippedArmor;
    const slots = [armor.helmet, armor.chest, armor.boots];
    return slots.reduce((total, itemId) => {
      if (!itemId) return total;
      return total + (ITEMS[itemId]?.defenseBoost ?? 0);
    }, 0);
  }

  getArmorHpBoostPercent(): number {
    const armor = this.state.equippedArmor;
    const slots = [armor.helmet, armor.chest, armor.boots];
    return slots.reduce((total, itemId) => {
      if (!itemId) return total;
      return total + (ITEMS[itemId]?.hpBoostPercent ?? 0);
    }, 0);
  }

  getArmorResistances(): Partial<Record<PetType, number>> {
    const armor = this.state.equippedArmor;
    const slots = [armor.helmet, armor.chest, armor.boots];
    const result: Partial<Record<PetType, number>> = {};
    for (const itemId of slots) {
      if (!itemId) continue;
      const item = ITEMS[itemId];
      if (item?.resistType !== undefined && item.resistPercent) {
        const existing = result[item.resistType] ?? 0;
        result[item.resistType] = Math.min(75, existing + item.resistPercent);
      }
    }
    return result;
  }

  isChampionSetEquipped(): boolean {
    const { helmet, chest, boots } = this.state.equippedArmor;
    return helmet === 'champion-helmet' && chest === 'champion-chest' && boots === 'champion-boots';
  }

  // ---- Team ----

  addPetToTeam(pet: IPetInstance): boolean {
    if (this.state.team.length >= MAX_TEAM_SIZE) return false;
    this.state.team.push(pet);
    EventBus.emit('team-changed', this.state.team);
    this.schedulePersist();
    return true;
  }

  removePetFromTeam(index: number): IPetInstance | null {
    if (index < 0 || index >= this.state.team.length) return null;
    const [removed] = this.state.team.splice(index, 1);
    EventBus.emit('team-changed', this.state.team);
    this.schedulePersist();
    return removed;
  }

  // ---- Storage ----

  addPetToStorage(pet: IPetInstance): void {
    this.state.storage.push(pet);
    this.schedulePersist();
  }

  removePetFromStorage(index: number): IPetInstance | null {
    if (index < 0 || index >= this.state.storage.length) return null;
    const [removed] = this.state.storage.splice(index, 1);
    this.schedulePersist();
    return removed;
  }

  // ---- Swap ----

  /**
   * Evolve a pet in-place (template + stats). Costs spirits. Returns false if not eligible or payment fails.
   */
  /** Id of the evolution stone a pet needs, or null if its evolution needs only spirits. */
  evolutionStoneFor(pet: IPetInstance): string | null {
    const type = PET_TEMPLATES[pet.templateId]?.type;
    if (type === PetType.Light) return 'light-stone';
    if (type === PetType.Shadow) return 'shadow-stone';
    return null;
  }

  tryEvolvePet(pet: IPetInstance): boolean {
    const def = getEvolutionDef(pet.templateId);
    if (!def || pet.level < def.minLevel) return false;
    const next = PET_TEMPLATES[def.into];
    if (!next) return false;
    const stoneId = this.evolutionStoneFor(pet);
    if (stoneId && this.getItemCount(stoneId) < 1) return false;
    if (!this.removeSpirits(EVOLUTION_SPIRIT_COST)) return false;
    if (stoneId) this.removeItem(stoneId, 1);
    pet.templateId = def.into;
    recalcPetStats(pet);
    this.schedulePersist();
    return true;
  }

  evolvePetOnTeam(teamIndex: number): boolean {
    const pet = this.state.team[teamIndex];
    if (!pet || !this.tryEvolvePet(pet)) return false;
    EventBus.emit('team-changed', this.state.team);
    return true;
  }

  evolvePetInStorage(storageIndex: number): boolean {
    const pet = this.state.storage[storageIndex];
    return pet ? this.tryEvolvePet(pet) : false;
  }

  swapTeamAndStorage(teamIndex: number, storageIndex: number): void {
    const team = this.state.team;
    const storage = this.state.storage;
    if (teamIndex < 0 || teamIndex >= team.length) return;
    if (storageIndex < 0 || storageIndex >= storage.length) return;

    const temp = team[teamIndex];
    team[teamIndex] = storage[storageIndex];
    storage[storageIndex] = temp;
    EventBus.emit('team-changed', this.state.team);
    this.schedulePersist();
  }

  // ---- Healing items ----

  /** Total HP an item restores, or 0 if it isn't a healing item. */
  static healAmountOf(itemId: string): number {
    const item = ITEMS[itemId];
    if (!item) return 0;
    if (item.itemType === ItemType.Food) return item.healAmount ?? 0;
    if (item.itemType === ItemType.Potion) return (item.healPerTurn ?? 0) * (item.healDuration ?? 0);
    return 0;
  }

  /**
   * Use a healing item on a pet outside battle (also revives a fainted pet).
   * Returns the HP restored; 0 means nothing happened and no item was consumed.
   */
  healPetWithItem(pet: IPetInstance, itemId: string): number {
    const amount = GameState.healAmountOf(itemId);
    if (amount <= 0 || pet.currentHp >= pet.maxHp) return 0;
    if (!this.removeItem(itemId, 1)) return 0;
    const before = pet.currentHp;
    pet.currentHp = Math.min(pet.maxHp, before + amount);
    EventBus.emit('team-changed', this.state.team);
    this.schedulePersist();
    return pet.currentHp - before;
  }

  // ---- TMs ----

  /**
   * Teach a pet the move from a TM, replacing the move in `slotIndex`. Consumes the TM.
   * Returns an error message, or null on success.
   */
  teachMove(pet: IPetInstance, tmItemId: string, slotIndex: number): string | null {
    const moveId = ITEMS[tmItemId]?.teachMoveId;
    const move = moveId ? MOVES[moveId] : undefined;
    if (!move) return 'That is not a TM.';
    if (!canPetLearnMove(pet, move)) return `${pet.nickname} cannot learn ${move.name}.`;
    const slots = getPetMoveSlots(pet).map((s) => ({ ...s }));
    if (slotIndex < 0 || slotIndex >= slots.length) return 'Pick a move to replace.';
    if (slots.some((s) => s.id === move.id)) return `${pet.nickname} already knows ${move.name}.`;
    if (!this.removeItem(tmItemId, 1)) return 'You do not have that TM.';
    slots[slotIndex] = { id: move.id, level: 1 };
    pet.moves = slots;
    EventBus.emit('team-changed', this.state.team);
    this.schedulePersist();
    return null;
  }

  // ---- Battle HP persistence ----

  /**
   * Write battle damage back onto the saved team pets. Index 0 of the battle team is the
   * player character; pets follow in team order. Combatant HP includes armour boosts, so
   * it is converted back to the pet's own max HP by fraction.
   */
  syncPetHpFromBattle(battleTeam: IBattleCombatant[]): void {
    for (let i = 1; i < battleTeam.length; i++) {
      const pet = this.state.team[i - 1];
      const c = battleTeam[i];
      if (!pet || !c || c.maxHp <= 0) continue;
      pet.currentHp = c.currentHp <= 0
        ? 0
        : Math.min(pet.maxHp, Math.max(1, Math.round((pet.maxHp * c.currentHp) / c.maxHp)));
    }
    EventBus.emit('team-changed', this.state.team);
    this.schedulePersist();
  }

  // ---- XP / Levelling ----

  /**
   * Add XP to a pet on the team. Returns true if the pet levelled up.
   * On level-up: recalculate stats from template (existing damage is kept).
   */
  addXpToPet(teamIndex: number, xp: number): boolean {
    const pet = this.state.team[teamIndex];
    if (!pet) return false;
    if (pet.level >= LEVEL_CAP) return false;

    pet.xp += xp;
    let levelled = false;

    while (pet.level < LEVEL_CAP && pet.xp >= XP_TABLE[pet.level + 1]) {
      pet.level++;
      levelled = true;
    }

    if (levelled) {
      recalcPetStats(pet); // keeps existing damage; no free heal on level-up
      EventBus.emit('team-changed', this.state.team);
    }

    this.schedulePersist();
    return levelled;
  }

  /**
   * Add XP to the player. Returns true if the player levelled up.
   */
  addXpToPlayer(xp: number): boolean {
    if (this.state.level >= LEVEL_CAP) return false;

    this.state.xp += xp;
    let levelled = false;

    while (this.state.level < LEVEL_CAP && this.state.xp >= XP_TABLE[this.state.level + 1]) {
      this.state.level++;
      levelled = true;
    }

    this.schedulePersist();
    return levelled;
  }

  // ---- Flags ----

  getFlag(key: string): boolean {
    return this.state.flags[key] ?? false;
  }

  setFlag(key: string, value: boolean): void {
    this.state.flags[key] = value;
    this.schedulePersist();
  }

  getCounter(key: string): number {
    return this.state.counters[key] ?? 0;
  }

  incrementCounter(key: string, amount: number = 1): number {
    this.state.counters[key] = (this.state.counters[key] ?? 0) + amount;
    this.schedulePersist();
    return this.state.counters[key];
  }

  // ---- Scene tracking ----

  setCurrentScene(sceneKey: string): void {
    this.state.currentScene = sceneKey;
    this.schedulePersist();
  }

  setLastSpinDate(isoDate: string): void {
    this.state.lastSpinDate = isoDate;
    this.schedulePersist();
  }

  // ---- Auto-save ----

  autoSave(): void {
    this.flushSave();
  }

  flushSave(): void {
    this.clearPendingPersist();
    this.writeSaveIfPlayable();
  }

  /** True after character create or loading a save — avoids writing empty state on exit. */
  hasPlayableSave(): boolean {
    return this.state.name.trim().length > 0;
  }

  /** Save when the player leaves the page or app (tab close, refresh, navigate away). */
  saveOnExitIfNeeded(): void {
    this.flushSave();
  }

  private schedulePersist(): void {
    if (!this.hasPlayableSave()) return;
    this.clearPendingPersist();
    this.pendingPersistTimer = window.setTimeout(() => {
      this.pendingPersistTimer = null;
      this.writeSaveIfPlayable();
    }, GameState.AUTO_SAVE_DEBOUNCE_MS);
  }

  private clearPendingPersist(): void {
    if (this.pendingPersistTimer === null) return;
    window.clearTimeout(this.pendingPersistTimer);
    this.pendingPersistTimer = null;
  }

  private writeSaveIfPlayable(): void {
    if (!this.hasPlayableSave()) return;
    SaveManager.save(this.state);
  }
}
