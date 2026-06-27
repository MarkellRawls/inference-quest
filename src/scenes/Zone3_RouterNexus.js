import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { createStalePacket, createLoadSpike } from '../objects/Enemy.js';
import { createPlatform, createSolidPlatform, createGround, createMovingPlatform, createCrumblingPlatform, createHazardSpikes, createConveyor } from '../objects/Platform.js';
import { generateStarField, generateNebula, generateDataConduit } from '../effects/procedural.js';
import { createAmbientParticles, createPortalParticles, createCollectBurst, createEnemyDeath, createGroundFog } from '../effects/particles.js';
import { addGlow, addPostBloom } from '../utils/helpers.js';

const PALETTE = PALETTES.ROUTER_NEXUS;
const WORLD = ZONE_WORLDS.ROUTER_NEXUS;

const GROUND_Y = 1700;

const GROUND_SEGMENTS = [
  { x: 0, w: 2000 },
  { x: 2400, w: 1800 },
  { x: 4600, w: 2000 },
  { x: 7000, w: 1800 },
  { x: 9200, w: 2000 },
  { x: 11600, w: 2800 },
];

const GPU_STATIONS = [
  { x: 3500, y: 1400, label: 'GPU STATION A' },
  { x: 6500, y: 1350, label: 'GPU STATION B' },
  { x: 9000, y: 1400, label: 'GPU STATION C' },
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
    this.physics.world.gravity.y = GAME.GRAVITY;
    this._exiting = false;
    this.score = 0;

    this.grounds = [];
    this.platforms = [];
    this.movingPlatforms = [];
    this.crumblingPlatforms = [];
    this.conveyors = [];
    this.hazards = [];
    this.enemies = [];
    this.crystals = [];
    this.conduitParticles = [];
    this.indicatorLights = [];

    this.createBackgrounds();
    this.createDataConduits();
    this.createAmbientEffects();
    this.createTerrain();
    this.createPlatforms();
    this.createGPUStations();
    this.createBranchingPaths();
    this.createEnemies();
    this.createPlayer();
    this.createBoss();
    this.setupCollisions();
    this.setupCamera();
    this.createHUD();

    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    addPostBloom(this.cameras.main, 0xffffff, 0.5, 0.5, 1, 1.3, 4);
  }

  /* ------------------------------------------------------------------ */
  /*  Backgrounds                                                       */
  /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ */
  /*  Data Conduits (background tubes with flowing particles)           */
  /* ------------------------------------------------------------------ */

  createDataConduits() {
    const conduitConfigs = [
      { x: 400, y: 600, w: 2400, h: 60, color: PALETTE.paths.clear },
      { x: 3200, y: 400, w: 2600, h: 50, color: PALETTE.paths.cached },
      { x: 6200, y: 500, w: 3000, h: 55, color: PALETTE.paths.congested },
      { x: 9800, y: 350, w: 2200, h: 60, color: PALETTE.paths.clear },
      { x: 1200, y: 900, w: 3400, h: 45, color: PALETTE.paths.cached },
      { x: 5500, y: 800, w: 2800, h: 50, color: PALETTE.paths.congested },
      { x: 8500, y: 700, w: 3200, h: 55, color: PALETTE.paths.clear },
    ];

    conduitConfigs.forEach(cfg => {
      const conduitKey = `z3_conduit_${cfg.x}_${cfg.y}`;
      if (!this.textures.exists(conduitKey)) {
        generateDataConduit(this, conduitKey, cfg.w, cfg.h, cfg.color);
      }

      const conduit = this.add.image(cfg.x + cfg.w / 2, cfg.y, conduitKey);
      conduit.setDepth(3).setAlpha(0.5);

      this.add.particles(cfg.x, cfg.y, 'particle_spark', {
        x: { min: 0, max: cfg.w },
        y: { min: -cfg.h / 4, max: cfg.h / 4 },
        speedX: { min: 40, max: 120 },
        speedY: { min: -5, max: 5 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.4, end: 0 },
        lifespan: { min: 800, max: 1600 },
        frequency: 120,
        blendMode: Phaser.BlendModes.ADD,
        tint: cfg.color,
      }).setDepth(4);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Ambient effects                                                   */
  /* ------------------------------------------------------------------ */

  createAmbientEffects() {
    this.ambientParticles = createAmbientParticles(this, PALETTE, {
      frequency: 100,
      alphaStart: 0.4,
      scaleStart: 0.25,
      lifespan: { min: 3000, max: 5000 },
    });

    this.ambientParticles2 = createAmbientParticles(this, PALETTE, {
      frequency: 250,
      alphaStart: 0.2,
      scaleStart: 0.4,
      lifespan: { min: 4000, max: 7000 },
      speedX: { min: -5, max: 15 },
      speedY: { min: -12, max: -3 },
    });

    this.groundFog = createGroundFog(this, WORLD.width, GROUND_Y, 0x665500);

    this.createIndicatorLights();
  }

  createIndicatorLights() {
    const lightPositions = [
      { x: 600, y: 1660 }, { x: 1400, y: 1660 },
      { x: 2700, y: 1660 }, { x: 3600, y: 1660 },
      { x: 5000, y: 1660 }, { x: 5800, y: 1660 },
      { x: 7400, y: 1660 }, { x: 8200, y: 1660 },
      { x: 9600, y: 1660 }, { x: 10400, y: 1660 },
      { x: 12000, y: 1660 }, { x: 12800, y: 1660 },
      { x: 13400, y: 1660 },
    ];

    lightPositions.forEach((pos, i) => {
      const colors = [0xffd700, 0x00ff88, 0xff4444];
      const color = colors[i % 3];
      const light = this.add.circle(pos.x, pos.y, 5, color, 0.8);
      light.setDepth(42).setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: light,
        alpha: { from: 0.2, to: 0.9 },
        duration: 600 + Math.random() * 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 1500,
      });

      this.indicatorLights.push(light);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Terrain (ground segments)                                         */
  /* ------------------------------------------------------------------ */

  createTerrain() {
    GROUND_SEGMENTS.forEach(seg => {
      const ground = createGround(this, seg.x, GROUND_Y, seg.w, PALETTE.accent, 60);
      this.grounds.push(ground);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Platforms (22 total)                                               */
  /* ------------------------------------------------------------------ */

  createPlatforms() {
    // Section 1: Intro area (x=0-2000)
    this.platforms.push(createPlatform(this, 400, 1450, 200, PALETTE.accent));
    this.platforms.push(createPlatform(this, 900, 1300, 180, PALETTE.accent));
    this.platforms.push(createPlatform(this, 1500, 1150, 200, PALETTE.accent));

    // Gap 1 bridge (x=2000-2400): moving platform
    this.movingPlatforms.push(createMovingPlatform(this, 2200, 1500, 180, {
      color: PALETTE.accent,
      moveType: 'horizontal',
      range: 150,
      speed: 0.8,
    }));

    // Section 2 (x=2400-4200)
    this.platforms.push(createPlatform(this, 2800, 1400, 200, PALETTE.accent));
    this.conveyors.push(createConveyor(this, 3200, 1500, 250, 120, PALETTE.paths.clear));

    // Crumbling tension
    this.crumblingPlatforms.push(createCrumblingPlatform(this, 3800, 1350, 160, 0xffaa44));

    // Section 3 (x=4600-6600)
    this.platforms.push(createPlatform(this, 4900, 1450, 220, PALETTE.accent));
    this.platforms.push(createPlatform(this, 5400, 1300, 180, PALETTE.accent));
    this.conveyors.push(createConveyor(this, 5900, 1450, 280, -100, PALETTE.paths.congested));

    // Gap 2 bridge (x=6600-7000): moving platform
    this.movingPlatforms.push(createMovingPlatform(this, 6800, 1400, 180, {
      color: PALETTE.accent,
      moveType: 'vertical',
      range: 150,
      speed: 0.7,
    }));

    // Section 4 (x=7000-8800)
    this.platforms.push(createPlatform(this, 7400, 1350, 200, PALETTE.accent));
    this.crumblingPlatforms.push(createCrumblingPlatform(this, 7900, 1250, 150, 0xffaa44));
    this.platforms.push(createPlatform(this, 8400, 1400, 220, PALETTE.accent));

    // Gap 3 bridge (x=8800-9200): moving platform
    this.movingPlatforms.push(createMovingPlatform(this, 9000, 1500, 200, {
      color: PALETTE.accent,
      moveType: 'horizontal',
      range: 180,
      speed: 1.0,
    }));

    // Section 5 (x=9200-11200)
    this.platforms.push(createPlatform(this, 9500, 1350, 200, PALETTE.accent));
    this.conveyors.push(createConveyor(this, 10000, 1450, 300, 150, PALETTE.paths.cached));
    this.crumblingPlatforms.push(createCrumblingPlatform(this, 10600, 1300, 150, 0xffaa44));
    this.platforms.push(createPlatform(this, 11100, 1400, 200, PALETTE.accent));

    // Boss arena platforms (x=11600-14400)
    this.platforms.push(createSolidPlatform(this, 12200, 1400, 300, PALETTE.accent, 24));
    this.platforms.push(createSolidPlatform(this, 13200, 1350, 250, PALETTE.accent, 24));
    this.platforms.push(createSolidPlatform(this, 13800, 1450, 200, PALETTE.accent, 24));

    // Hazard spikes at dangerous locations
    this.hazards.push(createHazardSpikes(this, 2100, GROUND_Y - 5, 200, 0xff2222));
    this.hazards.push(createHazardSpikes(this, 6650, GROUND_Y - 5, 200, 0xff2222));
  }

  /* ------------------------------------------------------------------ */
  /*  GPU Station Safe Zones                                            */
  /* ------------------------------------------------------------------ */

  createGPUStations() {
    GPU_STATIONS.forEach(station => {
      // Safe platform
      const plat = createSolidPlatform(this, station.x, station.y, 260, 0x00ff88, 24);
      this.platforms.push(plat);

      // Station label
      const label = this.add.text(station.x, station.y - 40, station.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#00ff88',
        resolution: 2,
      });
      label.setOrigin(0.5).setDepth(60);
      addGlow(label, 0x00ff88, 2, 0, false, 0.1, 10);

      // Healing crystal collectible near each station
      const crystal = this.physics.add.sprite(station.x, station.y - 80, 'crystal');
      crystal.setScale(0.8);
      crystal.setTint(0xffd700);
      crystal.setBlendMode(Phaser.BlendModes.ADD);
      crystal.setDepth(75);
      crystal.body.setAllowGravity(false);
      crystal.body.setImmovable(true);
      addGlow(crystal, 0xffd700, 3, 0, false, 0.1, 12);

      const crystalLabel = this.add.text(station.x, station.y - 110, 'HEAL +1', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffd700',
        resolution: 2,
      });
      crystalLabel.setOrigin(0.5).setDepth(76);
      crystal._label = crystalLabel;

      this.tweens.add({
        targets: [crystal, crystalLabel],
        y: '-=10',
        duration: 1200 + Math.random() * 400,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      this.crystals.push(crystal);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Branching Path Sections (2 areas)                                 */
  /* ------------------------------------------------------------------ */

  createBranchingPaths() {
    // Branch 1: around x=4000-4600 (gap between segment 2 and 3)
    this.createBranch1();

    // Branch 2: around x=8000-8800 (within segment 4 area)
    this.createBranch2();
  }

  createBranch1() {
    const branchX = 4100;

    // Sign
    const signText = this.add.text(branchX - 50, 1100, 'CHOOSE ROUTE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    });
    signText.setOrigin(0.5).setDepth(60);
    addGlow(signText, 0xffd700, 2, 0, false, 0.1, 10);

    // Upper route: harder platforming, healing reward
    const upperLabel = this.add.text(branchX + 100, 1000, 'UPPER: CACHE-HIT PATH', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#ffd700',
      resolution: 2,
    });
    upperLabel.setOrigin(0.5).setDepth(60);

    this.crumblingPlatforms.push(createCrumblingPlatform(this, branchX, 1100, 120, 0xffd700));
    this.platforms.push(createPlatform(this, branchX + 200, 1000, 120, 0xffd700));
    this.crumblingPlatforms.push(createCrumblingPlatform(this, branchX + 400, 950, 120, 0xffd700));

    // Bonus crystal on upper route
    const bonusCrystal = this.physics.add.sprite(branchX + 300, 930, 'crystal');
    bonusCrystal.setScale(0.7);
    bonusCrystal.setTint(0xffd700);
    bonusCrystal.setBlendMode(Phaser.BlendModes.ADD);
    bonusCrystal.setDepth(75);
    bonusCrystal.body.setAllowGravity(false);
    bonusCrystal.body.setImmovable(true);
    addGlow(bonusCrystal, 0xffd700, 3, 0, false, 0.1, 12);

    const bonusLabel = this.add.text(branchX + 300, 900, 'BONUS', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    });
    bonusLabel.setOrigin(0.5).setDepth(76);
    bonusCrystal._label = bonusLabel;

    this.tweens.add({
      targets: [bonusCrystal, bonusLabel],
      y: '-=8',
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.crystals.push(bonusCrystal);

    // Lower route: easier but more enemies
    const lowerLabel = this.add.text(branchX + 100, 1350, 'LOWER: CONGESTED PATH', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#ff4444',
      resolution: 2,
    });
    lowerLabel.setOrigin(0.5).setDepth(60);

    this.platforms.push(createPlatform(this, branchX, 1350, 200, 0xff4444));
    this.platforms.push(createPlatform(this, branchX + 300, 1400, 200, 0xff4444));

    // Enemies on lower path
    this.enemies.push(createLoadSpike(this, branchX + 100, 1310));
    this.enemies.push(createStalePacket(this, branchX + 350, 1360));
  }

  createBranch2() {
    const branchX = 8000;

    const signText = this.add.text(branchX - 50, 1100, 'CHOOSE ROUTE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    });
    signText.setOrigin(0.5).setDepth(60);
    addGlow(signText, 0xffd700, 2, 0, false, 0.1, 10);

    // Upper route: tight platforming
    const upperLabel = this.add.text(branchX + 100, 950, 'UPPER: OPTIMIZED PATH', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#00ff88',
      resolution: 2,
    });
    upperLabel.setOrigin(0.5).setDepth(60);

    this.movingPlatforms.push(createMovingPlatform(this, branchX, 1050, 120, {
      color: 0x00ff88,
      moveType: 'vertical',
      range: 80,
      speed: 0.9,
    }));
    this.crumblingPlatforms.push(createCrumblingPlatform(this, branchX + 250, 1000, 120, 0x00ff88));
    this.platforms.push(createPlatform(this, branchX + 500, 1050, 140, 0x00ff88));

    // Score bonus on upper route
    const bonusCrystal2 = this.physics.add.sprite(branchX + 350, 930, 'crystal');
    bonusCrystal2.setScale(0.7);
    bonusCrystal2.setTint(0x00ff88);
    bonusCrystal2.setBlendMode(Phaser.BlendModes.ADD);
    bonusCrystal2.setDepth(75);
    bonusCrystal2.body.setAllowGravity(false);
    bonusCrystal2.body.setImmovable(true);
    addGlow(bonusCrystal2, 0x00ff88, 3, 0, false, 0.1, 12);

    const bonusLabel2 = this.add.text(branchX + 350, 900, '+200 PTS', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#00ff88',
      resolution: 2,
    });
    bonusLabel2.setOrigin(0.5).setDepth(76);
    bonusCrystal2._label = bonusLabel2;
    bonusCrystal2._scoreBonus = 200;

    this.tweens.add({
      targets: [bonusCrystal2, bonusLabel2],
      y: '-=8',
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.crystals.push(bonusCrystal2);

    // Lower route: easier, more enemies
    const lowerLabel = this.add.text(branchX + 100, 1400, 'LOWER: HEAVY TRAFFIC', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#ff4444',
      resolution: 2,
    });
    lowerLabel.setOrigin(0.5).setDepth(60);

    this.conveyors.push(createConveyor(this, branchX, 1450, 280, -80, 0xff4444));
    this.platforms.push(createPlatform(this, branchX + 400, 1500, 200, 0xff4444));

    this.enemies.push(createStalePacket(this, branchX + 150, 1410));
    this.enemies.push(createLoadSpike(this, branchX + 450, 1460));
  }

  /* ------------------------------------------------------------------ */
  /*  Enemies (20 mobs)                                                 */
  /* ------------------------------------------------------------------ */

  createEnemies() {
    // Stale Packets on ground (8 total, plus 2 from branching = 10)
    const stalePositions = [
      { x: 600, y: GROUND_Y - 40 },
      { x: 1600, y: GROUND_Y - 40 },
      { x: 2900, y: GROUND_Y - 40 },
      { x: 5100, y: GROUND_Y - 40 },
      { x: 5700, y: GROUND_Y - 40 },
      { x: 7600, y: GROUND_Y - 40 },
      { x: 9600, y: GROUND_Y - 40 },
      { x: 10300, y: GROUND_Y - 40 },
    ];

    stalePositions.forEach(pos => {
      this.enemies.push(createStalePacket(this, pos.x, pos.y));
    });

    // Load Spikes on platforms (8 total, plus 2 from branching = 10)
    const spikePositions = [
      { x: 900, y: 1260 },
      { x: 2800, y: 1360 },
      { x: 4900, y: 1410 },
      { x: 5400, y: 1260 },
      { x: 7400, y: 1310 },
      { x: 9500, y: 1310 },
      { x: 10600, y: 1260 },
      { x: 11100, y: 1360 },
    ];

    spikePositions.forEach(pos => {
      this.enemies.push(createLoadSpike(this, pos.x, pos.y));
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Player                                                            */
  /* ------------------------------------------------------------------ */

  createPlayer() {
    this.player = new Player(this, 150, GROUND_Y - 60);
    this.player.setZonePalette(PALETTE);

    // Enemy projectiles group
    this._enemyProjectiles = this.physics.add.group();
  }

  /* ------------------------------------------------------------------ */
  /*  Collision Setup                                                   */
  /* ------------------------------------------------------------------ */

  setupCollisions() {
    // Player vs grounds
    this.grounds.forEach(g => {
      this.physics.add.collider(this.player, g);
    });

    // Player vs platforms (static, solid, crumbling, conveyors)
    this.platforms.forEach(p => {
      this.physics.add.collider(this.player, p);
    });

    this.movingPlatforms.forEach(mp => {
      this.physics.add.collider(this.player, mp);
    });

    this.crumblingPlatforms.forEach(cp => {
      this.physics.add.collider(this.player, cp, () => {
        cp.startCrumble();
      });
    });

    this.conveyors.forEach(cv => {
      this.physics.add.collider(this.player, cv);
    });

    // Enemies vs grounds
    this.enemies.forEach(e => {
      this.grounds.forEach(g => {
        this.physics.add.collider(e, g);
      });
      // Also collide with platforms
      this.platforms.forEach(p => {
        this.physics.add.collider(e, p);
      });
    });

    // Player vs enemies (damage)
    this.enemies.forEach(e => {
      this.physics.add.overlap(this.player, e, () => {
        if (!this.player._invulnerable && !this.player.isDashing) {
          const kbx = this.player.x < e.x ? -300 : 300;
          this.player.takeDamage(kbx, -250);
        }
      });
    });

    // Player vs hazard spikes
    this.hazards.forEach(h => {
      this.physics.add.overlap(this.player, h, () => {
        if (!this.player._invulnerable) {
          this.player.takeDamage(0, -400);
        }
      });
    });

    // Player vs crystals
    this.crystals.forEach(crystal => {
      this.physics.add.overlap(this.player, crystal, () => {
        this.collectCrystal(crystal);
      });
    });

    // Player vs enemy projectiles
    this.physics.add.overlap(this.player, this._enemyProjectiles, (player, proj) => {
      if (!this.player._invulnerable) {
        const kbx = this.player.x < proj.x ? -200 : 200;
        this.player.takeDamage(kbx, -200);
        proj.destroy();
      }
    });
  }

  collectCrystal(crystal) {
    if (!crystal.active) return;

    createCollectBurst(this, crystal.x, crystal.y, 0xffd700);
    this.cameras.main.shake(60, 0.003);

    if (crystal._scoreBonus) {
      this.score += crystal._scoreBonus;
      this.showFloatingText(crystal.x, crystal.y - 30, `+${crystal._scoreBonus}`, '#00ff88');
    } else {
      this.player.heal(1);
      this.showFloatingText(crystal.x, crystal.y - 30, '+1 HP', '#ffd700');
    }

    if (crystal._label) crystal._label.destroy();
    crystal.destroy();
  }

  showFloatingText(x, y, text, color) {
    const txt = this.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: color,
      resolution: 2,
    });
    txt.setOrigin(0.5).setDepth(300);
    addGlow(txt, Phaser.Display.Color.HexStringToColor(color).color, 3, 0, false, 0.1, 12);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 1200,
      onComplete: () => txt.destroy(),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boss: The Overload Sentinel                                       */
  /* ------------------------------------------------------------------ */

  createBoss() {
    this.bossDefeated = false;
    this.bossActive = false;
    this.bossPhase2 = false;
    this.bossVulnerable = false;
    this.bossPhaseTime = 0;
    this.bossTrafficBlocks = [];
    this.bossBarrierWalls = [];
    this.bossProjectiles = this.add.group();

    this.bossArenaCenterX = 12900;
    this.bossArenaCenterY = 1200;
    this.bossArenaX = 11600;
    this.bossArenaWidth = 2800;

    // Boss rings: 4 concentric spinning rings
    this.bossRings = [];
    const ringConfigs = [
      { scale: 3.5, speed: -0.3, color: 0xffd700, alpha: 0.9, depth: 82 },
      { scale: 2.6, speed: 0.5, color: 0xff8c00, alpha: 0.7, depth: 81 },
      { scale: 1.8, speed: -0.8, color: 0xffa500, alpha: 0.6, depth: 80 },
      { scale: 1.1, speed: 1.2, color: 0xffcc44, alpha: 0.5, depth: 79 },
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

    // Core glow
    this.bossCore = this.add.image(this.bossArenaCenterX, this.bossArenaCenterY, 'particle_soft');
    this.bossCore.setScale(2.5);
    this.bossCore.setTint(0xffd700);
    this.bossCore.setAlpha(0.6);
    this.bossCore.setBlendMode(Phaser.BlendModes.ADD);
    this.bossCore.setDepth(83);
    addGlow(this.bossCore, 0xffd700, 6, 0, false, 0.1, 32);

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

    // Physics body for the boss (invisible, use core position)
    this.boss = this.physics.add.sprite(this.bossArenaCenterX, this.bossArenaCenterY, 'player_orb');
    this.boss.setScale(2.5);
    this.boss.setAlpha(0.001);
    this.boss.setDepth(84);
    this.boss.body.setImmovable(true);
    this.boss.body.setAllowGravity(false);
    this.boss.body.setCircle(this.boss.width * 1.2);

    this.bossHP = 8;
    this.bossMaxHP = 8;

    // Boss arena trigger zone
    this.bossArenaZone = this.add.zone(this.bossArenaX + 50, 0, 80, WORLD.height);
    this.bossArenaZone.setOrigin(0, 0);
    this.physics.add.existing(this.bossArenaZone, true);
    this.physics.add.overlap(this.player, this.bossArenaZone, () => this.activateBoss(), null, this);

    // Overlap for dashing into boss
    this.physics.add.overlap(this.player, this.boss, () => this.hitBoss(), null, this);

    // Boss HUD (hidden)
    this.bossHUDContainer = this.add.container(GAME.WIDTH / 2, 40).setScrollFactor(0).setDepth(310).setAlpha(0);

    const bossTitle = this.add.text(0, 0, 'BOSS: Overload Sentinel', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    }).setOrigin(0.5);
    addGlow(bossTitle, 0xffd700, 3, 0, false, 0.1, 12);
    this._bossTitleText = bossTitle;

    const hpBarBg = this.add.rectangle(0, 30, 300, 16, 0x333333).setOrigin(0.5);
    const hpBarFrame = this.add.rectangle(0, 30, 302, 18);
    hpBarFrame.setStrokeStyle(1, 0xffd700, 0.6);
    hpBarFrame.setFillStyle(0x000000, 0);
    hpBarFrame.setOrigin(0.5);

    this.bossHPBar = this.add.rectangle(-150 + 1, 30, 298, 14, 0xffd700).setOrigin(0, 0.5);

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

    // Lock camera to boss arena
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(this.bossArenaX, 0, this.bossArenaWidth, WORLD.height);
    this.cameras.main.pan(this.bossArenaCenterX, this.bossArenaCenterY - 200, 800, 'Power2');

    // Show boss HUD
    this.tweens.add({
      targets: this.bossHUDContainer,
      alpha: 1,
      duration: 400,
    });

    // Attack cycle: traffic floods
    this.bossAttackTimer = this.time.addEvent({
      delay: 3500,
      callback: () => this.bossAttackCycle(),
      loop: true,
    });

    // Vulnerability window cycle
    this.bossVulnTimer = this.time.addEvent({
      delay: 5500,
      callback: () => this.bossOverheat(),
      loop: true,
    });
  }

  bossAttackCycle() {
    if (this.bossDefeated || this.bossVulnerable) return;

    // Rotate through attack patterns
    if (!this._bossAttackIndex) this._bossAttackIndex = 0;

    if (this.bossPhase2) {
      // Phase 2: two attacks per cycle
      this.bossFireTrafficFlood();
      this.time.delayedCall(800, () => {
        if (!this.bossDefeated && !this.bossVulnerable) {
          this.bossFireOmniBurst();
        }
      });
    } else {
      const attacks = [
        () => this.bossFireTrafficFlood(),
        () => this.bossRingShockwave(),
        () => this.bossBarrierAttack(),
      ];
      attacks[this._bossAttackIndex % attacks.length]();
      this._bossAttackIndex++;
    }
  }

  /** Attack 1: Traffic flood waves -- gate_block sprites sweep right to left */
  bossFireTrafficFlood() {
    if (this.bossDefeated || this.bossVulnerable) return;

    const count = Phaser.Math.Between(6, 8);
    const spacing = 800 / (count + 1);

    for (let i = 0; i < count; i++) {
      const blockY = GROUND_Y - 200 - spacing * i;
      this.time.delayedCall(i * 70, () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        const block = this.physics.add.sprite(
          this.bossArenaX + this.bossArenaWidth + 50,
          blockY + Phaser.Math.Between(-30, 30),
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
        });

        this.time.delayedCall(6000, () => {
          if (block.active) {
            block.destroy();
            const idx = this.bossTrafficBlocks.indexOf(block);
            if (idx >= 0) this.bossTrafficBlocks.splice(idx, 1);
          }
        });
      });
    }
  }

  /** Attack 2: Ring expansion shockwave -- rings pulse outward as damaging circles */
  bossRingShockwave() {
    if (this.bossDefeated || this.bossVulnerable) return;

    // Visual warning: rings flash
    this.bossRings.forEach(ring => {
      this.tweens.add({
        targets: ring,
        alpha: 1,
        duration: 150,
        yoyo: true,
        repeat: 2,
      });
    });

    this.time.delayedCall(600, () => {
      if (this.bossDefeated || this.bossVulnerable) return;

      // Spawn expanding damage rings
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 400, () => {
          if (this.bossDefeated || this.bossVulnerable) return;

          const bx = this.boss.x;
          const by = this.boss.y;
          const ringGfx = this.add.circle(bx, by, 30, 0x000000, 0);
          ringGfx.setStrokeStyle(6, 0xff8c00, 0.9);
          ringGfx.setDepth(77);
          ringGfx.setBlendMode(Phaser.BlendModes.ADD);

          this.physics.add.existing(ringGfx, false);
          ringGfx.body.setAllowGravity(false);
          ringGfx.body.setCircle(30);

          const shockOverlap = this.physics.add.overlap(this.player, ringGfx, () => {
            if (!this.player._invulnerable) {
              const pushDir = this.player.x > bx ? 1 : -1;
              this.player.takeDamage(pushDir * 350, -300);
              shockOverlap.destroy();
            }
          });

          this.tweens.add({
            targets: ringGfx,
            scaleX: 8,
            scaleY: 8,
            alpha: 0,
            duration: 1200,
            ease: 'Power2',
            onUpdate: () => {
              if (ringGfx.body) {
                ringGfx.body.setCircle(30 * ringGfx.scaleX);
                ringGfx.body.updateFromGameObject();
              }
            },
            onComplete: () => {
              shockOverlap.destroy();
              ringGfx.destroy();
            },
          });
        });
      }
    });
  }

  /** Attack 3: Barrier walls -- temporary solid platforms appear blocking movement */
  bossBarrierAttack() {
    if (this.bossDefeated || this.bossVulnerable) return;

    const barrierPositions = [
      { x: this.bossArenaX + 600, y: 1300, w: 30, h: 400 },
      { x: this.bossArenaX + 1400, y: 1100, w: 30, h: 500 },
      { x: this.bossArenaX + 2100, y: 1250, w: 30, h: 450 },
    ];

    barrierPositions.forEach((bp, i) => {
      this.time.delayedCall(i * 200, () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        // Warning flash
        const warning = this.add.rectangle(bp.x, bp.y, bp.w + 20, bp.h + 20, 0xff4444, 0.2);
        warning.setDepth(74);
        this.tweens.add({
          targets: warning,
          alpha: { from: 0.1, to: 0.4 },
          duration: 150,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            warning.destroy();
            if (this.bossDefeated || this.bossVulnerable) return;

            const wall = this.add.rectangle(bp.x, bp.y, bp.w, bp.h, 0xff4444, 0.7);
            wall.setDepth(75);
            addGlow(wall, 0xff4444, 3, 0, false, 0.1, 10);
            this.physics.add.existing(wall, true);
            this.physics.add.collider(this.player, wall);
            this.bossBarrierWalls.push(wall);

            // Remove after 2.5 seconds
            this.time.delayedCall(2500, () => {
              if (wall.active) {
                this.tweens.add({
                  targets: wall,
                  alpha: 0,
                  duration: 300,
                  onComplete: () => {
                    wall.destroy();
                    const idx = this.bossBarrierWalls.indexOf(wall);
                    if (idx >= 0) this.bossBarrierWalls.splice(idx, 1);
                  },
                });
              }
            });
          },
        });
      });
    });
  }

  /** Phase 2 attack: Omnidirectional projectile burst */
  bossFireOmniBurst() {
    if (this.bossDefeated || this.bossVulnerable) return;

    const count = 12;
    const bx = this.boss.x;
    const by = this.boss.y;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 250;

      const proj = this.add.circle(bx, by, 8, 0xff8c00);
      proj.setBlendMode(Phaser.BlendModes.ADD);
      proj.setDepth(76);
      addGlow(proj, 0xff8c00, 2, 0, false, 0.1, 6);

      this.physics.add.existing(proj, false);
      proj.body.setAllowGravity(false);
      proj.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      proj.body.setCircle(8);

      this.physics.add.overlap(this.player, proj, () => {
        if (!this.player._invulnerable) {
          const pushDir = this.player.x > bx ? 1 : -1;
          this.player.takeDamage(pushDir * 250, -200);
          proj.destroy();
        }
      });

      this.bossProjectiles.add(proj);

      this.time.delayedCall(4000, () => {
        if (proj.active) proj.destroy();
      });
    }
  }

  hitByTraffic(block) {
    if (this.player._invulnerable) return;

    const pushDir = this.player.x > block.x ? 1 : -1;
    this.player.takeDamage(pushDir * 300, -200);

    block.destroy();
    const idx = this.bossTrafficBlocks.indexOf(block);
    if (idx >= 0) this.bossTrafficBlocks.splice(idx, 1);
  }

  /** Boss overheats: turns green, vulnerable for 2.5 seconds */
  bossOverheat() {
    if (this.bossDefeated) return;

    this.bossVulnerable = true;

    // Turn rings green
    this.bossRings.forEach(ring => ring.setTint(0x44ff88));
    this.bossCore.setTint(0x88ffaa);

    // Core pulses faster during vulnerability
    this.tweens.add({
      targets: this.bossCore,
      scale: { from: 2.5, to: 3.5 },
      alpha: { from: 0.6, to: 0.9 },
      duration: 300,
      yoyo: true,
      repeat: 3,
    });

    const hitText = this.add.text(GAME.WIDTH / 2, 100, 'OVERHEATED - DASH STRIKE!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#44ff88',
      resolution: 2,
    }).setOrigin(0.5).setDepth(320).setScrollFactor(0);
    addGlow(hitText, 0x44ff88, 6, 0, false, 0.1, 20);

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
        this.bossRings.forEach(ring => ring.setTint(ring._baseColor));
        this.bossCore.setTint(0xffd700);
      }
      hitText.destroy();
    });
  }

  hitBoss() {
    if (!this.bossVulnerable || this.bossDefeated) return;
    if (!this.player.isDashing) return;

    this.bossVulnerable = false;
    this.bossHP--;
    this.score += 100;

    // Golden particle burst
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 50, () => {
        createCollectBurst(this, this.boss.x + Phaser.Math.Between(-30, 30),
          this.boss.y + Phaser.Math.Between(-30, 30), 0xffd700);
        createCollectBurst(this, this.boss.x + Phaser.Math.Between(-30, 30),
          this.boss.y + Phaser.Math.Between(-30, 30), 0xff8c00);
      });
    }

    this.cameras.main.shake(250, 0.015);

    // Rings scatter
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

    // Flash white
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

    if (this.bossHP <= 2) {
      this.bossHPBar.setFillStyle(0xff4444);
    } else if (this.bossHP <= 4) {
      this.bossHPBar.setFillStyle(0xff8c00);
    }

    // Bounce player back
    const pushDir = this.player.x > this.boss.x ? 1 : -1;
    this.player.body.setVelocity(pushDir * 350, -300);

    // Phase 2 at 4 HP
    if (this.bossHP <= 4 && !this.bossPhase2) {
      this.enterBossPhase2();
    }

    if (this.bossHP <= 0) {
      this.defeatBoss();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Boss Phase 2                                                      */
  /* ------------------------------------------------------------------ */

  enterBossPhase2() {
    this.bossPhase2 = true;

    // Spin faster
    this.bossRings.forEach(ring => {
      ring._rotSpeed *= 2.5;
    });

    // Screen flash
    const flash = this.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH, GAME.HEIGHT, 0xff4400, 0.4
    ).setScrollFactor(0).setDepth(200);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      onComplete: () => flash.destroy(),
    });

    // Phase 2 announcement
    const phaseText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 200, 'PHASE 2: OVERCLOCKED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ff4444',
      resolution: 2,
    }).setOrigin(0.5).setDepth(310).setScrollFactor(0);
    addGlow(phaseText, 0xff4444, 6, 0, false, 0.1, 20);

    this.tweens.add({
      targets: phaseText,
      alpha: 0,
      y: phaseText.y - 40,
      duration: 2000,
      delay: 1000,
      onComplete: () => phaseText.destroy(),
    });

    // Update boss title
    if (this._bossTitleText) {
      this._bossTitleText.setColor('#ff4444');
    }

    // Speed up attack timer
    if (this.bossAttackTimer) this.bossAttackTimer.remove();
    this.bossAttackTimer = this.time.addEvent({
      delay: 2500,
      callback: () => this.bossAttackCycle(),
      loop: true,
    });

    // Shift arena platforms
    this.platforms.forEach(p => {
      if (p.x > this.bossArenaX && p.x < this.bossArenaX + this.bossArenaWidth) {
        this.tweens.add({
          targets: p,
          y: p.y + Phaser.Math.Between(-80, 80),
          duration: 800,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (p.body) p.body.updateFromGameObject();
          },
        });
      }
    });

    this.cameras.main.shake(400, 0.018);
  }

  /* ------------------------------------------------------------------ */
  /*  Boss Defeat                                                       */
  /* ------------------------------------------------------------------ */

  defeatBoss() {
    this.bossDefeated = true;

    // Stop timers
    if (this.bossAttackTimer) this.bossAttackTimer.remove();
    if (this.bossVulnTimer) this.bossVulnTimer.remove();

    // Destroy remaining traffic blocks
    this.bossTrafficBlocks.forEach(b => { if (b.active) b.destroy(); });
    this.bossTrafficBlocks = [];
    this.bossBarrierWalls.forEach(b => { if (b.active) b.destroy(); });
    this.bossBarrierWalls = [];
    this.bossProjectiles.getChildren().forEach(p => { if (p.active) p.destroy(); });

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

    // Phase 2: rings explode outward
    this.time.delayedCall(1200, () => {
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

      // Boss physics body
      this.tweens.add({
        targets: this.boss,
        alpha: 0,
        duration: 400,
        onComplete: () => this.boss.destroy(),
      });

      // Massive particle bursts
      for (let i = 0; i < 10; i++) {
        this.time.delayedCall(i * 80, () => {
          const bx = this.bossArenaCenterX + Phaser.Math.Between(-100, 100);
          const by = this.bossArenaCenterY + Phaser.Math.Between(-100, 100);
          createCollectBurst(this, bx, by, 0xffd700);
          createCollectBurst(this, bx, by, 0xff8c00);
          createCollectBurst(this, bx, by, 0xffffff);
        });
      }

      this.cameras.main.shake(600, 0.025);

      // White screen flash
      const whiteFlash = this.add.rectangle(
        GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH + 200, GAME.HEIGHT + 200,
        0xffffff, 0.8
      ).setScrollFactor(0).setDepth(500);
      this.tweens.add({
        targets: whiteFlash,
        alpha: 0,
        duration: 800,
        delay: 200,
        ease: 'Power2',
        onComplete: () => whiteFlash.destroy(),
      });

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
      this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.spawnPortalAfterBoss();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Portal / Victory                                                  */
  /* ------------------------------------------------------------------ */

  spawnPortalAfterBoss() {
    this.portalX = 14250;
    this.portalY = GROUND_Y - 80;

    // "INFERENCE COMPLETE" message since this is the final zone
    const completeText = this.add.text(this.portalX, this.portalY - 160, 'INFERENCE COMPLETE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffd700',
      resolution: 2,
    });
    completeText.setOrigin(0.5).setDepth(90);
    addGlow(completeText, 0xffd700, 6, 0, false, 0.1, 20);

    this.tweens.add({
      targets: completeText,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 0.98, to: 1.02 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.portal = this.add.image(this.portalX, this.portalY, 'portal_ring');
    this.portal.setBlendMode(Phaser.BlendModes.ADD);
    this.portal.setDepth(85);
    this.portal.setScale(1.8);
    this.portal.setTint(0xffd700);
    addGlow(this.portal, 0xffd700, 6, 0, false, 0.1, 24);

    // Fade in
    this.portal.setAlpha(0);
    completeText.setAlpha(0);
    this.tweens.add({
      targets: [this.portal, completeText],
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

    // Portal ring graphics
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

    this.portalZone = this.add.zone(this.portalX, this.portalY, 80, 80);
    this.physics.add.existing(this.portalZone, true);
    this.physics.add.overlap(this.player, this.portalZone, () => this.exitZone(), null, this);
  }

  /* ------------------------------------------------------------------ */
  /*  HUD                                                               */
  /* ------------------------------------------------------------------ */

  createHUD() {
    // Zone title
    const hudTitle = this.add.text(20, 20, 'ZONE 3: ROUTER NEXUS', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ffd700',
      resolution: 2,
    }).setScrollFactor(0).setDepth(200);
    addGlow(hudTitle, 0xffd700, 2, 0, false, 0.1, 8);

    // HP display
    this.hpContainer = this.add.container(20, 50).setScrollFactor(0).setDepth(200);
    this.hpPips = [];

    for (let i = 0; i < this.player.maxHp; i++) {
      const pip = this.add.image(i * 28, 0, 'hp_pip');
      pip.setScale(1.0);
      pip.setDepth(200);
      this.hpContainer.add(pip);
      this.hpPips.push(pip);
    }

    // Score display
    this.scoreHUD = this.add.text(GAME.WIDTH - 20, 20, 'Score: 0', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ffd700',
      resolution: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);
  }

  updateHPDisplay() {
    this.hpPips.forEach((pip, i) => {
      if (i < this.player.hp) {
        pip.setAlpha(1);
        pip.setTint(0xff4444);
      } else {
        pip.setAlpha(0.2);
        pip.setTint(0x333333);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Camera                                                            */
  /* ------------------------------------------------------------------ */

  setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  /* ------------------------------------------------------------------ */
  /*  Exit Zone                                                         */
  /* ------------------------------------------------------------------ */

  exitZone() {
    if (this._exiting) return;
    this._exiting = true;

    this.player.body.setVelocity(0, 0);
    this.player.disableBody(true, false);

    // Portal suction effect
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

  /* ------------------------------------------------------------------ */
  /*  Update Loop                                                       */
  /* ------------------------------------------------------------------ */

  update(time, delta) {
    if (this._exiting) return;

    this.player.update(time, delta);
    this.parallax.update(this.cameras.main);

    // Update HUD
    this.updateHPDisplay();
    this.scoreHUD.setText('Score: ' + this.score);

    // Update moving platforms
    this.movingPlatforms.forEach(mp => {
      mp.updatePlatform(time, delta);
    });

    // Conveyor effect on player
    this.conveyors.forEach(cv => {
      if (this.player.body.touching.down) {
        const bounds = cv.getBounds();
        const playerBounds = this.player.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(bounds, playerBounds)) {
          this.player.body.velocity.x += cv._conveyorSpeed * (delta / 1000) * 5;
        }
      }
    });

    // Update enemies
    this.enemies.forEach(e => {
      if (e.active && !e._dead) {
        e.update(time, delta, this.player);
      }
    });

    // Player attack hitbox vs enemies
    if (this.player.attackHitbox) {
      this.enemies.forEach(e => {
        if (e.active && !e._dead && !e._hurt) {
          const hb = this.player.attackHitbox;
          const dx = Math.abs(hb.x - e.x);
          const dy = Math.abs(hb.y - e.y);
          if (dx < GAME.ATTACK_RANGE && dy < 60) {
            const dir = this.player.facing;
            e.takeDamage(GAME.ATTACK_DAMAGE, dir);
            this.score += e._scoreValue || 10;
            createCollectBurst(this, e.x, e.y, 0xffd700);
          }
        }
      });
    }

    // Boss movement: slow figure-8 float above the arena
    if (this.bossActive && !this.bossDefeated && this.boss && this.boss.active) {
      this.bossPhaseTime += delta * 0.001;
      const speedMult = this.bossPhase2 ? 1.5 : 1.0;
      const figureEightX = Math.sin(this.bossPhaseTime * 0.4 * speedMult) * 400;
      const figureEightY = Math.sin(this.bossPhaseTime * 0.8 * speedMult) * 200;
      const bx = this.bossArenaCenterX + figureEightX;
      const by = this.bossArenaCenterY + figureEightY;

      this.boss.x = bx;
      this.boss.y = by;
      this.boss.body.updateFromGameObject();

      // Move rings and core with boss
      this.bossRings.forEach(ring => {
        if (ring.active) {
          ring.x = bx;
          ring.y = by;
          ring.angle += ring._rotSpeed;
        }
      });

      if (this.bossCore && this.bossCore.active) {
        this.bossCore.x = bx;
        this.bossCore.y = by;
      }
    }
  }
}
