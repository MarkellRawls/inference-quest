import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { generateStarField, generateNebula } from '../effects/procedural.js';
import { createAmbientParticles, createPortalParticles, createCollectBurst } from '../effects/particles.js';
import { addGlow, addPostBloom } from '../utils/helpers.js';

const PALETTE = PALETTES.ROUTER_NEXUS;
const WORLD = ZONE_WORLDS.ROUTER_NEXUS;

const PATH_COLORS = PALETTE.paths;

const ROUTING_SECTIONS = [
  {
    splitX: 1800,
    mergeX: 4500,
    paths: [
      { y: 270, load: 0.3, label: 'GPU-A', status: 'clear', cached: false },
      { y: 540, load: 0.7, label: 'GPU-B', status: 'moderate', cached: true },
      { y: 810, load: 0.95, label: 'GPU-C', status: 'overloaded', cached: false },
    ],
  },
  {
    splitX: 5700,
    mergeX: 8400,
    paths: [
      { y: 300, load: 0.85, label: 'GPU-D', status: 'congested', cached: false },
      { y: 600, load: 0.2, label: 'GPU-E', status: 'clear', cached: true },
      { y: 870, load: 0.5, label: 'GPU-F', status: 'moderate', cached: false },
    ],
  },
  {
    splitX: 9300,
    mergeX: 11100,
    paths: [
      { y: 375, load: 0.15, label: 'GPU-G', status: 'clear', cached: true },
      { y: 750, load: 0.6, label: 'GPU-H', status: 'moderate', cached: false },
    ],
  },
];

const PREFIX_FRAGMENTS = [
  'system:', 'You are', 'a helpful', 'assistant', 'that',
];

export class Zone3_RouterNexus extends Phaser.Scene {
  constructor() {
    super(SCENES.ZONE3);
  }

  init(data) {
    this.playerData = data || {};
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this._exiting = false;
    this.currentSection = -1;
    this.speedMultiplier = 1;
    this.prefixFragments = [];
    this.score = 0;

    this.createBackgrounds();
    this.createAmbientEffects();
    this.createPathSystem();
    this.createPrefixCollectibles();
    this.createPlayer();
    this.createBoss();
    this.setupCamera();
    this.createHUD();

    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    addPostBloom(this.cameras.main, 0xffffff, 0.5, 0.5, 1, 1.3, 4);
  }

  createBackgrounds() {
    if (!this.textures.exists('z3_stars')) {
      generateStarField(this, 'z3_stars', 512, 512, 100, [0xffd700, 0xff8c00, 0xffffff]);
      generateNebula(this, 'z3_nebula', 512, 512, [0x2a1a3b, 0x3b1a2a, 0x1a2a3b, 0x4a2a1a]);
      generateStarField(this, 'z3_circuit', 512, 512, 200, [0x332200, 0x443300, 0x554400]);
    }

    this.add.rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.bg[0])
      .setOrigin(0, 0).setDepth(-200);

