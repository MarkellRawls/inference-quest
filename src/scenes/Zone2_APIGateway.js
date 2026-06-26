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
    });
    lockText.setOrigin(0.5).setDepth(61);
    addGlow(lockText, 0xff0000, 3, 0, false, 0.1, 12);

    const label = this.add.text(x, GAME.HEIGHT / 2 - 105, `Requires: ${tt.name}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#' + tt.color.toString(16).padStart(6, '0'),
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
      this.rateLimiters.push(beam);

      this.physics.add.overlap(this.player, beam, () => this.hitRateLimiter(beam), null, this);
    });

    this.rateLimitWarning = this.add.text(GAME.WIDTH / 2, 120, '429 Too Many Requests', {
      fontFamily: '"Courier New", monospace',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ff4444',
    });
    this.rateLimitWarning.setOrigin(0.5);
    this.rateLimitWarning.setScrollFactor(0);
    this.rateLimitWarning.setDepth(300);
    this.rateLimitWarning.setAlpha(0);
    addGlow(this.rateLimitWarning, 0xff0000, 6, 0, false, 0.1, 16);
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
      createCollectBurst(this, this.queueGates[index].gate.x, this.queueGates[index].gate.y, 0x44ff44);
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

    const tooltip = this.add.text(packet.x, packet.y - 30, packet._tooltip, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#00ffff',
      backgroundColor: '#0d022180',
      padding: { x: 9, y: 5 },
    });
    tooltip.setOrigin(0.5).setDepth(300);
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

    this.bossHP = 5;
    this.bossMaxHP = 5;
    this.bossVulnerable = false;
    this.bossPhaseTime = 0;
    this.bossActive = false;
    this.bossBeams = [];

    // Pulsing tween
    this.tweens.add({
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
    }).setOrigin(0.5);
    addGlow(bossTitle, 0xff0000, 3, 0, false, 0.1, 12);

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
      callback: () => this.bossFireBeams(),
      loop: true,
    });

    // Start vulnerability window cycle
    this.bossVulnTimer = this.time.addEvent({
      delay: 4500,
      callback: () => this.bossOpenWindow(),
      loop: true,
    });
  }

  bossFireBeams() {
    if (this.bossDefeated || this.bossVulnerable) return;

    // Fire 3 horizontal beams at different y positions
    const yOffsets = [-250, 0, 250];
    yOffsets.forEach((offset, i) => {
      this.time.delayedCall(i * 300, () => {
        if (this.bossDefeated || this.bossVulnerable) return;

        const beamY = this.bossArenaCenterY + offset;
        const beam = this.add.rectangle(this.bossArenaX, beamY, this.bossArenaWidth, 20, 0xff2200, 0.8);
        beam.setOrigin(0, 0.5).setDepth(75);
        beam.setAlpha(0);
        addGlow(beam, 0xff0000, 4, 0, false, 0.1, 12);

        // Warning flash
        this.tweens.add({
          targets: beam,
          alpha: 0.3,
          duration: 200,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            // Full beam fires
            beam.setAlpha(0.9);
            this.physics.add.existing(beam, true);

            this.physics.add.overlap(this.player, beam, () => {
              if (this.player._invulnerable) return;
              this.hitRateLimiterBoss(beam);
            }, null, this);

            this.bossBeams.push(beam);

            // Remove after a short time
            this.time.delayedCall(1200, () => {
              beam.destroy();
              const idx = this.bossBeams.indexOf(beam);
              if (idx >= 0) this.bossBeams.splice(idx, 1);
            });
          },
        });
      });
    });
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
    this.boss.setTint(0x44ff44);

    // Flash text
    const hitText = this.add.text(this.bossArenaCenterX, this.bossArenaCenterY - 120, 'COOLDOWN - STRIKE NOW!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#44ff44',
    }).setOrigin(0.5).setDepth(300).setScrollFactor(0, 0);
    // Position it relative to camera
    hitText.setPosition(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 180);
    addGlow(hitText, 0x44ff44, 4, 0, false, 0.1, 16);

    this.time.delayedCall(2000, () => {
      this.bossVulnerable = false;
      if (!this.bossDefeated) {
        this.boss.setTint(0xff2200);
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

    // Flash boss red
    this.boss.setTint(0xffffff);
    this.time.delayedCall(150, () => {
      if (!this.bossDefeated) this.boss.setTint(0xff2200);
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

    if (this.bossHP <= 0) {
      this.defeatBoss();
    }
  }

  defeatBoss() {
    this.bossDefeated = true;

    // Stop timers
    if (this.bossAttackTimer) this.bossAttackTimer.remove();
    if (this.bossVulnTimer) this.bossVulnTimer.remove();

    // Destroy remaining beams
    this.bossBeams.forEach(b => b.destroy());
    this.bossBeams = [];

    // Massive particle explosion
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 100, () => {
        createCollectBurst(this, this.boss.x + Phaser.Math.Between(-40, 40), this.boss.y + Phaser.Math.Between(-40, 40), 0xff4400);
        createCollectBurst(this, this.boss.x + Phaser.Math.Between(-40, 40), this.boss.y + Phaser.Math.Between(-40, 40), 0xffaa00);
        createCollectBurst(this, this.boss.x + Phaser.Math.Between(-40, 40), this.boss.y + Phaser.Math.Between(-40, 40), 0xff0000);
      });
    }

    // Camera shake
    this.cameras.main.shake(500, 0.02);

    // Boss explodes
    this.tweens.add({
      targets: this.boss,
      scale: 6,
      alpha: 0,
      duration: 800,
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

    // Spawn portal after a short delay
    this.time.delayedCall(1200, () => {
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

    // Boss figure-8 movement
    if (this.bossActive && !this.bossDefeated && this.boss.active) {
      this.bossPhaseTime += delta * 0.001;
      const figureEightX = Math.sin(this.bossPhaseTime * 0.8) * 350;
      const figureEightY = Math.sin(this.bossPhaseTime * 1.6) * 200;
      this.boss.x = this.bossArenaCenterX + figureEightX;
      this.boss.y = this.bossArenaCenterY + figureEightY;
      this.boss.body.updateFromGameObject();
    }
  }
}
