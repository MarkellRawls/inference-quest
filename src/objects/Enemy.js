import Phaser from 'phaser';
import { addGlow } from '../utils/helpers.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, config.texture || 'enemy_core');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setBlendMode(Phaser.BlendModes.ADD);
    this.setDepth(config.depth || 80);
    this.setScale(config.scale || 0.5);
    this.setTint(config.tint || 0xff4444);

    this.body.setCollideWorldBounds(true);
    this.body.setBounceX(0);

    if (config.bodyWidth && config.bodyHeight) {
      this.body.setSize(config.bodyWidth, config.bodyHeight);
    }

    if (config.noGravity) {
      this.body.setAllowGravity(false);
    }

    this.hp = config.hp || 1;
    this.maxHp = this.hp;
    this.damage = config.damage || 1;
    this.speed = config.speed || 80;
    this.patrolRange = config.patrolRange || 200;
    this.detectRange = config.detectRange || 300;
    this.attackRange = config.attackRange || 0;
    this.attackCooldown = config.attackCooldown || 2000;
    this.canAttack = config.canAttack || false;

    this._startX = x;
    this._patrolDir = 1;
    this._hurt = false;
    this._dead = false;
    this._attackTimer = 0;
    this._type = config.type || 'walker';
    this._sineOffset = config.sineOffset || 0;
    this._sineAmplitude = config.sineAmplitude || 0;
    this._baseY = y;
    this._onShoot = config.onShoot || null;
    this._scoreValue = config.scoreValue || 10;

    this.glowFx = addGlow(this, config.tint || 0xff4444, 3, 0, false, 0.1, 16);

    if (config.pulse !== false) {
      scene.tweens.add({
        targets: this,
        scaleX: (config.scale || 0.5) * 1.15,
        scaleY: (config.scale || 0.5) * 1.15,
        duration: 800 + Math.random() * 400,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }

  takeDamage(amount, knockbackDir) {
    if (this._hurt || this._dead) return;

    this.hp -= amount;
    this._hurt = true;

    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (!this._dead && this.active) {
        this.setTint(this._originalTint || 0xff4444);
      }
    });

    if (knockbackDir) {
      this.body.setVelocity(knockbackDir * 200, -150);
    }

    this.scene.time.delayedCall(200, () => {
      this._hurt = false;
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this._dead = true;
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.body.setEnable(false);

    const color = this._originalTint || 0xff4444;
    const emitter = this.scene.add.particles(this.x, this.y, 'particle_spark', {
      speed: { min: 100, max: 300 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 500,
      blendMode: Phaser.BlendModes.ADD,
      tint: [color, 0xffffff, color],
      quantity: 16,
      emitting: false,
    }).setDepth(110);
    emitter.explode(16, this.x, this.y);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        emitter.destroy();
        this.destroy();
      },
    });
  }

  update(time, delta, player) {
    if (this._dead || this._hurt) return;

    if (this._type === 'walker') {
      this.updateWalker(player);
    } else if (this._type === 'flyer') {
      this.updateFlyer(time, player);
    } else if (this._type === 'charger') {
      this.updateCharger(player);
    } else if (this._type === 'turret') {
      this.updateTurret(time, delta, player);
    } else if (this._type === 'tank') {
      this.updateWalker(player);
    }
  }

  updateWalker(player) {
    if (this.body.blocked.right || this.x > this._startX + this.patrolRange) {
      this._patrolDir = -1;
    } else if (this.body.blocked.left || this.x < this._startX - this.patrolRange) {
      this._patrolDir = 1;
    }

    const dist = player ? Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) : Infinity;
    if (dist < this.detectRange && player) {
      const dir = player.x > this.x ? 1 : -1;
      this.body.setVelocityX(dir * this.speed * 1.5);
    } else {
      this.body.setVelocityX(this._patrolDir * this.speed);
    }

    this.setFlipX(this.body.velocity.x < 0);
  }

  updateFlyer(time, player) {
    this.y = this._baseY + Math.sin(time * 0.002 + this._sineOffset) * this._sineAmplitude;

    if (this.body.blocked.right || this.x > this._startX + this.patrolRange) {
      this._patrolDir = -1;
    } else if (this.body.blocked.left || this.x < this._startX - this.patrolRange) {
      this._patrolDir = 1;
    }

    this.body.setVelocityX(this._patrolDir * this.speed);
    this.setFlipX(this.body.velocity.x < 0);

    if (this._onShoot && player) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < this.detectRange && time - this._attackTimer > this.attackCooldown) {
        this._attackTimer = time;
        this._onShoot(this);
      }
    }
  }

  updateCharger(player) {
    if (!player) {
      this.body.setVelocityX(0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < this.detectRange) {
      const dir = player.x > this.x ? 1 : -1;
      this.body.setVelocityX(dir * this.speed * 2);
    } else {
      if (this.body.blocked.right || this.x > this._startX + this.patrolRange) {
        this._patrolDir = -1;
      } else if (this.body.blocked.left || this.x < this._startX - this.patrolRange) {
        this._patrolDir = 1;
      }
      this.body.setVelocityX(this._patrolDir * this.speed);
    }

    this.setFlipX(this.body.velocity.x < 0);
  }

  updateTurret(time, delta, player) {
    if (!this._onShoot || !player) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist < this.detectRange && time - this._attackTimer > this.attackCooldown) {
      this._attackTimer = time;
      this._onShoot(this);
    }
  }
}

