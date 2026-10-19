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
    
    this.add.text(width / 2, height / 2 - 30, 'CRAFTING KAWAII CORE', {
      font: '700 14px Inter',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = 200 * progress;
    });

    this.generateKawaiiIcons();
  }

  create() {
    this.cameras.main.fadeOut(300, 2, 6, 23);
    this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
    });
  }

  private generateKawaiiIcons() {
    const size = 128;
    const center = size / 2;
    const radius = size * 0.38;

    const colors = {
        STAR: 0xfff08d,
        HEX: 0xff85c0,
        BOLT: 0xffdf5d,
        DIAMOND: 0x8df3ff,
        PLUS: 0xa2f67e,
        RING: 0xd88dff,
        TRI: 0x7ef6f6,
        SQUARE: 0xffcc80,
        SPIRAL: 0xa2f67e,
        HEART: 0xff7eb6,
        MOON: 0xfff08d,
        GLASS: 0xb9ff9d
    };

    for (let i = 0; i < 12; i++) {
      const g = this.add.graphics();
      g.setVisible(false);
      
      const config = this.getIconConfig(i, colors);
      
      // Shadow / Outline
      g.lineStyle(8, 0x2d1b4d, 0.5);
      this.drawShape(g, config.type, center, radius);
      
      // Main Body
      g.fillStyle(config.color, 1);
      this.drawShape(g, config.type, center, radius, true);
      
      // Glossy Highlight
      g.fillStyle(0xffffff, 0.3);
      this.drawHighlight(g, config.type, center, radius);

      // Faces
      if (config.hasFace) {
          this.drawFace(g, center, center, radius);
      }

      // Special details
      this.drawDetails(g, i, center, radius);

      g.generateTexture(`icon_${i}`, size, size);
      g.destroy();
    }

    // Background Textures
    const bg = this.add.graphics();
    bg.setVisible(false);
    bg.lineStyle(1, 0xffffff, 0.05);
    for (let x = 0; x <= 64; x += 32) bg.lineBetween(x, 0, x, 64);
    for (let y = 0; y <= 64; y += 32) bg.lineBetween(0, y, 64, y);
    bg.generateTexture('dots', 64, 64);
    bg.destroy();

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

  private getIconConfig(i: number, colors: any) {
      const types = ['star', 'hex', 'bolt', 'diamond', 'plus', 'ring', 'tri', 'square', 'spiral', 'heart', 'moon', 'glass'];
      const cList = [colors.STAR, colors.HEX, colors.BOLT, colors.DIAMOND, colors.PLUS, colors.RING, colors.TRI, colors.SQUARE, colors.SPIRAL, colors.HEART, colors.MOON, colors.GLASS];
      const hasFaces = [true, true, true, false, true, false, true, true, false, true, true, false];
      return { type: types[i], color: cList[i], hasFace: hasFaces[i] };
  }

  private drawShape(g: Phaser.GameObjects.Graphics, type: string, center: number, radius: number, fill: boolean = false) {
      g.beginPath();
      switch (type) {
          case 'star': this.traceStar(g, center, center, 5, radius, radius * 0.5); break;
          case 'hex': this.tracePolygon(g, center, center, 6, radius); break;
          case 'bolt':
              g.moveTo(center + radius * 0.3, center - radius);
              g.lineTo(center - radius * 0.5, center + radius * 0.1);
              g.lineTo(center - radius * 0.1, center + radius * 0.1);
              g.lineTo(center - radius * 0.3, center + radius);
              g.lineTo(center + radius * 0.5, center - radius * 0.1);
              g.lineTo(center + radius * 0.1, center - radius * 0.1);
              g.closePath();
              break;
          case 'diamond':
              g.moveTo(center, center - radius);
              g.lineTo(center + radius, center - radius * 0.3);
              g.lineTo(center, center + radius);
              g.lineTo(center - radius, center - radius * 0.3);
              g.closePath();
              break;
          case 'plus':
              const pw = radius * 0.4;
              g.moveTo(center - radius, center - pw); g.lineTo(center - pw, center - pw); g.lineTo(center - pw, center - radius);
              g.lineTo(center + pw, center - radius); g.lineTo(center + pw, center - pw); g.lineTo(center + radius, center - pw);
              g.lineTo(center + radius, center + pw); g.lineTo(center + pw, center + pw); g.lineTo(center + pw, center + radius);
              g.lineTo(center - pw, center + radius); g.lineTo(center - pw, center + pw); g.lineTo(center - radius, center + pw);
              g.closePath();
              break;
          case 'ring':
              g.strokeCircle(center, center, radius);
              if (fill) g.fillCircle(center, center, radius);
              break;
          case 'tri': this.tracePolygon(g, center, center, 3, radius); break;
          case 'square': g.fillRect(center - radius, center - radius, radius * 2, radius * 2); break;
          case 'spiral': g.strokeCircle(center, center, radius); if (fill) g.fillCircle(center, center, radius); break;
          case 'heart':
              const hr = radius * 0.7;
              const hy = center - 10;
              g.moveTo(center, center + radius);
              g.lineTo(center - radius, hy + radius * 0.2);
              g.arc(center - hr/2, hy, hr/2, Math.PI, 0, false);
              g.arc(center + hr/2, hy, hr/2, Math.PI, 0, false);
              g.lineTo(center, center + radius);
              g.closePath();
              break;
          case 'moon':
              g.arc(center, center, radius, -Math.PI/2, Math.PI/2, false);
              g.arc(center + radius * 0.5, center, radius * 0.8, Math.PI/2, -Math.PI/2, true);
              g.closePath();
              break;
          case 'glass':
              g.moveTo(center - radius, center - radius); g.lineTo(center + radius, center - radius);
              g.lineTo(center, center); g.lineTo(center + radius, center + radius);
              g.lineTo(center - radius, center + radius); g.lineTo(center, center);
              g.closePath();
              break;
      }
      if (fill) g.fillPath(); else g.strokePath();
  }

  private drawHighlight(g: Phaser.GameObjects.Graphics, type: string, center: number, radius: number) {
      const hX = center - radius * 0.3;
      const hY = center - radius * 0.5;
      g.fillCircle(hX, hY, radius * 0.2);
  }

  private drawFace(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number) {
      g.fillStyle(0x2d1b4d, 1);
      // Eyes
      g.fillCircle(x - radius * 0.3, y + 2, 4);
      g.fillCircle(x + radius * 0.3, y + 2, 4);
      // Mouth (small smile)
      g.lineStyle(2, 0x2d1b4d, 1);
      g.beginPath();
      g.arc(x, y + 8, 4, 0.2, Math.PI - 0.2, false);
      g.strokePath();
      // Blush
      g.fillStyle(0xffaebc, 0.6);
      g.fillCircle(x - radius * 0.4, y + 10, 5);
      g.fillCircle(x + radius * 0.4, y + 10, 5);
  }

  private drawDetails(g: Phaser.GameObjects.Graphics, i: number, center: number, radius: number) {
      if (i === 3) { // Diamond facets
          g.lineStyle(1, 0xffffff, 0.4);
          g.beginPath();
          g.moveTo(center - radius, center - radius * 0.3); g.lineTo(center + radius, center - radius * 0.3);
          g.moveTo(center - radius * 0.4, center - radius * 0.3); g.lineTo(center, center - radius);
          g.moveTo(center + radius * 0.4, center - radius * 0.3); g.lineTo(center, center - radius);
          g.strokePath();
      }
      if (i === 5) { // Donut hole
          g.fillStyle(0x2d1b4d, 1);
          g.fillCircle(center, center, radius * 0.4);
          // Bubbles
          g.fillStyle(0xffffff, 0.5);
          g.fillCircle(center + radius * 0.8, center - radius * 0.5, 6);
          g.fillCircle(center - radius * 0.9, center + radius * 0.2, 4);
      }
      if (i === 8) { // Spiral center
          g.lineStyle(3, 0xffffff, 0.4);
          for (let s = 1; s <= 3; s++) {
              g.strokeCircle(center, center, radius * (1 - s * 0.25));
          }
      }
      if (i === 11) { // Hourglass sand
          g.fillStyle(0xff7eb6, 1);
          g.beginPath();
          g.moveTo(center - radius * 0.6, center + radius * 0.8);
          g.lineTo(center + radius * 0.6, center + radius * 0.8);
          g.lineTo(center, center + 5);
          g.closePath();
          g.fillPath();
      }
      if (i === 10) { // Moon Cap
          g.fillStyle(0x7ef6f6, 1);
          g.beginPath();
          g.moveTo(center - radius * 0.2, center - radius);
          // Safe approximation of quadratic curve
          g.lineTo(center + radius * 0.4, center - radius * 1.2);
          g.lineTo(center + radius * 1.2, center - radius * 0.4);
          g.lineTo(center + radius * 0.5, center - radius * 0.5);
          g.closePath();
          g.fillPath();
          g.fillStyle(0xffffff, 1);
          g.fillCircle(center + radius * 1.2, center - radius * 0.4, 8);
      }
  }

  private tracePolygon(g: Phaser.GameObjects.Graphics, x: number, y: number, sides: number, radius: number) {
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
  }

  private traceStar(g: Phaser.GameObjects.Graphics, x: number, y: number, points: number, outerRadius: number, innerRadius: number) {
    const step = Math.PI / points;
    let rotation = -Math.PI / 2;
    g.moveTo(x + Math.cos(rotation) * outerRadius, y + Math.sin(rotation) * outerRadius);
    for (let i = 0; i < points; i++) {
      rotation += step;
      g.lineTo(x + Math.cos(rotation) * innerRadius, y + Math.sin(rotation) * innerRadius);
      rotation += step;
      g.lineTo(x + Math.cos(rotation) * outerRadius, y + Math.sin(rotation) * outerRadius);
    }
    g.closePath();
  }
}
