import Phaser from 'phaser';
import { addGlow } from '../utils/helpers.js';

export function createPlatform(scene, x, y, width, color = 0x4488ff, height = 20) {
  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 0.3);
  gfx.fillRect(0, 0, width, height);
  gfx.fillStyle(color, 0.8);
  gfx.fillRect(0, 0, width, 4);
  gfx.fillStyle(color, 0.15);
  gfx.fillRect(0, height - 3, width, 3);

  const key = `plat_${width}_${height}_${color}_${Phaser.Math.Between(0, 99999)}`;
  gfx.generateTexture(key, width, height);
  gfx.destroy();

  const plat = scene.physics.add.image(x, y, key);
  plat.setImmovable(true);
  plat.body.setAllowGravity(false);
  plat.body.checkCollision.down = false;
  plat.body.checkCollision.left = false;
  plat.body.checkCollision.right = false;
  plat.setDepth(40);

  addGlow(plat, color, 1, 0, false, 0.1, 8);

  return plat;
}

export function createSolidPlatform(scene, x, y, width, color = 0x4488ff, height = 20) {
  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 0.3);
  gfx.fillRect(0, 0, width, height);
  gfx.fillStyle(color, 0.8);
  gfx.fillRect(0, 0, width, 4);

  const key = `splat_${width}_${height}_${color}_${Phaser.Math.Between(0, 99999)}`;
  gfx.generateTexture(key, width, height);
  gfx.destroy();

  const plat = scene.physics.add.image(x, y, key);
  plat.setImmovable(true);
  plat.body.setAllowGravity(false);
  plat.setDepth(40);

  addGlow(plat, color, 1, 0, false, 0.1, 8);

  return plat;
}

export function createGround(scene, x, y, width, color = 0x4488ff, height = 60) {
  const gfx = scene.add.graphics();

  gfx.fillStyle(color, 0.15);
  gfx.fillRect(0, 0, width, height);
  gfx.fillStyle(color, 0.7);
  gfx.fillRect(0, 0, width, 5);
  gfx.fillStyle(color, 0.3);
  gfx.fillRect(0, 5, width, 3);

  const key = `ground_${width}_${height}_${color}_${Phaser.Math.Between(0, 99999)}`;
  gfx.generateTexture(key, width, height);
  gfx.destroy();

  const ground = scene.physics.add.image(x, y, key);
  ground.setImmovable(true);
  ground.body.setAllowGravity(false);
  ground.setDepth(40);
  ground.setOrigin(0, 0);

  addGlow(ground, color, 1, 0, false, 0.1, 6);

  return ground;
}

export function createMovingPlatform(scene, x, y, width, config = {}) {
  const color = config.color || 0x44ff88;
  const height = config.height || 20;

  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 0.4);
  gfx.fillRect(0, 0, width, height);
  gfx.fillStyle(color, 0.9);
  gfx.fillRect(0, 0, width, 4);

  const key = `mplat_${width}_${color}_${Phaser.Math.Between(0, 99999)}`;
  gfx.generateTexture(key, width, height);
  gfx.destroy();

  const plat = scene.physics.add.image(x, y, key);
  plat.setImmovable(true);
  plat.body.setAllowGravity(false);
  plat.body.checkCollision.down = false;
  plat.body.checkCollision.left = false;
  plat.body.checkCollision.right = false;
  plat.setDepth(40);

  addGlow(plat, color, 2, 0, false, 0.1, 10);

  const trail = scene.add.particles(x, y + height / 2, 'particle_spark', {
    speed: { min: 5, max: 15 },
    scale: { start: 0.15, end: 0 },
    alpha: { start: 0.3, end: 0 },
    lifespan: 800,
    frequency: 200,
    blendMode: Phaser.BlendModes.ADD,
    tint: color,
  }).setDepth(39);

  const moveType = config.moveType || 'horizontal';
  const range = config.range || 200;
  const speed = config.speed || 1;
  plat._moveType = moveType;
  plat._startX = x;
  plat._startY = y;
  plat._range = range;
  plat._speed = speed;
  plat._trail = trail;
  plat._time = config.phase || 0;

  plat.updatePlatform = (time, delta) => {
    plat._time += delta * 0.001 * plat._speed;
    let nx = plat._startX;
    let ny = plat._startY;

    if (moveType === 'horizontal') {
      nx = plat._startX + Math.sin(plat._time) * range;
    } else if (moveType === 'vertical') {
      ny = plat._startY + Math.sin(plat._time) * range;
    } else if (moveType === 'circular') {
      nx = plat._startX + Math.cos(plat._time) * range;
      ny = plat._startY + Math.sin(plat._time) * (config.rangeY || range * 0.5);
    }

    plat.body.setVelocity((nx - plat.x) * 60, (ny - plat.y) * 60);
    trail.setPosition(plat.x, plat.y + height / 2);
  };

  return plat;
}

