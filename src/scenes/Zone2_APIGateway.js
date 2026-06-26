import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { generateStarField, generateNebula, generateCitySkyline } from '../effects/procedural.js';
import { createNeonStreaks, createPortalParticles, createCollectBurst } from '../effects/particles.js';
import { addGlow, addPostBloom } from '../utils/helpers.js';

const PALETTE = PALETTES.API_GATEWAY;
const WORLD = ZONE_WORLDS.API_GATEWAY;

const TOKEN_TYPES = [
  { name: 'API Key', color: 0xffd700, shape: 'hexagon' },
  { name: 'OAuth', color: 0x4488ff, shape: 'circle' },
  { name: 'JWT', color: 0x44ff88, shape: 'rect' },
];

const DATA_TOOLTIPS = [
  'header: Content-Type: application/json',
  'header: Authorization: Bearer ***',
  'body: { "model": "llm-d" }',
  'body: { "prompt": "..." }',
  'header: X-Request-ID: abc123',
  'body: { "temperature": 0.7 }',
  'header: Accept: text/event-stream',
  'body: { "max_tokens": 1024 }',
];

const NEON_SIGNS = ['API v2.0', 'HTTPS', 'REST', 'gRPC', 'JSON', 'WebSocket', 'OAuth 2.0', 'TLS 1.3'];

export class Zone2_APIGateway extends Phaser.Scene {
  constructor() {
    super(SCENES.ZONE2);
  }

  init(data) {
    this.playerData = data || {};
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this._exiting = false;

    this.createBackgrounds();
    this.createAmbientEffects();
    this.createNeonSigns();
    this.createPlayer();
    this.createGates();
    this.createRateLimiters();
    this.createRequestQueue();
    this.createDataPackets();
    this.createBoss();
    this.setupCamera();
    this.createHUD();

    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    addPostBloom(this.cameras.main, 0xffffff, 0.5, 0.5, 1, 1.3, 4);
  }

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

