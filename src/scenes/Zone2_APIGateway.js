import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { generateStarField, generateNebula, generateCitySkyline } from '../effects/procedural.js';
import { createNeonStreaks, createPortalParticles, createCollectBurst } from '../effects/particles.js';

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
    this.createPortal();
    this.setupCamera();
    this.createHUD();

    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    this.cameras.main.postFX.addBloom(0xffffff, 0.5, 0.5, 1, 1.3, 4);
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
      { x: 1000, tokenType: 0, tokenX: 800, tokenY: 250 },
      { x: 2200, tokenType: 1, tokenX: 1900, tokenY: 450 },
      { x: 3400, tokenType: 2, tokenX: 3100, tokenY: 200 },
      { x: 4600, tokenType: 0, tokenX: 4300, tokenY: 500 },
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

    const topBar = this.add.rectangle(x, 0, 12, GAME.HEIGHT / 2 - 60, tt.color);
    topBar.setOrigin(0.5, 0).setDepth(60);
    topBar.preFX.addGlow(tt.color, 3, 0, false, 0.1, 12);
    gateGroup.add(topBar);

    const bottomBar = this.add.rectangle(x, GAME.HEIGHT / 2 + 60, 12, GAME.HEIGHT / 2 - 60, tt.color);
    bottomBar.setOrigin(0.5, 0).setDepth(60);
    bottomBar.preFX.addGlow(tt.color, 3, 0, false, 0.1, 12);
    gateGroup.add(bottomBar);

    const lockText = this.add.text(x, GAME.HEIGHT / 2, 'LOCKED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ff4444',
    });
    lockText.setOrigin(0.5).setDepth(61);
    lockText.preFX.addGlow(0xff0000, 3, 0, false, 0.1, 12);

    const label = this.add.text(x, GAME.HEIGHT / 2 - 70, `Requires: ${tt.name}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
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
    token.preFX.addGlow(tt.color, 4, 0, false, 0.1, 16);
    token._gateIndex = gateIndex;
    token._tokenType = tokenTypeIdx;

    const label = this.add.text(x, y - 22, tt.name, {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    label.setOrigin(0.5).setDepth(71);
    token._label = label;

    this.tweens.add({
      targets: [token, label],
      y: y - 10,
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
      { x: 1500, y: GAME.HEIGHT / 2, amplitude: 250, speed: 0.002 },
      { x: 2800, y: GAME.HEIGHT / 2, amplitude: 200, speed: 0.003 },
      { x: 4000, y: GAME.HEIGHT / 2, amplitude: 280, speed: 0.0025 },
    ];

    limiterPositions.forEach(lp => {
      const beam = this.add.rectangle(lp.x, lp.y, GAME.WIDTH * 0.6, 8, 0xff4444);
      beam.setDepth(55);
      beam.preFX.addGlow(0xff0000, 4, 0, false, 0.1, 16);
      this.physics.add.existing(beam, false);
      beam.body.setImmovable(true);
      beam.body.setAllowGravity(false);

      beam._config = lp;
      beam._cooldown = false;
      beam._baseY = lp.y;
      this.rateLimiters.push(beam);

      this.physics.add.overlap(this.player, beam, () => this.hitRateLimiter(beam), null, this);
    });

    this.rateLimitWarning = this.add.text(GAME.WIDTH / 2, 80, '429 Too Many Requests', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ff4444',
    });
    this.rateLimitWarning.setOrigin(0.5);
    this.rateLimitWarning.setScrollFactor(0);
    this.rateLimitWarning.setDepth(300);
    this.rateLimitWarning.setAlpha(0);
    this.rateLimitWarning.preFX.addGlow(0xff0000, 6, 0, false, 0.1, 16);
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
    const queueStartX = 5000;

    for (let i = 0; i < 3; i++) {
      const x = queueStartX + i * 180;
      const num = i + 1;

      const gate = this.add.rectangle(x, GAME.HEIGHT / 2, 30, 120, 0x4488ff, 0.4);
      gate.setDepth(55);
      gate.preFX.addGlow(0x4488ff, 2, 0, false, 0.1, 12);

      const numText = this.add.text(x, GAME.HEIGHT / 2, `${num}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#4488ff',
      });
      numText.setOrigin(0.5).setDepth(56);

      const zone = this.add.zone(x, GAME.HEIGHT / 2, 50, 140);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => this.hitQueueGate(i), null, this);

      this.queueGates.push({ gate, numText, passed: false, index: i });
    }

    const queueLabel = this.add.text(queueStartX + 180, GAME.HEIGHT / 2 - 100, 'REQUEST QUEUE\nPass in order: 1 > 2 > 3', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
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

      const warn = this.add.text(this.player.x, this.player.y - 40, 'Wrong order!', {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#ff4444',
      });
      warn.setOrigin(0.5).setDepth(300);
      this.tweens.add({
        targets: warn,
        y: warn.y - 30,
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
      const y = 80 + Math.random() * (GAME.HEIGHT - 160);

      const packet = this.physics.add.sprite(x, y, 'gate_block');
      packet.setScale(0.5);
      packet.setTint(Phaser.Utils.Array.GetRandom(PALETTE.neon));
      packet.setBlendMode(Phaser.BlendModes.ADD);
      packet.setDepth(65);
      packet.setAlpha(0.6);
      packet._tooltip = DATA_TOOLTIPS[i % DATA_TOOLTIPS.length];

      this.tweens.add({
        targets: packet,
        y: y - 6,
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

    const tooltip = this.add.text(packet.x, packet.y - 20, packet._tooltip, {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#00ffff',
      backgroundColor: '#0d022180',
      padding: { x: 6, y: 3 },
    });
    tooltip.setOrigin(0.5).setDepth(300);
    this.tweens.add({
      targets: tooltip,
      y: tooltip.y - 25,
      alpha: 0,
      duration: 1200,
      delay: 600,
      onComplete: () => tooltip.destroy(),
    });

    packet.destroy();
  }

  createPortal() {
    this.portalX = WORLD.width - 150;
    this.portalY = GAME.HEIGHT / 2;

    const approvedText = this.add.text(this.portalX, this.portalY - 80, 'GATEWAY APPROVED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#44ff44',
    });
    approvedText.setOrigin(0.5).setDepth(90);
    approvedText.preFX.addGlow(0x44ff44, 4, 0, false, 0.1, 16);

    this.portal = this.add.image(this.portalX, this.portalY, 'portal_ring');
    this.portal.setBlendMode(Phaser.BlendModes.ADD);
    this.portal.setDepth(85);
    this.portal.setScale(1.5);
    this.portal.setTint(0xff00ff);
    this.portal.preFX.addGlow(0xff00ff, 4, 0, false, 0.1, 24);

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
    this.add.text(20, 20, 'ZONE 2: API GATEWAY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#ff00ff',
    }).setScrollFactor(0).setDepth(200).preFX.addGlow(0xff00ff, 2, 0, false, 0.1, 8);
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
  }
}
