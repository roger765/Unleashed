import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, MAX_TEAM_SIZE } from '../constants';
import { GameState } from '../state/GameState';
import { EVOLUTION_SPIRIT_COST, getEvolutionDef } from '../data/evolutions';
import { PET_TEMPLATES } from '../data/pets';
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
};

const PET_TYPE_COLORS: Record<PetType, string> = {
  [PetType.Rock]: '#b0bec5',
  [PetType.Nature]: '#81c784',
  [PetType.Wood]: '#a1887f',
  [PetType.Water]: '#64b5f6',
  [PetType.Normal]: '#e0e0e0',
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
    this.rebuildPanel();
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
        sprite.on('pointerdown', () => {
          this.selectedTeamSlot = this.selectedTeamSlot === i ? null : i;
          this.rebuildPanel();
        });
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
  }
}