export function createCrumblingPlatform(scene, x, y, width, color = 0xffaa44) {
  const height = 20;

  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 0.3);
  gfx.fillRect(0, 0, width, height);
  gfx.fillStyle(color, 0.7);
  gfx.fillRect(0, 0, width, 4);

  const key = `crumble_${width}_${color}_${Phaser.Math.Between(0, 99999)}`;
  gfx.generateTexture(key, width, height);
  gfx.destroy();

  const plat = scene.physics.add.image(x, y, key);
  plat.setImmovable(true);
  plat.body.setAllowGravity(false);
  plat.body.checkCollision.down = false;
  plat.body.checkCollision.left = false;
  plat.body.checkCollision.right = false;
  plat.setDepth(40);

  plat._crumbling = false;
  plat._crumbled = false;

  plat.startCrumble = () => {
    if (plat._crumbling || plat._crumbled) return;
    plat._crumbling = true;

    scene.tweens.add({
      targets: plat,
      x: plat.x + Phaser.Math.Between(-3, 3),
      duration: 50,
      yoyo: true,
      repeat: 8,
      onComplete: () => {
        plat._crumbled = true;
        plat.body.setEnable(false);

        scene.add.particles(plat.x, plat.y, 'particle_spark', {
          speed: { min: 30, max: 100 },
          scale: { start: 0.3, end: 0 },
          alpha: { start: 0.5, end: 0 },
          lifespan: 600,
          blendMode: Phaser.BlendModes.ADD,
          tint: color,
          quantity: 10,
          emitting: false,
        }).setDepth(110).explode(10, plat.x, plat.y);

        scene.tweens.add({
          targets: plat,
          alpha: 0,
          y: plat.y + 100,
          duration: 400,
          onComplete: () => {
            scene.time.delayedCall(3000, () => {
              plat.setAlpha(1);
              plat.setY(y);
              plat.body.setEnable(true);
              plat._crumbling = false;
              plat._crumbled = false;
            });
          },
        });
      },
    });
  };

  return plat;
}

export function createHazardSpikes(scene, x, y, width, color = 0xff2222) {
  const height = 24;
  const spikeCount = Math.floor(width / 20);

  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 0.6);
  for (let i = 0; i < spikeCount; i++) {
    const sx = i * 20 + 2;
    gfx.fillTriangle(sx, height, sx + 8, 0, sx + 16, height);
  }

  const key = `spikes_${width}_${color}_${Phaser.Math.Between(0, 99999)}`;
  gfx.generateTexture(key, width, height);
  gfx.destroy();

  const spikes = scene.physics.add.image(x, y, key);
  spikes.setImmovable(true);
  spikes.body.setAllowGravity(false);
  spikes.setDepth(41);
  spikes._isHazard = true;

  addGlow(spikes, color, 2, 0, false, 0.1, 10);

  scene.tweens.add({
    targets: spikes,
    alpha: 0.6,
    duration: 800,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });

  return spikes;
}

export function createConveyor(scene, x, y, width, speed = 100, color = 0x44aaff) {
  const height = 20;

  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 0.25);
  gfx.fillRect(0, 0, width, height);
  gfx.fillStyle(color, 0.7);
  gfx.fillRect(0, 0, width, 3);

  const arrowSpacing = 30;
  const arrowDir = speed > 0 ? 1 : -1;
  gfx.fillStyle(color, 0.4);
  for (let ax = 10; ax < width - 10; ax += arrowSpacing) {
    if (arrowDir > 0) {
      gfx.fillTriangle(ax, height / 2 - 4, ax + 8, height / 2, ax, height / 2 + 4);
    } else {
      gfx.fillTriangle(ax + 8, height / 2 - 4, ax, height / 2, ax + 8, height / 2 + 4);
    }
  }

  const key = `conv_${width}_${speed}_${color}_${Phaser.Math.Between(0, 99999)}`;
  gfx.generateTexture(key, width, height);
  gfx.destroy();

  const conv = scene.physics.add.image(x, y, key);
  conv.setImmovable(true);
  conv.body.setAllowGravity(false);
  conv.body.checkCollision.down = false;
  conv.body.checkCollision.left = false;
  conv.body.checkCollision.right = false;
  conv.setDepth(40);
  conv._conveyorSpeed = speed;
  conv._isConveyor = true;

  return conv;
}
