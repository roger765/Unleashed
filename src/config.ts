import Phaser from 'phaser';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterCreateScene } from './scenes/CharacterCreateScene';
import { TownScene } from './scenes/TownScene';
import { UIScene } from './scenes/UIScene';
import { BattleScene } from './scenes/BattleScene';
import { TutorialScene, TutorialStarterSelectScene } from './scenes/TutorialScene';
import { ForestScene } from './scenes/ForestScene';
import { ShrubWoodlandsScene } from './scenes/ShrubWoodlandsScene';
import { StonyMountainsScene } from './scenes/StonyMountainsScene';
import { AquaIslesScene } from './scenes/AquaIslesScene';
import { CaveScene } from './scenes/CaveScene';
import { PondScene } from './scenes/PondScene';
import { ConvergenceWildsScene } from './scenes/ConvergenceWildsScene';
import { ShopScene } from './scenes/ShopScene';
import { QuizTowerScene } from './scenes/QuizTowerScene';
import { BossTowerScene } from './scenes/BossTowerScene';
import { SpinWheelScene } from './ui/SpinWheelUI';
import { HenryRanchScene } from './scenes/HenryRanchScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene, PreloadScene, MainMenuScene, CharacterCreateScene,
    TutorialScene, TutorialStarterSelectScene,
    TownScene, UIScene, BattleScene,
    ShrubWoodlandsScene, StonyMountainsScene, AquaIslesScene,
    ForestScene, CaveScene, PondScene, ConvergenceWildsScene,
    ShopScene, QuizTowerScene, BossTowerScene, SpinWheelScene,
    HenryRanchScene,
  ],
};
