import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { generateStarField, generateNebula } from '../effects/procedural.js';
import { createAmbientParticles, createPortalParticles, createCollectBurst } from '../effects/particles.js';
import { addGlow, addPostBloom } from '../utils/helpers.js';

const PALETTE = PALETTES.PROMPT_VOID;
const WORLD = ZONE_WORLDS.PROMPT_VOID;

const PROMPT_FRAGMENTS = [
  'Hello,', 'Tell me', 'about', 'How does', 'What is',
  'the meaning', 'of', 'artificial', 'intelligence', '?',
  'Explain', 'neural', 'networks', 'to me', 'Please',
  'Generate', 'a story', 'about', 'machine', 'learning',
];

const COLLECTIBLE_WORDS = [
  'What', 'is', 'the', 'AI', 'inference', 'pipeline', '?',
];

export class Zone1_PromptVoid extends Phaser.Scene {
  constructor() {
    super(SCENES.ZONE1);
  }

  init(data) {
    this.playerData = data || {};
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.createBackgrounds();
    this.createAmbientEffects();
    this.createPlayer();
    this.createFloatingText();
    this.createTutorialPhases();
    this.createCollectibles();
    this.createPortal();
    this.setupCamera();

    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    addPostBloom(this.cameras.main, 0xffffff, 0.5, 0.5, 1, 1.2, 4);

    this.tutorialPhase = 0;
    this.showTutorialText('Use WASD or Arrow Keys to move', 300, GAME.HEIGHT / 2 - 120);
  }

  createBackgrounds() {
    if (!this.textures.exists('z1_stars_far')) {
      generateStarField(this, 'z1_stars_far', 512, 512, 50, [0xffffff, 0xccccff]);
      generateStarField(this, 'z1_stars_near', 512, 512, 120, [0xffffff, 0xddddff, 0x8888ff]);
      generateNebula(this, 'z1_nebula', 512, 512, [0x3333aa, 0x5533aa, 0x2244bb]);
    }

    this.add.rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.bg[0])
      .setOrigin(0, 0).setDepth(-200);

