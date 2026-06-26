import Phaser from 'phaser';
import { GAME } from '../config/constants.js';
import { addGlow } from '../utils/helpers.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_orb');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setBlendMode(Phaser.BlendModes.ADD);
    this.setDepth(100);
    this.setScale(0.8);

    this.body.setCircle(24, 16, 16);
    this.body.setCollideWorldBounds(true);

    this.glowFx = addGlow(this, 0x00ffff, 4, 0, false, 0.1, 24);

    this.trail = scene.add.particles(0, 0, 'player_trail', {
      follow: this,
      speed: { min: 10, max: 30 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 600,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 35,
      tint: 0x00ffff,
    });
    this.trail.setDepth(99);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.isDashing = false;
    this.dashCooldown = false;
    this.dashTime = 0;
    this._invulnerable = false;

    this.hp = 3;
    this.maxHp = 3;
  }

  setZonePalette(palette) {
    if (this.glowFx) {
      this.scene.tweens.add({
        targets: this.glowFx,
        outerStrength: 6,
        duration: 800,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.glowFx.color = palette.player;
        },
      });
    }
    this.trail.setParticleTint(palette.player);
  }

  takeDamage(knockbackX, knockbackY) {
    if (this._invulnerable) return false;

    this.hp--;
    this._invulnerable = true;

    if (knockbackX !== undefined) {
      this.body.setVelocity(knockbackX, knockbackY || 0);
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      repeat: 8,
      onComplete: () => {
        this.setAlpha(1);
        this._invulnerable = false;
      },
    });

    this.scene.cameras.main.shake(150, 0.008);

    this.trail.setParticleTint(0xff4444);
    this.scene.time.delayedCall(800, () => {
      if (this.trail && this.trail.active) {
        this.trail.setParticleTint(this._currentPaletteTint || 0x00ffff);
      }
    });

    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  update(time, delta) {
    if (this.isDashing) {
      this.dashTime -= delta;
      if (this.dashTime <= 0) {
        this.isDashing = false;
        this.trail.setFrequency(35);
      }
      return;
    }

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;

    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.body.setVelocity(vx * GAME.PLAYER_SPEED, vy * GAME.PLAYER_SPEED);

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.dashCooldown) {
      this.dash(vx, vy);
    }

    this.lastVx = vx;
    this.lastVy = vy;
  }

  dash(vx, vy) {
    if (vx === 0 && vy === 0) {
      vx = 1;
    }

    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    this.body.setVelocity(
      (vx / len) * GAME.DASH_SPEED,
      (vy / len) * GAME.DASH_SPEED
    );

    this.isDashing = true;
    this.dashTime = GAME.DASH_DURATION;
    this.dashCooldown = true;
    this.trail.setFrequency(8);

    this.scene.cameras.main.shake(80, 0.004);

    this.scene.time.delayedCall(GAME.DASH_COOLDOWN, () => {
      this.dashCooldown = false;
    });
  }

  destroy(fromScene) {
    if (this.trail) this.trail.destroy();
    super.destroy(fromScene);
  }
}
