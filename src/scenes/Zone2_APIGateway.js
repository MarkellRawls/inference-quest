import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { createRogueRequest, createSpamBot, createFirewallDrone } from '../objects/Enemy.js';
import { createPlatform, createSolidPlatform, createGround, createMovingPlatform, createCrumblingPlatform, createHazardSpikes, createConveyor } from '../objects/Platform.js';
import { generateStarField, generateNebula, generateCitySkyline } from '../effects/procedural.js';
import { createNeonStreaks, createAmbientParticles, createPortalParticles, createCollectBurst, createEnemyDeath, createGroundFog, createRainParticles } from '../effects/particles.js';
import { addGlow, addPostBloom } from '../utils/helpers.js';

const PALETTE = PALETTES.API_GATEWAY;
const WORLD = ZONE_WORLDS.API_GATEWAY;

const GROUND_Y = 1700;
const GROUND_HEIGHT = 60;

const NEON_SIGNS = ['API v2.0', 'HTTPS', 'gRPC', 'REST', 'llm-d', 'JSON', 'WebSocket'];

/* ====================================================================== */
/*  Zone 2 -- The API Gateway                                             */
/*  A cyberpunk city side-scroller with gravity, firewalls, rate limiters, */
/*  rogue bot traffic, and the Rate Limit Guardian boss.                   */
/* ====================================================================== */

export class Zone2_APIGateway extends Phaser.Scene {
  constructor() {
    super(SCENES.ZONE2);
  }

  init(data) {
    this.playerData = data || {};
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.physics.world.gravity.y = GAME.GRAVITY;
    this._exiting = false;

    this.createBackgrounds();
    this.createAmbientEffects();
    this.createNeonSigns();
    this.createTerrain();
    this.createPlatforms();
    this.createLaserGates();
    this.createPlayer();
    this.createEnemies();
    this.createBoss();
    this.setupCamera();
    this.createHUD();

    this.setupCollisions();

    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    addPostBloom(this.cameras.main, 0xffffff, 0.5, 0.5, 1, 1.3, 4);
  }

  /* ------------------------------------------------------------------ */
  /*  Backgrounds & parallax                                            */
  /* ------------------------------------------------------------------ */

  createBackgrounds() {
    if (!this.textures.exists('z2_stars')) {
      generateStarField(this, 'z2_stars', 512, 512, 40, [0xff00ff, 0x00ffff, 0x8844ff]);
      generateNebula(this, 'z2_nebula', 512, 512, [0x440044, 0x220044, 0x000044]);
      generateCitySkyline(this, 'z2_city_far', 1024, 512, 30, PALETTE);
      generateCitySkyline(this, 'z2_city_near', 1024, 512, 20, PALETTE);
    }

    this.add.rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.bg[0])
      .setOrigin(0, 0).setDepth(-200);

