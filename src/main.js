import Phaser from 'phaser';
import { GAME } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { Zone1_PromptVoid } from './scenes/Zone1_PromptVoid.js';
import { Zone2_APIGateway } from './scenes/Zone2_APIGateway.js';
import { Zone3_RouterNexus } from './scenes/Zone3_RouterNexus.js';
import { InfoCardScene } from './scenes/InfoCardScene.js';

window.onerror = (msg, src, line, col, err) => {
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;top:0;left:0;color:#ff4444;background:#000;padding:20px;font-size:14px;z-index:99999;max-width:100vw;white-space:pre-wrap';
  el.textContent = `ERROR: ${msg}\n${src}:${line}:${col}\n${err?.stack || ''}`;
  document.body.appendChild(el);
};

const dpr = Math.min(window.devicePixelRatio || 1, 2);

const config = {
  type: Phaser.AUTO,
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
      gravity: { y: GAME.GRAVITY },
      debug: false,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    roundPixels: true,
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
