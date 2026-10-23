import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    const { width, height } = this.cameras.main;
    
    // Modern Minimalist Loader
    this.add.rectangle(width / 2, height / 2, 200, 4, 0x1e293b).setOrigin(0.5);
    const bar = this.add.rectangle(width / 2 - 100, height / 2, 0, 4, 0xff7eb6).setOrigin(0, 0.5);
    
    this.add.text(width / 2, height / 2 - 30, 'LOADING ANIMAL HEROES', {
      font: '700 14px Inter',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = 200 * progress;
    });

    // Load All 24 Animal Icons (Completely replaces old procedural shapes)
    for (let i = 0; i < 24; i++) {
      this.load.image(`icon_${i}`, `assets/icons/animal_${i}.png`);
      this.load.image(`animal_${i}`, `assets/icons/animal_${i}.png`);
    }

    // Load Custom Pastel Aesthetic Background
    this.load.image('game_bg', 'assets/pastel_bg.jpg');

    this.generateBackgroundTextures();
  }

  create() {
    this.cameras.main.fadeOut(300, 2, 6, 23);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }

  private generateBackgroundTextures() {
    // Animated Grid Dots
    const bg = this.add.graphics();
    bg.setVisible(false);
    bg.lineStyle(1, 0xffffff, 0.05);
    for (let x = 0; x <= 64; x += 32) bg.lineBetween(x, 0, x, 64);
    for (let y = 0; y <= 64; y += 32) bg.lineBetween(0, y, 64, y);
    bg.generateTexture('dots', 64, 64);
    bg.destroy();

    // Atmosphere Ambient Glow
    const glow = this.add.graphics();
    glow.setVisible(false);
    for (let r = 0; r < 64; r++) {
      glow.fillStyle(0xffffff, (1 - r / 64) * 0.2);
      glow.fillCircle(64, 64, r);
    }
    glow.generateTexture('glow', 128, 128);
    glow.destroy();

    // Custom Stylized Cursor Textures
    const cursorSize = 32;
    const cur = this.add.graphics();
    cur.setVisible(false);
    
    // Default Dot
    cur.fillStyle(0xffffff, 1);
    cur.fillCircle(16, 16, 4);
    cur.generateTexture('cursor_dot', cursorSize, cursorSize);
    cur.clear();

    // Reactive Ring
    cur.lineStyle(2, 0xffffff, 1);
    cur.strokeCircle(16, 16, 10);
    cur.lineStyle(4, 0xffffff, 0.3);
    cur.strokeCircle(16, 16, 12);
    cur.generateTexture('cursor_ring', cursorSize, cursorSize);
    cur.destroy();
  }
}
