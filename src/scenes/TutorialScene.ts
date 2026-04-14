import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE } from '../constants';
import { GameState } from '../state/GameState';
import { PET_TEMPLATES } from '../data/pets';
import { IPetInstance } from '../types/pet';
import { DialogueBox } from '../ui/DialogueBox';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { createPlayerCombatant, createPetCombatant } from '../battle/Combatant';
import { BattleConfig } from '../battle/BattleManager';
import { AudioManager } from '../audio/AudioManager';

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TutorialScene' });
  }

  create(): void {
    AudioManager.playMusic('calm');

    // Simple green ground
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 40; x++) {
        this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'tile-grass');
      }
    }

    // Edward NPC sprite
    const edward = this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 60, 'npc-edward').setScale(2);

    const dialogue = new DialogueBox(this);

    dialogue.show('Edward Dragon Master', [
      'Welcome, young wizard! I am Edward, the Dragon Master.',
      'The world is full of amazing creatures waiting to be discovered!',
      'But first, let me teach you how to battle.',
      'I will summon a weak creature for you to practice on. Use your staff!',
    ], () => {
      // Start practice battle
      this.startPracticeBattle();
    });
  }

  private startPracticeBattle(): void {
    const gs = GameState.getInstance();
    const state = gs.getState();

    // Player combatant only (no pet yet)
    const playerCombatant = createPlayerCombatant(state.name, 1, null);

    // Weak practice enemy — a level 1 common pet
    const template = PET_TEMPLATES['sprout'];
    const enemyPet: IPetInstance = {
      templateId: 'sprout',
      nickname: 'Wild Sprout',
      level: 1,
      currentHp: 30,
      maxHp: 30,
      xp: 0,
      attack: 5,
      defense: 3,
    };
    const enemyCombatant = createPetCombatant(enemyPet, 'enemy-0');
    // Weaken for tutorial
    enemyCombatant.maxHp = 30;
    enemyCombatant.currentHp = 30;
    enemyCombatant.attack = 5;
    enemyCombatant.defense = 3;

    const config: BattleConfig = {
      playerTeam: [playerCombatant],
      enemyTeam: [enemyCombatant],
      isBoss: false,
      isWild: false, // Don't offer capture in tutorial
      returnScene: 'TutorialScene-StarterSelect',
    };

    // Use a flag so we know to show starter select after
    gs.setFlag('tutorial-battle-done', true);

    this.scene.start('BattleScene', { battleConfig: config });
  }
}

// Separate scene for starter selection (returned to after tutorial battle)
export class TutorialStarterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TutorialScene-StarterSelect' });
  }

  create(): void {
    AudioManager.playMusic('calm');

    // Ground
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 40; x++) {
        this.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 16, 'tile-grass');
      }
    }

    this.add.image(SCREEN_WIDTH / 2, 120, 'npc-edward').setScale(2);

    const dialogue = new DialogueBox(this);
    dialogue.show('Edward Dragon Master', [
      'Well done! You defeated it!',
      'Now it is time to choose your first companion.',
      'Each creature has a unique type. Choose wisely!',
    ], () => {
      this.showStarterSelection();
    });
  }

  private showStarterSelection(): void {
    const panel = new Panel(this, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20, 700, 320);

    this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 120, 'Choose Your Starter!', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffd700',
    }).setOrigin(0.5);

    const starters = ['gravel', 'leaf', 'twig', 'wave'];
    const typeColors: Record<string, string> = {
      gravel: '#78909C', leaf: '#4CAF50', twig: '#795548', wave: '#2196F3',
    };
    const typeNames: Record<string, string> = {
      gravel: 'Rock', leaf: 'Nature', twig: 'Wood', wave: 'Water',
    };

    const startX = SCREEN_WIDTH / 2 - 250;

    for (let i = 0; i < starters.length; i++) {
      const id = starters[i];
      const template = PET_TEMPLATES[id];
      const x = startX + i * 170;
      const y = SCREEN_HEIGHT / 2 + 10;

      // Pet sprite
      this.add.image(x, y - 30, id).setScale(2.5);

      // Name and type
      this.add.text(x, y + 25, template.name, {
        fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setOrigin(0.5);

      this.add.text(x, y + 48, typeNames[id], {
        fontSize: '14px', fontFamily: 'Arial', color: typeColors[id],
      }).setOrigin(0.5);

      // Select button
      new Button(this, x, y + 80, 'Choose', () => {
        this.selectStarter(id);
      }, { width: 120, height: 35, fontSize: '14px' });
    }
  }

  private selectStarter(templateId: string): void {
    const template = PET_TEMPLATES[templateId];
    const pet: IPetInstance = {
      templateId,
      nickname: template.name,
      level: 5,
      currentHp: 0,
      maxHp: 0,
      xp: 0,
      attack: 0,
      defense: 0,
    };
    // Calculate stats
    pet.maxHp = Math.floor(template.baseHp + pet.level * template.baseHp * 0.1);
    pet.currentHp = pet.maxHp;
    pet.attack = Math.floor(template.baseAttack + pet.level * template.baseAttack * 0.1);
    pet.defense = Math.floor(template.baseDefense + pet.level * template.baseDefense * 0.1);

    const gs = GameState.getInstance();
    gs.addPetToTeam(pet);
    gs.addItem('star-staff', 1);
    gs.equipWeapon('star-staff');
    gs.addCoins(50); // Starting coins
    gs.setFlag('tutorial-complete', true);

    const dialogue = new DialogueBox(this);
    dialogue.show('Edward Dragon Master', [
      `Excellent! ${template.name} is a fine choice!`,
      'Go explore the world, young wizard. Adventure awaits!',
    ], () => {
      this.scene.start('TownScene');
    });
  }
}
