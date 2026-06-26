import Phaser from 'phaser';
import { GAME, SCENES } from '../config/constants.js';
import { PALETTES, ALL_ACCENTS } from '../config/colors.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { generateStarField, generateNebula } from '../effects/procedural.js';

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

    this.cameras.main.postFX.addBloom(0xffffff, 0.5, 0.5, 1, 1.5, 6);
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  createBackgrounds() {
    generateStarField(this, 'menu_stars_far', 512, 512, 80, [0xffffff, 0xccccff, 0xaaaaff]);
    generateStarField(this, 'menu_stars_near', 512, 512, 150, [0xffffff, 0xddddff, 0x8888ff]);
    generateNebula(this, 'menu_nebula', 512, 512, [0x4444aa, 0x6644aa, 0x2244aa, 0x884488]);

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
      speedX: { min: -8, max: 8 },
      speedY: { min: -5, max: 5 },
      scale: { start: 0.25, end: 0, random: true },
      alpha: { start: 0.35, end: 0 },
      lifespan: { min: 4000, max: 8000 },
      frequency: 180,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0x6a5acd, 0x00ffff, 0xff00ff, 0xffd700, 0x44ff88],
    }).setScrollFactor(0).setDepth(10);
  }

  createFloatingOrb() {
    this.orb = this.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 20, 'player_orb');
    this.orb.setBlendMode(Phaser.BlendModes.ADD);
    this.orb.setScale(1.5);
    this.orb.setDepth(20);
    this.orb.preFX.addGlow(0x00ffff, 8, 0, false, 0.1, 32);

    this.orbTrail = this.add.particles(0, 0, 'player_trail', {
      follow: this.orb,
      speed: { min: 5, max: 15 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 1200,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 30,
      tint: [0x00ffff, 0x4488ff],
    }).setDepth(19);

    this.orbAngle = 0;
  }

  createTitle() {
    const titleStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    };

    this.title = this.add.text(GAME.WIDTH / 2, 140, 'INFERENCE QUEST', titleStyle);
    this.title.setOrigin(0.5);
    this.title.setDepth(30);

    const titleGlow = this.title.preFX.addGlow(0x00ffff, 4, 0, false, 0.1, 24);
    this.tweens.add({
      targets: titleGlow,
      outerStrength: 12,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    const subtitleStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      color: '#88ccff',
      align: 'center',
    };

    this.subtitle = this.add.text(GAME.WIDTH / 2, 200, 'Journey Through the AI Pipeline', subtitleStyle);
    this.subtitle.setOrigin(0.5);
    this.subtitle.setDepth(30);
    this.subtitle.preFX.addGlow(0x4488cc, 2, 0, false, 0.1, 16);
    this.subtitle.setAlpha(0);

    this.tweens.add({
      targets: this.subtitle,
      alpha: 1,
      duration: 1500,
      delay: 500,
      ease: 'Sine.easeOut',
    });
  }

  createZoneDots() {
    const dotY = GAME.HEIGHT - 50;
    const startX = GAME.WIDTH / 2 - (ALL_ACCENTS.length - 1) * 22;

    const zoneNames = [
      'Prompt Void', 'API Gateway', 'Router Nexus',
      'Tokenizer Grove', 'Embedding Nebula', 'Attention Nexus',
      'KV Cache Caverns', 'Decode Waterfall', 'Response Stream',
    ];

    ALL_ACCENTS.forEach((color, i) => {
      const dot = this.add.circle(startX + i * 44, dotY, 6, color, 0.7);
      dot.setDepth(30);
      dot.preFX.addGlow(color, 2, 0, false, 0.1, 12);

      dot.setInteractive();
      dot.on('pointerover', () => {
        this.tweens.add({ targets: dot, scaleX: 1.5, scaleY: 1.5, duration: 200 });
        if (!this.zoneLabel) {
          this.zoneLabel = this.add.text(startX + i * 44, dotY - 20, zoneNames[i], {
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            color: '#ffffff',
          }).setOrigin(0.5).setDepth(31);
        } else {
          this.zoneLabel.setText(zoneNames[i]);
          this.zoneLabel.setX(startX + i * 44);
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
    const btnY = GAME.HEIGHT / 2 + 120;

    this.btnBg = this.add.image(btnX, btnY, 'button_bg');
    this.btnBg.setDepth(30);
    const btnGlow = this.btnBg.preFX.addGlow(0x00ffff, 3, 0, false, 0.1, 16);

    this.btnText = this.add.text(btnX, btnY, 'BEGIN JOURNEY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#00ffff',
    });
    this.btnText.setOrigin(0.5);
    this.btnText.setDepth(31);

    this.btnBg.setInteractive({ useHandCursor: true });

    this.btnBg.on('pointerover', () => {
      this.tweens.add({ targets: btnGlow, outerStrength: 8, duration: 200 });
      this.tweens.add({ targets: this.btnBg, scaleX: 1.05, scaleY: 1.05, duration: 200 });
      this.tweens.add({ targets: this.btnText, scaleX: 1.05, scaleY: 1.05, duration: 200 });
    });

    this.btnBg.on('pointerout', () => {
      this.tweens.add({ targets: btnGlow, outerStrength: 3, duration: 200 });
      this.tweens.add({ targets: this.btnBg, scaleX: 1, scaleY: 1, duration: 200 });
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
      scale: 3,
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
    const cy = GAME.HEIGHT / 2 - 20;
    this.orb.x = cx + Math.cos(this.orbAngle) * 120;
    this.orb.y = cy + Math.sin(this.orbAngle * 2) * 40;
  }
}
