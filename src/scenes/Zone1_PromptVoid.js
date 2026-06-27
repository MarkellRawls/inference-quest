import Phaser from 'phaser';
import { GAME, SCENES, ZONE_WORLDS } from '../config/constants.js';
import { PALETTES } from '../config/colors.js';
import { ZONE_CARDS } from '../config/cards.js';
import { Player } from '../objects/Player.js';
import { ParallaxBackground } from '../objects/ParallaxBackground.js';
import { createNullFragment, createErrorSprite, createGlitchTurret } from '../objects/Enemy.js';
import { createPlatform, createSolidPlatform, createGround, createMovingPlatform, createCrumblingPlatform, createHazardSpikes, createConveyor } from '../objects/Platform.js';
import { generateStarField, generateNebula } from '../effects/procedural.js';
import { createAmbientParticles, createPortalParticles, createCollectBurst, createEnemyDeath, createGroundFog } from '../effects/particles.js';
import { addGlow, addPostBloom } from '../utils/helpers.js';

const PALETTE = PALETTES.PROMPT_VOID;
const WORLD = ZONE_WORLDS.PROMPT_VOID;

const PROMPT_FRAGMENTS = [
  'Hello,', 'Tell me', 'about', 'How does', 'What is',
  'the meaning', 'of', 'artificial', 'intelligence', '?',
  'Explain', 'neural', 'networks', 'to me', 'Please',
  'Generate', 'a story', 'about', 'machine', 'learning',
];

const BOSS_PROJECTILE_WORDS = ['ERR0R', 'NaN', 'undef', 'null', 'segfault', '404', 'FATAL', '0xDEAD'];

// Ground level constant
const GROUND_Y = 1700;
const GROUND_HEIGHT = 460; // fills down to world bottom (2160 - 1700)

export class Zone1_PromptVoid extends Phaser.Scene {
  constructor() {
    super(SCENES.ZONE1);
  }

  init(data) {
    this.playerData = data || {};
  }

  create() {
    // -- World bounds --
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    // -- Groups --
    this.grounds = [];
    this.platforms = [];
    this.movingPlatforms = [];
    this.crumblingPlatforms = [];
    this.conveyors = [];
    this.hazards = [];
    this.enemies = this.physics.add.group();
    this._enemyProjectiles = this.physics.add.group();

    // -- Build the level --
    this.createBackgrounds();
    this.createGroundFog();
    this.createAmbientEffects();
    this.createVignette();
    this.createTerrain();
    this.createPlatforms();
    this.createEnemies();
    this.createPlayer();
    this.createFloatingText();
    this.createBoss();
    this.createPortal();
    this.createHUD();
    this.setupCollisions();
    this.setupCamera();

    // -- Intro --
    this.cameras.main.fadeIn(GAME.ZONE_TRANSITION_DURATION, 0, 0, 0);
    addPostBloom(this.cameras.main, 0xffffff, 0.5, 0.5, 1, 1.2, 4);

    this.showIntroTypewriter();
  }

  // ===================================================================
  //  BACKGROUNDS
  // ===================================================================

  createBackgrounds() {
    if (!this.textures.exists('z1_stars_far')) {
      generateStarField(this, 'z1_stars_far', 512, 512, 50, [0xffffff, 0xccccff]);
      generateStarField(this, 'z1_stars_near', 512, 512, 120, [0xffffff, 0xddddff, 0x8888ff]);
      generateNebula(this, 'z1_nebula', 512, 512, [0x3333aa, 0x5533aa, 0x2244bb]);
    }

    this.add.rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.bg[0])
      .setOrigin(0, 0).setDepth(-200);

    // Subtle gradient overlay for depth
    const grad = this.add.rectangle(0, WORLD.height * 0.4, WORLD.width, WORLD.height * 0.6, PALETTE.bg[1])
      .setOrigin(0, 0).setDepth(-199).setAlpha(0.4);