export function createNullFragment(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 1, speed: 60, patrolRange: 150, tint: 0x8866ff,
    scale: 0.35, type: 'walker', scoreValue: 10,
  });
  e._originalTint = 0x8866ff;
  return e;
}

export function createErrorSprite(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 1, speed: 50, patrolRange: 250, tint: 0xff6644,
    scale: 0.4, type: 'flyer', noGravity: true,
    sineAmplitude: 80, sineOffset: Math.random() * Math.PI * 2,
    detectRange: 400, attackCooldown: 2500, canAttack: true,
    scoreValue: 20,
    onShoot: (enemy) => {
      const proj = scene.add.text(enemy.x, enemy.y + 20, 'ERR', {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px', fontStyle: 'bold', color: '#ff4444',
        resolution: 2,
      });
      proj.setOrigin(0.5).setDepth(85);
      scene.physics.add.existing(proj);
      proj.body.setAllowGravity(false);
      proj.body.setVelocity(0, 180);
      scene.time.delayedCall(3000, () => { if (proj.active) proj.destroy(); });
      if (scene._enemyProjectiles) scene._enemyProjectiles.add(proj);
    },
  });
  e._originalTint = 0xff6644;
  return e;
}

export function createGlitchTurret(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 2, speed: 0, tint: 0xffaa00, scale: 0.45,
    type: 'turret', detectRange: 400, attackCooldown: 3500,
    pulse: true, scoreValue: 25,
    onShoot: (enemy) => {
      const dir = scene.player && scene.player.x > enemy.x ? 1 : -1;
      const proj = scene.add.circle(enemy.x + dir * 20, enemy.y, 6, 0xffaa00);
      proj.setBlendMode(Phaser.BlendModes.ADD).setDepth(85);
      scene.physics.add.existing(proj);
      proj.body.setAllowGravity(false);
      proj.body.setVelocity(dir * 180, 0);
      proj.body.setCircle(6);
      scene.time.delayedCall(3000, () => { if (proj.active) proj.destroy(); });
      if (scene._enemyProjectiles) scene._enemyProjectiles.add(proj);
    },
  });
  e._originalTint = 0xffaa00;
  e.body.setAllowGravity(false);
  e.body.setImmovable(true);
  return e;
}

export function createRogueRequest(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 2, speed: 150, patrolRange: 300, tint: 0xff00ff,
    scale: 0.45, type: 'charger', detectRange: 400,
    scoreValue: 25,
  });
  e._originalTint = 0xff00ff;
  return e;
}

export function createSpamBot(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 1, speed: 100, patrolRange: 100, tint: 0x00ffff,
    scale: 0.25, type: 'walker', detectRange: 250,
    scoreValue: 5,
  });
  e._originalTint = 0x00ffff;
  return e;
}

export function createFirewallDrone(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 2, speed: 40, patrolRange: 200, tint: 0xff4488,
    scale: 0.5, type: 'flyer', noGravity: true,
    sineAmplitude: 60, sineOffset: Math.random() * Math.PI * 2,
    detectRange: 450, attackCooldown: 3000, canAttack: true,
    scoreValue: 30,
    onShoot: (enemy) => {
      const dir = scene.player && scene.player.x > enemy.x ? 1 : -1;
      const laser = scene.add.rectangle(enemy.x, enemy.y, 200, 4, 0xff4488);
      laser.setOrigin(dir > 0 ? 0 : 1, 0.5).setDepth(85);
      laser.setBlendMode(Phaser.BlendModes.ADD);
      scene.physics.add.existing(laser);
      laser.body.setAllowGravity(false);
      laser.body.setVelocity(dir * 350, 0);
      scene.time.delayedCall(2000, () => { if (laser.active) laser.destroy(); });
      if (scene._enemyProjectiles) scene._enemyProjectiles.add(laser);
    },
  });
  e._originalTint = 0xff4488;
  return e;
}

export function createStalePacket(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 3, speed: 40, patrolRange: 120, tint: 0x888888,
    scale: 0.7, type: 'tank', detectRange: 200,
    scoreValue: 40,
  });
  e._originalTint = 0x888888;
  return e;
}

export function createLoadSpike(scene, x, y) {
  const e = new Enemy(scene, x, y, {
    hp: 2, speed: 60, patrolRange: 180, tint: 0xffaa00,
    scale: 0.3, type: 'walker', detectRange: 350,
    scoreValue: 30,
  });
  e._originalTint = 0xffaa00;
  e._growTimer = 0;
  e._baseScale = 0.3;
  const origUpdate = e.update.bind(e);
  e.update = (time, delta, player) => {
    origUpdate(time, delta, player);
    e._growTimer += delta;
    const growth = Math.min(e._growTimer / 5000, 1);
    const s = e._baseScale + growth * 0.5;
    e.setScale(s);
    e.speed = 60 + growth * 120;
  };
  return e;
}
