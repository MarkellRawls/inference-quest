import Phaser from 'phaser';

export function createAmbientParticles(scene, palette, config = {}) {
  return scene.add.particles(0, 0, config.texture || 'particle_soft', {
    x: { min: 0, max: scene.scale.width },
    y: { min: 0, max: scene.scale.height },
    speedX: config.speedX || { min: -10, max: 10 },
    speedY: config.speedY || { min: -8, max: -2 },
    scale: { start: config.scaleStart || 0.3, end: 0, random: true },
    alpha: { start: config.alphaStart || 0.4, end: 0 },
    lifespan: config.lifespan || { min: 3000, max: 6000 },
    frequency: config.frequency || 200,
    blendMode: Phaser.BlendModes.ADD,
    tint: palette.particles,
  }).setScrollFactor(0).setDepth(config.depth || 50);
}

export function createNeonStreaks(scene, palette) {
  return scene.add.particles(0, 0, 'particle_spark', {
    x: { min: 0, max: scene.scale.width },
    y: { min: 0, max: scene.scale.height },
    speedX: { min: 200, max: 400 },
    speedY: { min: -20, max: 20 },
    scaleX: { start: 0.8, end: 0 },
    scaleY: { start: 0.15, end: 0 },
    alpha: { start: 0.7, end: 0 },
    lifespan: { min: 300, max: 600 },
    frequency: 120,
    blendMode: Phaser.BlendModes.ADD,
    tint: palette.neon || palette.particles,
  }).setScrollFactor(0).setDepth(50);
}

export function createPortalParticles(scene, x, y, color) {
  return scene.add.particles(x, y, 'particle_soft', {
    emitZone: {
      type: 'edge',
      source: new Phaser.Geom.Circle(0, 0, 40),
      quantity: 32,
    },
    speed: { min: 5, max: 20 },
    scale: { start: 0.4, end: 0 },
    alpha: { start: 0.6, end: 0 },
    lifespan: 1200,
    blendMode: Phaser.BlendModes.ADD,
    tint: color,
  }).setDepth(90);
}

export function createCollectBurst(scene, x, y, color) {
  const emitter = scene.add.particles(x, y, 'particle_spark', {
    speed: { min: 80, max: 200 },
    scale: { start: 0.5, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 400,
    blendMode: Phaser.BlendModes.ADD,
    tint: color,
    quantity: 12,
    emitting: false,
  }).setDepth(110);

  emitter.explode(12, x, y);

  scene.time.delayedCall(500, () => emitter.destroy());
}