  createAmbientEffects() {
    this.neonStreaks = createNeonStreaks(this, PALETTE);
    // Make neon streaks more vibrant: increase alpha and frequency
    if (this.neonStreaks && this.neonStreaks.setAlpha) {
      this.neonStreaks.setAlpha(0.9);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Pulsing neon signs in the background                              */
  /* ------------------------------------------------------------------ */

  createNeonSigns() {
    const signSpacing = WORLD.width / (NEON_SIGNS.length + 1);
    NEON_SIGNS.forEach((label, i) => {
      const x = signSpacing * (i + 1) + Phaser.Math.Between(-100, 100);
      const y = Phaser.Math.Between(60, 180);
      const color = Phaser.Utils.Array.GetRandom(PALETTE.neon);
      const hexColor = '#' + color.toString(16).padStart(6, '0');

      const sign = this.add.text(x, y, label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: hexColor,
        resolution: 2,
      });
      sign.setOrigin(0.5).setDepth(5).setAlpha(0.35);
      addGlow(sign, color, 4, 0, false, 0.1, 16);

      // Pulsing glow animation
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

  createPlayer() {
    this.player = new Player(this, 150, GAME.HEIGHT / 2);
    this.player.setZonePalette(PALETTE);
  }

  createGates() {
    this.gates = [];
    this.authTokens = this.physics.add.group();

    const gatePositions = [
      { x: 1500, tokenType: 0, tokenX: 1200, tokenY: 375 },
      { x: 3300, tokenType: 1, tokenX: 2850, tokenY: 675 },
      { x: 5100, tokenType: 2, tokenX: 4650, tokenY: 300 },
      { x: 6900, tokenType: 0, tokenX: 6450, tokenY: 750 },
    ];

    gatePositions.forEach((gp, i) => {
      const gate = this.createGate(gp.x, gp.tokenType, i);
      this.gates.push(gate);
      this.createAuthToken(gp.tokenX, gp.tokenY, gp.tokenType, i);
    });
  }

  createGate(x, tokenTypeIdx, gateIndex) {
    const tt = TOKEN_TYPES[tokenTypeIdx];
    const gateGroup = this.physics.add.staticGroup();

    const topBar = this.add.rectangle(x, 0, 18, GAME.HEIGHT / 2 - 90, tt.color);
    topBar.setOrigin(0.5, 0).setDepth(60);
    addGlow(topBar, tt.color, 3, 0, false, 0.1, 12);
    gateGroup.add(topBar);

    const bottomBar = this.add.rectangle(x, GAME.HEIGHT / 2 + 90, 18, GAME.HEIGHT / 2 - 90, tt.color);
    bottomBar.setOrigin(0.5, 0).setDepth(60);
    addGlow(bottomBar, tt.color, 3, 0, false, 0.1, 12);
    gateGroup.add(bottomBar);

    const lockText = this.add.text(x, GAME.HEIGHT / 2, 'LOCKED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ff4444',
      resolution: 2,
    });
    lockText.setOrigin(0.5).setDepth(61);
    addGlow(lockText, 0xff0000, 3, 0, false, 0.1, 12);

    const label = this.add.text(x, GAME.HEIGHT / 2 - 105, `Requires: ${tt.name}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#' + tt.color.toString(16).padStart(6, '0'),
      resolution: 2,
    });
    label.setOrigin(0.5).setDepth(61);

    this.physics.add.collider(this.player, gateGroup);

    return {
      group: gateGroup,
      topBar,
      bottomBar,
      lockText,
      label,
      tokenType: tokenTypeIdx,
      unlocked: false,
      x,
    };
  }

  createAuthToken(x, y, tokenTypeIdx, gateIndex) {
    const tt = TOKEN_TYPES[tokenTypeIdx];

    const token = this.physics.add.sprite(x, y, 'player_orb');
    token.setScale(0.35);
    token.setTint(tt.color);
    token.setBlendMode(Phaser.BlendModes.ADD);
    token.setDepth(70);
    addGlow(token, tt.color, 4, 0, false, 0.1, 16);
    token._gateIndex = gateIndex;
    token._tokenType = tokenTypeIdx;

    const label = this.add.text(x, y - 33, tt.name, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2,
    });
    label.setOrigin(0.5).setDepth(71);
    token._label = label;

    this.tweens.add({
      targets: [token, label],
      y: y - 15,
      duration: 1200 + Math.random() * 400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.authTokens.add(token);
    this.physics.add.overlap(this.player, token, () => this.collectAuthToken(token), null, this);
  }

  collectAuthToken(token) {
    const gateIndex = token._gateIndex;
    const gate = this.gates[gateIndex];

    createCollectBurst(this, token.x, token.y, TOKEN_TYPES[token._tokenType].color);
    this.cameras.main.shake(80, 0.004);

    if (token._label) token._label.destroy();
    token.destroy();

    this.unlockGate(gate);
  }

  unlockGate(gate) {
    gate.unlocked = true;
    gate.lockText.setText('OPEN');
    gate.lockText.setColor('#44ff44');

    // Particle burst from gate bars
    for (let i = 0; i < 8; i++) {
      const burstY = Phaser.Math.Between(100, GAME.HEIGHT - 100);
      this.time.delayedCall(i * 40, () => {
        createCollectBurst(this, gate.x, burstY, 0x44ff44);
      });
    }

    // Neon flash overlay
    const flash = this.add.rectangle(gate.x, GAME.HEIGHT / 2, 200, GAME.HEIGHT, 0x44ff44, 0.4);
    flash.setDepth(100);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    this.tweens.add({
      targets: gate.topBar,
      scaleY: 0,
      duration: 600,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: gate.bottomBar,
      scaleY: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        gate.group.getChildren().forEach(c => c.destroy());
        gate.lockText.destroy();
        gate.label.destroy();
      },
    });

    this.cameras.main.shake(100, 0.005);
  }

  createRateLimiters() {
    this.rateLimiters = [];
    const limiterPositions = [
      { x: 2250, y: GAME.HEIGHT / 2, amplitude: 375, speed: 0.002 },
      { x: 4200, y: GAME.HEIGHT / 2, amplitude: 300, speed: 0.003 },
      { x: 6000, y: GAME.HEIGHT / 2, amplitude: 420, speed: 0.0025 },
    ];

    limiterPositions.forEach(lp => {
      const beam = this.add.rectangle(lp.x, lp.y, GAME.WIDTH * 0.6, 12, 0xff4444);
      beam.setDepth(55);
      addGlow(beam, 0xff0000, 4, 0, false, 0.1, 16);
      this.physics.add.existing(beam, false);
      beam.body.setImmovable(true);
      beam.body.setAllowGravity(false);

      beam._config = lp;
      beam._cooldown = false;
      beam._baseY = lp.y;
      beam._warningActive = false;
      this.rateLimiters.push(beam);

      this.physics.add.overlap(this.player, beam, () => this.hitRateLimiter(beam), null, this);
    });

    this.rateLimitWarning = this.add.text(GAME.WIDTH / 2, 120, '429 Too Many Requests', {
      fontFamily: '"Courier New", monospace',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ff4444',
      resolution: 2,
    });
    this.rateLimitWarning.setOrigin(0.5);
    this.rateLimitWarning.setScrollFactor(0);
    this.rateLimitWarning.setDepth(300);
    this.rateLimitWarning.setAlpha(0);
    addGlow(this.rateLimitWarning, 0xff0000, 6, 0, false, 0.1, 16);

    // Start beam warning flash cycle
    this._beamWarningTimer = this.time.addEvent({
      delay: 2800,
      callback: () => this.flashBeamWarnings(),
      loop: true,
    });
  }

  /* Flash rate limiter beams red 3 times before they go solid */
  flashBeamWarnings() {
    this.rateLimiters.forEach(beam => {
      if (beam._cooldown || beam._warningActive) return;
      beam._warningActive = true;

      // 3 quick red blinks
      let blinkCount = 0;
      const blinkEvent = this.time.addEvent({
        delay: 120,
        callback: () => {
          blinkCount++;
          if (blinkCount % 2 === 1) {
            beam.setFillStyle(0xff0000);
            beam.setAlpha(1);
          } else {
            beam.setFillStyle(0xff4444);
            beam.setAlpha(0.7);
          }
          if (blinkCount >= 6) {
            beam.setFillStyle(0xff4444);
            beam.setAlpha(1);
            beam._warningActive = false;
            blinkEvent.remove();
          }
        },
        loop: true,
      });
    });
  }

  hitRateLimiter(beam) {
    if (beam._cooldown || this.player._invulnerable) return;

    const pushDir = this.player.x > beam.x ? 1 : -1;
    this.player.body.setVelocity(pushDir * 400, -200);

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

    this.cameras.main.shake(150, 0.008);

    this.tweens.add({
      targets: this.rateLimitWarning,
      alpha: 1,
      duration: 100,
      yoyo: true,
      hold: 600,
    });

    // Particle trail on the beam
    createCollectBurst(this, this.player.x, beam.y, 0xff4444);

    beam._cooldown = true;
    beam.setFillStyle(0x44ff44);
    this.time.delayedCall(1500, () => {
      beam._cooldown = false;
      beam.setFillStyle(0xff4444);
    });
  }

  createRequestQueue() {
    this.queueGates = [];
    this.queueProgress = 0;
    const queueStartX = 7500;

    for (let i = 0; i < 3; i++) {
      const x = queueStartX + i * 270;
      const num = i + 1;

      const gate = this.add.rectangle(x, GAME.HEIGHT / 2, 45, 180, 0x4488ff, 0.4);
      gate.setDepth(55);
      addGlow(gate, 0x4488ff, 2, 0, false, 0.1, 12);

      const numText = this.add.text(x, GAME.HEIGHT / 2, `${num}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#4488ff',
        resolution: 2,
      });
      numText.setOrigin(0.5).setDepth(56);

      const zone = this.add.zone(x, GAME.HEIGHT / 2, 75, 210);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => this.hitQueueGate(i), null, this);

      this.queueGates.push({ gate, numText, passed: false, index: i });
    }

    const queueLabel = this.add.text(queueStartX + 270, GAME.HEIGHT / 2 - 150, 'REQUEST QUEUE\nPass in order: 1 > 2 > 3', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#4488ff',
      align: 'center',
      resolution: 2,
    });
    queueLabel.setOrigin(0.5).setDepth(60);
  }

  hitQueueGate(index) {
    if (this.queueGates[index].passed) return;

    if (index === this.queueProgress) {
      this.queueGates[index].passed = true;
      this.queueProgress++;
      this.queueGates[index].gate.setFillStyle(0x44ff44, 0.6);
      this.queueGates[index].numText.setColor('#44ff44');

      // Cascade of green particles
      const gx = this.queueGates[index].gate.x;
      const gy = this.queueGates[index].gate.y;
      for (let j = 0; j < 5; j++) {
        this.time.delayedCall(j * 60, () => {
          createCollectBurst(this, gx, gy - 60 + j * 30, 0x44ff44);
        });
      }

      this.cameras.main.shake(60, 0.003);
    } else if (index > this.queueProgress) {
      this.cameras.main.shake(100, 0.006);
      this.queueProgress = 0;
      this.queueGates.forEach(qg => {
        qg.passed = false;
        qg.gate.setFillStyle(0x4488ff, 0.4);
        qg.numText.setColor('#4488ff');
      });

      const warn = this.add.text(this.player.x, this.player.y - 60, 'Wrong order!', {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        color: '#ff4444',
        resolution: 2,
      });
      warn.setOrigin(0.5).setDepth(300);
      this.tweens.add({
        targets: warn,
        y: warn.y - 45,
        alpha: 0,
        duration: 800,
        onComplete: () => warn.destroy(),
      });
    }
  }

  createDataPackets() {
    this.dataPackets = this.physics.add.group();
    this.packetsCollected = 0;

    for (let i = 0; i < 15; i++) {
      const x = 500 + Math.random() * (WORLD.width - 1000);
      const y = 120 + Math.random() * (GAME.HEIGHT - 240);

      const packet = this.physics.add.sprite(x, y, 'gate_block');
      packet.setScale(0.5);
      packet.setTint(Phaser.Utils.Array.GetRandom(PALETTE.neon));
      packet.setBlendMode(Phaser.BlendModes.ADD);
      packet.setDepth(65);
      packet.setAlpha(0.6);
      packet._tooltip = DATA_TOOLTIPS[i % DATA_TOOLTIPS.length];

      this.tweens.add({
        targets: packet,
        y: y - 9,
        angle: 10,
        duration: 1000 + Math.random() * 500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      this.dataPackets.add(packet);
    }

    this.physics.add.overlap(this.player, this.dataPackets, this.collectPacket, null, this);
  }

  collectPacket(player, packet) {
    createCollectBurst(this, packet.x, packet.y, 0x00ffff);
    this.packetsCollected++;

    // Enhanced tooltip with border and glow styling
    const tooltip = this.add.text(packet.x, packet.y - 30, packet._tooltip, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#00ffff',
      backgroundColor: '#0d022199',
      padding: { x: 12, y: 8 },
      resolution: 2,
      stroke: '#00ffff',
      strokeThickness: 1,
    });
    tooltip.setOrigin(0.5).setDepth(300);
    addGlow(tooltip, 0x00ffff, 3, 0, false, 0.1, 10);

    this.tweens.add({
      targets: tooltip,
      y: tooltip.y - 38,
      alpha: 0,
      duration: 1200,
      delay: 600,
      onComplete: () => tooltip.destroy(),
    });

    packet.destroy();
  }

  /* ------------------------------------------------------------------ */
  /*  Boss: Rate Limit Guardian                                         */
  /* ------------------------------------------------------------------ */

  createBoss() {
    this.bossDefeated = false;

    // Arena spans one full screen starting at x=8400
    this.bossArenaX = 8400;
    this.bossArenaWidth = GAME.WIDTH; // 1920
    this.bossArenaCenterX = this.bossArenaX + this.bossArenaWidth / 2;
    this.bossArenaCenterY = GAME.HEIGHT / 2;

    // Boss orb
    this.boss = this.physics.add.sprite(this.bossArenaCenterX, this.bossArenaCenterY, 'player_orb');
    this.boss.setScale(3);
    this.boss.setTint(0xff2200);
    this.boss.setBlendMode(Phaser.BlendModes.ADD);
    this.boss.setDepth(80);
    this.boss.body.setImmovable(true);
    this.boss.body.setAllowGravity(false);
    this.boss.body.setCircle(this.boss.width / 2);
    addGlow(this.boss, 0xff4400, 6, 0, false, 0.1, 32);

    this.bossHP = 6;
    this.bossMaxHP = 6;
    this.bossVulnerable = false;
    this.bossPhaseTime = 0;
    this.bossActive = false;
    this.bossPhase2 = false;
    this.bossBeams = [];
    this.boss429s = [];
    this.bossMovementSpeed = 1.0;

    // Pulsing tween
    this.bossPulseTween = this.tweens.add({
      targets: this.boss,
      scaleX: 3.3,
      scaleY: 3.3,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // Boss arena trigger zone - activates the fight when player enters
    this.bossArenaZone = this.add.zone(this.bossArenaX, 0, 60, GAME.HEIGHT);
    this.bossArenaZone.setOrigin(0, 0);
    this.physics.add.existing(this.bossArenaZone, true);
    this.physics.add.overlap(this.player, this.bossArenaZone, () => this.activateBoss(), null, this);

    // Overlap for dashing into boss
    this.physics.add.overlap(this.player, this.boss, () => this.hitBoss(), null, this);

    // Create boss HUD (hidden until active)
    this.bossHUDContainer = this.add.container(GAME.WIDTH / 2, 40).setScrollFactor(0).setDepth(310).setAlpha(0);

    const bossTitle = this.add.text(0, 0, 'BOSS: Rate Limit Guardian', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ff4444',
      resolution: 2,
    }).setOrigin(0.5);
    addGlow(bossTitle, 0xff0000, 3, 0, false, 0.1, 12);
    this._bossTitleText = bossTitle;

    // HP bar background
    const hpBarBg = this.add.rectangle(0, 30, 300, 16, 0x333333);
    hpBarBg.setOrigin(0.5);

    // HP bar fill
    this.bossHPBar = this.add.rectangle(-150 + 1, 30, 298, 14, 0xff2200);
    this.bossHPBar.setOrigin(0, 0.5);

    // HP text
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

    // Lock camera to the boss arena
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(this.bossArenaX, 0, this.bossArenaWidth, GAME.HEIGHT);
    this.cameras.main.pan(this.bossArenaCenterX, this.bossArenaCenterY, 500, 'Power2');

    // Show boss HUD
    this.tweens.add({
      targets: this.bossHUDContainer,
      alpha: 1,
      duration: 400,
    });

    // Start boss attack cycle
    this.bossAttackTimer = this.time.addEvent({
      delay: 3000,
      callback: () => this.bossAttackCycle(),
      loop: true,
    });

    // Start vulnerability window cycle
    this.bossVulnTimer = this.time.addEvent({
      delay: 4500,
      callback: () => this.bossOpenWindow(),
      loop: true,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boss attack cycle: alternates beams and 429 barrage               */
  /* ------------------------------------------------------------------ */

  bossAttackCycle() {
    if (this.bossDefeated || this.bossVulnerable) return;

    if (this.bossPhase2) {
      // Phase 2: fire both simultaneously
      this.bossFireBeams();
      this.time.delayedCall(400, () => this.bossFire429Barrage());
    } else {
      // Phase 1: alternate between beams and 429 barrage
      this._bossAttackToggle = !this._bossAttackToggle;
      if (this._bossAttackToggle) {
        this.bossFireBeams();
      } else {
        this.bossFire429Barrage();
      }
    }
  }

  bossFireBeams() {
    if (this.bossDefeated || this.bossVulnerable) return;

    // Fire 3 horizontal beams at different y positions
    const yOffsets = [-250, 0, 250];
    yOffsets.forEach((offset, i) => {
      this.time.delayedCall(i * 300, () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        const beamY = this.bossArenaCenterY + offset;

        // Visual warning line (thin, glowing)
        const warningLine = this.add.rectangle(this.bossArenaX, beamY, this.bossArenaWidth, 4, 0xff6600, 0.3);
        warningLine.setOrigin(0, 0.5).setDepth(74);
        addGlow(warningLine, 0xff4400, 3, 0, false, 0.1, 8);

        // Warning flash: 3 quick blinks
        this.tweens.add({
          targets: warningLine,
          alpha: { from: 0.1, to: 0.6 },
          duration: 150,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            warningLine.destroy();

            if (this.bossDefeated || this.bossVulnerable) return;

            // Full beam fires
            const beam = this.add.rectangle(this.bossArenaX, beamY, this.bossArenaWidth, 20, 0xff2200, 0.9);
            beam.setOrigin(0, 0.5).setDepth(75);
            addGlow(beam, 0xff0000, 4, 0, false, 0.1, 12);

            this.physics.add.existing(beam, true);

            this.physics.add.overlap(this.player, beam, () => {
              if (this.player._invulnerable) return;
              this.hitRateLimiterBoss(beam);
            }, null, this);

            this.bossBeams.push(beam);

            // Particle trail along beam
            for (let p = 0; p < 4; p++) {
              this.time.delayedCall(p * 80, () => {
                if (beam.active) {
                  const px = this.bossArenaX + Math.random() * this.bossArenaWidth;
                  createCollectBurst(this, px, beamY, 0xff4400);
                }
              });
            }

            // Remove after a short time
            this.time.delayedCall(1200, () => {
              if (beam.active) beam.destroy();
              const idx = this.bossBeams.indexOf(beam);
              if (idx >= 0) this.bossBeams.splice(idx, 1);
            });
          },
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  429 barrage: "429" text objects rain down from above               */
  /* ------------------------------------------------------------------ */

  bossFire429Barrage() {
    if (this.bossDefeated || this.bossVulnerable) return;

    const count = this.bossPhase2 ? 10 : 6;

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 150, () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        const spawnX = this.bossArenaX + 100 + Math.random() * (this.bossArenaWidth - 200);
        const text429 = this.add.text(spawnX, -30, '429', {
          fontFamily: '"Courier New", monospace',
          fontSize: '32px',
          fontStyle: 'bold',
          color: '#ff4444',
          resolution: 2,
        });
        text429.setOrigin(0.5).setDepth(76);
        addGlow(text429, 0xff0000, 4, 0, false, 0.1, 12);

        this.physics.add.existing(text429, false);
        text429.body.setAllowGravity(false);
        text429.body.setVelocityY(this.bossPhase2 ? 400 : 280);
        text429.body.setSize(text429.width, text429.height);

        this.physics.add.overlap(this.player, text429, () => {
          if (this.player._invulnerable) return;
          this.hitRateLimiterBoss(text429);
          text429.destroy();
        }, null, this);

        this.boss429s.push(text429);

        // Destroy when off-screen
        this.time.delayedCall(3500, () => {
          if (text429.active) text429.destroy();
          const idx = this.boss429s.indexOf(text429);
          if (idx >= 0) this.boss429s.splice(idx, 1);
        });
      });
    }
  }

  hitRateLimiterBoss() {
    if (this.player._invulnerable) return;

    const pushDir = this.player.x > this.bossArenaCenterX ? 1 : -1;
    this.player.body.setVelocity(pushDir * 300, -150);

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

    this.cameras.main.shake(150, 0.008);
  }

  bossOpenWindow() {
    if (this.bossDefeated) return;

    this.bossVulnerable = true;

    // Dramatic vulnerability: boss shrinks, turns bright green
    this.boss.setTint(0x44ff44);
    this.tweens.add({
      targets: this.boss,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Ring of particles expanding outward
    const ringCount = 16;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const particle = this.add.circle(this.boss.x, this.boss.y, 6, 0x44ff44);
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(81);
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

    // Flash text
    const hitText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 180, 'COOLDOWN - STRIKE NOW!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#44ff44',
      resolution: 2,
    }).setOrigin(0.5).setDepth(300).setScrollFactor(0);
    addGlow(hitText, 0x44ff44, 6, 0, false, 0.1, 20);

    // Pulsing text
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
        // Restore boss scale
        this.tweens.add({
          targets: this.boss,
          scaleX: 3,
          scaleY: 3,
          duration: 300,
          ease: 'Power2',
        });
      }
      hitText.destroy();
    });
  }

  hitBoss() {
    if (!this.bossVulnerable || this.bossDefeated) return;
    // Only allow hitting if player is dashing or moving fast
    const speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
    if (speed < 150) return;

    this.bossVulnerable = false;
    this.bossHP--;

    // Particle explosion at impact
    createCollectBurst(this, this.boss.x, this.boss.y, 0xff4400);
    createCollectBurst(this, this.boss.x, this.boss.y, 0xffaa00);

    // Camera shake
    this.cameras.main.shake(200, 0.012);

    // Flash boss white
    this.boss.setTint(0xffffff);
    this.time.delayedCall(150, () => {
      if (!this.bossDefeated) {
        this.boss.setTint(this.bossPhase2 ? 0xaa00ff : 0xff2200);
      }
    });

    // Restore boss scale after vulnerability shrink
    this.tweens.add({
      targets: this.boss,
      scaleX: 3,
      scaleY: 3,
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
    this.player.body.setVelocity(pushDir * 350, -200);

    // Phase 2 trigger at 2 HP
    if (this.bossHP <= 2 && !this.bossPhase2) {
      this.enterBossPhase2();
    }

    if (this.bossHP <= 0) {
      this.defeatBoss();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Boss Phase 2: enraged mode at 2 HP                                */
  /* ------------------------------------------------------------------ */

  enterBossPhase2() {
    this.bossPhase2 = true;
    this.bossMovementSpeed = 1.6;

    // Boss turns purple
    this.boss.setTint(0xaa00ff);
    addGlow(this.boss, 0xaa00ff, 8, 0, false, 0.1, 40);

    // Screen flash purple
    const purpleFlash = this.add.rectangle(
      this.bossArenaCenterX, this.bossArenaCenterY,
      this.bossArenaWidth, GAME.HEIGHT,
      0xaa00ff, 0.4
    );
    purpleFlash.setDepth(200);
    this.tweens.add({
      targets: purpleFlash,
      alpha: 0,
      duration: 600,
      onComplete: () => purpleFlash.destroy(),
    });

    // Phase 2 announcement
    const phaseText = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 240, 'PHASE 2: ENRAGED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px',
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

    // Update boss title color
    if (this._bossTitleText) {
      this._bossTitleText.setColor('#aa00ff');
    }

    // HP bar turns purple
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

  defeatBoss() {
    this.bossDefeated = true;

    // Stop timers
    if (this.bossAttackTimer) this.bossAttackTimer.remove();
    if (this.bossVulnTimer) this.bossVulnTimer.remove();

    // Destroy remaining beams and 429s
    this.bossBeams.forEach(b => { if (b.active) b.destroy(); });
    this.bossBeams = [];
    this.boss429s.forEach(b => { if (b.active) b.destroy(); });
    this.boss429s = [];

    // Chain of explosions across the arena
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 120, () => {
        const ex = this.bossArenaX + 200 + Math.random() * (this.bossArenaWidth - 400);
        const ey = 150 + Math.random() * (GAME.HEIGHT - 300);
        createCollectBurst(this, ex, ey, 0xff4400);
        createCollectBurst(this, ex, ey, 0xffaa00);
        createCollectBurst(this, ex, ey, 0xff0000);
        this.cameras.main.shake(100, 0.008);
      });
    }

    // Screen flash white
    const whiteFlash = this.add.rectangle(
      this.bossArenaCenterX, this.bossArenaCenterY,
      this.bossArenaWidth + 200, GAME.HEIGHT + 200,
      0xffffff, 0.9
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

    // Big camera shake
    this.cameras.main.shake(600, 0.025);

    // Boss explodes with scale-up
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

    // "RATE LIMIT BYPASSED" neon text appears after explosions
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

      // Pulsing neon glow on the text
      this.tweens.add({
        targets: bypassText,
        alpha: { from: 0.7, to: 1 },
        scale: { from: 0.98, to: 1.02 },
        duration: 400,
        yoyo: true,
        repeat: 4,
        delay: 500,
      });

      // Fade out the victory text after a moment
      this.tweens.add({
        targets: bypassText,
        alpha: 0,
        y: bypassText.y - 40,
        duration: 800,
        delay: 3000,
        onComplete: () => bypassText.destroy(),
      });
    });

    // Spawn portal after a short delay
    this.time.delayedCall(1800, () => {
      // Restore camera to follow player and full world bounds
      this.cameras.main.setBounds(0, 0, WORLD.width, GAME.HEIGHT);
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.spawnPortalAfterBoss();
    });
  }

  spawnPortalAfterBoss() {
    this.portalX = WORLD.width - 150;
    this.portalY = GAME.HEIGHT / 2;

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

    // Fade in the portal
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

    this.portalZone = this.add.zone(this.portalX, this.portalY, 60, 60);
    this.physics.add.existing(this.portalZone, true);
    this.physics.add.overlap(this.player, this.portalZone, () => this.exitZone(), null, this);
  }

  createHUD() {
    const hudTitle = this.add.text(20, 20, 'ZONE 2: API GATEWAY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ff00ff',
      resolution: 2,
    }).setScrollFactor(0).setDepth(200);
    addGlow(hudTitle, 0xff00ff, 2, 0, false, 0.1, 8);
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

  update(time, delta) {
    this.player.update(time, delta);
    this.parallax.update(this.cameras.main);

    for (const beam of this.rateLimiters) {
      if (!beam._cooldown) {
        beam.y = beam._baseY + Math.sin(time * beam._config.speed) * beam._config.amplitude;
        beam.body.updateFromGameObject();
      }
    }

    // Boss figure-8 movement (speed increases in phase 2)
    if (this.bossActive && !this.bossDefeated && this.boss.active) {
      this.bossPhaseTime += delta * 0.001;
      const spd = this.bossMovementSpeed;
      const figureEightX = Math.sin(this.bossPhaseTime * 0.8 * spd) * 350;
      const figureEightY = Math.sin(this.bossPhaseTime * 1.6 * spd) * 200;
      this.boss.x = this.bossArenaCenterX + figureEightX;
      this.boss.y = this.bossArenaCenterY + figureEightY;
      this.boss.body.updateFromGameObject();
    }
  }
}
