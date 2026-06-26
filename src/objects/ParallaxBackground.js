import Phaser from 'phaser';

export class ParallaxBackground {
  constructor(scene, layerConfigs) {
    this.layers = layerConfigs.map((config, i) => {
      const layer = scene.add.tileSprite(
        0, 0,
        scene.scale.width, scene.scale.height,
        config.key
      );
      layer.setOrigin(0, 0);
      layer.setScrollFactor(0);
      layer.setDepth(-100 + i);
      if (config.tint !== undefined) layer.setTint(config.tint);
      if (config.alpha !== undefined) layer.setAlpha(config.alpha);
      layer._scrollSpeed = config.speed;
      return layer;
    });
  }

  update(camera) {
    for (const layer of this.layers) {
      layer.tilePositionX = camera.scrollX * layer._scrollSpeed;
      layer.tilePositionY = camera.scrollY * layer._scrollSpeed * 0.5;
    }
  }

  destroy() {
    for (const layer of this.layers) {
      layer.destroy();
    }
    this.layers = [];
  }
}