    this.parallax = new ParallaxBackground(this, [
      { key: 'z1_stars_far', speed: 0.02, alpha: 0.5 },
      { key: 'z1_nebula', speed: 0.06, alpha: 0.35 },
      { key: 'z1_stars_near', speed: 0.1, alpha: 0.7 },
    ]);
  }

  createGroundFog() {
    // Ground fog along each ground segment
    this.groundFog1 = createGroundFog(this, 1200, GROUND_Y, PALETTE.glow);
    this.groundFog2 = createGroundFog(this, 3000, GROUND_Y, PALETTE.glow);
    this.groundFog3 = createGroundFog(this, 5000, GROUND_Y, PALETTE.glow);
    this.groundFog4 = createGroundFog(this, 7200, GROUND_Y, PALETTE.glow);
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

  // ===================================================================
  //  TERRAIN  (Ground segments with gaps)
  // ===================================================================

  createTerrain() {
    // Segment 1: x=0 to x=1200  (spawn area)
    const g1 = createGround(this, 0, GROUND_Y, 1200, PALETTE.accent, GROUND_HEIGHT);
    this.grounds.push(g1);

    // Segment 2: x=1600 to x=3000  (early platforming area)
    const g2 = createGround(this, 1600, GROUND_Y, 1400, PALETTE.accent, GROUND_HEIGHT);
    this.grounds.push(g2);

    // Segment 3: x=3400 to x=5000  (mid-level)
    const g3 = createGround(this, 3400, GROUND_Y, 1600, PALETTE.accent, GROUND_HEIGHT);
    this.grounds.push(g3);

    // Segment 4: x=5400 to x=7200  (boss arena + end)
    const g4 = createGround(this, 5400, GROUND_Y, 1800, PALETTE.accent, GROUND_HEIGHT);
    this.grounds.push(g4);
  }

  // ===================================================================
  //  PLATFORMS  (mix of static, moving, crumbling, conveyors, spikes)
  // ===================================================================

  createPlatforms() {
    const accent = PALETTE.accent;

    // --- SEGMENT 1: Intro area (x 0-1200) ---
    // Low platform to teach jumping
    this.addPlatform(createPlatform(this, 400, GROUND_Y - 200, 200, accent));
    this.addPlatform(createPlatform(this, 750, GROUND_Y - 350, 180, accent));
    this.addPlatform(createPlatform(this, 1000, GROUND_Y - 180, 150, accent));

    // --- GAP 1 (x 1200-1600) ---
    // Spikes at the bottom of the gap
    const spikes1 = createHazardSpikes(this, 1280, GROUND_Y + 40, 200, 0xff2222);
    this.hazards.push(spikes1);

    // Moving platform over gap 1
    const mp1 = createMovingPlatform(this, 1400, GROUND_Y - 120, 160, {
      color: 0x44ff88, moveType: 'horizontal', range: 150, speed: 0.8,
    });
    this.addPlatform(mp1);
    this.movingPlatforms.push(mp1);

    // --- SEGMENT 2: Challenge ramp (x 1600-3000) ---
    this.addPlatform(createPlatform(this, 1800, GROUND_Y - 250, 200, accent));
    this.addPlatform(createSolidPlatform(this, 2100, GROUND_Y - 400, 180, accent));

    // Crumbling platform over a dangerous spot
    const crumb1 = createCrumblingPlatform(this, 2400, GROUND_Y - 280, 160, 0xffaa44);
    this.addPlatform(crumb1);
    this.crumblingPlatforms.push(crumb1);

    // Conveyor belt pushing toward gap
    const conv1 = createConveyor(this, 2600, GROUND_Y - 180, 220, 120, 0x44aaff);
    this.addPlatform(conv1);
    this.conveyors.push(conv1);

    // High platform near end of segment 2
    this.addPlatform(createPlatform(this, 2850, GROUND_Y - 450, 180, accent));

    // Vertically moving platform
    const mp2 = createMovingPlatform(this, 2950, GROUND_Y - 300, 140, {
      color: 0x44ff88, moveType: 'vertical', range: 120, speed: 1.0,
    });
    this.addPlatform(mp2);
    this.movingPlatforms.push(mp2);

    // --- GAP 2 (x 3000-3400) ---
    const spikes2 = createHazardSpikes(this, 3080, GROUND_Y + 40, 240, 0xff2222);
    this.hazards.push(spikes2);

    // Crumbling platform over gap 2
    const crumb2 = createCrumblingPlatform(this, 3200, GROUND_Y - 100, 140, 0xffaa44);
    this.addPlatform(crumb2);
    this.crumblingPlatforms.push(crumb2);

    // --- SEGMENT 3: Gauntlet (x 3400-5000) ---
    this.addPlatform(createPlatform(this, 3600, GROUND_Y - 300, 200, accent));
    this.addPlatform(createSolidPlatform(this, 3900, GROUND_Y - 450, 160, accent));

    // Moving platform -- horizontal sweep
    const mp3 = createMovingPlatform(this, 4100, GROUND_Y - 250, 150, {
      color: 0x44ff88, moveType: 'horizontal', range: 180, speed: 1.2,
    });
    this.addPlatform(mp3);
    this.movingPlatforms.push(mp3);

    // Conveyor belt going the other direction
    const conv2 = createConveyor(this, 4350, GROUND_Y - 180, 200, -100, 0x44aaff);
    this.addPlatform(conv2);
    this.conveyors.push(conv2);

    this.addPlatform(createPlatform(this, 4600, GROUND_Y - 350, 180, accent));
    this.addPlatform(createPlatform(this, 4850, GROUND_Y - 200, 150, accent));

    // --- GAP 3 (x 5000-5400) ---
    const spikes3 = createHazardSpikes(this, 5080, GROUND_Y + 40, 240, 0xff2222);
    this.hazards.push(spikes3);

    // Moving platform over gap 3
    const mp4 = createMovingPlatform(this, 5200, GROUND_Y - 150, 180, {
      color: 0x44ff88, moveType: 'horizontal', range: 140, speed: 0.9, phase: Math.PI,
    });
    this.addPlatform(mp4);
    this.movingPlatforms.push(mp4);

    // --- SEGMENT 4: Boss Arena (x 5400-7200) ---
    // Arena wall (left side of boss zone)
    this.addPlatform(createSolidPlatform(this, 5800, GROUND_Y - 600, 30, accent, 600));
    // Arena wall (right side of boss zone)
    this.addPlatform(createSolidPlatform(this, 7000, GROUND_Y - 600, 30, accent, 600));

    // High escape platform in boss arena
    this.addPlatform(createPlatform(this, 6100, GROUND_Y - 350, 200, accent));
    this.addPlatform(createPlatform(this, 6600, GROUND_Y - 350, 200, accent));

    // Crumbling platform in boss arena (tension!)
    const crumb3 = createCrumblingPlatform(this, 6350, GROUND_Y - 500, 180, 0xffaa44);
    this.addPlatform(crumb3);
    this.crumblingPlatforms.push(crumb3);
  }

  addPlatform(plat) {
    this.platforms.push(plat);
  }

  // ===================================================================
  //  ENEMIES
  // ===================================================================

  createEnemies() {
    // --- NullFragments on ground (9 total) ---
    const nullPositions = [
      500, 900,       // segment 1
      1750, 2050, 2500, 2800,  // segment 2
      3600, 4200, 4700,        // segment 3
    ];
    for (const ex of nullPositions) {
      const enemy = createNullFragment(this, ex, GROUND_Y - 30);
      this.enemies.add(enemy);
    }

    // --- ErrorSprites flying above platforms (5 total) ---
    const errorPositions = [
      { x: 800, y: GROUND_Y - 500 },
      { x: 2200, y: GROUND_Y - 550 },
      { x: 3750, y: GROUND_Y - 580 },
      { x: 4400, y: GROUND_Y - 500 },
      { x: 4900, y: GROUND_Y - 520 },
    ];
    for (const pos of errorPositions) {
      const enemy = createErrorSprite(this, pos.x, pos.y);
      this.enemies.add(enemy);
    }

    // --- GlitchTurrets on high platforms (3 total) ---
    const turretPositions = [
      { x: 2100, y: GROUND_Y - 430 },  // on solid platform at 2100
      { x: 3900, y: GROUND_Y - 480 },  // on solid platform at 3900
      { x: 4600, y: GROUND_Y - 380 },  // on platform at 4600
    ];
    for (const pos of turretPositions) {
      const enemy = createGlitchTurret(this, pos.x, pos.y);
      this.enemies.add(enemy);
    }
  }

  // ===================================================================
  //  PLAYER
  // ===================================================================

  createPlayer() {
    this.player = new Player(this, 120, GROUND_Y - 60);
    this.player.setZonePalette(PALETTE);
  }

  // ===================================================================
  //  FLOATING TEXT  (ambient code fragments drifting through the void)
  // ===================================================================

  createFloatingText() {
    this.floatingTexts = [];
    const textStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      color: '#6a5acd',
      resolution: 2,
    };

    for (let i = 0; i < 50; i++) {
      const word = PROMPT_FRAGMENTS[i % PROMPT_FRAGMENTS.length];
      const x = 200 + Math.random() * (WORLD.width - 400);
      const y = 200 + Math.random() * (GROUND_Y - 400);
      const txt = this.add.text(x, y, word, textStyle);
      txt.setAlpha(0.1 + Math.random() * 0.2);
      txt.setDepth(5);
      txt._driftSpeed = 6 + Math.random() * 12;
      txt._baseY = y;
      txt._bobOffset = Math.random() * Math.PI * 2;
      this.floatingTexts.push(txt);
    }
  }

  // ===================================================================
  //  BOSS: THE SYNTAX CORRUPTOR
  // ===================================================================

  createBoss() {
    this.bossDefeated = false;
    this.bossActivated = false;
    this.bossHP = 6;
    this.bossMaxHP = 6;
    this.bossVulnerable = false;
    this.bossPhase = 1;
    this.bossAttackIndex = 0;

    const bossX = 6400;
    const bossY = GROUND_Y - 450;

    // Boss sprite -- large pulsing orb
    this.boss = this.physics.add.sprite(bossX, bossY, 'player_orb');
    this.boss.setScale(3.0);
    this.boss.setTint(0xff4466);
    this.boss.setBlendMode(Phaser.BlendModes.ADD);
    this.boss.setDepth(85);
    this.boss.setVisible(false);
    this.boss.body.setImmovable(true);
    this.boss.body.setAllowGravity(false);
    this.boss.body.setCircle(24, 8, 8);
    this.boss._baseX = bossX;
    this.boss._baseY = bossY;
    this.boss._sineOffset = 0;
    addGlow(this.boss, 0xff4466, 6, 0, false, 0.1, 32);

    this.bossPulseTween = this.tweens.add({
      targets: this.boss,
      scaleX: 3.4,
      scaleY: 3.4,
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    // Boss projectiles group (text objects managed manually)
    this.bossProjectiles = this.add.group();

    // Boss shockwave group (physics bodies for ground slam)
    this.bossShockwaves = this.physics.add.group();

    // Vulnerability text
    this.bossVulnText = this.add.text(bossX, bossY - 100, 'VULNERABLE!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      color: '#44ff88',
      fontStyle: 'bold',
      resolution: 2,
    });
    this.bossVulnText.setOrigin(0.5);
    this.bossVulnText.setDepth(90);
    this.bossVulnText.setAlpha(0);
    addGlow(this.bossVulnText, 0x44ff88, 4, 0, false, 0.1, 16);

    // Boss trigger zone -- invisible line at x=5900
    this.bossTriggerZone = this.add.zone(5900, GROUND_Y - 300, 60, 600);
    this.physics.add.existing(this.bossTriggerZone, true);
  }

  activateBoss() {
    if (this.bossActivated || this.bossDefeated) return;
    this.bossActivated = true;

    // Boss entrance dramatic reveal
    this.boss.setVisible(true);
    this.boss.setAlpha(0);

    // Brief camera lock on boss
    this.cameras.main.shake(400, 0.008);

    // Boss title flash
    const bossIntro = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2 - 100, 'THE SYNTAX CORRUPTOR', {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      color: '#ff4466',
      fontStyle: 'bold',
      resolution: 2,
    });
    bossIntro.setOrigin(0.5);
    bossIntro.setScrollFactor(0);
    bossIntro.setDepth(300);
    bossIntro.setAlpha(0);
    addGlow(bossIntro, 0xff4466, 6, 0, false, 0.1, 24);

    this.tweens.add({
      targets: bossIntro,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
      hold: 1500,
      yoyo: true,
      onComplete: () => bossIntro.destroy(),
    });

    this.tweens.add({
      targets: this.boss,
      alpha: 1,
      duration: 1200,
      ease: 'Power2',
    });

    this.bossPulseTween.resume();

    // Show boss HUD
    this.tweens.add({
      targets: this.bossHUD,
      alpha: 1,
      duration: 600,
      delay: 800,
    });

    // Start attack cycle after a brief pause
    this.time.delayedCall(2000, () => {
      if (!this.bossDefeated) this.bossAttackCycle();
    });
  }

  bossAttackCycle() {
    if (this.bossDefeated || !this.bossActivated) return;

    const attacks = this.bossPhase === 1
      ? ['slam', 'burst', 'slam', 'minions']
      : ['slam', 'burst', 'burst', 'slam', 'minions'];

    const attack = attacks[this.bossAttackIndex % attacks.length];
    this.bossAttackIndex++;

    const delay = this.bossPhase === 1 ? 3500 : 2500;

    if (attack === 'slam') {
      this.bossGroundSlam();
    } else if (attack === 'burst') {
      this.bossProjectileBurst();
    } else if (attack === 'minions') {
      this.bossSpawnMinions();
    }

    // After slam, become vulnerable
    if (attack === 'slam') {
      this.time.delayedCall(1200, () => {
        if (!this.bossDefeated) this.startBossVulnerability();
      });
    }

    // Queue next attack
    this.time.delayedCall(delay, () => {
      if (!this.bossDefeated && this.bossActivated) {
        this.bossAttackCycle();
      }
    });
  }

  bossGroundSlam() {
    if (this.bossDefeated) return;

    // Boss telegraphs by rising up
    this.tweens.add({
      targets: this.boss,
      y: this.boss._baseY - 150,
      duration: 400,
      ease: 'Power2',
      yoyo: true,
      onYoyo: () => {
        // Slam impact -- create shockwave rectangle sweeping across ground
        this.cameras.main.shake(300, 0.015);

        // Shockwave sweeps left
        const waveLeft = this.add.rectangle(this.boss.x, GROUND_Y - 20, 80, 40, 0xff4466);
        waveLeft.setBlendMode(Phaser.BlendModes.ADD);
        waveLeft.setAlpha(0.8);
        waveLeft.setDepth(86);
        this.physics.add.existing(waveLeft);
        waveLeft.body.setAllowGravity(false);
        waveLeft.body.setVelocity(-400, 0);
        waveLeft.body.setImmovable(true);
        this.bossShockwaves.add(waveLeft);

        // Shockwave sweeps right
        const waveRight = this.add.rectangle(this.boss.x, GROUND_Y - 20, 80, 40, 0xff4466);
        waveRight.setBlendMode(Phaser.BlendModes.ADD);
        waveRight.setAlpha(0.8);
        waveRight.setDepth(86);
        this.physics.add.existing(waveRight);
        waveRight.body.setAllowGravity(false);
        waveRight.body.setVelocity(400, 0);
        waveRight.body.setImmovable(true);
        this.bossShockwaves.add(waveRight);

        // Fade and destroy after traveling
        [waveLeft, waveRight].forEach(wave => {
          addGlow(wave, 0xff4466, 3, 0, false, 0.1, 12);
          this.tweens.add({
            targets: wave,
            alpha: 0,
            scaleY: 0.3,
            duration: 1200,
            onComplete: () => {
              this.bossShockwaves.remove(wave, true, true);
            },
          });
        });

        // Ground impact particles
        for (let px = -200; px <= 200; px += 60) {
          createCollectBurst(this, this.boss.x + px, GROUND_Y - 10, 0xff4466);
        }
      },
    });
  }

  bossProjectileBurst() {
    if (this.bossDefeated) return;

    const count = this.bossPhase === 1 ? 6 : 10;
    const bx = this.boss.x;
    const by = this.boss.y;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const word = BOSS_PROJECTILE_WORDS[Math.floor(Math.random() * BOSS_PROJECTILE_WORDS.length)];

      this.time.delayedCall(i * 60, () => {
        if (this.bossDefeated) return;

        const proj = this.add.text(bx, by, word, {
          fontFamily: '"Courier New", monospace',
          fontSize: '20px',
          color: '#ff4466',
          fontStyle: 'bold',
          resolution: 2,
        });
        proj.setOrigin(0.5);
        proj.setDepth(86);
        proj.setBlendMode(Phaser.BlendModes.ADD);
        addGlow(proj, 0xff4466, 2, 0, false, 0.1, 8);

        const speed = this.bossPhase === 1 ? 200 + Math.random() * 60 : 280 + Math.random() * 80;
        proj._vx = Math.cos(angle) * speed;
        proj._vy = Math.sin(angle) * speed;
        proj._lifetime = 0;

        this.bossProjectiles.add(proj);
      });
    }

    this.cameras.main.shake(80, 0.004);
  }

  bossSpawnMinions() {
    if (this.bossDefeated) return;

    // Spawn 2 NullFragments near the boss arena
    const offsets = [-200, 200];
    for (const ox of offsets) {
      const minion = createNullFragment(this, this.boss.x + ox, GROUND_Y - 30);
      this.enemies.add(minion);

      // Dramatic spawn particles
      createCollectBurst(this, this.boss.x + ox, GROUND_Y - 30, 0x8866ff);
    }

    // Re-setup collisions for new enemies
    for (const g of this.grounds) {
      this.physics.add.collider(this.enemies, g);
    }
  }

  startBossVulnerability() {
    if (this.bossDefeated || !this.bossActivated) return;

    this.bossVulnerable = true;
    this.boss.setTint(0x44ff88);

    this.bossVulnText.setAlpha(1);
    this.tweens.add({
      targets: this.bossVulnText,
      alpha: { from: 1, to: 0.3 },
      duration: 250,
      yoyo: true,
      repeat: 4,
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

    if (this.bossVulnerable && player.attackHitbox) {
      // Player melee landed during vulnerability
      this.damageBoss();
    } else if (!player._invulnerable && !player.isDashing) {
      const kbx = (player.x < boss.x) ? -400 : 400;
      player.takeDamage(kbx, -250);
      this.flashPlayerDamage();
    }
  }

  onAttackHitBoss() {
    if (this.bossDefeated || !this.bossVulnerable) return;
    this.damageBoss();
  }

  damageBoss() {
    this.bossHP--;
    this.bossVulnerable = false;
    this.bossVulnText.setAlpha(0);
    this.boss.setTint(0xff4466);

    createCollectBurst(this, this.boss.x, this.boss.y, 0xff4466);
    createCollectBurst(this, this.boss.x, this.boss.y, 0xffffff);

    this.cameras.main.shake(250, 0.012);

    // Flash white
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

    // Phase 2 trigger
    if (this.bossHP <= 3 && this.bossPhase === 1) {
      this.bossPhase = 2;
      this.cameras.main.flash(300, 255, 68, 102, true);

      // Boss turns more aggressive color briefly
      this.boss.setTint(0xff0000);
      this.time.delayedCall(500, () => {
        if (!this.bossDefeated) this.boss.setTint(0xff4466);
      });

      // Phase 2 announcement
      const p2text = this.add.text(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'PHASE 2: CORRUPTED FURY', {
        fontFamily: '"Courier New", monospace',
        fontSize: '36px',
        color: '#ff2222',
        fontStyle: 'bold',
        resolution: 2,
      });
      p2text.setOrigin(0.5);
      p2text.setScrollFactor(0);
      p2text.setDepth(300);
      addGlow(p2text, 0xff2222, 4, 0, false, 0.1, 16);

      this.tweens.add({
        targets: p2text,
        alpha: 0,
        duration: 2000,
        delay: 1000,
        onComplete: () => p2text.destroy(),
      });
    }

    if (this.bossHP <= 0) {
      this.defeatBoss();
    }
  }

  defeatBoss() {
    this.bossDefeated = true;
    this.bossVulnerable = false;

    // Clear boss projectiles
    this.bossProjectiles.getChildren().forEach(p => p.destroy());
    this.bossProjectiles.clear(true);

    // Clear shockwaves
    this.bossShockwaves.clear(true, true);

    // Multi-burst explosion
    const bx = this.boss.x;
    const by = this.boss.y;
    const burstColors = [0xff4466, 0xff88aa, 0xffffff, 0x7b68ee, 0x00ffff, 0x44ff88];
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 180, () => {
        const ox = (Math.random() - 0.5) * 80;
        const oy = (Math.random() - 0.5) * 80;
        createCollectBurst(this, bx + ox, by + oy, burstColors[i]);
      });
    }

    this.cameras.main.shake(600, 0.02);

    // Boss scales up and fades
    this.tweens.add({
      targets: this.boss,
      scale: 6,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        this.boss.setVisible(false);
        this.boss.body.enable = false;
      },
    });

    // Fade HUD
    this.tweens.add({
      targets: this.bossHUD,
      alpha: 0,
      duration: 800,
      delay: 500,
    });

    this.bossVulnText.setAlpha(0);

    // Victory text
    const victoryText = this.add.text(bx, by - 100, 'SYNTAX CORRUPTOR DEFEATED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px',
      color: '#44ff88',
      fontStyle: 'bold',
      resolution: 2,
    });
    victoryText.setOrigin(0.5);
    victoryText.setDepth(200);
    addGlow(victoryText, 0x44ff88, 4, 0, false, 0.1, 16);

    this.tweens.add({
      targets: victoryText,
      alpha: 0,
      y: by - 200,
      duration: 3000,
      delay: 1500,
      onComplete: () => victoryText.destroy(),
    });

    // Spawn portal
    this.time.delayedCall(2000, () => {
      this.activatePortal();
    });
  }

  // ===================================================================
  //  PORTAL
  // ===================================================================

  createPortal() {
    this.portalX = 7050;
    this.portalY = GROUND_Y - 80;
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

    this.showStoryText('Input parsed. Entering the pipeline...', this.portalX - 300, this.portalY - 140);
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

  // ===================================================================
  //  HUD
  // ===================================================================

  createHUD() {
    // --- HP display (top-left, fixed to camera) ---
    this.hpContainer = this.add.container(30, 30);
    this.hpContainer.setScrollFactor(0);
    this.hpContainer.setDepth(210);

    const hpLabel = this.add.text(0, 0, 'HP', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      color: '#e0e0ff',
      fontStyle: 'bold',
      resolution: 2,
    });
    this.hpContainer.add(hpLabel);

    this.hpPips = [];
    for (let i = 0; i < this.player.maxHp; i++) {
      const pip = this.add.rectangle(50 + i * 28, 8, 20, 16, 0x00ffff);
      pip.setStrokeStyle(1, 0x00ffff, 0.6);
      addGlow(pip, 0x00ffff, 2, 0, false, 0.1, 8);
      this.hpContainer.add(pip);
      this.hpPips.push(pip);
    }

    // --- Zone title (top center, fades out) ---
    const zoneTitle = this.add.text(GAME.WIDTH / 2, 30, 'ZONE 1: THE PROMPT VOID', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      color: '#e0e0ff',
      fontStyle: 'bold',
      resolution: 2,
    });
    zoneTitle.setOrigin(0.5, 0);
    zoneTitle.setScrollFactor(0);
    zoneTitle.setDepth(210);
    addGlow(zoneTitle, PALETTE.accent, 3, 0, false, 0.1, 12);

    this.tweens.add({
      targets: zoneTitle,
      alpha: 0,
      duration: 1500,
      delay: 4000,
      onComplete: () => zoneTitle.destroy(),
    });

    // --- Boss HUD (hidden until boss activates) ---
    this.bossHUD = this.add.container(GAME.WIDTH / 2, 50);
    this.bossHUD.setScrollFactor(0);
    this.bossHUD.setDepth(210);
    this.bossHUD.setAlpha(0);

    const bossTitle = this.add.text(0, 0, 'SYNTAX CORRUPTOR', {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      color: '#ff4466',
      fontStyle: 'bold',
      resolution: 2,
    });
    bossTitle.setOrigin(0.5, 0);
    addGlow(bossTitle, 0xff4466, 3, 0, false, 0.1, 12);

    const hpBarBg = this.add.rectangle(0, 36, 300, 18, 0x330011);
    hpBarBg.setOrigin(0.5, 0);
    hpBarBg.setStrokeStyle(1, 0xff4466, 0.6);

    this.bossHPBar = this.add.rectangle(-146, 40, 292, 10, 0xff4466);
    this.bossHPBar.setOrigin(0, 0);
    addGlow(this.bossHPBar, 0xff4466, 2, 0, false, 0.1, 8);

    this.bossHUD.add([bossTitle, hpBarBg, this.bossHPBar]);
  }

  updateHUD() {
    for (let i = 0; i < this.hpPips.length; i++) {
      if (i < this.player.hp) {
        this.hpPips[i].setFillStyle(0x00ffff);
        this.hpPips[i].setAlpha(1);
      } else {
        this.hpPips[i].setFillStyle(0x222244);
        this.hpPips[i].setAlpha(0.4);
      }
    }
  }

  // ===================================================================
  //  COLLISIONS
  // ===================================================================

  setupCollisions() {
    // Player vs ground/platforms
    for (const g of this.grounds) {
      this.physics.add.collider(this.player, g);
    }
    for (const p of this.platforms) {
      this.physics.add.collider(this.player, p, this.onPlayerPlatformCollide, null, this);
    }
    for (const mp of this.movingPlatforms) {
      this.physics.add.collider(this.player, mp);
    }
    for (const cp of this.crumblingPlatforms) {
      this.physics.add.collider(this.player, cp, this.onPlayerPlatformCollide, null, this);
    }
    for (const cv of this.conveyors) {
      this.physics.add.collider(this.player, cv);
    }

    // Enemies vs ground (so walkers stay on ground)
    for (const g of this.grounds) {
      this.physics.add.collider(this.enemies, g);
    }
    for (const p of this.platforms) {
      this.physics.add.collider(this.enemies, p);
    }

    // Player vs enemies (damage on contact)
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerEnemyCollide, null, this);

    // Enemy projectiles vs player
    this.physics.add.overlap(this.player, this._enemyProjectiles, this.onProjectileHit, null, this);

    // Player vs boss body
    this.physics.add.overlap(this.player, this.boss, this.onPlayerHitBoss, null, this);

    // Boss shockwaves vs player
    this.physics.add.overlap(this.player, this.bossShockwaves, this.onShockwaveHit, null, this);

    // Player vs boss trigger zone
    this.physics.add.overlap(this.player, this.bossTriggerZone, () => {
      this.activateBoss();
    }, null, this);

    // Player vs hazard spikes
    for (const spike of this.hazards) {
      this.physics.add.overlap(this.player, spike, this.onHazardHit, null, this);
    }
  }

  onPlayerPlatformCollide(player, platform) {
    // Crumbling platform: start crumble when player lands on it
    if (platform.startCrumble && player.body.blocked.down) {
      platform.startCrumble();
    }
  }

  onPlayerEnemyCollide(player, enemy) {
    if (player._invulnerable || enemy._dead) return;

    // Check if player is attacking (melee overlap)
    if (player.attackHitbox) {
      const hb = player.attackHitbox;
      const dx = Math.abs(hb.x - enemy.x);
      const dy = Math.abs(hb.y - enemy.y);
      if (dx < GAME.ATTACK_RANGE && dy < 50) {
        enemy.takeDamage(GAME.ATTACK_DAMAGE, player.facing);
        return;
      }
    }

    // Otherwise, player takes damage
    if (!player.isDashing) {
      const kbx = (player.x < enemy.x) ? -300 : 300;
      player.takeDamage(kbx, -200);
      this.flashPlayerDamage();
    }
  }

  onProjectileHit(player, projectile) {
    if (player._invulnerable || player.isDashing) return;

    const kbx = (player.x < projectile.x) ? -250 : 250;
    player.takeDamage(kbx, -180);
    this.flashPlayerDamage();

    if (projectile.body) {
      projectile.destroy();
    }
  }

  onShockwaveHit(player, shockwave) {
    if (player._invulnerable || player.isDashing) return;

    const kbx = (player.x < shockwave.x) ? -350 : 350;
    player.takeDamage(kbx, -300);
    this.flashPlayerDamage();
  }

  onHazardHit(player, hazard) {
    if (player._invulnerable || player.isDashing) return;

    player.takeDamage(0, -400);
    this.flashPlayerDamage();
  }

  flashPlayerDamage() {
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

  // ===================================================================
  //  CAMERA
  // ===================================================================

  setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    // Offset camera so player is slightly below center (see more above)
    this.cameras.main.setFollowOffset(0, 100);
  }

  // ===================================================================
  //  STORY / TUTORIAL TEXT
  // ===================================================================

  showIntroTypewriter() {
    const lines = [
      'You are a thought...',
      'a question given form...',
      'awaiting the pipeline.',
    ];

    let totalDelay = 500;

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const yPos = GROUND_Y - 400 + li * 50;

      this.time.delayedCall(totalDelay, () => {
        this.showStoryText(line, 200, yPos);
      });

      totalDelay += line.length * 45 + 800;
    }
  }

  showStoryText(message, x, y) {
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

    this.time.delayedCall(message.length * 40 + 4000, () => {
      this.tweens.add({
        targets: txt,
        alpha: 0,
        duration: 1000,
        onComplete: () => txt.destroy(),
      });
    });

    return txt;
  }

  // ===================================================================
  //  UPDATE LOOP
  // ===================================================================

  update(time, delta) {
    if (this._exiting) return;

    // -- Player --
    this.player.update(time, delta);

    // -- Parallax --
    this.parallax.update(this.cameras.main);

    // -- HUD --
    this.updateHUD();

    // -- Floating text drift --
    for (const txt of this.floatingTexts) {
      txt.x -= txt._driftSpeed * delta * 0.001;
      txt.y = txt._baseY + Math.sin(time * 0.001 + txt._bobOffset) * 15;
      if (txt.x < -150) {
        txt.x = WORLD.width + 150;
      }
    }

    // -- Moving platforms --
    for (const mp of this.movingPlatforms) {
      mp.updatePlatform(time, delta);
    }

    // -- Conveyor effect --
    if (this.player.body.blocked.down) {
      for (const conv of this.conveyors) {
        if (conv._isConveyor) {
          const playerBounds = this.player.getBounds();
          const convBounds = conv.getBounds();
          if (Phaser.Geom.Rectangle.Overlaps(playerBounds, convBounds)) {
            this.player.body.x += conv._conveyorSpeed * delta * 0.001;
          }
        }
      }
    }

    // -- Enemies --
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.active && !enemy._dead) {
        enemy.update(time, delta, this.player);
      }
    });

    // -- Player attack vs enemies (melee hitbox check) --
    if (this.player.attackHitbox) {
      const hb = this.player.attackHitbox;
      this.enemies.getChildren().forEach(enemy => {
        if (enemy.active && !enemy._dead && !enemy._hurt) {
          const dx = Math.abs(hb.x - enemy.x);
          const dy = Math.abs(hb.y - enemy.y);
          if (dx < GAME.ATTACK_RANGE && dy < 50) {
            enemy.takeDamage(GAME.ATTACK_DAMAGE, this.player.facing);
          }
        }
      });

      // Attack hitbox vs boss (when vulnerable)
      if (this.bossActivated && !this.bossDefeated && this.bossVulnerable) {
        const dx = Math.abs(hb.x - this.boss.x);
        const dy = Math.abs(hb.y - this.boss.y);
        if (dx < GAME.ATTACK_RANGE + 40 && dy < 80) {
          this.damageBoss();
        }
      }
    }

    // -- Boss --
    if (this.bossActivated && !this.bossDefeated) {
      this.updateBoss(time, delta);
    }

    // -- Death check --
    if (this.player.hp <= 0 && !this._dead) {
      this._dead = true;
      this.playerDeath();
    }

    // -- Fall into void (below world) --
    if (this.player.y > WORLD.height - 50 && !this._dead) {
      this.player.takeDamage(0, -500);
      // Teleport back to last safe ground
      this.player.setPosition(this.player.x - 200, GROUND_Y - 100);
    }
  }

  updateBoss(time, delta) {
    // Sine wave movement (horizontal sway + vertical bob)
    this.boss._sineOffset += delta * 0.001;
    const swayX = Math.sin(this.boss._sineOffset * 0.8) * 120;
    const bobY = Math.sin(this.boss._sineOffset * 1.5) * 60;
    this.boss.x = this.boss._baseX + swayX;
    this.boss.y = this.boss._baseY + bobY;

    // Track vulnerability text to boss
    this.bossVulnText.x = this.boss.x;
    this.bossVulnText.y = this.boss.y - 100;

    // Update boss projectiles (manual movement since they are text objects)
    const deadProjectiles = [];
    this.bossProjectiles.getChildren().forEach(proj => {
      proj.x += proj._vx * delta * 0.001;
      proj.y += proj._vy * delta * 0.001;
      proj._lifetime += delta;

      if (proj._lifetime > 5000 ||
          proj.x < 5700 || proj.x > 7100 ||
          proj.y < -50 || proj.y > WORLD.height + 50) {
        deadProjectiles.push(proj);
        return;
      }

      // Manual collision with player for text projectiles
      if (!this.player._invulnerable && !this.player.isDashing) {
        const dx = proj.x - this.player.x;
        const dy = proj.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          const kbx = dx < 0 ? -300 : 300;
          this.player.takeDamage(kbx, -200);
          this.flashPlayerDamage();
          deadProjectiles.push(proj);
        }
      }
    });

    deadProjectiles.forEach(p => {
      this.bossProjectiles.remove(p);
      p.destroy();
    });
  }

  playerDeath() {
    this.cameras.main.shake(500, 0.02);

    this.tweens.add({
      targets: this.player,
      alpha: 0,
      scale: 2,
      duration: 800,
      ease: 'Power2',
    });

    // Restart after delay
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.restart(this.playerData);
      });
    });
  }
}
