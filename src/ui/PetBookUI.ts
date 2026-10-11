import { ITEMS } from '../data/items';
import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, MAX_TEAM_SIZE, MAX_PET_NAME_LENGTH, SPIRITS_PER_PET_LEVEL } from '../constants';
import { GameState } from '../state/GameState';
import { EVOLUTION_SPIRIT_COST, getEvolutionDef } from '../data/evolutions';
import { PET_TEMPLATES } from '../data/pets';
import { MOVES } from '../data/moves';
import { getPetMoveSlots, canPetLearnMove } from '../utils/petMoves';
import { ItemType } from '../types/item';
import { IPetInstance, PetType } from '../types/pet';
import { Panel } from './Panel';
import { Button } from './Button';
import { Toast } from './Toast';

const STORAGE_PAGE_SIZE = 8; // 4 columns × 2 rows per page (unlimited storage; UI pages through)
const STORAGE_ROW_PITCH = 92;

const PET_TYPE_NAMES: Record<PetType, string> = {
  [PetType.Rock]: 'Rock',
  [PetType.Nature]: 'Nature',
  [PetType.Wood]: 'Wood',
  [PetType.Water]: 'Water',
  [PetType.Normal]: 'Normal',
  [PetType.Light]: 'Light',
  [PetType.Shadow]: 'Shadow',
};

const PET_TYPE_COLORS: Record<PetType, string> = {
  [PetType.Rock]: '#b0bec5',
  [PetType.Nature]: '#81c784',
  [PetType.Wood]: '#a1887f',
  [PetType.Water]: '#64b5f6',
  [PetType.Normal]: '#e0e0e0',
  [PetType.Light]: '#fff176',
  [PetType.Shadow]: '#9575cd',
};

function petTypeForInstance(pet: IPetInstance): PetType {
  return PET_TEMPLATES[pet.templateId]?.type ?? PetType.Normal;
}

/** Stable sort: type → species name → level (desc) → original index. */
function getSortedStorageEntries(storage: IPetInstance[]): { storageIndex: number; pet: IPetInstance }[] {
  const entries = storage.map((pet, storageIndex) => ({ storageIndex, pet }));
  entries.sort((a, b) => {
    const typeA = petTypeForInstance(a.pet);
    const typeB = petTypeForInstance(b.pet);
    if (typeA !== typeB) return typeA - typeB;
    const nameA = PET_TEMPLATES[a.pet.templateId]?.name ?? a.pet.templateId;
    const nameB = PET_TEMPLATES[b.pet.templateId]?.name ?? b.pet.templateId;
    const nameCmp = nameA.localeCompare(nameB);
    if (nameCmp !== 0) return nameCmp;
    if (b.pet.level !== a.pet.level) return b.pet.level - a.pet.level;
    return a.storageIndex - b.storageIndex;
  });
  return entries;
}

