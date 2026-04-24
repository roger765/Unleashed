import { IPlayerAppearance, IPlayerState } from '../types/player';
import { IPetInstance } from '../types/pet';
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

  pet.maxHp = Math.floor(template.baseHp + pet.level * template.baseHp * 0.1);
  pet.attack = Math.floor(template.baseAttack + pet.level * template.baseAttack * 0.1);
  pet.defense = Math.floor(template.baseDefense + pet.level * template.baseDefense * 0.1);
}

export class GameState {
  private static instance: GameState;
  private state!: IPlayerState;

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
  }

  getState(): IPlayerState {
    return this.state;
  }

  setState(state: IPlayerState): void {
    this.state = state;
  }

  // ---- Coins ----

  addCoins(amount: number): void {
    this.state.coins += amount;
    EventBus.emit('coins-changed', this.state.coins);
  }

  removeCoins(amount: number): boolean {
    if (this.state.coins < amount) return false;
    this.state.coins -= amount;
    EventBus.emit('coins-changed', this.state.coins);
    return true;
  }

  // ---- Spirits ----

  addSpirits(amount: number): void {
    this.state.spirits += amount;
    EventBus.emit('spirits-changed', this.state.spirits);
  }

  removeSpirits(amount: number): boolean {
    if (this.state.spirits < amount) return false;
    this.state.spirits -= amount;
    EventBus.emit('spirits-changed', this.state.spirits);
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
  }

  removeItem(itemId: string, quantity: number): boolean {
    const slot = this.state.inventory.find((s) => s.itemId === itemId);
    if (!slot || slot.quantity < quantity) return false;
    slot.quantity -= quantity;
    if (slot.quantity <= 0) {
      this.state.inventory = this.state.inventory.filter((s) => s.itemId !== itemId);
    }
    EventBus.emit('inventory-changed', this.state.inventory);
    return true;
  }

  getItemCount(itemId: string): number {
    const slot = this.state.inventory.find((s) => s.itemId === itemId);
    return slot ? slot.quantity : 0;
  }

  // ---- Equipment ----

  equipWeapon(itemId: string): void {
    this.state.equippedWeaponId = itemId;
  }

  unequipWeapon(): void {
    this.state.equippedWeaponId = null;
  }

  // ---- Team ----

  addPetToTeam(pet: IPetInstance): boolean {
    if (this.state.team.length >= MAX_TEAM_SIZE) return false;
    this.state.team.push(pet);
    EventBus.emit('team-changed', this.state.team);
    return true;
  }

  removePetFromTeam(index: number): IPetInstance | null {
    if (index < 0 || index >= this.state.team.length) return null;
    const [removed] = this.state.team.splice(index, 1);
    EventBus.emit('team-changed', this.state.team);
    return removed;
  }

  // ---- Storage ----

  addPetToStorage(pet: IPetInstance): void {
    this.state.storage.push(pet);
  }

  removePetFromStorage(index: number): IPetInstance | null {
    if (index < 0 || index >= this.state.storage.length) return null;
    const [removed] = this.state.storage.splice(index, 1);
    return removed;
  }

  // ---- Swap ----

  /**
   * Evolve a pet in-place (template + stats). Costs spirits. Returns false if not eligible or payment fails.
   */
  tryEvolvePet(pet: IPetInstance): boolean {
    const def = getEvolutionDef(pet.templateId);
    if (!def || pet.level < def.minLevel) return false;
    const next = PET_TEMPLATES[def.into];
    if (!next) return false;
    if (!this.removeSpirits(EVOLUTION_SPIRIT_COST)) return false;
    pet.templateId = def.into;
    recalcPetStats(pet);
    pet.currentHp = pet.maxHp;
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
  }

  // ---- XP / Levelling ----

  /**
   * Add XP to a pet on the team. Returns true if the pet levelled up.
   * On level-up: recalculate stats from template and heal to full HP.
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
      recalcPetStats(pet);
      pet.currentHp = pet.maxHp; // Heal to full on level-up
      EventBus.emit('team-changed', this.state.team);
    }

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

    return levelled;
  }

  // ---- Flags ----

  getFlag(key: string): boolean {
    return this.state.flags[key] ?? false;
  }

  setFlag(key: string, value: boolean): void {
    this.state.flags[key] = value;
  }

  getCounter(key: string): number {
    return this.state.counters[key] ?? 0;
  }

  incrementCounter(key: string, amount: number = 1): number {
    this.state.counters[key] = (this.state.counters[key] ?? 0) + amount;
    return this.state.counters[key];
  }

  // ---- Scene tracking ----

  setCurrentScene(sceneKey: string): void {
    this.state.currentScene = sceneKey;
  }

  // ---- Auto-save ----

  autoSave(): void {
    SaveManager.save(this.state);
  }

  /** True after character create or loading a save — avoids writing empty state on exit. */
  hasPlayableSave(): boolean {
    return this.state.name.trim().length > 0;
  }

  /** Save when the player leaves the page or app (tab close, refresh, navigate away). */
  saveOnExitIfNeeded(): void {
    if (this.hasPlayableSave()) {
      this.autoSave();
    }
  }
}
