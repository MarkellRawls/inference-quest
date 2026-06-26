import Phaser from 'phaser';
import { GAME, SCENES } from '../config/constants.js';
import { addGlow } from '../utils/helpers.js';

export class InfoCardScene extends Phaser.Scene {
  constructor() {
    super(SCENES.INFO_CARD);
  }

  init(data) {
    this.cardData = data;
  }

  create() {
    const { title, concept, details, funFact, nextZone, callingScene, playerData } = this.cardData;

    this.overlay = this.add.rectangle(
      GAME.WIDTH / 2, GAME.HEIGHT / 2,
      GAME.WIDTH, GAME.HEIGHT,
      0x000000, 0
    );
    this.overlay.setDepth(0);

    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.75,
      duration: 400,
      ease: 'Sine.easeOut',
    });

    this.cardContainer = this.add.container(GAME.WIDTH / 2, GAME.HEIGHT / 2);
    this.cardContainer.setDepth(10);
    this.cardContainer.setScale(0);

    const cardW = 1000;
    const cardH = 650;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0a0a2a, 0.95);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    cardBg.lineStyle(2, 0x00ffff, 0.6);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    this.cardContainer.add(cardBg);

    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x00ffff, 0.08);
    headerBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 80, { tl: 20, tr: 20, bl: 0, br: 0 });
    this.cardContainer.add(headerBg);

    const stageLabel = this.add.text(-cardW / 2 + 30, -cardH / 2 + 14, 'CONCEPT UNLOCKED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#00ffff',
      letterSpacing: 4,
      resolution: 2,
    });
    this.cardContainer.add(stageLabel);

    const titleText = this.add.text(-cardW / 2 + 30, -cardH / 2 + 38, title, {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      resolution: 2,
    });
    this.cardContainer.add(titleText);

    const conceptText = this.add.text(-cardW / 2 + 30, -cardH / 2 + 100, concept, {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ccddff',
      wordWrap: { width: cardW - 60 },
      lineSpacing: 6,
      resolution: 2,
    });
    this.cardContainer.add(conceptText);

    let bulletY = conceptText.y + conceptText.height + 24;
    for (const detail of details) {
      const bullet = this.add.text(-cardW / 2 + 50, bulletY, '> ' + detail, {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        color: '#aabbdd',
        wordWrap: { width: cardW - 100 },
        lineSpacing: 3,
        resolution: 2,
      });
      this.cardContainer.add(bullet);
      bulletY += bullet.height + 10;
    }

    if (funFact) {
      const factY = Math.max(bulletY + 16, cardH / 2 - 110);
      const factBg = this.add.graphics();
      factBg.fillStyle(0xffd700, 0.06);
      factBg.fillRoundedRect(-cardW / 2 + 20, factY, cardW - 40, 50, 10);
      this.cardContainer.add(factBg);

      const factText = this.add.text(-cardW / 2 + 40, factY + 8, 'FUN FACT: ' + funFact, {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#ffd700',
        wordWrap: { width: cardW - 100 },
        lineSpacing: 3,
        resolution: 2,
      });
      this.cardContainer.add(factText);
    }

    const btnY = cardH / 2 - 45;
    const btnBg = this.add.image(0, btnY, 'button_bg');
    btnBg.setScale(0.9, 1);
    this.cardContainer.add(btnBg);

    const btnText = this.add.text(0, btnY, 'CONTINUE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#00ffff',
      resolution: 2,
    });
    btnText.setOrigin(0.5);
    this.cardContainer.add(btnText);

    btnBg.setInteractive({ useHandCursor: true });

    const btnGlow = addGlow(btnBg, 0x00ffff, 2, 0, false, 0.1, 12);
    btnBg.on('pointerover', () => {
      if (btnGlow) this.tweens.add({ targets: btnGlow, outerStrength: 6, duration: 200 });
    });
    btnBg.on('pointerout', () => {
      if (btnGlow) this.tweens.add({ targets: btnGlow, outerStrength: 2, duration: 200 });
    });
    btnBg.on('pointerdown', () => {
      this.dismiss(nextZone, callingScene, playerData);
    });

    this.tweens.add({
      targets: this.cardContainer,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  dismiss(nextZone, callingScene, playerData) {
    this.tweens.add({
      targets: this.cardContainer,
      scale: 0,
      duration: 300,
      ease: 'Back.easeIn',
    });

    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0,
      duration: 300,
      onComplete: () => {
        this.scene.stop(callingScene);
        this.scene.stop(SCENES.INFO_CARD);
        if (nextZone) {
          this.scene.start(nextZone, playerData || {});
        }
      },
    });
  }
}