export class PetBookUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;
  /** Team index 0–3 to replace when using Swap In; null = none / append when team not full */
  private selectedTeamSlot: number | null = null;
  /** Current page when browsing storage (unlimited length). */
  private storagePage = 0;
  /** Pet whose detail card is open (team slot index, or null for a stored pet). */
  private detailPet: IPetInstance | null = null;
  private detailTeamSlot: number | null = null;
  private detailPickingItem = false;
  /** TM flow: pick a TM from the bag, then pick which move slot to replace. */
  private detailPickingTm = false;
  private detailTmId: string | null = null;
  private tmPage = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(800).setVisible(false);
    this.build();
  }

  private build(): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    // Backdrop
    const bg = this.scene.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.7);
    bg.setInteractive(); // block clicks through
    this.container.add(bg);

    const panel = new Panel(this.scene, cx, cy, 700, 500, { fillColor: 0x0d1117, borderColor: 0x3498db });
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(cx, cy - 220, 'Pet Book', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);
    this.container.add(title);

    // Close button
    const closeBtn = new Button(this.scene, cx + 310, cy - 220, 'X', () => this.hide(), {
      width: 40, height: 40, fontSize: '18px', fillColor: 0xc0392b,
    });
    this.container.add(closeBtn);
  }

  show(): void {
    this.selectedTeamSlot = null;
    this.storagePage = 0;
    this.detailPet = null;
    this.detailTeamSlot = null;
    this.resetDetailModes();
    this.rebuildPanel();
  }

  private resetDetailModes(): void {
    this.detailPickingItem = false;
    this.detailPickingTm = false;
    this.detailTmId = null;
    this.tmPage = 0;
  }

  private openDetail(pet: IPetInstance, teamSlot: number | null): void {
    this.detailPet = pet;
    this.detailTeamSlot = teamSlot;
    this.resetDetailModes();
    this.rebuildPanel();
  }

  private closeDetail(): void {
    this.detailPet = null;
    this.detailTeamSlot = null;
    this.resetDetailModes();
    this.rebuildPanel();
  }

  /** Detail card: level, HP, moves, and a Use Item button for healing. */
  private addDetail(pet: IPetInstance): void {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.container.add(o); return o; };

    const block = this.scene.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.5);
    block.setInteractive();
    add(block);
    add(new Panel(this.scene, cx, cy, 520, 400, { fillColor: 0x161b22, borderColor: 0xffd700 }));

    const template = PET_TEMPLATES[pet.templateId];
    const type = petTypeForInstance(pet);
    const left = cx - 235;
    const top = cy - 180;

    add(this.scene.add.image(left + 40, top + 50, pet.templateId).setScale(2.5));
    add(this.scene.add.text(left + 100, top + 15, pet.nickname, {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#ffd700',
    }));
    add(new Button(this.scene, left + 440, top + 27, 'Rename', () => {
      const input = window.prompt(`Name your ${template?.name ?? 'pet'} (max ${MAX_PET_NAME_LENGTH} characters):`, pet.nickname);
      if (input === null) return; // cancelled
      if (GameState.getInstance().renamePet(pet, input)) {
        this.rebuildPanel();
      } else {
        Toast.show(this.scene, 'A pet needs a name!');
      }
    }, { width: 80, height: 28, fontSize: '13px', fillColor: 0x2c3e50 }));
    add(this.scene.add.text(left + 100, top + 45, `Level ${pet.level}  ·  ${PET_TYPE_NAMES[type]}`, {
      fontSize: '14px', fontFamily: 'Arial', color: PET_TYPE_COLORS[type],
    }));

    // HP bar
    const fraction = pet.maxHp > 0 ? Math.max(0, Math.min(1, pet.currentHp / pet.maxHp)) : 0;
    const barW = 260;
    const barY = top + 82;
    add(this.scene.add.rectangle(left + 100 + barW / 2, barY, barW, 14, 0x333333));
    const fill = fraction > 0.5 ? 0x4caf50 : fraction > 0.25 ? 0xff9800 : 0xe53935;
    if (fraction > 0) add(this.scene.add.rectangle(left + 100 + (barW * fraction) / 2, barY, barW * fraction, 14, fill));
    add(this.scene.add.text(left + 100 + barW + 10, barY, pet.currentHp <= 0 ? 'Fainted' : `${pet.currentHp}/${pet.maxHp} HP`, {
      fontSize: '13px', fontFamily: 'Arial', color: pet.currentHp <= 0 ? '#e53935' : '#ffffff',
    }).setOrigin(0, 0.5));

    if (this.detailPickingItem) {
      this.addDetailItemPicker(pet, add);
    } else if (this.detailPickingTm) {
      if (this.detailTmId) this.addDetailTmSlotPicker(pet, add);
      else this.addDetailTmPicker(pet, add);
    } else {
      add(this.scene.add.text(left, top + 115, 'Moves', {
        fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
      }));
      if (template) {
        const slots = getPetMoveSlots(pet);
        for (let i = 0; i < slots.length; i++) {
          const move = MOVES[slots[i].id];
          const unlockLevel = slots[i].level;
          if (!move) continue;
          const unlocked = pet.level >= unlockLevel;
          add(this.scene.add.text(
            left + 10,
            top + 142 + i * 24,
            unlocked
              ? `${move.name}  —  ${PET_TYPE_NAMES[move.type]}, power ${move.power}`
              : `${move.name}  —  unlocks at Lv ${unlockLevel}`,
            { fontSize: '13px', fontFamily: 'Arial', color: unlocked ? '#e0e0e0' : '#666666' },
          ));
        }
      }
    }

    // Buttons
    const btnY = cy + 165;
    const canHeal = pet.currentHp < pet.maxHp;
    const picking = this.detailPickingItem || this.detailPickingTm;
    if (!picking) {
      const playerLevel = GameState.getInstance().getState().level;
      const canLevel = pet.level < playerLevel;
      add(new Button(this.scene, cx - 105, btnY - 48, `Level Up to ${pet.level + 1}  (${SPIRITS_PER_PET_LEVEL} spirit)`, () => {
        const result = GameState.getInstance().levelUpPetWithSpirits(pet);
        if (result === 'at-player-level') {
          Toast.show(this.scene, `${pet.nickname} can't pass your level (${playerLevel}).`);
        } else if (result === 'no-spirits') {
          Toast.show(this.scene, `Need ${SPIRITS_PER_PET_LEVEL} spirit to level up.`);
        } else {
          Toast.show(this.scene, `${pet.nickname} reached level ${pet.level}!`);
          this.rebuildPanel();
        }
      }, { width: 260, height: 32, fontSize: '14px', fillColor: canLevel ? 0x27ae60 : 0x333333 }));

      add(new Button(this.scene, cx - 195, btnY, 'Use Item', () => {
        if (!canHeal) {
          Toast.show(this.scene, `${pet.nickname} is already at full health.`);
          return;
        }
        this.detailPickingItem = true;
        this.rebuildPanel();
      }, { width: 115, height: 36, fontSize: '14px', fillColor: canHeal ? 0x8e44ad : 0x333333 }));

      add(new Button(this.scene, cx - 65, btnY, 'Use TM', () => {
        this.detailPickingTm = true;
        this.detailTmId = null;
        this.tmPage = 0;
        this.rebuildPanel();
      }, { width: 115, height: 36, fontSize: '14px', fillColor: 0x2980b9 }));

      if (this.detailTeamSlot !== null) {
        const slot = this.detailTeamSlot;
        add(new Button(this.scene, cx + 70, btnY, 'Select to Swap', () => {
          this.selectedTeamSlot = this.selectedTeamSlot === slot ? null : slot;
          this.closeDetail();
        }, { width: 130, height: 36, fontSize: '13px', fillColor: 0x2c3e50 }));
      }
    }
    add(new Button(this.scene, cx + 200, btnY, picking ? 'Back' : 'Close', () => {
      if (this.detailPickingItem) {
        this.detailPickingItem = false;
      } else if (this.detailPickingTm && this.detailTmId) {
        this.detailTmId = null;
      } else if (this.detailPickingTm) {
        this.detailPickingTm = false;
      } else {
        this.closeDetail();
        return;
      }
      this.rebuildPanel();
    }, { width: 100, height: 36, fontSize: '14px', fillColor: 0xc0392b }));
  }

  /** Step 1 of Use TM: choose a TM from the bag. */
  private addDetailTmPicker(
    pet: IPetInstance,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    const gs = GameState.getInstance();
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    const top = cy - 180;
    const PER_PAGE = 5;

    add(this.scene.add.text(cx - 235, top + 115, 'Use which TM?', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
    }));

    const tms = gs.getState().inventory.filter((slot) => {
      const item = ITEMS[slot.itemId];
      return item && item.itemType === ItemType.TM && slot.quantity > 0;
    });

    if (tms.length === 0) {
      add(this.scene.add.text(cx, cy, "You have no TMs. Buy them from the shop's TMs tab.", {
        fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa', wordWrap: { width: 440 }, align: 'center',
      }).setOrigin(0.5));
      return;
    }

    const pages = Math.ceil(tms.length / PER_PAGE);
    this.tmPage = Math.min(this.tmPage, pages - 1);
    tms.slice(this.tmPage * PER_PAGE, (this.tmPage + 1) * PER_PAGE).forEach((slot, i) => {
      const item = ITEMS[slot.itemId];
      const move = MOVES[item.teachMoveId ?? ''];
      if (!move) return;
      const learnable = canPetLearnMove(pet, move);
      const known = getPetMoveSlots(pet).some((s) => s.id === move.id);
      const ok = learnable && !known;
      const note = known ? 'already known' : learnable ? `power ${move.power}` : `${PET_TYPE_NAMES[move.type]} - cannot learn`;
      add(new Button(
        this.scene, cx, top + 155 + i * 36,
        `${item.name} x${slot.quantity}  (${note})`,
        () => {
          if (!ok) {
            Toast.show(this.scene, known ? `${pet.nickname} already knows ${move.name}.` : `${pet.nickname} cannot learn ${move.name}.`);
            return;
          }
          this.detailTmId = slot.itemId;
          this.rebuildPanel();
        },
        { width: 380, height: 30, fontSize: '14px', fillColor: ok ? 0x2980b9 : 0x333333 },
      ));
    });

    if (pages > 1) {
      const btnY = cy + 165;
      add(new Button(this.scene, cx - 80, btnY, '<', () => {
        this.tmPage = (this.tmPage + pages - 1) % pages;
        this.rebuildPanel();
      }, { width: 50, height: 36, fontSize: '16px', fillColor: 0x2c3e50 }));
      add(this.scene.add.text(cx - 15, btnY, `${this.tmPage + 1}/${pages}`, {
        fontSize: '14px', fontFamily: 'Arial', color: '#ffffff',
      }).setOrigin(0.5));
      add(new Button(this.scene, cx + 50, btnY, '>', () => {
        this.tmPage = (this.tmPage + 1) % pages;
        this.rebuildPanel();
      }, { width: 50, height: 36, fontSize: '16px', fillColor: 0x2c3e50 }));
    }
  }

  /** Step 2 of Use TM: choose which known move to replace. */
  private addDetailTmSlotPicker(
    pet: IPetInstance,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    const gs = GameState.getInstance();
    const cx = SCREEN_WIDTH / 2;
    const top = SCREEN_HEIGHT / 2 - 180;
    const tmId = this.detailTmId!;
    const newMove = MOVES[ITEMS[tmId]?.teachMoveId ?? ''];

    add(this.scene.add.text(cx - 235, top + 115, `Replace which move with ${newMove?.name ?? '?'}?`, {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
    }));

    getPetMoveSlots(pet).forEach((slot, i) => {
      const move = MOVES[slot.id];
      if (!move) return;
      const locked = pet.level < slot.level;
      add(new Button(
        this.scene, cx, top + 155 + i * 40,
        `${move.name}  -  ${PET_TYPE_NAMES[move.type]}, power ${move.power}${locked ? `  (unlocks Lv ${slot.level})` : ''}`,
        () => {
          const err = gs.teachMove(pet, tmId, i);
          if (err) {
            Toast.show(this.scene, err);
          } else {
            Toast.show(this.scene, `${pet.nickname} forgot ${move.name} and learned ${newMove.name}!`);
            this.detailPickingTm = false;
            this.detailTmId = null;
          }
          this.rebuildPanel();
        },
        { width: 380, height: 32, fontSize: '14px', fillColor: 0xc0392b },
      ));
    });
  }

  private addDetailItemPicker(
    pet: IPetInstance,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    const gs = GameState.getInstance();
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    const left = cx - 235;
    const top = cy - 180;

    add(this.scene.add.text(left, top + 115, 'Use which item?', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
    }));

    const usable = gs.getState().inventory.filter((slot) => {
      const item = ITEMS[slot.itemId];
      return item && slot.quantity > 0 && (item.itemType === ItemType.Food || item.itemType === ItemType.Potion);
    });

    if (usable.length === 0) {
      add(this.scene.add.text(cx, cy, 'No healing items. Buy Apples, Feasts or Health Potions in the shop.', {
        fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa', wordWrap: { width: 440 }, align: 'center',
      }).setOrigin(0.5));
      return;
    }

    usable.slice(0, 5).forEach((slot, i) => {
      const item = ITEMS[slot.itemId];
      add(new Button(
        this.scene, cx, top + 160 + i * 42,
        `${item.name} x${slot.quantity}  (+${GameState.healAmountOf(slot.itemId)} HP)`,
        () => {
          const healed = gs.healPetWithItem(pet, slot.itemId);
          if (healed <= 0) {
            Toast.show(this.scene, `${pet.nickname} is already at full health.`);
          } else {
            Toast.show(this.scene, `${pet.nickname} healed for ${healed} HP!`);
          }
          if (pet.currentHp >= pet.maxHp) this.detailPickingItem = false;
          this.rebuildPanel();
        },
        { width: 380, height: 34, fontSize: '14px', fillColor: 0x27ae60 },
      ));
    });
  }

  /** Rebuild pet book UI without clearing team-slot selection (e.g. after picking a slot). */
  private rebuildPanel(): void {
    this.container.removeAll(true);
    this.build();
    this.addContent();
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  private addContent(): void {
    const gs = GameState.getInstance();
    const state = gs.getState();
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    // Active Team
    const teamLabel = this.scene.add.text(cx - 300, cy - 170, 'Active Team (tap pet to replace)', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff',
    });
    this.container.add(teamLabel);

    for (let i = 0; i < 4; i++) {
      const pet = state.team[i];
      const x = cx - 280 + i * 160;
      const y = cy - 100;

      if (pet) {
        if (this.selectedTeamSlot === i) {
          const ring = this.scene.add.rectangle(x, y, 72, 80);
          ring.setStrokeStyle(3, 0xffd700);
          this.container.add(ring);
        }

        const sprite = this.scene.add.image(x, y, pet.templateId).setScale(2);
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => this.openDetail(pet, i));
        this.container.add(sprite);

        const pt = petTypeForInstance(pet);
        const typeLine = PET_TYPE_NAMES[pt];
        const info = this.scene.add.text(
          x,
          y + 35,
          `${pet.nickname}\nLv ${pet.level}\n${pet.currentHp}/${pet.maxHp} HP\n${typeLine}`,
          {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
          },
        ).setOrigin(0.5);
        this.container.add(info);

        const evoDef = getEvolutionDef(pet.templateId);
        if (evoDef) {
          const yEvo = y + 68;
          if (pet.level < evoDef.minLevel) {
            this.container.add(
              this.scene.add.text(x, yEvo, `Evolve @ Lv${evoDef.minLevel}`, {
                fontSize: '9px',
                fontFamily: 'Arial',
                color: '#888888',
              }).setOrigin(0.5),
            );
          } else {
            const canPay = state.spirits >= EVOLUTION_SPIRIT_COST;
            const intoName = PET_TEMPLATES[evoDef.into]?.name ?? '?';
            const nick = pet.nickname;
            const evoBtn = new Button(
              this.scene,
              x,
              yEvo,
              `Evolve (${EVOLUTION_SPIRIT_COST})`,
              () => {
                if (!canPay) {
                  Toast.show(this.scene, `Need ${EVOLUTION_SPIRIT_COST} spirits to evolve.`);
                  return;
                }
                const stoneId = gs.evolutionStoneFor(pet);
                if (stoneId && gs.getItemCount(stoneId) < 1) {
                  Toast.show(this.scene, `Needs a ${ITEMS[stoneId]?.name ?? 'stone'} (sold in the shop).`);
                  return;
                }
                if (!gs.evolvePetOnTeam(i)) {
                  Toast.show(this.scene, 'Could not evolve.');
                  return;
                }
                Toast.show(this.scene, `${nick} evolved into ${intoName}!`);
                this.rebuildPanel();
              },
              { width: 100, height: 22, fontSize: '9px', fillColor: canPay ? 0x6a1b9a : 0x333333 },
            );
            evoBtn.setEnabled(canPay);
            this.container.add(evoBtn);
          }
        }
      } else {
        const empty = this.scene.add.text(x, y, '[Empty]', {
          fontSize: '14px', fontFamily: 'Arial', color: '#555555',
        }).setOrigin(0.5);
        this.container.add(empty);
      }
    }

    // Storage (unlimited capacity; paginate in UI)
    const totalStored = state.storage.length;
    const storageLabel = this.scene.add.text(cx - 300, cy + 10, `Storage (${totalStored}) — by type`, {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff',
    });
    this.container.add(storageLabel);

    if (totalStored === 0) {
      const noStore = this.scene.add.text(cx, cy + 60, 'No stored pets yet.', {
        fontSize: '14px', fontFamily: 'Arial', color: '#888888',
      }).setOrigin(0.5);
      this.container.add(noStore);
    } else {
      const sortedStorage = getSortedStorageEntries(state.storage);
      const totalPages = Math.ceil(totalStored / STORAGE_PAGE_SIZE);
      if (this.storagePage >= totalPages) {
        this.storagePage = Math.max(0, totalPages - 1);
      }

      const start = this.storagePage * STORAGE_PAGE_SIZE;
      for (let slot = 0; slot < STORAGE_PAGE_SIZE; slot++) {
        const pagePos = start + slot;
        if (pagePos >= totalStored) break;

        const { storageIndex: absIdx, pet } = sortedStorage[pagePos];
        const x = cx - 280 + (slot % 4) * 160;
        const y = cy + 58 + Math.floor(slot / 4) * STORAGE_ROW_PITCH;

        const sprite = this.scene.add.image(x, y, pet.templateId).setScale(1.5);
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => this.openDetail(pet, null));
        this.container.add(sprite);

        const st = petTypeForInstance(pet);
        this.container.add(
          this.scene.add.text(x, y + 26, PET_TYPE_NAMES[st], {
            fontSize: '10px',
            fontFamily: 'Arial Black',
            color: PET_TYPE_COLORS[st],
          }).setOrigin(0.5),
        );

        this.container.add(
          this.scene.add.text(x, y + 38, pet.nickname, {
            fontSize: '9px',
            fontFamily: 'Arial',
            color: '#cccccc',
          }).setOrigin(0.5),
        );

        const swapBtn = new Button(this.scene, x, y + 52, 'Swap In', () => {
          const team = gs.getState().team;
          if (team.length >= MAX_TEAM_SIZE) {
            if (this.selectedTeamSlot === null) {
              Toast.show(this.scene, 'Select a team pet to replace');
              return;
            }
            gs.swapTeamAndStorage(this.selectedTeamSlot, absIdx);
          } else if (this.selectedTeamSlot !== null && this.selectedTeamSlot < team.length) {
            gs.swapTeamAndStorage(this.selectedTeamSlot, absIdx);
          } else {
            const removed = gs.removePetFromStorage(absIdx);
            if (removed) gs.addPetToTeam(removed);
          }
          this.selectedTeamSlot = null;
          const newTotal = gs.getState().storage.length;
          if (newTotal === 0) {
            this.storagePage = 0;
          } else {
            const pages = Math.ceil(newTotal / STORAGE_PAGE_SIZE);
            if (this.storagePage >= pages) this.storagePage = pages - 1;
          }
          this.rebuildPanel();
        }, { width: 80, height: 22, fontSize: '10px' });
        this.container.add(swapBtn);

        const evoDef = getEvolutionDef(pet.templateId);
        if (evoDef) {
          const yEvo = y + 78;
          if (pet.level < evoDef.minLevel) {
            this.container.add(
              this.scene.add.text(x, yEvo, `Evo Lv${evoDef.minLevel}`, {
                fontSize: '8px',
                fontFamily: 'Arial',
                color: '#666666',
              }).setOrigin(0.5),
            );
          } else {
            const canPay = state.spirits >= EVOLUTION_SPIRIT_COST;
            const intoName = PET_TEMPLATES[evoDef.into]?.name ?? '?';
            const nick = pet.nickname;
            const evoBtn = new Button(
              this.scene,
              x,
              yEvo,
              `Evolve (${EVOLUTION_SPIRIT_COST})`,
              () => {
                if (!canPay) {
                  Toast.show(this.scene, `Need ${EVOLUTION_SPIRIT_COST} spirits to evolve.`);
                  return;
                }
                const stoneId = gs.evolutionStoneFor(pet);
                if (stoneId && gs.getItemCount(stoneId) < 1) {
                  Toast.show(this.scene, `Needs a ${ITEMS[stoneId]?.name ?? 'stone'} (sold in the shop).`);
                  return;
                }
                if (!gs.evolvePetInStorage(absIdx)) {
                  Toast.show(this.scene, 'Could not evolve.');
                  return;
                }
                Toast.show(this.scene, `${nick} evolved into ${intoName}!`);
                this.rebuildPanel();
              },
              { width: 100, height: 20, fontSize: '8px', fillColor: canPay ? 0x6a1b9a : 0x333333 },
            );
            evoBtn.setEnabled(canPay);
            this.container.add(evoBtn);
          }
        }
      }

      if (totalPages > 1) {
        const navY = cy + 232;
        const pageHint = this.scene.add.text(cx, navY, `Page ${this.storagePage + 1} / ${totalPages}`, {
          fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa',
        }).setOrigin(0.5);
        this.container.add(pageHint);

        const prevBtn = new Button(
          this.scene,
          cx - 100,
          navY + 28,
          'Prev',
          () => {
            if (this.storagePage > 0) {
              this.storagePage--;
              this.rebuildPanel();
            }
          },
          { width: 72, height: 28, fontSize: '12px', fillColor: 0x2c3e50 },
        );
        prevBtn.setEnabled(this.storagePage > 0);
        this.container.add(prevBtn);

        const nextBtn = new Button(
          this.scene,
          cx + 100,
          navY + 28,
          'Next',
          () => {
            if (this.storagePage < totalPages - 1) {
              this.storagePage++;
              this.rebuildPanel();
            }
          },
          { width: 72, height: 28, fontSize: '12px', fillColor: 0x2c3e50 },
        );
        nextBtn.setEnabled(this.storagePage < totalPages - 1);
        this.container.add(nextBtn);
      }
    }

    // Detail card sits on top of everything else
    if (this.detailPet) this.addDetail(this.detailPet);
  }
}
