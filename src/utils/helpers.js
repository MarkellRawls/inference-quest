export function addGlow(gameObject, color, strength = 4, inner = 0, knockout = false, quality = 0.1, distance = 24) {
  try {
    if (gameObject.postFX) {
      return gameObject.postFX.addGlow(color, strength, inner, knockout, quality, distance);
    }
  } catch (e) {
    // FX pipeline unavailable
  }
  return null;
}

export function addPostBloom(camera, color = 0xffffff, offX = 0.5, offY = 0.5, blur = 1, strength = 1.2, steps = 4) {
  try {
    if (camera.postFX) {
      return camera.postFX.addBloom(color, offX, offY, blur, strength, steps);
    }
  } catch (e) {
    // FX pipeline unavailable
  }
  return null;
}