    this.parallax = new ParallaxBackground(this, [
      { key: 'z3_stars', speed: 0.02, alpha: 0.6 },
      { key: 'z3_circuit', speed: 0.06, alpha: 0.2 },
      { key: 'z3_nebula', speed: 0.1, alpha: 0.35 },
    ]);
  }

  createAmbientEffects() {
    // Denser gold/orange ambient particles
    this.ambientParticles = createAmbientParticles(this, PALETTE, {
      frequency: 100,
      alphaStart: 0.4,
      scaleStart: 0.25,
      lifespan: { min: 3000, max: 5000 },
    });

    // Extra layer of warm orange motes
    this.ambientParticles2 = createAmbientParticles(this, PALETTE, {
      frequency: 250,
      alphaStart: 0.2,
      scaleStart: 0.4,
      lifespan: { min: 4000, max: 7000 },
      speedX: { min: -5, max: 15 },
      speedY: { min: -12, max: -3 },
    });
  }

  createPathSystem() {
    this.pathGraphics = this.add.graphics().setDepth(10);
    this.pathZones = [];
    this.sectionStates = [];

    ROUTING_SECTIONS.forEach((section, si) => {
      const state = { decided: false, chosenPath: -1 };
      this.sectionStates.push(state);

      this.drawPathLines(section, si);
      this.createPathDecisionUI(section, si);
      this.createGPUNodes(section, si);
    });
  }

  drawPathLines(section, sectionIndex) {
    const g = this.pathGraphics;
    const { splitX, mergeX, paths } = section;
    const splitY = GAME.HEIGHT / 2;
    const mergeY = GAME.HEIGHT / 2;

    // Main trunk line
    g.lineStyle(8, 0x222222, 0.8);
    g.beginPath();
    g.moveTo(sectionIndex === 0 ? 0 : ROUTING_SECTIONS[sectionIndex - 1].mergeX, splitY);
    g.lineTo(splitX, splitY);
    g.strokePath();

    g.lineStyle(4, PALETTE.accent, 0.4);
    g.beginPath();
    g.moveTo(sectionIndex === 0 ? 0 : ROUTING_SECTIONS[sectionIndex - 1].mergeX, splitY);
    g.lineTo(splitX, splitY);
    g.strokePath();

    // Trunk line particle trail
    const trunkStartX = sectionIndex === 0 ? 0 : ROUTING_SECTIONS[sectionIndex - 1].mergeX;
    const trunkLen = splitX - trunkStartX;
    if (trunkLen > 0) {
      this.add.particles(trunkStartX, splitY, 'particle_spark', {
        x: { min: 0, max: trunkLen },
        y: { min: -3, max: 3 },
        speedX: { min: 30, max: 80 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.35, end: 0 },
        lifespan: { min: 600, max: 1200 },
        frequency: 200,
        blendMode: Phaser.BlendModes.ADD,
        tint: 0xffd700,
      }).setDepth(11);
    }

    paths.forEach(path => {
      let pathColor;
      if (path.cached) pathColor = PATH_COLORS.cached;
      else if (path.status === 'clear') pathColor = PATH_COLORS.clear;
      else pathColor = PATH_COLORS.congested;

      g.lineStyle(8, 0x222222, 0.8);
      g.beginPath();
      g.moveTo(splitX, splitY);
      g.lineTo(splitX + 300, path.y);
      g.lineTo(mergeX - 300, path.y);
      g.lineTo(mergeX, mergeY);
      g.strokePath();

      g.lineStyle(4, pathColor, 0.5);
      g.beginPath();
      g.moveTo(splitX, splitY);
      g.lineTo(splitX + 300, path.y);
      g.lineTo(mergeX - 300, path.y);
      g.lineTo(mergeX, mergeY);
      g.strokePath();

      // Denser path particle flow
      this.createPathParticles(splitX + 300, path.y, mergeX - splitX - 600, pathColor);
    });
  }

  createPathParticles(x, y, width, color) {
    // Primary flow particles -- denser than before
    this.add.particles(x, y, 'particle_spark', {
      x: { min: 0, max: width },
      y: { min: -4, max: 4 },
      speedX: { min: 30, max: 80 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 800, max: 1500 },
      frequency: 150,
      blendMode: Phaser.BlendModes.ADD,
      tint: color,
    }).setDepth(11);

    // Secondary soft glow trail layer
    this.add.particles(x, y, 'particle_soft', {
      x: { min: 0, max: width },
      y: { min: -6, max: 6 },
      speedX: { min: 15, max: 40 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.25, end: 0 },
      lifespan: { min: 1000, max: 2000 },
      frequency: 300,
      blendMode: Phaser.BlendModes.ADD,
      tint: color,
    }).setDepth(10);
  }

  createPathDecisionUI(section, sectionIndex) {
    const { splitX, paths } = section;

    const decisionLabel = this.add.text(splitX, 60, 'CHOOSE ROUTE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    });
    decisionLabel.setOrigin(0.5).setDepth(100);
    addGlow(decisionLabel, 0xffd700, 3, 0, false, 0.1, 12);

    paths.forEach((path, pi) => {
      const triggerX = splitX + 225;
      const triggerWidth = 150;
      const triggerHeight = 120;

      const zone = this.add.zone(triggerX, path.y, triggerWidth, triggerHeight);
      this.physics.add.existing(zone, true);
      zone._sectionIndex = sectionIndex;
      zone._pathIndex = pi;
      this.pathZones.push(zone);
    });
  }

  createGPUNodes(section, sectionIndex) {
    const { splitX, mergeX, paths } = section;
    const midX = (splitX + mergeX) / 2;

    paths.forEach((path, pi) => {
      const nodeX = midX;
      const nodeY = path.y;

      let nodeColor;
      if (path.load < 0.4) nodeColor = PATH_COLORS.clear;
      else if (path.load < 0.8) nodeColor = 0xffaa00;
      else nodeColor = PATH_COLORS.congested;

      // Outer decorative ring
      const outerRing = this.add.graphics().setDepth(19);
      outerRing.lineStyle(1, nodeColor, 0.3);
      outerRing.strokeCircle(nodeX, nodeY, 70);

      // Main node ring
      const nodeGfx = this.add.graphics().setDepth(20);
      nodeGfx.lineStyle(2, nodeColor, 0.8);
      nodeGfx.strokeCircle(nodeX, nodeY, 45);
      nodeGfx.lineStyle(1, nodeColor, 0.4);
      nodeGfx.strokeCircle(nodeX, nodeY, 60);

      // Pulsing ring sprite for animation
      const pulseRing = this.add.image(nodeX, nodeY, 'portal_ring');
      pulseRing.setScale(0.6);
      pulseRing.setTint(nodeColor);
      pulseRing.setAlpha(0.15);
      pulseRing.setBlendMode(Phaser.BlendModes.ADD);
      pulseRing.setDepth(18);

      this.tweens.add({
        targets: pulseRing,
        scale: 0.9,
        alpha: 0.05,
        duration: 1800 + pi * 200,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      // Slow rotation on the ring
      this.tweens.add({
        targets: pulseRing,
        angle: 360,
        duration: 8000 + pi * 1000,
        repeat: -1,
      });

      const nodeLabel = this.add.text(nodeX, nodeY - 70, path.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffd700',
        resolution: 2,
      });
      nodeLabel.setOrigin(0.5).setDepth(21);

      this.createLoadBar(nodeX - 37, nodeY + 22, 75, 12, path.load, nodeColor);

      if (path.cached) {
        const cachedLabel = this.add.text(nodeX, nodeY + 42, 'CACHED', {
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffd700',
          resolution: 2,
        });
        cachedLabel.setOrigin(0.5).setDepth(21);
        addGlow(cachedLabel, 0xffd700, 2, 0, false, 0.1, 8);

        this.add.particles(nodeX, nodeY, 'particle_spark', {
          speed: { min: 10, max: 30 },
          scale: { start: 0.2, end: 0 },
          alpha: { start: 0.5, end: 0 },
          lifespan: 1000,
          frequency: 300,
          blendMode: Phaser.BlendModes.ADD,
          tint: 0xffd700,
        }).setDepth(19);
      }

      const statusText = path.load >= 0.9 ? 'OVERLOADED' :
        path.load >= 0.7 ? 'BUSY' :
        path.load >= 0.4 ? 'MODERATE' : 'AVAILABLE';
      const statusColor = path.load >= 0.9 ? '#ff4444' :
        path.load >= 0.7 ? '#ffaa44' :
        path.load >= 0.4 ? '#ffff44' : '#44ff88';

      const statusLabel = this.add.text(nodeX, nodeY - 3, statusText, {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: statusColor,
        resolution: 2,
      });
      statusLabel.setOrigin(0.5).setDepth(21);
    });
  }

  createLoadBar(x, y, width, height, load, color) {
    const bg = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x222222);
    bg.setDepth(22);

    const fill = this.add.rectangle(x + 1, y + 1, (width - 2) * load, height - 2, color);
    fill.setOrigin(0, 0).setDepth(23);
  }

  createPrefixCollectibles() {
    this.prefixGroup = this.physics.add.group();

    const positions = [
      { x: 900, y: 450 },
      { x: 3750, y: 300 },
      { x: 5250, y: 750 },
      { x: 7800, y: 225 },
      { x: 10200, y: 600 },
    ];

    positions.forEach((pos, i) => {
      const fragment = this.physics.add.sprite(pos.x, pos.y, 'crystal');
      fragment.setScale(0.8);
      fragment.setTint(0xffd700);
      fragment.setBlendMode(Phaser.BlendModes.ADD);
      fragment.setDepth(75);
      addGlow(fragment, 0xffd700, 3, 0, false, 0.1, 12);
      fragment._word = PREFIX_FRAGMENTS[i];

      const label = this.add.text(pos.x, pos.y - 28, PREFIX_FRAGMENTS[i], {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffd700',
        resolution: 2,
      });
      label.setOrigin(0.5).setDepth(76);
      fragment._label = label;

      this.tweens.add({
        targets: [fragment, label],
        y: pos.y - 8,
        duration: 1200 + Math.random() * 400,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      this.prefixGroup.add(fragment);
    });
  }

  createPlayer() {
    this.player = new Player(this, 100, GAME.HEIGHT / 2);
    this.player.setZonePalette(PALETTE);

    this.physics.add.overlap(this.player, this.prefixGroup, this.collectPrefix, null, this);

    for (const zone of this.pathZones) {
      this.physics.add.overlap(this.player, zone, () => {
        this.choosePath(zone._sectionIndex, zone._pathIndex);
      }, null, this);
    }
  }

  collectPrefix(player, fragment) {
    createCollectBurst(this, fragment.x, fragment.y, 0xffd700);
    this.cameras.main.shake(60, 0.003);
    this.prefixFragments.push(fragment._word);

    if (fragment._label) fragment._label.destroy();
    fragment.destroy();

    this.updatePrefixHUD();
  }

  choosePath(sectionIndex, pathIndex) {
    const state = this.sectionStates[sectionIndex];
    if (state.decided) return;

    const section = ROUTING_SECTIONS[sectionIndex];
    const path = section.paths[pathIndex];

    state.decided = true;
    state.chosenPath = pathIndex;

    if (path.load >= 0.9) {
      this.handleOverloaded(sectionIndex, pathIndex);
      return;
    }

    if (path.cached) {
      this.speedMultiplier = 1.5;
      this.score += 100;
      this.showRoutingFeedback('CACHE HIT! Speed Boost!', '#ffd700', this.player.x, this.player.y - 50);
      this.player.trail.setParticleTint(0xffd700);
      this.applySpeedVisualFeedback(0xffd700, 0.08);
    } else if (path.status === 'clear') {
      this.speedMultiplier = 1;
      this.score += 50;
      this.showRoutingFeedback('Good Route!', '#44ff88', this.player.x, this.player.y - 50);
      this.applySpeedVisualFeedback(0x44ff88, 0.04);
    } else if (path.status === 'congested' || path.status === 'moderate') {
      this.speedMultiplier = 0.5;
      this.score += 10;
      this.showRoutingFeedback('Congested... Slow Route', '#ff4444', this.player.x, this.player.y - 50);
      this.player.trail.setParticleTint(0xff4444);
      this.applySpeedVisualFeedback(0xff4444, 0.06);
    }

    this.time.delayedCall(3000, () => {
      this.speedMultiplier = 1;
      this.player.trail.setParticleTint(PALETTE.player);
      this.clearSpeedVisualFeedback();
    });
  }

  /** Flash a screen tint overlay and spawn colored particles around the player for speed changes */
  applySpeedVisualFeedback(color, tintAlpha) {
    // Screen tint overlay
    if (this._speedTintRect) this._speedTintRect.destroy();
    this._speedTintRect = this.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, color, tintAlpha
    ).setScrollFactor(0).setDepth(195);

    // Flash it in
    this._speedTintRect.setAlpha(0);
    this.tweens.add({
      targets: this._speedTintRect,
      alpha: 1,
      duration: 200,
      ease: 'Sine.easeIn',
    });

    // Burst of colored particles around player
    const burst = this.add.particles(this.player.x, this.player.y, 'particle_spark', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 600,
      blendMode: Phaser.BlendModes.ADD,
      tint: color,
      quantity: 16,
      emitting: false,
    }).setDepth(110);
    burst.explode(16, this.player.x, this.player.y);
    this.time.delayedCall(700, () => burst.destroy());
  }

  clearSpeedVisualFeedback() {
    if (this._speedTintRect) {
      this.tweens.add({
        targets: this._speedTintRect,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          if (this._speedTintRect) {
            this._speedTintRect.destroy();
            this._speedTintRect = null;
          }
        },
      });
    }
  }

  handleOverloaded(sectionIndex, pathIndex) {
    // Big flashing 503 text with shake
    const bigText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 60, '503 SERVICE UNAVAILABLE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ff4444',
      resolution: 2,
    });
    bigText.setOrigin(0.5).setDepth(310).setScrollFactor(0);
    addGlow(bigText, 0xff0000, 8, 0, false, 0.1, 24);

    this.cameras.main.shake(350, 0.018);

    // Red screen flash
    const flashRect = this.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0xff0000, 0.15
    ).setScrollFactor(0).setDepth(305);

    this.tweens.add({
      targets: [bigText, flashRect],
      alpha: 0,
      duration: 1200,
      delay: 600,
      onComplete: () => {
        bigText.destroy();
        flashRect.destroy();
      },
    });

    this.player.body.setVelocity(-300, 0);

    this.time.delayedCall(500, () => {
      this.sectionStates[sectionIndex].decided = false;
    });
  }

  showRoutingFeedback(text, color, x, y) {
    const feedback = this.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: color,
      resolution: 2,
    });
    feedback.setOrigin(0.5).setDepth(300);
    addGlow(feedback,
      Phaser.Display.Color.HexStringToColor(color).color,
      3, 0, false, 0.1, 12
    );

    this.tweens.add({
      targets: feedback,
      y: y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => feedback.destroy(),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boss: The Overload Sentinel                                       */
  /* ------------------------------------------------------------------ */

  createBoss() {
    this.bossDefeated = false;

    // Arena sits between x=11200 and the world edge at 12000
    this.bossArenaX = 11200;
    this.bossArenaWidth = WORLD.width - this.bossArenaX; // 800
    // Expand arena to a full screen width so the camera has room
    this.bossArenaWidth = GAME.WIDTH;
    // Center the arena: boss arena starts such that the center is at 11600
    this.bossArenaCenterX = 11600;
    this.bossArenaCenterY = GAME.HEIGHT / 2;
    this.bossArenaX = this.bossArenaCenterX - GAME.WIDTH / 2; // 10640

    // Boss rings -- concentric portal_ring textures at different scales/angles
    this.bossRings = [];
    const ringConfigs = [
      { scale: 3.2, speed: -0.3, color: 0xffd700, alpha: 0.9, depth: 82 },
      { scale: 2.4, speed: 0.5, color: 0xff8c00, alpha: 0.7, depth: 81 },
      { scale: 1.6, speed: -0.8, color: 0xffa500, alpha: 0.6, depth: 80 },
      { scale: 1.0, speed: 1.2, color: 0xffcc44, alpha: 0.5, depth: 79 },
    ];

    ringConfigs.forEach(cfg => {
      const ring = this.add.image(this.bossArenaCenterX, this.bossArenaCenterY, 'portal_ring');
      ring.setScale(cfg.scale);
      ring.setTint(cfg.color);
      ring.setAlpha(cfg.alpha);
      ring.setBlendMode(Phaser.BlendModes.ADD);
      ring.setDepth(cfg.depth);
      ring._rotSpeed = cfg.speed;
      ring._baseScale = cfg.scale;
      ring._baseAlpha = cfg.alpha;
      ring._baseColor = cfg.color;
      this.bossRings.push(ring);
    });

    // Core glow at the center
    this.bossCore = this.add.image(this.bossArenaCenterX, this.bossArenaCenterY, 'particle_soft');
    this.bossCore.setScale(2.5);
    this.bossCore.setTint(0xffd700);
    this.bossCore.setAlpha(0.6);
    this.bossCore.setBlendMode(Phaser.BlendModes.ADD);
    this.bossCore.setDepth(83);
    addGlow(this.bossCore, 0xffd700, 6, 0, false, 0.1, 32);

    // Physics body for the boss (use the core)
    this.boss = this.physics.add.sprite(this.bossArenaCenterX, this.bossArenaCenterY, 'player_orb');
    this.boss.setScale(2.5);
    this.boss.setAlpha(0.001); // invisible; rings are the visual
    this.boss.setDepth(84);
    this.boss.body.setImmovable(true);
    this.boss.body.setAllowGravity(false);
    this.boss.body.setCircle(this.boss.width * 1.2);

    this.bossHP = 5;
    this.bossMaxHP = 5;
    this.bossVulnerable = false;
    this.bossPhaseTime = 0;
    this.bossActive = false;
    this.bossTrafficBlocks = [];

    // Pulsing core
    this.tweens.add({
      targets: this.bossCore,
      scale: 3.0,
      alpha: 0.4,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Boss arena trigger zone
    this.bossArenaZone = this.add.zone(this.bossArenaX, 0, 60, GAME.HEIGHT);
    this.bossArenaZone.setOrigin(0, 0);
    this.physics.add.existing(this.bossArenaZone, true);
    this.physics.add.overlap(this.player, this.bossArenaZone, () => this.activateBoss(), null, this);

    // Overlap for dashing into boss
    this.physics.add.overlap(this.player, this.boss, () => this.hitBoss(), null, this);

    // Create boss HUD (hidden until active)
    this.bossHUDContainer = this.add.container(GAME.WIDTH / 2, 40).setScrollFactor(0).setDepth(310).setAlpha(0);

    const bossTitle = this.add.text(0, 0, 'BOSS: Overload Sentinel', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    }).setOrigin(0.5);
    addGlow(bossTitle, 0xffd700, 3, 0, false, 0.1, 12);

    // HP bar background
    const hpBarBg = this.add.rectangle(0, 30, 300, 16, 0x333333);
    hpBarBg.setOrigin(0.5);

    // HP bar frame
    const hpBarFrame = this.add.rectangle(0, 30, 302, 18);
    hpBarFrame.setStrokeStyle(1, 0xffd700, 0.6);
    hpBarFrame.setFillStyle(0x000000, 0);
    hpBarFrame.setOrigin(0.5);

    // HP bar fill
    this.bossHPBar = this.add.rectangle(-150 + 1, 30, 298, 14, 0xffd700);
    this.bossHPBar.setOrigin(0, 0.5);

    // HP text
    this.bossHPText = this.add.text(0, 30, `${this.bossHP} / ${this.bossMaxHP}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5);

    this.bossHUDContainer.add([bossTitle, hpBarBg, hpBarFrame, this.bossHPBar, this.bossHPText]);
  }

  activateBoss() {
    if (this.bossActive || this.bossDefeated) return;
    this.bossActive = true;

    // Lock camera to the boss arena
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(this.bossArenaX, 0, GAME.WIDTH, GAME.HEIGHT);
    this.cameras.main.pan(this.bossArenaCenterX, this.bossArenaCenterY, 500, 'Power2');

    // Show boss HUD
    this.tweens.add({
      targets: this.bossHUDContainer,
      alpha: 1,
      duration: 400,
    });

    // Start traffic flood attack cycle -- every 3.5 seconds
    this.bossAttackTimer = this.time.addEvent({
      delay: 3500,
      callback: () => this.bossFireTrafficFlood(),
      loop: true,
    });

    // Start vulnerability window cycle -- every 5 seconds, boss overheats for 2.5s
    this.bossVulnTimer = this.time.addEvent({
      delay: 5000,
      callback: () => this.bossOverheat(),
      loop: true,
    });
  }

  /** Boss fires a wave of 6-8 traffic block sprites that sweep across the arena */
  bossFireTrafficFlood() {
    if (this.bossDefeated || this.bossVulnerable) return;

    const count = Phaser.Math.Between(6, 8);
    const spacing = GAME.HEIGHT / (count + 1);

    for (let i = 0; i < count; i++) {
      const blockY = spacing * (i + 1);
      // Stagger slightly
      this.time.delayedCall(i * 60, () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        const block = this.physics.add.sprite(
          this.bossArenaCenterX + GAME.WIDTH / 2 + 50,
          blockY + Phaser.Math.Between(-20, 20),
          'gate_block'
        );
        block.setScale(0.6);
        block.setTint(0xff2200);
        block.setBlendMode(Phaser.BlendModes.ADD);
        block.setDepth(76);
        block.body.setAllowGravity(false);
        block.body.setVelocityX(-Phaser.Math.Between(350, 550));
        block.body.setImmovable(true);
        addGlow(block, 0xff0000, 3, 0, false, 0.1, 8);

        this.bossTrafficBlocks.push(block);

        this.physics.add.overlap(this.player, block, () => {
          this.hitByTraffic(block);
        }, null, this);

        // Destroy when off-screen left
        this.time.delayedCall(5000, () => {
          if (block.active) {
            block.destroy();
            const idx = this.bossTrafficBlocks.indexOf(block);
            if (idx >= 0) this.bossTrafficBlocks.splice(idx, 1);
          }
        });
      });
    }
  }

  hitByTraffic(block) {
    if (this.player._invulnerable) return;

    const pushDir = this.player.x > block.x ? 1 : -1;
    this.player.body.setVelocity(pushDir * 300, Phaser.Math.Between(-150, 150));

    this.player._invulnerable = true;
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.player.setAlpha(1);
        this.player._invulnerable = false;
      },
    });

    this.cameras.main.shake(120, 0.007);

    // Destroy the block on hit
    block.destroy();
    const idx = this.bossTrafficBlocks.indexOf(block);
    if (idx >= 0) this.bossTrafficBlocks.splice(idx, 1);
  }

  /** Boss overheats: turns gold/green, becomes vulnerable for 2.5 seconds */
  bossOverheat() {
    if (this.bossDefeated) return;

    this.bossVulnerable = true;

    // Turn rings gold/green
    this.bossRings.forEach(ring => {
      ring.setTint(0x44ff88);
    });
    this.bossCore.setTint(0x88ffaa);

    // Flash text
    const hitText = this.add.text(GAME.WIDTH / 2, 100, 'OVERLOADED - STRIKE!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#44ff88',
      resolution: 2,
    }).setOrigin(0.5).setDepth(320).setScrollFactor(0);
    addGlow(hitText, 0x44ff88, 6, 0, false, 0.1, 20);

    // Pulsing text
    this.tweens.add({
      targets: hitText,
      scale: 1.1,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(2500, () => {
      this.bossVulnerable = false;
      if (!this.bossDefeated) {
        // Restore ring colors
        this.bossRings.forEach(ring => {
          ring.setTint(ring._baseColor);
        });
        this.bossCore.setTint(0xffd700);
      }
      hitText.destroy();
    });
  }

  hitBoss() {
    if (!this.bossVulnerable || this.bossDefeated) return;
    // Require dashing or fast movement
    if (!this.player.isDashing) return;

    this.bossVulnerable = false;
    this.bossHP--;

    // Golden particle burst
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 50, () => {
        createCollectBurst(this, this.boss.x + Phaser.Math.Between(-30, 30),
          this.boss.y + Phaser.Math.Between(-30, 30), 0xffd700);
        createCollectBurst(this, this.boss.x + Phaser.Math.Between(-30, 30),
          this.boss.y + Phaser.Math.Between(-30, 30), 0xff8c00);
      });
    }

    // Camera shake
    this.cameras.main.shake(250, 0.015);

    // Rings scatter briefly
    this.bossRings.forEach((ring, i) => {
      const scatterAngle = Phaser.Math.Between(0, 360);
      const scatterDist = 40 + i * 20;
      const scatterX = Math.cos(Phaser.Math.DegToRad(scatterAngle)) * scatterDist;
      const scatterY = Math.sin(Phaser.Math.DegToRad(scatterAngle)) * scatterDist;

      this.tweens.add({
        targets: ring,
        x: ring.x + scatterX,
        y: ring.y + scatterY,
        alpha: 0.2,
        duration: 300,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          ring.setTint(ring._baseColor);
        },
      });
    });

    // Flash rings white briefly
    this.bossRings.forEach(ring => ring.setTint(0xffffff));
    this.bossCore.setTint(0xffffff);
    this.time.delayedCall(200, () => {
      if (!this.bossDefeated) {
        this.bossRings.forEach(ring => ring.setTint(ring._baseColor));
        this.bossCore.setTint(0xffd700);
      }
    });

    // Update HP bar
    const hpFraction = this.bossHP / this.bossMaxHP;
    this.tweens.add({
      targets: this.bossHPBar,
      displayWidth: 298 * hpFraction,
      duration: 300,
      ease: 'Power2',
    });
    this.bossHPText.setText(`${this.bossHP} / ${this.bossMaxHP}`);

    // Change bar color as HP drops
    if (this.bossHP <= 2) {
      this.bossHPBar.setFillStyle(0xff4444);
    } else if (this.bossHP <= 3) {
      this.bossHPBar.setFillStyle(0xff8c00);
    }

    // Bounce player back
    const pushDir = this.player.x > this.boss.x ? 1 : -1;
    this.player.body.setVelocity(pushDir * 350, -200);

    if (this.bossHP <= 0) {
      this.defeatBoss();
    }
  }

  defeatBoss() {
    this.bossDefeated = true;

    // Stop timers
    if (this.bossAttackTimer) this.bossAttackTimer.remove();
    if (this.bossVulnTimer) this.bossVulnTimer.remove();

    // Destroy remaining traffic blocks
    this.bossTrafficBlocks.forEach(b => { if (b.active) b.destroy(); });
    this.bossTrafficBlocks = [];

    // Phase 1: Rings spin faster and faster
    this.bossRings.forEach((ring, i) => {
      ring.setTint(0xffffff);
      this.tweens.add({
        targets: ring,
        angle: ring.angle + 720 * (i % 2 === 0 ? 1 : -1),
        duration: 1200,
        ease: 'Quad.easeIn',
      });
    });

    // Core intensifies
    this.tweens.add({
      targets: this.bossCore,
      scale: 6,
      alpha: 1.0,
      duration: 1200,
      ease: 'Quad.easeIn',
    });

    this.cameras.main.shake(1200, 0.015);

    // Phase 2: After spin-up, rings explode outward
    this.time.delayedCall(1200, () => {
      // Each ring flies away in a different direction
      this.bossRings.forEach((ring, i) => {
        const angle = (i / this.bossRings.length) * Math.PI * 2;
        const targetX = ring.x + Math.cos(angle) * 1200;
        const targetY = ring.y + Math.sin(angle) * 800;

        this.tweens.add({
          targets: ring,
          x: targetX,
          y: targetY,
          alpha: 0,
          scale: ring._baseScale * 2,
          angle: ring.angle + 360,
          duration: 800,
          ease: 'Power3',
          onComplete: () => ring.destroy(),
        });
      });

      // Core explosion
      this.tweens.add({
        targets: this.bossCore,
        scale: 10,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => this.bossCore.destroy(),
      });

      // Boss physics body fade
      this.tweens.add({
        targets: this.boss,
        alpha: 0,
        duration: 400,
        onComplete: () => this.boss.destroy(),
      });

      // Massive particle bursts
      for (let i = 0; i < 8; i++) {
        this.time.delayedCall(i * 80, () => {
          const bx = this.bossArenaCenterX + Phaser.Math.Between(-80, 80);
          const by = this.bossArenaCenterY + Phaser.Math.Between(-80, 80);
          createCollectBurst(this, bx, by, 0xffd700);
          createCollectBurst(this, bx, by, 0xff8c00);
          createCollectBurst(this, bx, by, 0xffffff);
        });
      }

      this.cameras.main.shake(600, 0.025);

      // Victory text
      const victoryText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 80, 'ROUTING OPTIMIZED', {
        fontFamily: '"Courier New", monospace',
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#ffd700',
        resolution: 2,
      }).setOrigin(0.5).setDepth(320).setScrollFactor(0).setAlpha(0);
      addGlow(victoryText, 0xffd700, 8, 0, false, 0.1, 24);

      this.tweens.add({
        targets: victoryText,
        alpha: 1,
        duration: 800,
        delay: 400,
        ease: 'Power2',
      });

      // Fade out victory text after a while
      this.tweens.add({
        targets: victoryText,
        alpha: 0,
        duration: 1000,
        delay: 3000,
        onComplete: () => victoryText.destroy(),
      });
    });

    // Hide boss HUD
    this.tweens.add({
      targets: this.bossHUDContainer,
      alpha: 0,
      duration: 600,
      delay: 1000,
    });

    // Spawn portal after the spectacle
    this.time.delayedCall(2500, () => {
      // Restore camera to follow player and full world bounds
      this.cameras.main.setBounds(0, 0, WORLD.width, GAME.HEIGHT);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.spawnPortalAfterBoss();
    });
  }

  spawnPortalAfterBoss() {
    this.portalX = WORLD.width - 150;
    this.portalY = GAME.HEIGHT / 2;

    const approvedText = this.add.text(this.portalX, this.portalY - 130, 'ROUTING COMPLETE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    });
    approvedText.setOrigin(0.5).setDepth(90);
    addGlow(approvedText, 0xffd700, 4, 0, false, 0.1, 16);

    this.portal = this.add.image(this.portalX, this.portalY, 'portal_ring');
    this.portal.setBlendMode(Phaser.BlendModes.ADD);
    this.portal.setDepth(85);
    this.portal.setScale(1.8);
    this.portal.setTint(0xffd700);
    addGlow(this.portal, 0xffd700, 6, 0, false, 0.1, 24);

    // Fade in
    this.portal.setAlpha(0);
    approvedText.setAlpha(0);
    this.tweens.add({
      targets: [this.portal, approvedText],
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.portal,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });

    // Portal particles
    const nexusGfx = this.add.graphics().setDepth(80);
    nexusGfx.lineStyle(3, 0xffd700, 0.8);
    nexusGfx.strokeCircle(this.portalX, this.portalY, 75);
    nexusGfx.lineStyle(2, 0xffd700, 0.4);
    nexusGfx.strokeCircle(this.portalX, this.portalY, 95);
    nexusGfx.lineStyle(1, 0xffd700, 0.2);
    nexusGfx.strokeCircle(this.portalX, this.portalY, 120);

    this.portalParticles = this.add.particles(this.portalX, this.portalY, 'particle_soft', {
      speed: { min: 20, max: 50 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 1500,
      frequency: 80,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xffd700, 0xff8c00],
    }).setDepth(84);

    this.portalZone = this.add.zone(this.portalX, this.portalY, 70, 70);
    this.physics.add.existing(this.portalZone, true);
    this.physics.add.overlap(this.player, this.portalZone, () => this.exitZone(), null, this);
  }

  createHUD() {
    const hudTitle = this.add.text(20, 20, 'ZONE 3: ROUTER NEXUS', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ffd700',
      resolution: 2,
    }).setScrollFactor(0).setDepth(200);
    addGlow(hudTitle, 0xffd700, 2, 0, false, 0.1, 8);

    this.prefixHUD = this.add.text(20, 50, 'Prefix: []', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ffd700',
      resolution: 2,
    }).setScrollFactor(0).setDepth(200);

    this.scoreHUD = this.add.text(GAME.WIDTH - 20, 20, 'Score: 0', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ffd700',
      resolution: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);
  }

  updatePrefixHUD() {
    this.prefixHUD.setText('Prefix: ' + this.prefixFragments.join(' '));
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD.width, GAME.HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  exitZone() {
    if (this._exiting) return;
    this._exiting = true;

    this.player.body.setVelocity(0, 0);
    this.player.disableBody(true, false);

    this.add.particles(this.portalX, this.portalY, 'particle_soft', {
      speed: { min: -100, max: -10 },
      scale: { start: 0, end: 0.6 },
      alpha: { start: 0, end: 0.8 },
      lifespan: 600,
      blendMode: Phaser.BlendModes.ADD,
      tint: 0xffd700,
      emitting: false,
    }).setDepth(110).explode(40, this.portalX, this.portalY);

    this.time.delayedCall(300, () => {
      this.add.particles(this.portalX, this.portalY, 'particle_spark', {
        speed: { min: 100, max: 300 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 800,
        blendMode: Phaser.BlendModes.ADD,
        tint: [0xffd700, 0xff8c00, 0xffffff],
        emitting: false,
      }).setDepth(110).explode(60, this.portalX, this.portalY);
    });

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
        ...ZONE_CARDS.ROUTER_NEXUS,
        nextZone: null,
        callingScene: SCENES.ZONE3,
        playerData: this.playerData,
      });
    });
  }

  update(time, delta) {
    const effectiveSpeed = GAME.PLAYER_SPEED * this.speedMultiplier;
    this.player.update(time, delta);

    if (this.speedMultiplier !== 1 && !this.player.isDashing) {
      const vel = this.player.body.velocity;
      const len = vel.length();
      if (len > 0) {
        vel.normalize();
        vel.scale(effectiveSpeed);
      }
    }

    this.parallax.update(this.cameras.main);
    this.scoreHUD.setText('Score: ' + this.score);

    // Boss figure-8 movement + slow rotation
    if (this.bossActive && !this.bossDefeated && this.boss && this.boss.active) {
      this.bossPhaseTime += delta * 0.001;
      const figureEightX = Math.sin(this.bossPhaseTime * 0.5) * 250;
      const figureEightY = Math.sin(this.bossPhaseTime * 1.0) * 160;
      const bx = this.bossArenaCenterX + figureEightX;
      const by = this.bossArenaCenterY + figureEightY;

      this.boss.x = bx;
      this.boss.y = by;
      this.boss.body.updateFromGameObject();

      // Move all rings and core with the boss
      this.bossRings.forEach(ring => {
        ring.x = bx;
        ring.y = by;
        ring.angle += ring._rotSpeed;
      });

      if (this.bossCore && this.bossCore.active) {
        this.bossCore.x = bx;
        this.bossCore.y = by;
      }
    }
  }
}
