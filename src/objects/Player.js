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
    this.setScale(0.7);

    this.body.setSize(32, 40);
    this.body.setOffset(64, 60);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocityY(800);

    this.glowFx = addGlow(this, 0x00ffff, 4, 0, false, 0.1, 24);

    this.trail = scene.add.particles(0, 0, 'player_trail', {
      follow: this,
      speed: { min: 10, max: 30 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 500,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 40,
      tint: 0x00ffff,
    });
    this.trail.setDepth(99);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    this.jumpKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.attackKey2 = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.dashKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.dashKey2 = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);

    this.facing = 1;
    this.isDashing = false;
    this.dashCooldown = false;
    this.dashTime = 0;
    this._invulnerable = false;

    this.isAttacking = false;
    this.attackCooldown = false;
    this.attackHitbox = null;

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wasGrounded = false;
    this.hasDoubleJump = false;
    this.usedDoubleJump = false;
    this.jumpHeld = false;
    this.jumpReleased = true;

    this.hp = 5;
    this.maxHp = 5;

    this._currentPaletteTint = 0x00ffff;
    this.state = 'idle';
  }

  setZonePalette(palette) {
    this._currentPaletteTint = palette.player;
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
      this.body.setVelocity(knockbackX, knockbackY || -250);
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      repeat: 10,
      onComplete: () => {
        this.setAlpha(1);
        this._invulnerable = false;
      },
    });

    this.scene.cameras.main.shake(150, 0.01);
    this.trail.setParticleTint(0xff4444);
    this.scene.time.delayedCall(800, () => {
      if (this.trail && this.trail.active) {
        this.trail.setParticleTint(this._currentPaletteTint);
      }
    });

    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  performAttack() {
    if (this.isAttacking || this.attackCooldown) return;

    this.isAttacking = true;
    this.attackCooldown = true;

    const hbX = this.x + this.facing * 60;
    const hbY = this.y;

    this.attackHitbox = this.scene.add.zone(hbX, hbY, GAME.ATTACK_RANGE, 70);
    this.scene.physics.add.existing(this.attackHitbox, false);
    this.attackHitbox.body.setAllowGravity(false);
    this.attackHitbox.body.setImmovable(true);
    this.attackHitbox.setDepth(101);

    const arcGfx = this.scene.add.graphics();
    arcGfx.setDepth(105);
    const arcColor = this._currentPaletteTint;
    arcGfx.lineStyle(3, arcColor, 0.8);
    const startAngle = this.facing > 0 ? -Math.PI / 3 : Math.PI - Math.PI / 3;
    arcGfx.beginPath();
    arcGfx.arc(this.x, this.y, 70, startAngle, startAngle + (2 * Math.PI / 3), false);
    arcGfx.strokePath();

    this.scene.tweens.add({
      targets: arcGfx,
      alpha: 0,
      duration: 200,
      onComplete: () => arcGfx.destroy(),
    });

    const burstX = this.x + this.facing * 50;
    this.scene.add.particles(burstX, this.y, 'particle_spark', {
      speed: { min: 80, max: 200 },
      angle: this.facing > 0 ? { min: -45, max: 45 } : { min: 135, max: 225 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 250,
      blendMode: Phaser.BlendModes.ADD,
      tint: arcColor,
      quantity: 8,
      emitting: false,
    }).setDepth(106).explode(8, burstX, this.y);

    this.setScale(this.facing > 0 ? 0.8 : 0.8, 0.65);
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.7,
      scaleY: 0.7,
      duration: 150,
    });

    this.scene.time.delayedCall(120, () => {
      if (this.attackHitbox) {
        this.attackHitbox.destroy();
        this.attackHitbox = null;
      }
      this.isAttacking = false;
    });

    this.scene.time.delayedCall(GAME.ATTACK_COOLDOWN, () => {
      this.attackCooldown = false;
    });
  }

  update(time, delta) {
    const grounded = this.body.blocked.down;

    if (grounded) {
      this.coyoteTimer = GAME.COYOTE_TIME;
      this.usedDoubleJump = false;
    } else {
      this.coyoteTimer -= delta;
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta;
    }

    if (this.isDashing) {
      this.dashTime -= delta;
      if (this.dashTime <= 0) {
        this.isDashing = false;
        this.trail.setFrequency(40);
        this.body.setAllowGravity(true);
      }
      return;
    }

    let vx = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -1;
      this.facing = -1;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = 1;
      this.facing = 1;
    }

    this.body.setVelocityX(vx * GAME.PLAYER_SPEED);

    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W);
    const jumpHeld = this.jumpKey.isDown || this.cursors.up.isDown || this.wasd.W.isDown;

    if (jumpPressed) {
      this.jumpBufferTimer = GAME.JUMP_BUFFER;
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.body.setVelocityY(GAME.JUMP_VELOCITY);
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.jumpHeld = true;
      this.jumpReleased = false;

      this.scene.add.particles(this.x, this.y + 20, 'particle_soft', {
        speed: { min: 30, max: 80 },
        angle: { min: -150, max: -30 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 300,
        blendMode: Phaser.BlendModes.ADD,
        tint: 0xffffff,
        quantity: 6,
        emitting: false,
      }).setDepth(98).explode(6, this.x, this.y + 20);
    }

    if (!jumpHeld && this.body.velocity.y < -100) {
      this.body.setVelocityY(this.body.velocity.y * 0.5);
      this.jumpReleased = true;
    }

    if (grounded && !this.wasGrounded && this.body.velocity.y >= 0) {
      this.scene.add.particles(this.x, this.y + 20, 'particle_soft', {
        speed: { min: 20, max: 60 },
        angle: { min: -160, max: -20 },
        scale: { start: 0.2, end: 0 },
        alpha: { start: 0.4, end: 0 },
        lifespan: 250,
        blendMode: Phaser.BlendModes.ADD,
        tint: 0xffffff,
        quantity: 4,
        emitting: false,
      }).setDepth(98).explode(4, this.x, this.y + 20);
    }

    const attackPressed = Phaser.Input.Keyboard.JustDown(this.attackKey) ||
      Phaser.Input.Keyboard.JustDown(this.attackKey2);
    if (attackPressed) {
      this.performAttack();
    }

    const dashPressed = Phaser.Input.Keyboard.JustDown(this.dashKey) ||
      Phaser.Input.Keyboard.JustDown(this.dashKey2);
    if (dashPressed && !this.dashCooldown) {
      this.dash();
    }

    this.updateVisualState(grounded, vx);
    this.wasGrounded = grounded;
  }

  updateVisualState(grounded, vx) {
    if (this.isDashing) {
      this.setScale(0.9 * Math.abs(this.facing), 0.55);
    } else if (this.isAttacking) {
      // attack tween handles scale
    } else if (!grounded && this.body.velocity.y < -50) {
      this.setScale(0.6, 0.85);
      this.state = 'jump';
    } else if (!grounded && this.body.velocity.y > 50) {
      this.setScale(0.75, 0.65);
      this.state = 'fall';
    } else if (Math.abs(vx) > 0) {
      this.setScale(0.8, 0.65);
      this.trail.setFrequency(25);
      this.state = 'run';
    } else {
      const pulse = 0.68 + Math.sin(this.scene.time.now * 0.004) * 0.03;
      this.setScale(pulse, pulse);
      this.trail.setFrequency(60);
      this.state = 'idle';
    }

    this.setFlipX(this.facing < 0);
  }

  dash() {
    this.body.setVelocity(this.facing * GAME.DASH_SPEED, 0);
    this.body.setAllowGravity(false);

    this.isDashing = true;
    this.dashTime = GAME.DASH_DURATION;
    this.dashCooldown = true;
    this._invulnerable = true;
    this.trail.setFrequency(6);

    this.scene.cameras.main.shake(60, 0.004);

    this.scene.time.delayedCall(GAME.DASH_DURATION + 50, () => {
      this._invulnerable = false;
    });

    this.scene.time.delayedCall(GAME.DASH_COOLDOWN, () => {
      this.dashCooldown = false;
    });
  }

  destroy(fromScene) {
    if (this.trail) this.trail.destroy();
    super.destroy(fromScene);
  }
}