    this.parallax = new ParallaxBackground(this, [
      { key: 'z2_stars', speed: 0.02, alpha: 0.5 },
      { key: 'z2_nebula', speed: 0.05, alpha: 0.3 },
      { key: 'z2_city_far', speed: 0.08, alpha: 0.5 },
      { key: 'z2_city_near', speed: 0.18, alpha: 0.7 },
    ]);
  }

  /* ------------------------------------------------------------------ */
  /*  Ambient effects -- rain, fog, neon streaks                        */
  /* ------------------------------------------------------------------ */

  createAmbientEffects() {
    this.neonStreaks = createNeonStreaks(this, PALETTE);
    if (this.neonStreaks && this.neonStreaks.setAlpha) {
      this.neonStreaks.setAlpha(0.9);
    }

    this.rain = createRainParticles(this);
    this.groundFog = createGroundFog(this, WORLD.width, GROUND_Y, 0x4400aa);
  }

  /* ------------------------------------------------------------------ */
  /*  Pulsing neon signs in the background                              */
  /* ------------------------------------------------------------------ */

  createNeonSigns() {
    const signSpacing = WORLD.width / (NEON_SIGNS.length + 1);
    NEON_SIGNS.forEach((label, i) => {
      const x = signSpacing * (i + 1) + Phaser.Math.Between(-100, 100);
      const y = Phaser.Math.Between(400, 900);
      const color = Phaser.Utils.Array.GetRandom(PALETTE.neon);
      const hexColor = '#' + color.toString(16).padStart(6, '0');

      const sign = this.add.text(x, y, label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '28px',
        fontStyle: 'bold',
        color: hexColor,
        resolution: 2,
      });
      sign.setOrigin(0.5).setDepth(5).setAlpha(0.35);
      addGlow(sign, color, 4, 0, false, 0.1, 16);

      this.tweens.add({
        targets: sign,
        alpha: { from: 0.2, to: 0.55 },
        duration: 1500 + Math.random() * 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Terrain -- ground segments as building rooftops                    */
  /* ------------------------------------------------------------------ */

  createTerrain() {
    this.grounds = [];

    const segments = [
      { x: 0, w: 1800 },
      { x: 2200, w: 1600 },
      { x: 4200, w: 1400 },
      { x: 6000, w: 1800 },
      { x: 8200, w: 1600 },
      { x: 10200, w: 1800 },
    ];

    segments.forEach(seg => {
      const g = createGround(this, seg.x, GROUND_Y, seg.w, PALETTE.accent, GROUND_HEIGHT);
      this.grounds.push(g);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Platforms, conveyors, crumbling, spikes, moving elevators          */
  /* ------------------------------------------------------------------ */

  createPlatforms() {
    this.platforms = [];
    this.movingPlatforms = [];
    this.crumblingPlatforms = [];
    this.conveyors = [];
    this.hazards = [];

    /* -- Section 1 (x 0-1800): Introductory rooftop platforms -- */
    this.platforms.push(createPlatform(this, 350, 1450, 250, 0x00ffff));
    this.platforms.push(createPlatform(this, 700, 1250, 200, 0x00ffff));
    this.platforms.push(createPlatform(this, 1100, 1350, 220, 0x00ffff));
    this.platforms.push(createSolidPlatform(this, 1500, 1500, 200, 0xff00ff));

    /* -- Gap 1 (x 1800-2200): crumbling bridge -- */
    const crumb1 = createCrumblingPlatform(this, 1950, 1550, 180, 0xffaa44);
    this.crumblingPlatforms.push(crumb1);
    this.platforms.push(crumb1);

    /* -- Section 2 (x 2200-3800): server room with conveyors -- */
    const conv1 = createConveyor(this, 2400, 1500, 300, 120, 0x44aaff);
    this.conveyors.push(conv1);
    this.platforms.push(conv1);

    this.platforms.push(createPlatform(this, 2900, 1350, 200, 0x00ffff));
    this.platforms.push(createPlatform(this, 3300, 1250, 220, 0x00ffff));

    const conv2 = createConveyor(this, 3100, 1500, 250, -100, 0x44aaff);
    this.conveyors.push(conv2);
    this.platforms.push(conv2);

    /* -- Gap 2 (x 3800-4200): spike pit -- */
    const spikes1 = createHazardSpikes(this, 3950, GROUND_Y + 10, 200, 0xff2222);
    this.hazards.push(spikes1);

    const crumb2 = createCrumblingPlatform(this, 4000, 1500, 150, 0xffaa44);
    this.crumblingPlatforms.push(crumb2);
    this.platforms.push(crumb2);

    /* -- Section 3 (x 4200-5600): vertical city climb -- */
    this.platforms.push(createPlatform(this, 4400, 1450, 200, 0x00ffff));

    // Vertical elevator
    const elev1 = createMovingPlatform(this, 4700, 1400, 160, {
      color: 0xff00ff, moveType: 'vertical', range: 250, speed: 0.8, phase: 0,
    });
    this.movingPlatforms.push(elev1);
    this.platforms.push(elev1);

    this.platforms.push(createSolidPlatform(this, 4950, 1200, 250, 0xff00ff));
    this.platforms.push(createPlatform(this, 5300, 1350, 180, 0x00ffff));

    // Spike hazard on a ledge
    const spikes2 = createHazardSpikes(this, 5200, 1180, 140, 0xff2222);
    this.hazards.push(spikes2);

    /* -- Gap 3 (x 5600-6000): danger crossing -- */
    const crumb3 = createCrumblingPlatform(this, 5750, 1500, 160, 0xffaa44);
    this.crumblingPlatforms.push(crumb3);
    this.platforms.push(crumb3);

    const crumb4 = createCrumblingPlatform(this, 5950, 1400, 140, 0xffaa44);
    this.crumblingPlatforms.push(crumb4);
    this.platforms.push(crumb4);

    /* -- Section 4 (x 6000-7800): firewall gauntlet -- */
    this.platforms.push(createPlatform(this, 6200, 1450, 200, 0x00ffff));

    const conv3 = createConveyor(this, 6600, 1500, 350, 150, 0x44aaff);
    this.conveyors.push(conv3);
    this.platforms.push(conv3);

    const elev2 = createMovingPlatform(this, 7000, 1350, 160, {
      color: 0xff00ff, moveType: 'vertical', range: 300, speed: 1.0, phase: Math.PI,
    });
    this.movingPlatforms.push(elev2);
    this.platforms.push(elev2);

    this.platforms.push(createSolidPlatform(this, 7300, 1250, 200, 0xff00ff));

    const spikes3 = createHazardSpikes(this, 7500, GROUND_Y + 10, 160, 0xff2222);
    this.hazards.push(spikes3);

    this.platforms.push(createPlatform(this, 7600, 1400, 200, 0x00ffff));

    /* -- Gap 4 (x 7800-8200): final approach -- */
    const elev3 = createMovingPlatform(this, 7950, 1500, 180, {
      color: 0x00ffff, moveType: 'horizontal', range: 150, speed: 0.7, phase: 0,
    });
    this.movingPlatforms.push(elev3);
    this.platforms.push(elev3);

    /* -- Section 5 (x 8200-9800): pre-boss area -- */
    this.platforms.push(createPlatform(this, 8500, 1400, 250, 0x00ffff));
    this.platforms.push(createPlatform(this, 8900, 1300, 200, 0x00ffff));
    this.platforms.push(createSolidPlatform(this, 9300, 1450, 220, 0xff00ff));

    const spikes4 = createHazardSpikes(this, 9550, GROUND_Y + 10, 200, 0xff2222);
    this.hazards.push(spikes4);

    /* -- Section 6 (x 10200-12000): Boss arena platforms -- */
    // Three tiers for dodging during boss fight
    this.platforms.push(createSolidPlatform(this, 10500, 1450, 300, 0xff00ff));
    this.platforms.push(createSolidPlatform(this, 11100, 1450, 300, 0xff00ff));
    this.platforms.push(createPlatform(this, 10800, 1250, 350, 0x00ffff));
    this.platforms.push(createPlatform(this, 11400, 1250, 250, 0x00ffff));
    this.platforms.push(createPlatform(this, 11000, 1050, 300, 0x00ffff));
  }

  /* ------------------------------------------------------------------ */
  /*  Timed laser gates                                                 */
  /* ------------------------------------------------------------------ */

  createLaserGates() {
    this.laserGates = [];

    const laserDefs = [
      { x: 2050, y: 1350, w: 20, h: 350 },
      { x: 4100, y: 1300, w: 20, h: 400 },
      { x: 5650, y: 1250, w: 20, h: 450 },
      { x: 7850, y: 1350, w: 20, h: 350 },
    ];

    laserDefs.forEach((ld, i) => {
      const laser = this.add.rectangle(ld.x, ld.y, ld.w, ld.h, 0xff2222, 0.85);
      laser.setDepth(55);
      addGlow(laser, 0xff0000, 4, 0, false, 0.1, 16);

      this.physics.add.existing(laser, true);
      laser._on = true;
      laser._def = ld;

      // Stagger the timing per gate
      const onDuration = 2000;
      const offDuration = 1500;
      const offset = i * 600;

      this.time.delayedCall(offset, () => {
        this.time.addEvent({
          delay: onDuration + offDuration,
          callback: () => {
            // Turn off
            laser._on = false;
            laser.setAlpha(0.1);
            laser.body.setEnable(false);

            this.time.delayedCall(offDuration, () => {
              // Turn on with warning flash
              this.tweens.add({
                targets: laser,
                alpha: { from: 0.15, to: 0.85 },
                duration: 100,
                yoyo: true,
                repeat: 2,
                onComplete: () => {
                  laser._on = true;
                  laser.setAlpha(0.85);
                  laser.body.setEnable(true);
                  laser.body.updateFromGameObject();
                },
              });
            });
          },
          loop: true,
        });
      });

      this.laserGates.push(laser);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Player                                                            */
  /* ------------------------------------------------------------------ */

  createPlayer() {
    this.player = new Player(this, 150, GROUND_Y - 60);
    this.player.setZonePalette(PALETTE);
  }

  /* ------------------------------------------------------------------ */
  /*  Enemies                                                           */
  /* ------------------------------------------------------------------ */

  createEnemies() {
    this.enemies = [];
    this._enemyProjectiles = this.physics.add.group();

    // --- Rogue Requests on ground (10 total) ---
    const roguePositions = [800, 1400, 2600, 3500, 4500, 6300, 6800, 7400, 8600, 9400];
    roguePositions.forEach(rx => {
      const e = createRogueRequest(this, rx, GROUND_Y - 40);
      this.enemies.push(e);
    });

    // --- SpamBot swarms (4 swarms of 3-4 = 14 total) ---
    const swarmCenters = [
      { x: 1000, count: 3 },
      { x: 3000, count: 4 },
      { x: 5100, count: 4 },
      { x: 8000, count: 3 },
    ];
    swarmCenters.forEach(sw => {
      for (let i = 0; i < sw.count; i++) {
        const sx = sw.x + i * 60 - (sw.count * 30);
        const e = createSpamBot(this, sx, GROUND_Y - 30);
        this.enemies.push(e);
      }
    });

    // --- Firewall Drones hovering above platforms (4) ---
    const dronePositions = [
      { x: 2800, y: 1100 },
      { x: 4800, y: 1000 },
      { x: 7200, y: 1050 },
      { x: 9100, y: 1050 },
    ];
    dronePositions.forEach(dp => {
      const e = createFirewallDrone(this, dp.x, dp.y);
      this.enemies.push(e);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boss: Rate Limit Guardian                                         */
  /* ------------------------------------------------------------------ */

  createBoss() {
    this.bossDefeated = false;

    this.bossArenaX = 10200;
    this.bossArenaWidth = 1800;
    this.bossArenaCenterX = this.bossArenaX + this.bossArenaWidth / 2;
    this.bossArenaCenterY = GROUND_Y - 400;

    // Boss sprite -- large armored sentinel
    this.boss = this.physics.add.sprite(this.bossArenaCenterX, this.bossArenaCenterY - 100, 'player_orb');
    this.boss.setScale(3.5);
    this.boss.setTint(0xff2200);
    this.boss.setBlendMode(Phaser.BlendModes.ADD);
    this.boss.setDepth(80);
    this.boss.body.setImmovable(true);
    this.boss.body.setAllowGravity(false);
    this.boss.body.setCircle(this.boss.width / 2);
    addGlow(this.boss, 0xff4400, 6, 0, false, 0.1, 32);

    this.bossHP = 8;
    this.bossMaxHP = 8;
    this.bossVulnerable = false;
    this.bossPhaseTime = 0;
    this.bossActive = false;
    this.bossPhase2 = false;
    this.bossBeams = [];
    this.boss429s = [];
    this.bossShockwaves = [];
    this.bossMovementSpeed = 1.0;
    this._bossAttackIndex = 0;

    // Pulsing tween
    this.bossPulseTween = this.tweens.add({
      targets: this.boss,
      scaleX: 3.8,
      scaleY: 3.8,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Boss arena trigger zone
    this.bossArenaZone = this.add.zone(this.bossArenaX, 0, 60, WORLD.height);
    this.bossArenaZone.setOrigin(0, 0);
    this.physics.add.existing(this.bossArenaZone, true);
    this.physics.add.overlap(this.player, this.bossArenaZone, () => this.activateBoss(), null, this);

    // Overlap for attacking boss when vulnerable
    this.physics.add.overlap(this.player, this.boss, () => this.hitBoss(), null, this);

    // Create boss HUD (hidden until active)
    this.bossHUDContainer = this.add.container(GAME.WIDTH / 2, 60).setScrollFactor(0).setDepth(310).setAlpha(0);

    const bossTitle = this.add.text(0, 0, 'RATE LIMIT GUARDIAN', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ff4444',
      resolution: 2,
    }).setOrigin(0.5);
    addGlow(bossTitle, 0xff0000, 3, 0, false, 0.1, 12);
    this._bossTitleText = bossTitle;

    const hpBarBg = this.add.rectangle(0, 30, 300, 16, 0x333333).setOrigin(0.5);

    this.bossHPBar = this.add.rectangle(-150 + 1, 30, 298, 14, 0xff2200).setOrigin(0, 0.5);

    this.bossHPText = this.add.text(0, 30, `${this.bossHP} / ${this.bossMaxHP}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5);

    this.bossHUDContainer.add([bossTitle, hpBarBg, this.bossHPBar, this.bossHPText]);
  }

  activateBoss() {
    if (this.bossActive || this.bossDefeated) return;
    this.bossActive = true;

    // Lock camera to boss arena
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(this.bossArenaX, 0, this.bossArenaWidth, WORLD.height);
    this.cameras.main.pan(
      this.bossArenaCenterX,
      GROUND_Y - GAME.HEIGHT / 2 + 100,
      500, 'Power2',
    );

    // Show boss HUD
    this.tweens.add({
      targets: this.bossHUDContainer,
      alpha: 1,
      duration: 400,
    });

    // Dramatic entrance: boss slams down from above
    this.boss.setY(this.bossArenaCenterY - 600);
    this.tweens.add({
      targets: this.boss,
      y: this.bossArenaCenterY,
      duration: 800,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.cameras.main.shake(300, 0.012);

        // Start boss attack cycle
        this.bossAttackTimer = this.time.addEvent({
          delay: 3200,
          callback: () => this.bossAttackCycle(),
          loop: true,
        });

        // Start vulnerability window cycle
        this.bossVulnTimer = this.time.addEvent({
          delay: 5000,
          callback: () => this.bossOpenWindow(),
          loop: true,
        });
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boss attack cycle -- three attack types                           */
  /* ------------------------------------------------------------------ */

  bossAttackCycle() {
    if (this.bossDefeated || this.bossVulnerable) return;

    if (this.bossPhase2) {
      // Phase 2: fire two attacks simultaneously
      const attacks = [0, 1, 2];
      const pick1 = Phaser.Utils.Array.GetRandom(attacks);
      let pick2 = Phaser.Utils.Array.GetRandom(attacks);
      while (pick2 === pick1) pick2 = Phaser.Utils.Array.GetRandom(attacks);

      this.executeBossAttack(pick1);
      this.time.delayedCall(400, () => this.executeBossAttack(pick2));
    } else {
      // Phase 1: cycle through attacks in order
      this.executeBossAttack(this._bossAttackIndex % 3);
      this._bossAttackIndex++;
    }
  }

  executeBossAttack(attackType) {
    if (this.bossDefeated || this.bossVulnerable) return;

    switch (attackType) {
      case 0: this.bossGroundStomp(); break;
      case 1: this.bossFire429Barrage(); break;
      case 2: this.bossFireBeamSweep(); break;
    }
  }

  /* Attack 1: Ground stomp shockwave */
  bossGroundStomp() {
    if (this.bossDefeated || this.bossVulnerable) return;

    // Warning: boss rises up
    this.tweens.add({
      targets: this.boss,
      y: this.boss.y - 80,
      duration: 400,
      ease: 'Power2',
      yoyo: true,
      onYoyo: () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        this.cameras.main.shake(200, 0.015);

        // Shockwave -- rectangle sweeping across floor from boss position
        const shockLeft = this.add.rectangle(this.boss.x, GROUND_Y - 25, 40, 50, 0xff4400, 0.8);
        shockLeft.setDepth(75);
        addGlow(shockLeft, 0xff4400, 3, 0, false, 0.1, 12);
        this.physics.add.existing(shockLeft, false);
        shockLeft.body.setAllowGravity(false);
        shockLeft.body.setImmovable(true);
        shockLeft.body.setVelocityX(-500);

        const shockRight = this.add.rectangle(this.boss.x, GROUND_Y - 25, 40, 50, 0xff4400, 0.8);
        shockRight.setDepth(75);
        addGlow(shockRight, 0xff4400, 3, 0, false, 0.1, 12);
        this.physics.add.existing(shockRight, false);
        shockRight.body.setAllowGravity(false);
        shockRight.body.setImmovable(true);
        shockRight.body.setVelocityX(500);

        [shockLeft, shockRight].forEach(sw => {
          this.bossShockwaves.push(sw);

          this.physics.add.overlap(this.player, sw, () => {
            if (this.player._invulnerable) return;
            this.bossHitPlayer();
          }, null, this);

          // Ground particles trail
          const trailTimer = this.time.addEvent({
            delay: 80,
            callback: () => {
              if (sw.active) {
                createCollectBurst(this, sw.x, sw.y, 0xff4400);
              }
            },
            repeat: 15,
          });

          this.time.delayedCall(2500, () => {
            if (sw.active) sw.destroy();
            trailTimer.remove();
            const idx = this.bossShockwaves.indexOf(sw);
            if (idx >= 0) this.bossShockwaves.splice(idx, 1);
          });
        });
      },
    });
  }

  /* Attack 2: "429" text rain from above */
  bossFire429Barrage() {
    if (this.bossDefeated || this.bossVulnerable) return;

    const count = this.bossPhase2 ? 12 : 7;
    const camScrollX = this.cameras.main.scrollX;

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 180, () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        const spawnX = this.bossArenaX + 100 + Math.random() * (this.bossArenaWidth - 200);
        const spawnY = this.cameras.main.scrollY - 40;

        const text429 = this.add.text(spawnX, spawnY, '429', {
          fontFamily: '"Courier New", monospace',
          fontSize: '36px',
          fontStyle: 'bold',
          color: '#ff4444',
          resolution: 2,
        });
        text429.setOrigin(0.5).setDepth(76);
        addGlow(text429, 0xff0000, 4, 0, false, 0.1, 12);

        this.physics.add.existing(text429, false);
        text429.body.setAllowGravity(true);
        text429.body.setBounce(0);
        text429.body.setSize(text429.width, text429.height);

        this.physics.add.overlap(this.player, text429, () => {
          if (this.player._invulnerable) return;
          this.bossHitPlayer();
          text429.destroy();
        }, null, this);

        this.boss429s.push(text429);

        // Destroy when fallen too far
        this.time.delayedCall(4000, () => {
          if (text429.active) text429.destroy();
          const idx = this.boss429s.indexOf(text429);
          if (idx >= 0) this.boss429s.splice(idx, 1);
        });
      });
    }
  }

  /* Attack 3: Horizontal beam sweep with warning */
  bossFireBeamSweep() {
    if (this.bossDefeated || this.bossVulnerable) return;

    const beamYOptions = [GROUND_Y - 60, GROUND_Y - 200, GROUND_Y - 400];
    const beamY = Phaser.Utils.Array.GetRandom(beamYOptions);

    // Warning line -- thin, flashing
    const warningLine = this.add.rectangle(
      this.bossArenaX, beamY,
      this.bossArenaWidth, 6, 0xff6600, 0.3,
    );
    warningLine.setOrigin(0, 0.5).setDepth(74);
    addGlow(warningLine, 0xff4400, 3, 0, false, 0.1, 8);

    this.tweens.add({
      targets: warningLine,
      alpha: { from: 0.1, to: 0.7 },
      duration: 150,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        warningLine.destroy();
        if (this.bossDefeated || this.bossVulnerable) return;

        // Full beam fires
        const beam = this.add.rectangle(
          this.bossArenaX, beamY,
          this.bossArenaWidth, 24, 0xff2200, 0.9,
        );
        beam.setOrigin(0, 0.5).setDepth(75);
        addGlow(beam, 0xff0000, 4, 0, false, 0.1, 16);

        this.physics.add.existing(beam, true);

        this.physics.add.overlap(this.player, beam, () => {
          if (this.player._invulnerable) return;
          this.bossHitPlayer();
        }, null, this);

        this.bossBeams.push(beam);

        // Particle trail
        for (let p = 0; p < 5; p++) {
          this.time.delayedCall(p * 60, () => {
            if (beam.active) {
              const px = this.bossArenaX + Math.random() * this.bossArenaWidth;
              createCollectBurst(this, px, beamY, 0xff4400);
            }
          });
        }

        this.time.delayedCall(1200, () => {
          if (beam.active) beam.destroy();
          const idx = this.bossBeams.indexOf(beam);
          if (idx >= 0) this.bossBeams.splice(idx, 1);
        });
      },
    });
  }

  bossHitPlayer() {
    if (this.player._invulnerable) return;

    const pushDir = this.player.x > this.boss.x ? 1 : -1;
    this.player.takeDamage(pushDir * 350, -250);
    this.cameras.main.shake(150, 0.008);

    // Flash "429 Too Many Requests" warning
    if (!this._rateLimitWarning) {
      this._rateLimitWarning = this.add.text(GAME.WIDTH / 2, 120, '429 Too Many Requests', {
        fontFamily: '"Courier New", monospace',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ff4444',
        resolution: 2,
      });
      this._rateLimitWarning.setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);
      addGlow(this._rateLimitWarning, 0xff0000, 6, 0, false, 0.1, 16);
    }

    this.tweens.add({
      targets: this._rateLimitWarning,
      alpha: 1,
      duration: 100,
      yoyo: true,
      hold: 500,
    });
  }

  /* Vulnerability window -- boss shrinks and turns green */
  bossOpenWindow() {
    if (this.bossDefeated) return;

    this.bossVulnerable = true;

    // Dramatic: boss shrinks, turns bright green
    this.boss.setTint(0x44ff44);
    this.tweens.add({
      targets: this.boss,
      scaleX: 2.0,
      scaleY: 2.0,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Ring of particles
    const ringCount = 16;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const particle = this.add.circle(this.boss.x, this.boss.y, 6, 0x44ff44);
      particle.setBlendMode(Phaser.BlendModes.ADD).setDepth(81);
      addGlow(particle, 0x44ff44, 3, 0, false, 0.1, 8);

      this.tweens.add({
        targets: particle,
        x: this.boss.x + Math.cos(angle) * 200,
        y: this.boss.y + Math.sin(angle) * 200,
        alpha: 0,
        scale: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    const hitText = this.add.text(GAME.WIDTH / 2, 180, 'COOLDOWN -- STRIKE NOW!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#44ff44',
      resolution: 2,
    }).setOrigin(0.5).setDepth(300).setScrollFactor(0);
    addGlow(hitText, 0x44ff44, 6, 0, false, 0.1, 20);

    this.tweens.add({
      targets: hitText,
      alpha: { from: 0.6, to: 1 },
      scale: { from: 0.95, to: 1.05 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(2000, () => {
      this.bossVulnerable = false;
      if (!this.bossDefeated) {
        this.boss.setTint(this.bossPhase2 ? 0xaa00ff : 0xff2200);
        this.tweens.add({
          targets: this.boss,
          scaleX: 3.5,
          scaleY: 3.5,
          duration: 300,
          ease: 'Power2',
        });
      }
      hitText.destroy();
    });
  }

  hitBoss() {
    if (!this.bossVulnerable || this.bossDefeated) return;
    // Require dashing or high speed
    const speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
    if (speed < 150) return;

    this.bossVulnerable = false;
    this.bossHP--;

    createCollectBurst(this, this.boss.x, this.boss.y, 0xff4400);
    createCollectBurst(this, this.boss.x, this.boss.y, 0xffaa00);
    this.cameras.main.shake(200, 0.012);

    // Flash white
    this.boss.setTint(0xffffff);
    this.time.delayedCall(150, () => {
      if (!this.bossDefeated) {
        this.boss.setTint(this.bossPhase2 ? 0xaa00ff : 0xff2200);
      }
    });

    // Restore scale
    this.tweens.add({
      targets: this.boss,
      scaleX: 3.5,
      scaleY: 3.5,
      duration: 300,
      ease: 'Power2',
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

    // Bounce player back
    const pushDir = this.player.x > this.boss.x ? 1 : -1;
    this.player.body.setVelocity(pushDir * 350, -250);

    // Phase 2 trigger at 3 HP
    if (this.bossHP <= 3 && !this.bossPhase2) {
      this.enterBossPhase2();
    }

    if (this.bossHP <= 0) {
      this.defeatBoss();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Boss Phase 2: enraged at 3 HP -- purple, faster, combined attacks */
  /* ------------------------------------------------------------------ */

  enterBossPhase2() {
    this.bossPhase2 = true;
    this.bossMovementSpeed = 1.6;

    this.boss.setTint(0xaa00ff);
    addGlow(this.boss, 0xaa00ff, 8, 0, false, 0.1, 40);

    // Screen flash purple
    const purpleFlash = this.add.rectangle(
      this.bossArenaCenterX, this.bossArenaCenterY,
      this.bossArenaWidth, WORLD.height,
      0xaa00ff, 0.4,
    );
    purpleFlash.setDepth(200);
    this.tweens.add({
      targets: purpleFlash,
      alpha: 0,
      duration: 600,
      onComplete: () => purpleFlash.destroy(),
    });

    const phaseText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 200, 'PHASE 2: ENRAGED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#aa00ff',
      resolution: 2,
    }).setOrigin(0.5).setDepth(310).setScrollFactor(0);
    addGlow(phaseText, 0xaa00ff, 6, 0, false, 0.1, 20);

    this.tweens.add({
      targets: phaseText,
      alpha: 0,
      y: phaseText.y - 40,
      duration: 2000,
      delay: 1000,
      onComplete: () => phaseText.destroy(),
    });

    if (this._bossTitleText) {
      this._bossTitleText.setColor('#aa00ff');
    }
    this.bossHPBar.setFillStyle(0xaa00ff);

    // Speed up attack timer
    if (this.bossAttackTimer) this.bossAttackTimer.remove();
    this.bossAttackTimer = this.time.addEvent({
      delay: 2200,
      callback: () => this.bossAttackCycle(),
      loop: true,
    });

    this.cameras.main.shake(300, 0.015);
  }

  /* ------------------------------------------------------------------ */
  /*  Boss defeat                                                       */
  /* ------------------------------------------------------------------ */

  defeatBoss() {
    this.bossDefeated = true;

    if (this.bossAttackTimer) this.bossAttackTimer.remove();
    if (this.bossVulnTimer) this.bossVulnTimer.remove();

    // Destroy remaining projectiles
    this.bossBeams.forEach(b => { if (b.active) b.destroy(); });
    this.bossBeams = [];
    this.boss429s.forEach(b => { if (b.active) b.destroy(); });
    this.boss429s = [];
    this.bossShockwaves.forEach(b => { if (b.active) b.destroy(); });
    this.bossShockwaves = [];

    // Chain of explosions
    for (let i = 0; i < 14; i++) {
      this.time.delayedCall(i * 100, () => {
        const ex = this.bossArenaX + 200 + Math.random() * (this.bossArenaWidth - 400);
        const ey = GROUND_Y - 100 - Math.random() * 600;
        createCollectBurst(this, ex, ey, 0xff4400);
        createCollectBurst(this, ex, ey, 0xffaa00);
        createCollectBurst(this, ex, ey, 0xff0000);
        this.cameras.main.shake(100, 0.008);
      });
    }

    // White flash
    const whiteFlash = this.add.rectangle(
      this.bossArenaCenterX, this.bossArenaCenterY,
      this.bossArenaWidth + 200, WORLD.height + 200,
      0xffffff, 0.9,
    );
    whiteFlash.setDepth(500);
    this.tweens.add({
      targets: whiteFlash,
      alpha: 0,
      duration: 800,
      delay: 200,
      ease: 'Power2',
      onComplete: () => whiteFlash.destroy(),
    });

    this.cameras.main.shake(600, 0.025);

    // Boss explodes
    this.tweens.add({
      targets: this.boss,
      scale: 8,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.boss.destroy();
      },
    });

    // Hide boss HUD
    this.tweens.add({
      targets: this.bossHUDContainer,
      alpha: 0,
      duration: 600,
    });

    // Victory text
    this.time.delayedCall(800, () => {
      const bypassText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'RATE LIMIT BYPASSED', {
        fontFamily: '"Courier New", monospace',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#44ff44',
        resolution: 2,
      }).setOrigin(0.5).setDepth(310).setScrollFactor(0);
      bypassText.setAlpha(0).setScale(0.5);
      addGlow(bypassText, 0x44ff44, 8, 0, false, 0.1, 32);

      this.tweens.add({
        targets: bypassText,
        alpha: 1,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut',
      });

      this.tweens.add({
        targets: bypassText,
        alpha: { from: 0.7, to: 1 },
        scale: { from: 0.98, to: 1.02 },
        duration: 400,
        yoyo: true,
        repeat: 4,
        delay: 500,
      });

      this.tweens.add({
        targets: bypassText,
        alpha: 0,
        y: bypassText.y - 40,
        duration: 800,
        delay: 3000,
        onComplete: () => bypassText.destroy(),
      });
    });

    // Spawn portal after delay
    this.time.delayedCall(1800, () => {
      this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.spawnPortalAfterBoss();
    });
  }

  spawnPortalAfterBoss() {
    this.portalX = WORLD.width - 150;
    this.portalY = GROUND_Y - 100;

    const approvedText = this.add.text(this.portalX, this.portalY - 120, 'GATEWAY APPROVED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#44ff44',
      resolution: 2,
    });
    approvedText.setOrigin(0.5).setDepth(90);
    addGlow(approvedText, 0x44ff44, 4, 0, false, 0.1, 16);

    this.portal = this.add.image(this.portalX, this.portalY, 'portal_ring');
    this.portal.setBlendMode(Phaser.BlendModes.ADD);
    this.portal.setDepth(85);
    this.portal.setScale(1.5);
    this.portal.setTint(0xff00ff);
    addGlow(this.portal, 0xff00ff, 4, 0, false, 0.1, 24);

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
      duration: 5000,
      repeat: -1,
    });

    this.portalParticles = createPortalParticles(this, this.portalX, this.portalY, 0xff00ff);

    this.portalZone = this.add.zone(this.portalX, this.portalY, 80, 80);
    this.physics.add.existing(this.portalZone, true);
    this.physics.add.overlap(this.player, this.portalZone, () => this.exitZone(), null, this);
  }

  /* ------------------------------------------------------------------ */
  /*  Camera                                                            */
  /* ------------------------------------------------------------------ */

  setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  /* ------------------------------------------------------------------ */
  /*  HUD                                                               */
  /* ------------------------------------------------------------------ */

  createHUD() {
    // Zone title
    const hudTitle = this.add.text(20, 20, 'ZONE 2: API GATEWAY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ff00ff',
      resolution: 2,
    }).setScrollFactor(0).setDepth(200);
    addGlow(hudTitle, 0xff00ff, 2, 0, false, 0.1, 8);

    // HP display
    this.hpText = this.add.text(20, 50, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#00ffff',
      resolution: 2,
    }).setScrollFactor(0).setDepth(200);
    addGlow(this.hpText, 0x00ffff, 2, 0, false, 0.1, 8);
  }

  /* ------------------------------------------------------------------ */
  /*  Collisions                                                        */
  /* ------------------------------------------------------------------ */

  setupCollisions() {
    // Player vs ground/platforms
    for (const g of this.grounds) {
      this.physics.add.collider(this.player, g);
    }
    for (const p of this.platforms) {
      this.physics.add.collider(this.player, p);
    }

    // Enemies vs ground
    this.enemies.forEach(e => {
      for (const g of this.grounds) {
        this.physics.add.collider(e, g);
      }
    });

    // Player overlaps enemies (takes damage on touch)
    this.enemies.forEach(e => {
      this.physics.add.overlap(this.player, e, () => {
        if (this.player._invulnerable || e._dead) return;
        this.player.takeDamage(
          (this.player.x > e.x ? 1 : -1) * 250,
          -200,
        );
      }, null, this);
    });

    // Enemy projectiles vs player
    this.physics.add.overlap(this.player, this._enemyProjectiles, (p, proj) => {
      if (this.player._invulnerable) return;
      this.player.takeDamage(
        (this.player.x > proj.x ? 1 : -1) * 200,
        -150,
      );
      proj.destroy();
    }, null, this);

    // Crumbling platforms -- trigger crumble on player landing
    this.crumblingPlatforms.forEach(cp => {
      this.physics.add.collider(this.player, cp, () => {
        cp.startCrumble();
      });
    });

    // Hazard spikes overlap
    this.hazards.forEach(h => {
      this.physics.add.overlap(this.player, h, () => {
        if (this.player._invulnerable) return;
        this.player.takeDamage(0, -350);
      }, null, this);
    });

    // Laser gates overlap
    this.laserGates.forEach(lg => {
      this.physics.add.overlap(this.player, lg, () => {
        if (!lg._on || this.player._invulnerable) return;
        this.player.takeDamage(
          (this.player.x > lg.x ? 1 : -1) * 300,
          -200,
        );
      }, null, this);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Zone exit                                                         */
  /* ------------------------------------------------------------------ */

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
        ...ZONE_CARDS.API_GATEWAY,
        nextZone: SCENES.ZONE3,
        callingScene: SCENES.ZONE2,
        playerData: this.playerData,
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Update loop                                                       */
  /* ------------------------------------------------------------------ */

  update(time, delta) {
    this.player.update(time, delta);
    this.parallax.update(this.cameras.main);

    // Update HUD
    if (this.hpText) {
      const hearts = '♥'.repeat(this.player.hp) + '♡'.repeat(this.player.maxHp - this.player.hp);
      this.hpText.setText(`HP: ${hearts}`);
    }

    // Update moving platforms
    this.movingPlatforms.forEach(mp => {
      if (mp.active) mp.updatePlatform(time, delta);
    });

    // Conveyor belt effect on player
    this.conveyors.forEach(conv => {
      if (conv.active && conv._isConveyor && this.player.body.touching.down) {
        // Check if player is standing on this conveyor
        const px = this.player.x;
        const pw = this.player.body.width / 2;
        const cx = conv.x;
        const cw = conv.body.width / 2;
        if (px + pw > cx - cw && px - pw < cx + cw) {
          const playerBottom = this.player.body.bottom;
          const convTop = conv.body.top;
          if (Math.abs(playerBottom - convTop) < 10) {
            this.player.x += conv._conveyorSpeed * delta * 0.001;
          }
        }
      }
    });

    // Update enemies
    this.enemies.forEach(e => {
      if (e.active && !e._dead) {
        e.update(time, delta, this.player);
      }
    });

    // Attack hitbox vs enemies
    if (this.player.attackHitbox) {
      this.enemies.forEach(e => {
        if (e.active && !e._dead && !e._hurt) {
          const hb = this.player.attackHitbox;
          if (Phaser.Geom.Intersects.RectangleToRectangle(
            hb.getBounds(),
            e.getBounds(),
          )) {
            e.takeDamage(GAME.ATTACK_DAMAGE, this.player.facing);
          }
        }
      });
    }

    // Boss movement -- figure-8 pattern hovering above the arena
    if (this.bossActive && !this.bossDefeated && this.boss.active) {
      this.bossPhaseTime += delta * 0.001;
      const spd = this.bossMovementSpeed;
      const figureEightX = Math.sin(this.bossPhaseTime * 0.6 * spd) * 500;
      const figureEightY = Math.sin(this.bossPhaseTime * 1.2 * spd) * 150;
      this.boss.x = this.bossArenaCenterX + figureEightX;
      this.boss.y = this.bossArenaCenterY + figureEightY;
      this.boss.body.updateFromGameObject();
    }

    // Player death check -- respawn at last ground segment start
    if (this.player.y > WORLD.height - 50) {
      if (!this.player._invulnerable) {
        const dead = this.player.takeDamage(0, -400);
        if (!dead) {
          // Respawn on nearest ground segment behind player
          const segments = [0, 2200, 4200, 6000, 8200, 10200];
          let respawnX = 150;
          for (let i = segments.length - 1; i >= 0; i--) {
            if (this.player.x >= segments[i]) {
              respawnX = segments[i] + 100;
              break;
            }
          }
          this.player.setPosition(respawnX, GROUND_Y - 60);
          this.player.body.setVelocity(0, 0);
        }
      }
    }
  }
}
