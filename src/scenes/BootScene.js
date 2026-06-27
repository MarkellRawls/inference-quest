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
    this.generateEnemyCore();
    this.generateGateBlock();
    this.generateTokenLeaf();
    this.generateCrystal();
    this.generateStarPoint();
    this.generateButtonBg();
    this.generatePortalRing();
    this.generateBossRing();
    this.generateHpPip();

    this.scene.start(SCENES.MENU);
  }

  generateParticleDot() {
    const size = 16;
    const tex = this.textures.createCanvas('particle_dot', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.5)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateParticleSoft() {
    const size = 96;
    const tex = this.textures.createCanvas('particle_soft', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateParticleSpark() {
    const size = 48;
    const tex = this.textures.createCanvas('particle_spark', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
    g.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generatePlayerOrb() {
    const size = 160;
    const tex = this.textures.createCanvas('player_orb', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;

    const outerGlow = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    outerGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    outerGlow.addColorStop(0.1, 'rgba(240, 250, 255, 0.95)');
    outerGlow.addColorStop(0.2, 'rgba(200, 235, 255, 0.7)');
    outerGlow.addColorStop(0.35, 'rgba(150, 220, 255, 0.4)');
    outerGlow.addColorStop(0.5, 'rgba(100, 200, 255, 0.15)');
    outerGlow.addColorStop(0.7, 'rgba(50, 150, 255, 0.04)');
    outerGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = outerGlow;
    ctx.fillRect(0, 0, size, size);

    const highlight = ctx.createRadialGradient(cx - 8, cx - 8, 0, cx, cx, 20);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(cx, cx, 22, 0, Math.PI * 2);
    ctx.fill();

    tex.refresh();
  }

  generatePlayerTrail() {
    const size = 80;
    const tex = this.textures.createCanvas('player_trail', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    g.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
    g.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateEnemyCore() {
    const size = 120;
    const tex = this.textures.createCanvas('enemy_core', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;

    const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.15, 'rgba(255, 200, 200, 0.9)');
    g.addColorStop(0.3, 'rgba(255, 100, 100, 0.5)');
    g.addColorStop(0.5, 'rgba(255, 50, 50, 0.2)');
    g.addColorStop(0.7, 'rgba(200, 0, 0, 0.05)');
    g.addColorStop(1, 'rgba(150, 0, 0, 0)');
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
    gfx.fillEllipse(24, 12, 48, 24);
    gfx.generateTexture('token_leaf', 48, 24);
    gfx.destroy();
  }

  generateCrystal() {
    const size = 48;
    const tex = this.textures.createCanvas('crystal', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, 2);
    ctx.lineTo(size - 2, cx);
    ctx.lineTo(cx, size - 2);
    ctx.lineTo(2, cx);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    tex.refresh();
  }

  generateStarPoint() {
    const size = 8;
    const tex = this.textures.createCanvas('star_point', size, size);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateButtonBg() {
    const w = 420, h = 90;
    const tex = this.textures.createCanvas('button_bg', w, h);
    const ctx = tex.getContext();
    const r = 22;

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
    g.addColorStop(0, 'rgba(30, 70, 120, 0.85)');
    g.addColorStop(0.5, 'rgba(15, 45, 80, 0.92)');
    g.addColorStop(1, 'rgba(8, 25, 55, 0.85)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    tex.refresh();
  }

  generatePortalRing() {
    const size = 192;
    const tex = this.textures.createCanvas('portal_ring', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;

    const g = ctx.createRadialGradient(cx, cx, cx * 0.5, cx, cx, cx);
    g.addColorStop(0, 'rgba(0, 255, 255, 0)');
    g.addColorStop(0.3, 'rgba(0, 255, 255, 0.2)');
    g.addColorStop(0.6, 'rgba(0, 220, 255, 0.5)');
    g.addColorStop(0.8, 'rgba(0, 200, 255, 0.8)');
    g.addColorStop(0.9, 'rgba(100, 230, 255, 0.9)');
    g.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  generateBossRing() {
    const size = 128;
    const tex = this.textures.createCanvas('boss_ring', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;

    ctx.strokeStyle = 'rgba(255, 100, 50, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cx, cx - 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 50, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cx, cx - 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 150, 50, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cx, cx - 24, 0, Math.PI * 2);
    ctx.stroke();

    tex.refresh();
  }

  generateHpPip() {
    const size = 24;
    const tex = this.textures.createCanvas('hp_pip', size, size);
    const ctx = tex.getContext();
    const cx = size / 2;

    const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0, 'rgba(255, 100, 100, 1)');
    g.addColorStop(0.4, 'rgba(255, 50, 50, 0.8)');
    g.addColorStop(0.7, 'rgba(200, 0, 0, 0.3)');
    g.addColorStop(1, 'rgba(150, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
