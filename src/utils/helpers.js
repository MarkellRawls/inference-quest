export function addGlow(gameObject, color, strength = 4, inner = 0, knockout = false, quality = 0.1, distance = 24) {
  if (gameObject.preFX) {
    return gameObject.preFX.addGlow(color, strength, inner, knockout, quality, distance);
  }
  return null;
}

export function addPostBloom(camera, color = 0xffffff, offX = 0.5, offY = 0.5, blur = 1, strength = 1.2, steps = 4) {
  if (camera.postFX) {
    return camera.postFX.addBloom(color, offX, offY, blur, strength, steps);
  }
  return null;
}