    this.parallax = new ParallaxBackground(this, [
      { key: 'z1_stars_far', speed: 0.02, alpha: 0.5 },
      { key: 'z1_nebula', speed: 0.06, alpha: 0.35 },
      { key: 'z1_stars_near', speed: 0.1, alpha: 0.7 },
    ]);
  }

  createAmbientEffects() {
    this.ambientParticles = createAmbientParticles(this, PALETTE, {
      frequency: 250,
      alphaStart: 0.3,
      scaleStart: 0.2,
      lifespan: { min: 4000, max: 7000 },
    });
  }

  createPlayer() {
    this.player = new Player(this, 225, GAME.HEIGHT / 2);
    this.player.setZonePalette(PALETTE);
  }

  createFloatingText() {
    this.floatingTexts = [];
    const textStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      color: '#6a5acd',
    };

    for (let i = 0; i < 25; i++) {
      const word = PROMPT_FRAGMENTS[i % PROMPT_FRAGMENTS.length];
      const x = 600 + Math.random() * (WORLD.width - 900);
      const y = 75 + Math.random() * (GAME.HEIGHT - 150);
      const txt = this.add.text(x, y, word, textStyle);
      txt.setAlpha(0.15 + Math.random() * 0.25);
      txt.setDepth(5);
      txt._driftSpeed = 8 + Math.random() * 15;
      txt._baseY = y;
      txt._bobOffset = Math.random() * Math.PI * 2;
      this.floatingTexts.push(txt);
    }
  }

  createTutorialPhases() {
    this.dashWall = this.physics.add.staticGroup();
    const wallX = 1500;
    for (let y = 0; y < GAME.HEIGHT; y += 75) {
      const wallPiece = this.add.text(wallX, y, '|||||', {
        fontFamily: '"Courier New", monospace',
        fontSize: '24px',
        color: '#6a5acd',
      });
      wallPiece.setAlpha(0.5);
      wallPiece.setDepth(15);
      addGlow(wallPiece, PALETTE.accent, 2, 0, false, 0.1, 8);
      this.dashWall.add(wallPiece);
    }

    this.dashWallParticles = this.add.particles(wallX, GAME.HEIGHT / 2, 'particle_soft', {
      x: { min: -10, max: 10 },
      y: { min: -GAME.HEIGHT / 2, max: GAME.HEIGHT / 2 },
      speed: { min: 5, max: 15 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 2000,
      frequency: 150,
      blendMode: Phaser.BlendModes.ADD,
      tint: PALETTE.particles,
    }).setDepth(14);

    this.dashTriggerShown = false;
    this.dashWallBroken = false;
  }

  createCollectibles() {
    this.collectibles = this.physics.add.group();
    this.collectedCount = 0;
    this.totalCollectibles = COLLECTIBLE_WORDS.length;

    const startX = 2100;
    COLLECTIBLE_WORDS.forEach((word, i) => {
      const x = startX + i * 180 + Math.random() * 60;
      const y = 300 + Math.random() * 480;

      const orb = this.physics.add.sprite(x, y, 'player_orb');
      orb.setScale(0.4);
      orb.setBlendMode(Phaser.BlendModes.ADD);
      orb.setDepth(80);
      orb.setTint(PALETTE.accent);
      addGlow(orb, PALETTE.accent, 3, 0, false, 0.1, 16);

      const label = this.add.text(x, y - 38, word, {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        color: '#e0e0ff',
        fontStyle: 'bold',
      });
      label.setOrigin(0.5);
      label.setDepth(81);
      orb._label = label;
      orb._word = word;

      this.tweens.add({
        targets: [orb, label],
        y: y - 12,
        duration: 1500 + Math.random() * 500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      this.collectibles.add(orb);
    });

    this.physics.add.overlap(this.player, this.collectibles, this.collectToken, null, this);

    this.collectCounter = this.add.text(GAME.WIDTH - 30, 30, `0 / ${this.totalCollectibles}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      color: '#e0e0ff',
    });
    this.collectCounter.setOrigin(1, 0);
    this.collectCounter.setScrollFactor(0);
    this.collectCounter.setDepth(200);
    addGlow(this.collectCounter, PALETTE.accent, 2, 0, false, 0.1, 12);
    this.collectCounter.setAlpha(0);
  }

  createPortal() {
    this.portalX = WORLD.width - 150;
    this.portalY = GAME.HEIGHT / 2;
    this.portalActive = false;

    this.portal = this.add.image(this.portalX, this.portalY, 'portal_ring');
    this.portal.setBlendMode(Phaser.BlendModes.ADD);
    this.portal.setDepth(85);
    this.portal.setScale(0);
    addGlow(this.portal, 0x00ffff, 4, 0, false, 0.1, 24);

    this.portalParticles = createPortalParticles(this, this.portalX, this.portalY, 0x00ffff);
    this.portalParticles.setVisible(false);

    this.portalZone = this.add.zone(this.portalX, this.portalY, 90, 90);
    this.physics.add.existing(this.portalZone, true);
    this.physics.add.overlap(this.player, this.portalZone, () => {
      if (this.portalActive) this.exitZone();
    }, null, this);
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD.width, GAME.HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  showTutorialText(message, x, y) {
    const txt = this.add.text(x, y, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      color: '#e0e0ff',
    });
    txt.setDepth(200);
    addGlow(txt, PALETTE.accent, 3, 0, false, 0.1, 16);

    let charIndex = 0;
    this.time.addEvent({
      delay: 40,
      repeat: message.length - 1,
      callback: () => {
        charIndex++;
        txt.setText(message.substring(0, charIndex));
      },
    });

    this.time.delayedCall(message.length * 40 + 3000, () => {
      this.tweens.add({
        targets: txt,
        alpha: 0,
        duration: 1000,
        onComplete: () => txt.destroy(),
      });
    });

    return txt;
  }

  collectToken(player, orb) {
    createCollectBurst(this, orb.x, orb.y, PALETTE.accent);
    this.cameras.main.shake(80, 0.004);

    if (orb._label) orb._label.destroy();
    orb.destroy();

    this.collectedCount++;
    this.collectCounter.setText(`${this.collectedCount} / ${this.totalCollectibles}`);

    if (this.collectedCount >= this.totalCollectibles) {
      this.activatePortal();
    }
  }

  activatePortal() {
    this.portalActive = true;
    this.portalParticles.setVisible(true);

    this.tweens.add({
      targets: this.portal,
      scale: 1.5,
      duration: 800,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: this.portal,
      angle: 360,
      duration: 4000,
      repeat: -1,
    });

    this.showTutorialText('Portal activated! Enter to continue...', this.portalX - 300, this.portalY - 120);
  }

  exitZone() {
    if (this._exiting) return;
    this._exiting = true;

    this.player.body.setVelocity(0, 0);
    this.player.disableBody(true, false);

    this.tweens.add({
      targets: this.player,
      x: this.portalX,
      y: this.portalY,
      scale: 0,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
    });

    this.cameras.main.fadeOut(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.pause();
      this.scene.launch(SCENES.INFO_CARD, {
        ...ZONE_CARDS.PROMPT_VOID,
        nextZone: SCENES.ZONE2,
        callingScene: SCENES.ZONE1,
        playerData: this.playerData,
      });
    });
  }

  update(time, delta) {
    this.player.update(time, delta);
    this.parallax.update(this.cameras.main);

    for (const txt of this.floatingTexts) {
      txt.x -= txt._driftSpeed * delta * 0.001;
      txt.y = txt._baseY + Math.sin(time * 0.001 + txt._bobOffset) * 12;
      if (txt.x < -100) {
        txt.x = WORLD.width + 100;
      }
    }

    const px = this.player.x;

    if (!this.dashTriggerShown && px > 1050) {
      this.dashTriggerShown = true;
      this.showTutorialText('Press SPACE to dash through barriers', 1125, GAME.HEIGHT / 2 - 150);
    }

    if (!this.dashWallBroken && this.player.isDashing) {
      const wallX = 1500;
      if (px > wallX - 60 && px < wallX + 60) {
        this.dashWallBroken = true;
        this.dashWall.getChildren().forEach(piece => {
          this.tweens.add({
            targets: piece,
            x: piece.x + (Math.random() - 0.5) * 300,
            y: piece.y + (Math.random() - 0.5) * 300,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => piece.destroy(),
          });
        });
        this.dashWallParticles.destroy();
        this.cameras.main.shake(200, 0.008);
      }
    }

    if (px > 1950 && this.collectCounter.alpha === 0) {
      this.tweens.add({
        targets: this.collectCounter,
        alpha: 1,
        duration: 500,
      });
      this.showTutorialText('Collect all prompt tokens', 2025, GAME.HEIGHT / 2 - 150);
    }
  }
}
