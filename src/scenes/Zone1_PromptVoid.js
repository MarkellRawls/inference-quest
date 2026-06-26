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

const BOSS_PROJECTILE_WORDS = ['ERR0R', 'NaN', 'undef', 'null', 'segfault', '404'];

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
    this.createVignette();
    this.createPlayer();
    this.createFloatingText();
    this.createTutorialPhases();
    this.createCollectibles();
    this.createBoss();
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
      frequency: 150,
      alphaStart: 0.3,
      scaleStart: 0.2,
      lifespan: { min: 4000, max: 7000 },
    });
  }

  createVignette() {
    this.vignette = this.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH + 40, GAME.HEIGHT + 40, 0x000000
    );
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(250);
    this.vignette.setAlpha(0.15);
    this.vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.tweens.add({
      targets: this.vignette,
      alpha: 0.25,
      duration: 3000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
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
      resolution: 2,
    };

    for (let i = 0; i < 40; i++) {
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
        resolution: 2,
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
        resolution: 2,
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
      resolution: 2,
    });
    this.collectCounter.setOrigin(1, 0);
    this.collectCounter.setScrollFactor(0);
    this.collectCounter.setDepth(200);
    addGlow(this.collectCounter, PALETTE.accent, 2, 0, false, 0.1, 12);
    this.collectCounter.setAlpha(0);
  }

  // ── Boss: The Syntax Corruptor ──────────────────────────────────

  createBoss() {
    this.bossDefeated = false;
    this.bossActivated = false;
    this.bossHP = 4;
    this.bossMaxHP = 4;
    this.bossVulnerable = false;

    // Boss sprite - large pulsing orb
    const bossX = 4050;
    const bossY = GAME.HEIGHT / 2;
    this.boss = this.physics.add.sprite(bossX, bossY, 'player_orb');
    this.boss.setScale(2.5);
    this.boss.setTint(0xff4466);
    this.boss.setBlendMode(Phaser.BlendModes.ADD);
    this.boss.setDepth(85);
    this.boss.setVisible(false);
    this.boss.body.setImmovable(true);
    this.boss.body.setCircle(20, 12, 12);
    this.boss._baseY = bossY;
    this.boss._sineOffset = 0;
    addGlow(this.boss, 0xff4466, 6, 0, false, 0.1, 32);

    // Pulsing tween on the boss
    this.bossPulseTween = this.tweens.add({
      targets: this.boss,
      scaleX: 2.8,
      scaleY: 2.8,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    // Boss projectiles group
    this.bossProjectiles = this.add.group();

    // Boss HUD - fixed to camera
    this.bossHUD = this.add.container(GAME.WIDTH / 2, 50);
    this.bossHUD.setScrollFactor(0);
    this.bossHUD.setDepth(210);
    this.bossHUD.setAlpha(0);

    const bossTitle = this.add.text(0, 0, 'BOSS: Syntax Corruptor', {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      color: '#ff4466',
      fontStyle: 'bold',
      resolution: 2,
    });
    bossTitle.setOrigin(0.5, 0);
    addGlow(bossTitle, 0xff4466, 3, 0, false, 0.1, 12);

    // HP bar background
    const hpBarBg = this.add.rectangle(0, 36, 260, 16, 0x330011);
    hpBarBg.setOrigin(0.5, 0);
    hpBarBg.setStrokeStyle(1, 0xff4466, 0.6);

    // HP bar fill
    this.bossHPBar = this.add.rectangle(-126, 39, 252, 10, 0xff4466);
    this.bossHPBar.setOrigin(0, 0);
    addGlow(this.bossHPBar, 0xff4466, 2, 0, false, 0.1, 8);

    this.bossHUD.add([bossTitle, hpBarBg, this.bossHPBar]);

    // Vulnerability text (follows boss)
    this.bossVulnText = this.add.text(bossX, bossY - 80, 'VULNERABLE!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '26px',
      color: '#44ff88',
      fontStyle: 'bold',
      resolution: 2,
    });
    this.bossVulnText.setOrigin(0.5);
    this.bossVulnText.setDepth(90);
    this.bossVulnText.setAlpha(0);
    addGlow(this.bossVulnText, 0x44ff88, 4, 0, false, 0.1, 16);

    // Overlap: player dash into boss while vulnerable
    this.physics.add.overlap(this.player, this.boss, this.onPlayerHitBoss, null, this);

    // Overlap: projectile hits player
    // (handled in update since projectiles are text objects, not physics bodies)
  }

  activateBoss() {
    if (this.bossActivated || this.bossDefeated) return;
    this.bossActivated = true;

    this.boss.setVisible(true);
    this.boss.setAlpha(0);
    this.tweens.add({
      targets: this.boss,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    });

    this.bossPulseTween.resume();

    // Fade in HUD
    this.tweens.add({
      targets: this.bossHUD,
      alpha: 1,
      duration: 600,
    });

    this.showTutorialText('Dash into it when VULNERABLE!', 3700, GAME.HEIGHT / 2 - 200);

    // Start attack cycle - fire burst every 4 seconds
    this.bossFireTimer = this.time.addEvent({
      delay: 4000,
      callback: () => this.bossFireProjectiles(),
      loop: true,
    });

    // Start vulnerability cycle - every 6 seconds, 2 second window
    this.bossVulnTimer = this.time.addEvent({
      delay: 6000,
      callback: () => this.startBossVulnerability(),
      loop: true,
    });
  }

  bossFireProjectiles() {
    if (this.bossDefeated || !this.bossActivated) return;

    const count = 4 + Math.floor(Math.random() * 2); // 4-5 projectiles
    const bx = this.boss.x;
    const by = this.boss.y;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const word = BOSS_PROJECTILE_WORDS[Math.floor(Math.random() * BOSS_PROJECTILE_WORDS.length)];

      const proj = this.add.text(bx, by, word, {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        color: '#ff4466',
        fontStyle: 'bold',
        resolution: 2,
      });
      proj.setOrigin(0.5);
      proj.setDepth(86);
      proj.setBlendMode(Phaser.BlendModes.ADD);
      addGlow(proj, 0xff4466, 2, 0, false, 0.1, 8);

      const speed = 180 + Math.random() * 80;
      proj._vx = Math.cos(angle) * speed;
      proj._vy = Math.sin(angle) * speed;
      proj._lifetime = 0;

      this.bossProjectiles.add(proj);
    }

    // Camera flash for the burst
    this.cameras.main.shake(60, 0.002);
  }

  startBossVulnerability() {
    if (this.bossDefeated || !this.bossActivated) return;

    this.bossVulnerable = true;
    this.boss.setTint(0x44ff88);

    this.bossVulnText.setAlpha(1);
    this.tweens.add({
      targets: this.bossVulnText,
      alpha: { from: 1, to: 0.4 },
      duration: 300,
      yoyo: true,
      repeat: 3,
    });

    // End vulnerability after 2 seconds
    this.time.delayedCall(2000, () => {
      if (this.bossDefeated) return;
      this.bossVulnerable = false;
      this.boss.setTint(0xff4466);
      this.bossVulnText.setAlpha(0);
    });
  }

  onPlayerHitBoss(player, boss) {
    if (this.bossDefeated) return;

    if (this.bossVulnerable && player.isDashing) {
      this.damageBoss();
    } else if (!player._invulnerable && !player.isDashing) {
      // Boss body contact damages player (knockback away from boss)
      const kbx = (player.x < boss.x) ? -350 : 350;
      const kby = (player.y < boss.y) ? -200 : 200;
      player.takeDamage(kbx, kby);
      this.flashPlayerDamage();
    }
  }

  damageBoss() {
    this.bossHP--;
    this.bossVulnerable = false;
    this.bossVulnText.setAlpha(0);
    this.boss.setTint(0xff4466);

    // Particle burst at boss position
    createCollectBurst(this, this.boss.x, this.boss.y, 0xff4466);
    createCollectBurst(this, this.boss.x, this.boss.y, 0xffffff);

    // Camera shake
    this.cameras.main.shake(250, 0.012);

    // Flash boss white briefly
    this.boss.setTint(0xffffff);
    this.time.delayedCall(150, () => {
      if (!this.bossDefeated) this.boss.setTint(0xff4466);
    });

    // Update HP bar
    const hpRatio = Math.max(0, this.bossHP / this.bossMaxHP);
    this.tweens.add({
      targets: this.bossHPBar,
      scaleX: hpRatio,
      duration: 300,
      ease: 'Power2',
    });

    if (this.bossHP <= 0) {
      this.defeatBoss();
    }
  }

  defeatBoss() {
    this.bossDefeated = true;
    this.bossVulnerable = false;

    // Stop timers
    if (this.bossFireTimer) this.bossFireTimer.destroy();
    if (this.bossVulnTimer) this.bossVulnTimer.destroy();

    // Destroy all projectiles
    this.bossProjectiles.getChildren().forEach(p => p.destroy());
    this.bossProjectiles.clear();

    // Massive multi-burst explosion - 5 staggered bursts
    const bx = this.boss.x;
    const by = this.boss.y;
    const burstColors = [0xff4466, 0xff88aa, 0xffffff, 0x7b68ee, 0x00ffff];
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 200, () => {
        const ox = (Math.random() - 0.5) * 60;
        const oy = (Math.random() - 0.5) * 60;
        createCollectBurst(this, bx + ox, by + oy, burstColors[i]);
      });
    }

    // Camera shake - big
    this.cameras.main.shake(500, 0.015);

    // Boss scales up and fades out
    this.tweens.add({
      targets: this.boss,
      scale: 5,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        this.boss.setVisible(false);
        this.boss.body.enable = false;
      },
    });

    // Fade out HUD
    this.tweens.add({
      targets: this.bossHUD,
      alpha: 0,
      duration: 800,
      delay: 400,
    });

    // Hide vulnerability text
    this.bossVulnText.setAlpha(0);

    // Show victory text
    this.showTutorialText('Syntax Corruptor defeated!', bx - 200, by - 180);

    // Now spawn the portal
    this.time.delayedCall(1500, () => {
      this.activatePortal();
    });
  }

  flashPlayerDamage() {
    // Flash screen red briefly
    const flashRect = this.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0xff0000
    );
    flashRect.setScrollFactor(0);
    flashRect.setDepth(240);
    flashRect.setAlpha(0.3);

    this.tweens.add({
      targets: flashRect,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flashRect.destroy(),
    });
  }

  // ── Portal ──────────────────────────────────────────────────────

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
      resolution: 2,
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

    // Collecting all tokens no longer opens portal directly;
    // the boss must be defeated first
    if (this.collectedCount >= this.totalCollectibles && this.bossDefeated) {
      this.activatePortal();
    }
  }

  activatePortal() {
    if (this.portalActive) return;
    this.portalActive = true;
    this.portalParticles.setVisible(true);

    this.tweens.add({
      targets: this.portal,
      scale: 2.0,
      duration: 800,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: this.portal,
      angle: 360,
      duration: 4000,
      repeat: -1,
    });

    // Extra portal particles for a more dramatic effect
    this.portalExtraParticles = this.add.particles(this.portalX, this.portalY, 'particle_spark', {
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 60),
        quantity: 24,
      },
      speed: { min: 15, max: 40 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 1000,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0x00ffff, 0x4488ff, 0xffffff],
    }).setDepth(89);

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

    // Tutorial trigger: dash hint
    if (!this.dashTriggerShown && px > 1050) {
      this.dashTriggerShown = true;
      this.showTutorialText('Press SPACE to dash through barriers', 1125, GAME.HEIGHT / 2 - 150);
    }

    // Dash wall break
    if (!this.dashWallBroken && this.player.isDashing) {
      const wallX = 1500;
      if (px > wallX - 60 && px < wallX + 60) {
        this.dashWallBroken = true;
        this.dashWall.getChildren().forEach(piece => {
          // More dramatic scatter: bigger range, rotation
          this.tweens.add({
            targets: piece,
            x: piece.x + (Math.random() - 0.5) * 500,
            y: piece.y + (Math.random() - 0.5) * 500,
            angle: (Math.random() - 0.5) * 360,
            alpha: 0,
            duration: 700,
            ease: 'Power3',
            onComplete: () => piece.destroy(),
          });
        });
        // Extra particle bursts along the wall
        for (let burstY = 150; burstY < GAME.HEIGHT - 150; burstY += 200) {
          createCollectBurst(this, wallX, burstY, PALETTE.accent);
        }
        this.dashWallParticles.destroy();
        this.cameras.main.shake(300, 0.012);
      }
    }

    // Show collect counter
    if (px > 1950 && this.collectCounter.alpha === 0) {
      this.tweens.add({
        targets: this.collectCounter,
        alpha: 1,
        duration: 500,
      });
      this.showTutorialText('Collect all prompt tokens', 2025, GAME.HEIGHT / 2 - 150);
    }

    // Boss activation trigger
    if (!this.bossActivated && !this.bossDefeated && px > 3600) {
      this.activateBoss();
    }

    // Boss update: sine wave movement and projectile management
    if (this.bossActivated && !this.bossDefeated) {
      this.updateBoss(time, delta);
    }
  }

  updateBoss(time, delta) {
    // Sine wave movement
    this.boss._sineOffset += delta * 0.002;
    this.boss.y = this.boss._baseY + Math.sin(this.boss._sineOffset) * 180;

    // Keep vulnerability text tracking boss
    this.bossVulnText.x = this.boss.x;
    this.bossVulnText.y = this.boss.y - 80;

    // Update projectiles
    const deadProjectiles = [];
    this.bossProjectiles.getChildren().forEach(proj => {
      proj.x += proj._vx * delta * 0.001;
      proj.y += proj._vy * delta * 0.001;
      proj._lifetime += delta;

      // Remove if out of bounds or too old
      if (proj._lifetime > 5000 ||
          proj.x < 0 || proj.x > WORLD.width ||
          proj.y < -50 || proj.y > GAME.HEIGHT + 50) {
        deadProjectiles.push(proj);
        return;
      }

      // Check collision with player (manual distance check)
      if (!this.player._invulnerable && !this.player.isDashing) {
        const dx = proj.x - this.player.x;
        const dy = proj.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          // Hit player
          const kbx = dx < 0 ? -300 : 300;
          const kby = dy < 0 ? -150 : 150;
          this.player.takeDamage(kbx, kby);
          this.flashPlayerDamage();
          deadProjectiles.push(proj);
        }
      }
    });

    // Clean up dead projectiles
    deadProjectiles.forEach(p => {
      this.bossProjectiles.remove(p);
      p.destroy();
    });
  }
}
