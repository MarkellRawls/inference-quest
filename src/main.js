import Phaser from 'phaser';
import { GAME } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { Zone1_PromptVoid } from './scenes/Zone1_PromptVoid.js';
import { Zone2_APIGateway } from './scenes/Zone2_APIGateway.js';
import { Zone3_RouterNexus } from './scenes/Zone3_RouterNexus.js';
import { InfoCardScene } from './scenes/InfoCardScene.js';

const config = {
  type: Phaser.WEBGL,
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    Zone1_PromptVoid,
    Zone2_APIGateway,
    Zone3_RouterNexus,
    InfoCardScene,
  ],
};

new Phaser.Game(config);
