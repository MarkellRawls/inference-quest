import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    this.generateParticleDot();
    this.generateParticleSoft();
    this.generateParticleSpark();
    this.generatePlayerOrb();
    this.generatePlayerTrail();
    this.generateGateBlock();
    this.generateTokenLeaf();
    this.generateCrystal();
    this.generateStarPoint();
    this.generateButtonBg();
    this.generatePortalRing();

    this.scene.start(SCENES.MENU);
  }

  generateParticleDot() {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture('particle_dot', 12, 12);
    gfx.destroy();
  }

  generateParticleSoft() {
    const size = 64;
    const tex = this.textures.createCanvas('particle_soft', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateParticleSpark() {
    const size = 32;
    const tex = this.textures.createCanvas('particle_spark', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.15, 'rgba(255, 255, 255, 0.8)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generatePlayerOrb() {
    const size = 128;
    const tex = this.textures.createCanvas('player_orb', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;

    const outerGlow = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    outerGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    outerGlow.addColorStop(0.15, 'rgba(220, 245, 255, 0.95)');
    outerGlow.addColorStop(0.3, 'rgba(150, 220, 255, 0.5)');
    outerGlow.addColorStop(0.5, 'rgba(100, 200, 255, 0.2)');
    outerGlow.addColorStop(0.75, 'rgba(50, 150, 255, 0.05)');
    outerGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fillRect(0, 0, size, size);

    const highlight = ctx.createRadialGradient(cx - 6, cx - 6, 0, cx, cx, 16);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(cx, cx, 18, 0, Math.PI * 2);
    ctx.fill();

    tex.refresh();
  }

  generatePlayerTrail() {
    const size = 64;
    const tex = this.textures.createCanvas('player_trail', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    g.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateGateBlock() {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRoundedRect(0, 0, 60, 60, 8);
    gfx.generateTexture('gate_block', 60, 60);
    gfx.destroy();
  }

  generateTokenLeaf() {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillEllipse(18, 9, 36, 18);
    gfx.generateTexture('token_leaf', 36, 18);
    gfx.destroy();
  }

  generateCrystal() {
    const size = 36;
    const tex = this.textures.createCanvas('crystal', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(size, cx);
    ctx.lineTo(cx, size);
    ctx.lineTo(0, cx);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  generateStarPoint() {
    const size = 6;
    const tex = this.textures.createCanvas('star_point', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(3, 3, 0, 3, 3, 3);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateButtonBg() {
    const w = 384, h = 80;
    const tex = this.textures.createCanvas('button_bg', w, h);
    const ctx = tex.getContext();
    const r = 20;

    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(40, 80, 120, 0.8)');
    g.addColorStop(0.5, 'rgba(20, 50, 80, 0.9)');
    g.addColorStop(1, 'rgba(10, 30, 60, 0.8)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    tex.refresh();
  }

  generatePortalRing() {
    const size = 144;
    const tex = this.textures.createCanvas('portal_ring', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;

    const g = ctx.createRadialGradient(cx, cx, cx * 0.55, cx, cx, cx);
    g.addColorStop(0, 'rgba(0, 255, 255, 0)');
    g.addColorStop(0.4, 'rgba(0, 255, 255, 0.3)');
    g.addColorStop(0.7, 'rgba(0, 220, 255, 0.7)');
    g.addColorStop(0.9, 'rgba(0, 200, 255, 0.9)');
    g.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
