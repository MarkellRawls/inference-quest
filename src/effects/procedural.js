import Phaser from 'phaser';

export function generateStarField(scene, key, width, height, starCount, colors) {
  const tex = scene.textures.createCanvas(key, width, height);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 0.5 + Math.random() * 2;
    const alpha = 0.2 + Math.random() * 0.8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const c = Phaser.Display.Color.IntegerToColor(color);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  tex.refresh();
}

export function generateNebula(scene, key, width, height, colorStops) {
  const tex = scene.textures.createCanvas(key, width, height);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < colorStops.length; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const radius = 100 + Math.random() * 200;
    const color = Phaser.Display.Color.IntegerToColor(colorStops[i]);

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.15)`);
    g.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.06)`);
    g.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  tex.refresh();
}

export function generateTerrainSilhouette(scene, key, width, height, color, segmentCount) {
  const tex = scene.textures.createCanvas(key, width, height);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, height);

  const segments = segmentCount || 20;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const x = (width / segments) * i;
    const baseY = height * 0.6 + Math.random() * height * 0.3;
    points.push({ x, y: baseY });
  }

  for (let pass = 0; pass < 3; pass++) {
    const newPoints = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const mid = {
        x: (points[i].x + points[i + 1].x) / 2,
        y: (points[i].y + points[i + 1].y) / 2 + (Math.random() - 0.5) * 30 / (pass + 1),
      };
      newPoints.push(mid, points[i + 1]);
    }
    points.length = 0;
    points.push(...newPoints);
  }

  const c = Phaser.Display.Color.IntegerToColor(color);
  ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (const p of points) {
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  tex.refresh();
}

export function generateCitySkyline(scene, key, width, height, buildingCount, palette) {
  const tex = scene.textures.createCanvas(key, width, height);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, height);

  const neonColors = palette.neon || [0xff00ff, 0x00ffff, 0xffff00];

  for (let i = 0; i < buildingCount; i++) {
    const bw = 25 + Math.random() * 55;
    const bh = height * 0.2 + Math.random() * height * 0.7;
    const bx = (width / buildingCount) * i + (Math.random() - 0.5) * 15;
    const by = height - bh;

    ctx.fillStyle = 'rgba(12, 4, 25, 0.92)';
    ctx.fillRect(bx, by, bw, bh);

    const neon = neonColors[Math.floor(Math.random() * neonColors.length)];
    const nc = Phaser.Display.Color.IntegerToColor(neon);
    ctx.strokeStyle = `rgba(${nc.r}, ${nc.g}, ${nc.b}, 0.5)`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    for (let wy = by + 8; wy < by + bh - 6; wy += 12) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 10) {
        if (Math.random() > 0.45) {
          const wc = neonColors[Math.floor(Math.random() * neonColors.length)];
          const wColor = Phaser.Display.Color.IntegerToColor(wc);
          ctx.fillStyle = `rgba(${wColor.r}, ${wColor.g}, ${wColor.b}, ${0.2 + Math.random() * 0.5})`;
          ctx.fillRect(wx, wy, 3, 5);
        }
      }
    }
  }

  tex.refresh();
}

export function generateGlowOrb(scene, key, size, coreColor, glowColor) {
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  const cx = size / 2;

  const core = Phaser.Display.Color.IntegerToColor(coreColor);
  const glow = Phaser.Display.Color.IntegerToColor(glowColor);

  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0, `rgba(${core.r}, ${core.g}, ${core.b}, 1)`);
  g.addColorStop(0.3, `rgba(${glow.r}, ${glow.g}, ${glow.b}, 0.6)`);
  g.addColorStop(0.7, `rgba(${glow.r}, ${glow.g}, ${glow.b}, 0.15)`);
  g.addColorStop(1, `rgba(${glow.r}, ${glow.g}, ${glow.b}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  tex.refresh();
}

export function generateGradientRect(scene, key, width, height, topColor, bottomColor) {
  const tex = scene.textures.createCanvas(key, width, height);
  const ctx = tex.getContext();

  const tc = Phaser.Display.Color.IntegerToColor(topColor);
  const bc = Phaser.Display.Color.IntegerToColor(bottomColor);

  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, `rgb(${tc.r}, ${tc.g}, ${tc.b})`);
  g.addColorStop(1, `rgb(${bc.r}, ${bc.g}, ${bc.b})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  tex.refresh();
}
