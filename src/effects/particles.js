import Phaser from 'phaser';

export function createAmbientParticles(scene, palette, config = {}) {
  return scene.add.particles(0, 0, config.texture || 'particle_soft', {
    x: { min: 0, max: scene.scale.width },
    y: { min: 0, max: scene.scale.height },
    speedX: config.speedX || { min: -15, max: 15 },
    speedY: config.speedY || { min: -10, max: -2 },
    scale: { start: config.scaleStart || 0.35, end: 0, random: true },
    alpha: { start: config.alphaStart || 0.5, end: 0 },
    lifespan: config.lifespan || { min: 3000, max: 6000 },
    frequency: config.frequency || 120,
    blendMode: Phaser.BlendModes.ADD,
    tint: palette.particles,
  }).setScrollFactor(0).setDepth(config.depth || 50);
}

export function createNeonStreaks(scene, palette) {
  return scene.add.particles(0, 0, 'particle_spark', {
    x: { min: 0, max: scene.scale.width },
    y: { min: 0, max: scene.scale.height },
    speedX: { min: 250, max: 500 },
    speedY: { min: -25, max: 25 },
    scaleX: { start: 1.0, end: 0 },
    scaleY: { start: 0.2, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: { min: 300, max: 600 },
    frequency: 80,
    blendMode: Phaser.BlendModes.ADD,
    tint: palette.neon || palette.particles,
  }).setScrollFactor(0).setDepth(50);
}

export function createPortalParticles(scene, x, y, color) {
  return scene.add.particles(x, y, 'particle_soft', {
    emitZone: {
      type: 'edge',
      source: new Phaser.Geom.Circle(0, 0, 55),
      quantity: 48,
    },
    speed: { min: 8, max: 30 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: 1500,
    blendMode: Phaser.BlendModes.ADD,
    tint: color,
  }).setDepth(90);
}

export function createCollectBurst(scene, x, y, color) {
  const emitter = scene.add.particles(x, y, 'particle_spark', {
    speed: { min: 100, max: 280 },
    scale: { start: 0.6, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 500,
    blendMode: Phaser.BlendModes.ADD,
    tint: color,
    quantity: 18,
    emitting: false,
  }).setDepth(110);

  emitter.explode(18, x, y);
  scene.time.delayedCall(600, () => emitter.destroy());
}

export function createBossExplosion(scene, x, y, colors, count = 6) {
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * 120, () => {
      const ox = x + Phaser.Math.Between(-60, 60);
      const oy = y + Phaser.Math.Between(-60, 60);
      const color = colors[i % colors.length];
      createCollectBurst(scene, ox, oy, color);
    });
  }
}

export function createEnemyDeath(scene, x, y, color) {
  const emitter = scene.add.particles(x, y, 'particle_spark', {
    speed: { min: 120, max: 350 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 600,
    blendMode: Phaser.BlendModes.ADD,
    tint: [color, 0xffffff, color],
    quantity: 20,
    emitting: false,
  }).setDepth(110);

  emitter.explode(20, x, y);
  scene.time.delayedCall(700, () => emitter.destroy());
}

export function createGroundFog(scene, worldWidth, groundY, color = 0x4444aa) {
  return scene.add.particles(0, groundY - 30, 'particle_soft', {
    x: { min: 0, max: worldWidth },
    speedX: { min: -20, max: 20 },
    speedY: { min: -15, max: -5 },
    scale: { start: 0.6, end: 0, random: true },
    alpha: { start: 0.15, end: 0 },
    lifespan: { min: 4000, max: 8000 },
    frequency: 80,
    blendMode: Phaser.BlendModes.ADD,
    tint: color,
  }).setDepth(45);
}

export function createRainParticles(scene) {
  return scene.add.particles(0, 0, 'particle_dot', {
    x: { min: 0, max: scene.scale.width },
    y: -20,
    speedY: { min: 400, max: 600 },
    speedX: { min: -30, max: -10 },
    scaleX: 0.15,
    scaleY: { start: 0.6, end: 0.3 },
    alpha: { start: 0.3, end: 0.1 },
    lifespan: { min: 1500, max: 2500 },
    frequency: 10,
    blendMode: Phaser.BlendModes.ADD,
    tint: 0x6688ff,
  }).setScrollFactor(0).setDepth(200);
}
