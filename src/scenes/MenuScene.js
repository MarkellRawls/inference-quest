import Phaser from 'phaser';
import { GAME, SCENES } from '../config/constants.js';
import { PALETTES, ALL_ACCENTS } from '../config/colors.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { generateStarField, generateNebula } from '../effects/procedural.js';
import { addGlow, addPostBloom } from '../utils/helpers.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    this.createBackgrounds();
    this.createAmbientParticles();
    this.createFloatingOrb();
    this.createTitle();
    this.createZoneDots();
    this.createBeginButton();

    addPostBloom(this.cameras.main, 0xffffff, 0.5, 0.5, 1, 1.5, 6);
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  createBackgrounds() {
    if (!this.textures.exists('menu_stars_far')) {
      generateStarField(this, 'menu_stars_far', 1024, 1024, 200, [0xffffff, 0xccccff, 0xaaaaff]);
      generateStarField(this, 'menu_stars_near', 1024, 1024, 350, [0xffffff, 0xddddff, 0x8888ff]);
      generateNebula(this, 'menu_nebula', 1024, 1024, [0x4444aa, 0x6644aa, 0x2244aa, 0x884488, 0x664488, 0x446688]);
    }

    const bg = this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x050515);
    bg.setOrigin(0, 0).setDepth(-200);

    this.parallax = new ParallaxBackground(this, [
      { key: 'menu_stars_far', speed: 0.02, alpha: 0.6 },
      { key: 'menu_nebula', speed: 0.05, alpha: 0.4 },
      { key: 'menu_stars_near', speed: 0.08, alpha: 0.8 },
    ]);

    this.bgScrollX = 0;
  }

  createAmbientParticles() {
    this.add.particles(0, 0, 'particle_soft', {
      x: { min: 0, max: GAME.WIDTH },
      y: { min: 0, max: GAME.HEIGHT },
      speedX: { min: -10, max: 10 },
      speedY: { min: -6, max: 6 },
      scale: { start: 0.35, end: 0, random: true },
      alpha: { start: 0.4, end: 0 },
      lifespan: { min: 4000, max: 8000 },
      frequency: 100,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0x6a5acd, 0x00ffff, 0xff00ff, 0xffd700, 0x44ff88],
    }).setScrollFactor(0).setDepth(10);
  }

  createFloatingOrb() {
    this.orb = this.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 60, 'player_orb');
    this.orb.setBlendMode(Phaser.BlendModes.ADD);
    this.orb.setScale(2.5);
    this.orb.setDepth(20);
    addGlow(this.orb, 0x00ffff, 10, 0, false, 0.1, 40);

    this.orbTrail = this.add.particles(0, 0, 'player_trail', {
      follow: this.orb,
      speed: { min: 5, max: 20 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 1500,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 20,
      tint: [0x00ffff, 0x4488ff],
    }).setDepth(19);

    this.orbAngle = 0;
  }

  createTitle() {
    this.title = this.add.text(GAME.WIDTH / 2, 160, 'INFERENCE QUEST', {
      fontFamily: '"Courier New", monospace',
      fontSize: '84px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
      resolution: 2,
    });
    this.title.setOrigin(0.5);
    this.title.setDepth(30);

    const titleGlow = addGlow(this.title, 0x00ffff, 4, 0, false, 0.1, 32);
    if (titleGlow) {
      this.tweens.add({
        targets: titleGlow,
        outerStrength: 14,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }

    this.subtitle = this.add.text(GAME.WIDTH / 2, 260, 'Journey Through the AI Inference Pipeline', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      color: '#88ccff',
      align: 'center',
      resolution: 2,
    });
    this.subtitle.setOrigin(0.5);
    this.subtitle.setDepth(30);
    addGlow(this.subtitle, 0x4488cc, 2, 0, false, 0.1, 16);
    this.subtitle.setAlpha(0);

    this.tweens.add({
      targets: this.subtitle,
      alpha: 1,
      duration: 1500,
      delay: 500,
      ease: 'Sine.easeOut',
    });

    this.tagline = this.add.text(GAME.WIDTH / 2, 310, 'Featuring llm-d  |  KV Cache Routing  |  Cutting-Edge Serving Architecture', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      color: '#ffd700',
      align: 'center',
      resolution: 2,
    });
    this.tagline.setOrigin(0.5);
    this.tagline.setDepth(30);
    addGlow(this.tagline, 0xffd700, 2, 0, false, 0.1, 12);
    this.tagline.setAlpha(0);

    this.tweens.add({
      targets: this.tagline,
      alpha: 0.9,
      duration: 1500,
      delay: 1000,
      ease: 'Sine.easeOut',
    });

    this.storyTeaser = this.add.text(GAME.WIDTH / 2, 365, 'You are a thought, a question given form. Survive the pipeline. Become a response.', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#8888cc',
      align: 'center',
      fontStyle: 'italic',
      resolution: 2,
      wordWrap: { width: 700 },
    });
    this.storyTeaser.setOrigin(0.5, 0);
    this.storyTeaser.setDepth(30);
    this.storyTeaser.setAlpha(0);

    this.tweens.add({
      targets: this.storyTeaser,
      alpha: 0.8,
      duration: 2000,
      delay: 1500,
      ease: 'Sine.easeOut',
    });
  }

  createZoneDots() {
    const dotY = GAME.HEIGHT - 80;
    const spacing = 60;
    const startX = GAME.WIDTH / 2 - (ALL_ACCENTS.length - 1) * (spacing / 2);

    const zoneNames = [
      'Prompt Void', 'API Gateway', 'Router Nexus',
      'Tokenizer Grove', 'Embedding Nebula', 'Attention Nexus',
      'KV Cache Caverns', 'Decode Waterfall', 'Response Stream',
    ];

    ALL_ACCENTS.forEach((color, i) => {
      const dot = this.add.circle(startX + i * spacing, dotY, 9, color, 0.7);
      dot.setDepth(30);
      addGlow(dot, color, 2, 0, false, 0.1, 12);

      dot.setInteractive();
      dot.on('pointerover', () => {
        this.tweens.add({ targets: dot, scaleX: 1.5, scaleY: 1.5, duration: 200 });
        if (!this.zoneLabel) {
          this.zoneLabel = this.add.text(startX + i * spacing, dotY - 30, zoneNames[i], {
            fontFamily: '"Courier New", monospace',
            fontSize: '16px',
            color: '#ffffff',
            resolution: 2,
          }).setOrigin(0.5).setDepth(31);
        } else {
          this.zoneLabel.setText(zoneNames[i]);
          this.zoneLabel.setX(startX + i * spacing);
          this.zoneLabel.setVisible(true);
        }
      });
      dot.on('pointerout', () => {
        this.tweens.add({ targets: dot, scaleX: 1, scaleY: 1, duration: 200 });
        if (this.zoneLabel) this.zoneLabel.setVisible(false);
      });
    });
  }

  createBeginButton() {
    const btnX = GAME.WIDTH / 2;
    const btnY = GAME.HEIGHT / 2 + 200;

    this.btnBg = this.add.image(btnX, btnY, 'button_bg');
    this.btnBg.setScale(1.4, 1.3);
    this.btnBg.setDepth(30);
    const btnGlow = addGlow(this.btnBg, 0x00ffff, 3, 0, false, 0.1, 16);

    this.btnText = this.add.text(btnX, btnY, 'BEGIN JOURNEY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#00ffff',
      resolution: 2,
    });
    this.btnText.setOrigin(0.5);
    this.btnText.setDepth(31);

    this.btnBg.setInteractive({ useHandCursor: true });

    this.btnBg.on('pointerover', () => {
      if (btnGlow) this.tweens.add({ targets: btnGlow, outerStrength: 8, duration: 200 });
      this.tweens.add({ targets: this.btnBg, scaleX: 1.45, scaleY: 1.35, duration: 200 });
      this.tweens.add({ targets: this.btnText, scaleX: 1.05, scaleY: 1.05, duration: 200 });
    });

    this.btnBg.on('pointerout', () => {
      if (btnGlow) this.tweens.add({ targets: btnGlow, outerStrength: 3, duration: 200 });
      this.tweens.add({ targets: this.btnBg, scaleX: 1.4, scaleY: 1.3, duration: 200 });
      this.tweens.add({ targets: this.btnText, scaleX: 1, scaleY: 1, duration: 200 });
    });

    this.btnBg.on('pointerdown', () => this.startGame());

    this.btnBg.setAlpha(0);
    this.btnText.setAlpha(0);
    this.tweens.add({
      targets: [this.btnBg, this.btnText],
      alpha: 1,
      duration: 1000,
      delay: 1200,
      ease: 'Sine.easeOut',
    });
  }

  startGame() {
    this.btnBg.disableInteractive();

    this.tweens.add({
      targets: this.orb,
      x: GAME.WIDTH / 2,
      y: GAME.HEIGHT / 2,
      scale: 4,
      duration: 600,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.cameras.main,
      zoom: 2.5,
      duration: 800,
      ease: 'Power2',
    });

    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.ZONE1);
    });
  }

  update(time, delta) {
    this.bgScrollX += delta * 0.01;
    for (const layer of this.parallax.layers) {
      layer.tilePositionX = this.bgScrollX * layer._scrollSpeed * 50;
    }

    this.orbAngle += delta * 0.001;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2 - 60;
    this.orb.x = cx + Math.cos(this.orbAngle) * 200;
    this.orb.y = cy + Math.sin(this.orbAngle * 2) * 70;
  }
}
