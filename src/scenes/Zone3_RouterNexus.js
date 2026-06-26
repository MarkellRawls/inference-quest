import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { generateStarField, generateNebula } from '../effects/procedural.js';
import { createAmbientParticles, createPortalParticles, createCollectBurst } from '../effects/particles.js';

const PALETTE = PALETTES.ROUTER_NEXUS;
const WORLD = ZONE_WORLDS.ROUTER_NEXUS;

const PATH_COLORS = PALETTE.paths;

const ROUTING_SECTIONS = [
  {
    splitX: 1200,
    mergeX: 3000,
    paths: [
      { y: 180, load: 0.3, label: 'GPU-A', status: 'clear', cached: false },
      { y: 360, load: 0.7, label: 'GPU-B', status: 'moderate', cached: true },
      { y: 540, load: 0.95, label: 'GPU-C', status: 'overloaded', cached: false },
    ],
  },
  {
    splitX: 3800,
    mergeX: 5600,
    paths: [
      { y: 200, load: 0.85, label: 'GPU-D', status: 'congested', cached: false },
      { y: 400, load: 0.2, label: 'GPU-E', status: 'clear', cached: true },
      { y: 580, load: 0.5, label: 'GPU-F', status: 'moderate', cached: false },
    ],
  },
  {
    splitX: 6200,
    mergeX: 7400,
    paths: [
      { y: 250, load: 0.15, label: 'GPU-G', status: 'clear', cached: true },
      { y: 500, load: 0.6, label: 'GPU-H', status: 'moderate', cached: false },
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
    this.createPortal();
    this.setupCamera();
    this.createHUD();

    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    this.cameras.main.postFX.addBloom(0xffffff, 0.5, 0.5, 1, 1.3, 4);
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
    this.ambientParticles = createAmbientParticles(this, PALETTE, {
      frequency: 200,
      alphaStart: 0.3,
      scaleStart: 0.2,
      lifespan: { min: 3000, max: 5000 },
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

    g.lineStyle(6, 0x222222, 0.8);
    g.beginPath();
    g.moveTo(sectionIndex === 0 ? 0 : ROUTING_SECTIONS[sectionIndex - 1].mergeX, splitY);
    g.lineTo(splitX, splitY);
    g.strokePath();

    g.lineStyle(3, PALETTE.accent, 0.4);
    g.beginPath();
    g.moveTo(sectionIndex === 0 ? 0 : ROUTING_SECTIONS[sectionIndex - 1].mergeX, splitY);
    g.lineTo(splitX, splitY);
    g.strokePath();

    paths.forEach(path => {
      let pathColor;
      if (path.cached) pathColor = PATH_COLORS.cached;
      else if (path.status === 'clear') pathColor = PATH_COLORS.clear;
      else pathColor = PATH_COLORS.congested;

      g.lineStyle(6, 0x222222, 0.8);
      g.beginPath();
      g.moveTo(splitX, splitY);
      g.lineTo(splitX + 200, path.y);
      g.lineTo(mergeX - 200, path.y);
      g.lineTo(mergeX, mergeY);
      g.strokePath();

      g.lineStyle(3, pathColor, 0.5);
      g.beginPath();
      g.moveTo(splitX, splitY);
      g.lineTo(splitX + 200, path.y);
      g.lineTo(mergeX - 200, path.y);
      g.lineTo(mergeX, mergeY);
      g.strokePath();

      this.createPathParticles(splitX + 200, path.y, mergeX - splitX - 400, pathColor);
    });
  }

  createPathParticles(x, y, width, color) {
    this.add.particles(x, y, 'particle_spark', {
      x: { min: 0, max: width },
      y: { min: -4, max: 4 },
      speedX: { min: 20, max: 60 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: { min: 800, max: 1500 },
      frequency: 300,
      blendMode: Phaser.BlendModes.ADD,
      tint: color,
    }).setDepth(11);
  }

  createPathDecisionUI(section, sectionIndex) {
    const { splitX, paths } = section;

    const decisionLabel = this.add.text(splitX, 40, 'CHOOSE ROUTE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffd700',
    });
    decisionLabel.setOrigin(0.5).setDepth(100);
    decisionLabel.preFX.addGlow(0xffd700, 3, 0, false, 0.1, 12);

    paths.forEach((path, pi) => {
      const triggerX = splitX + 150;
      const triggerWidth = 100;
      const triggerHeight = 80;

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

      const nodeGfx = this.add.graphics().setDepth(20);

      let nodeColor;
      if (path.load < 0.4) nodeColor = PATH_COLORS.clear;
      else if (path.load < 0.8) nodeColor = 0xffaa00;
      else nodeColor = PATH_COLORS.congested;

      nodeGfx.lineStyle(2, nodeColor, 0.8);
      nodeGfx.strokeCircle(nodeX, nodeY, 30);
      nodeGfx.lineStyle(1, nodeColor, 0.4);
      nodeGfx.strokeCircle(nodeX, nodeY, 40);

      const nodeLabel = this.add.text(nodeX, nodeY - 50, path.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd700',
      });
      nodeLabel.setOrigin(0.5).setDepth(21);

      this.createLoadBar(nodeX - 25, nodeY + 15, 50, 8, path.load, nodeColor);

      if (path.cached) {
        const cachedLabel = this.add.text(nodeX, nodeY + 30, 'CACHED', {
          fontFamily: '"Courier New", monospace',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#ffd700',
        });
        cachedLabel.setOrigin(0.5).setDepth(21);
        cachedLabel.preFX.addGlow(0xffd700, 2, 0, false, 0.1, 8);

        this.add.particles(nodeX, nodeY, 'particle_spark', {
          speed: { min: 10, max: 30 },
          scale: { start: 0.2, end: 0 },
          alpha: { start: 0.5, end: 0 },
          lifespan: 1000,
          frequency: 400,
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
        fontSize: '9px',
        color: statusColor,
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
      { x: 600, y: 300 },
      { x: 2500, y: 200 },
      { x: 3500, y: 500 },
      { x: 5200, y: 150 },
      { x: 6800, y: 400 },
    ];

    positions.forEach((pos, i) => {
      const fragment = this.physics.add.sprite(pos.x, pos.y, 'crystal');
      fragment.setScale(0.8);
      fragment.setTint(0xffd700);
      fragment.setBlendMode(Phaser.BlendModes.ADD);
      fragment.setDepth(75);
      fragment.preFX.addGlow(0xffd700, 3, 0, false, 0.1, 12);
      fragment._word = PREFIX_FRAGMENTS[i];

      const label = this.add.text(pos.x, pos.y - 20, PREFIX_FRAGMENTS[i], {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffd700',
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
    } else if (path.status === 'clear') {
      this.speedMultiplier = 1;
      this.score += 50;
      this.showRoutingFeedback('Good Route!', '#44ff88', this.player.x, this.player.y - 50);
    } else if (path.status === 'congested' || path.status === 'moderate') {
      this.speedMultiplier = 0.5;
      this.score += 10;
      this.showRoutingFeedback('Congested... Slow Route', '#ff4444', this.player.x, this.player.y - 50);
    }

    this.time.delayedCall(3000, () => {
      this.speedMultiplier = 1;
      this.player.trail.setParticleTint(PALETTE.player);
    });
  }

  handleOverloaded(sectionIndex, pathIndex) {
    this.showRoutingFeedback('503 SERVICE UNAVAILABLE', '#ff4444', this.player.x, this.player.y - 50);
    this.cameras.main.shake(200, 0.01);

    this.player.body.setVelocity(-300, 0);

    this.time.delayedCall(500, () => {
      this.sectionStates[sectionIndex].decided = false;
    });
  }

  showRoutingFeedback(text, color, x, y) {
    const feedback = this.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: color,
    });
    feedback.setOrigin(0.5).setDepth(300);
    feedback.preFX.addGlow(
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

  createPortal() {
    this.portalX = WORLD.width - 150;
    this.portalY = GAME.HEIGHT / 2;

    const nexusGfx = this.add.graphics().setDepth(80);
    nexusGfx.lineStyle(3, 0xffd700, 0.8);
    nexusGfx.strokeCircle(this.portalX, this.portalY, 50);
    nexusGfx.lineStyle(2, 0xffd700, 0.4);
    nexusGfx.strokeCircle(this.portalX, this.portalY, 65);
    nexusGfx.lineStyle(1, 0xffd700, 0.2);
    nexusGfx.strokeCircle(this.portalX, this.portalY, 80);

    this.portal = this.add.image(this.portalX, this.portalY, 'portal_ring');
    this.portal.setBlendMode(Phaser.BlendModes.ADD);
    this.portal.setDepth(85);
    this.portal.setScale(1.8);
    this.portal.setTint(0xffd700);
    this.portal.preFX.addGlow(0xffd700, 6, 0, false, 0.1, 24);

    this.tweens.add({
      targets: this.portal,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });

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
    this.add.text(20, 20, 'ZONE 3: ROUTER NEXUS', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#ffd700',
    }).setScrollFactor(0).setDepth(200).preFX.addGlow(0xffd700, 2, 0, false, 0.1, 8);

    this.prefixHUD = this.add.text(20, 45, 'Prefix: []', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#ffd700',
    }).setScrollFactor(0).setDepth(200);

    this.scoreHUD = this.add.text(GAME.WIDTH - 20, 20, 'Score: 0', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#ffd700',
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
  }
}
