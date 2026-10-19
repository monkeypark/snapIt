import Phaser from 'phaser';
import { soundManager } from '../services/soundManager';
import { NativeBridge } from '../services/nativeBridge';

export class MenuScene extends Phaser.Scene {
  private selectedMode: string = '';

  constructor() {
    super('MenuScene');
  }

  private grid: Phaser.GameObjects.TileSprite | null = null;
  private glows: Phaser.GameObjects.Image[] = [];

  create() {
    const { width, height } = this.cameras.main;

    // 1. Background Layer (60%)
    this.add.rectangle(0, 0, width, height, 0x020617).setOrigin(0);
    this.cameras.main.fadeIn(500, 2, 6, 23);
    
    // Animated Grid Pattern (Parallax Layer 1)
    this.grid = this.add.tileSprite(0, 0, width, height, 'dots').setOrigin(0, 0).setAlpha(0.2);
    
    // Decorative Ambient Glows (Parallax Layer 2)
    const glow1 = this.add.image(width * 0.1, height * 0.2, 'glow').setScale(4).setTint(0x6366f1).setAlpha(0.1);
    const glow2 = this.add.image(width * 0.9, height * 0.8, 'glow').setScale(5).setTint(0xec4899).setAlpha(0.1);
    this.glows = [glow1, glow2];

    // Reactive Parallax Logic
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.grid) return;
      
      // Calculate normalized offset from center (-1 to 1)
      const nx = (pointer.x - width / 2) / (width / 2);
      const ny = (pointer.y - height / 2) / (height / 2);

      // Apply subtle parallax to grid
      this.grid.tilePositionX = -nx * 15;
      this.grid.tilePositionY = -ny * 15;

      // Apply deeper parallax to glows
      this.glows[0].setPosition(width * 0.1 - nx * 30, height * 0.2 - ny * 30);
      this.glows[1].setPosition(width * 0.9 - nx * 40, height * 0.8 - ny * 40);
    });

    // Constant slow drift for when pointer is idle
    this.tweens.add({
      targets: this.grid,
      tilePositionX: { from: 0, to: 100 },
      tilePositionY: { from: 0, to: 100 },
      duration: 60000,
      repeat: -1,
      ease: 'Linear'
    });

    // 2. Header Section
    const titleContainer = this.add.container(40, height * 0.1);
    
    const title1 = this.add.text(0, 0, 'SNAP', {
      font: '900 84px "Barlow Condensed"',
      color: '#ffffff',
      fontStyle: 'italic',
      letterSpacing: -2
    }).setOrigin(0, 0.5).setResolution(2);

    const title2 = this.add.text(0, 60, 'IT!', {
      font: '900 84px "Barlow Condensed"',
      color: '#ffffff',
      fontStyle: 'italic',
      letterSpacing: -2
    }).setOrigin(0, 0.5).setResolution(2);

    const subtitle = this.add.text(4, 115, 'EST. 2026 · SNAP ARCHIVE', {
      font: '700 12px Inter',
      color: '#6366f1',
      letterSpacing: 4
    }).setOrigin(0, 0.5).setResolution(2);

    titleContainer.add([title1, title2, subtitle]);

    // 3. Audio & System Toggles (Top Right)
    this.createModernSettings(width - 40, height * 0.1);

    // 4. Mode Selection (30% Structural)
    this.showModeSelection();

    // 5. Missions & Training Footer (10% Accent/Action)
    this.createFooterActions(width / 2, height - 60);
  }

  private createModernSettings(x: number, y: number) {
    const container = this.add.container(x, y);
    
    const sfxBtn = this.add.text(0, 0, soundManager.getSFXEnabled() ? 'SFX ON' : 'SFX OFF', {
      font: '900 11px Inter',
      color: soundManager.getSFXEnabled() ? '#10b981' : '#475569'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    const bgmBtn = this.add.text(0, 25, soundManager.getBGMEnabled() ? 'BGM ON' : 'BGM OFF', {
      font: '900 11px Inter',
      color: soundManager.getBGMEnabled() ? '#10b981' : '#475569'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    sfxBtn.on('pointerdown', () => {
      const next = !soundManager.getSFXEnabled();
      soundManager.setSFXEnabled(next);
      sfxBtn.setText(next ? 'SFX ON' : 'SFX OFF');
      sfxBtn.setColor(next ? '#10b981' : '#475569');
      NativeBridge.hapticLight();
      soundManager.playSelect();
    });

    sfxBtn.on('pointerover', () => soundManager.playHover());

    bgmBtn.on('pointerdown', () => {
      const next = !soundManager.getBGMEnabled();
      soundManager.setBGMEnabled(next);
      bgmBtn.setText(next ? 'BGM ON' : 'BGM OFF');
      bgmBtn.setColor(next ? '#10b981' : '#475569');
      NativeBridge.hapticLight();
      soundManager.playSelect();
    });

    bgmBtn.on('pointerover', () => soundManager.playHover());

    container.add([sfxBtn, bgmBtn]);
  }

  private createFooterActions(x: number, y: number) {
    const container = this.add.container(x, y);
    
    const missionsBtn = this.add.text(-100, 0, 'DAILY MISSIONS', {
      font: '900 11px Inter',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    const statsBtn = this.add.text(0, 0, 'STATS ARCHIVE', {
        font: '900 11px Inter',
        color: '#94a3b8',
        letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    const trainingBtn = this.add.text(100, 0, 'REWATCH TRAINING', {
      font: '900 11px Inter',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    const sep1 = this.add.text(-50, 0, '·', { font: '900 11px Inter', color: '#334155' }).setOrigin(0.5);
    const sep2 = this.add.text(50, 0, '·', { font: '900 11px Inter', color: '#334155' }).setOrigin(0.5);

    missionsBtn.on('pointerdown', () => {
      NativeBridge.hapticLight();
      soundManager.playSelect();
      this.showMissionsOverlay();
    });
    missionsBtn.on('pointerover', () => soundManager.playHover());

    statsBtn.on('pointerdown', () => {
        NativeBridge.hapticLight();
        soundManager.playSelect();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('StatsScene');
        });
    });
    statsBtn.on('pointerover', () => soundManager.playHover());

    trainingBtn.on('pointerdown', () => {
      NativeBridge.hapticLight();
      soundManager.playSelect();
      this.cameras.main.fadeOut(300, 2, 6, 23);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('TrainingScene');
      });
    });
    trainingBtn.on('pointerover', () => soundManager.playHover());

    container.add([missionsBtn, statsBtn, trainingBtn, sep1, sep2]);
  }





  private async showModeSelection() {
    const { width, height } = this.cameras.main;
    const container = this.add.container(0, 0);

    const modes = [
      { label: 'CLASSIC 10', mode: 'classic', color: 0x6366f1, desc: 'Original reaction challenge' },
      { label: 'MEMORY FLASH', mode: 'memory', color: 0xec4899, desc: 'Recall the sequence' },
      { label: 'TIME ATTACK', mode: 'attack', color: 0xf59e0b, desc: '30 seconds to peak score' },
      { label: 'CRAZY MODE', mode: 'crazy', color: 0xf43f5e, desc: 'High-speed erratic targets' },
      { label: 'MASOCHIST MODE', mode: 'super_crazy', color: 0x991b1b, desc: 'Absolute reflex limit' }
    ];

    for (let i = 0; i < modes.length; i++) {
      const m = modes[i];
      const score = await NativeBridge.getHighScore(m.mode);
      const formattedScore = (m.mode === 'attack' || m.mode === 'crazy' || m.mode === 'super_crazy') 
        ? (score > 0 ? `BEST: ${score}` : 'BEST: -') 
        : (score > 0 ? `BEST: ${score.toFixed(2)}s` : 'BEST: -');

      this.createModeCard(width / 2, height * 0.32 + (i * 88), m.label, m.color, formattedScore, async () => {
        this.selectedMode = m.mode;
        
        const needsTraining = (m.mode === 'crazy' || m.mode === 'super_crazy') && !(await NativeBridge.hasSeenTraining());
        const isDirectStart = m.mode === 'crazy' || m.mode === 'super_crazy';

        this.tweens.add({
            targets: container,
            alpha: 0,
            x: -width,
            duration: 300,
            onComplete: () => {
                container.destroy();
                
                if (needsTraining || isDirectStart) {
                    // Transitioning to a NEW scene, so we fade out
                    if (!needsTraining) soundManager.playStart();
                    this.cameras.main.fadeOut(300, 2, 6, 23);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        if (needsTraining) {
                            this.scene.start('TrainingScene');
                        } else {
                            this.scene.start('PlayScene', { mode: m.mode, difficulty: 'hard' });
                        }
                    });
                } else {
                    // Staying in MenuScene for Difficulty selection, NO fade out needed
                    soundManager.playSelect();
                    this.showDifficultySelection();
                }
            }
        });
      }, container, m.desc);
    }
  }

  private createModeCard(x: number, y: number, label: string, color: number, score: string, callback: Function, parent: Phaser.GameObjects.Container, desc: string) {
    const { width } = this.cameras.main;
    const btnWidth = width * 0.88;
    const btnHeight = 76;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.03);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    bg.lineStyle(1, 0xffffff, 0.05);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const accent = this.add.rectangle(-btnWidth / 2 + 12, 0, 3, btnHeight * 0.3, color).setOrigin(0, 0.5);

    const title = this.add.text(-btnWidth / 2 + 28, -12, label, {
      font: '900 18px Inter',
      color: '#ffffff'
    }).setOrigin(0, 0.5).setResolution(2);

    const description = this.add.text(-btnWidth / 2 + 28, 12, desc, {
      font: '600 11px Inter',
      color: '#64748b'
    }).setOrigin(0, 0.5).setResolution(2);

    const scoreText = this.add.text(btnWidth / 2 - 20, 0, score, {
      font: '900 11px Inter',
      color: '#475569'
    }).setOrigin(1, 0.5).setResolution(2);

    const container = this.add.container(x, y, [bg, accent, title, description, scoreText]);
    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.97,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          callback();
        }
      });
    });

    container.on('pointerover', () => {
      soundManager.playHover();
      this.tweens.add({
        targets: bg,
        alpha: 0.08,
        duration: 200
      });
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: bg,
        alpha: 0.03,
        duration: 200
      });
    });

    parent.add(container);
  }

  private async showMissionsOverlay() {
    const { width, height } = this.cameras.main;
    const { MissionManager } = await import('../services/missionManager');
    const missions = await MissionManager.getMissions();

    const overlay = this.add.container(0, 0).setDepth(100);
    const bg = this.add.rectangle(0, 0, width, height, 0x020617, 0.98).setOrigin(0);
    overlay.add(bg);

    const title = this.add.text(40, 80, 'DAILY MISSIONS', {
        font: '900 32px "Barlow Condensed"',
        color: '#ffffff',
        fontStyle: 'italic',
        letterSpacing: 2
    }).setOrigin(0, 0.5).setResolution(2);
    overlay.add(title);

    missions.forEach((m, i) => {
        const itemY = 180 + (i * 90);
        const itemBg = this.add.graphics();
        itemBg.fillStyle(0xffffff, 0.03);
        itemBg.fillRoundedRect(25, itemY - 35, width - 50, 70, 12);
        overlay.add(itemBg);

        const desc = this.add.text(45, itemY - 10, m.description, {
            font: '700 14px Inter',
            color: '#ffffff'
        }).setResolution(2);
        
        const reward = this.add.text(45, itemY + 12, `REWARD: ${m.reward}`, {
            font: '900 9px Inter',
            color: m.completed ? '#10b981' : '#6366f1',
            letterSpacing: 1
        }).setResolution(2);

        const statusText = m.completed ? 'DONE' : `${m.id === 'perfect_classic' ? (m.current === 999 ? '-' : m.current + 's') : m.current}/${m.target}`;
        const status = this.add.text(width - 45, itemY, statusText, {
            font: '900 16px Inter',
            color: m.completed ? '#10b981' : '#475569'
        }).setOrigin(1, 0.5).setResolution(2);

        overlay.add([desc, reward, status]);
    });

    const closeBtn = this.add.text(width / 2, height - 60, '← CLOSE', {
        font: '900 11px Inter',
        color: '#ffffff',
        letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    closeBtn.on('pointerdown', () => {
        soundManager.playSelect();
        overlay.destroy();
    });

    closeBtn.on('pointerover', () => soundManager.playHover());
    overlay.add(closeBtn);
  }

  private showDifficultySelection() {
    const { width, height } = this.cameras.main;
    const container = this.add.container(width, 0);
    container.setAlpha(0);

    const difficulties = [
        { label: 'EASY', diff: 'easy', color: 0x10b981, desc: 'Slower tempo, longer flash time' },
        { label: 'MEDIUM', diff: 'medium', color: 0x6366f1, desc: 'Balanced reflex challenge' },
        { label: 'HARD', diff: 'hard', color: 0xf43f5e, desc: 'Insane speed, rapid grid expansion' }
    ];

    const title = this.add.text(width / 2, height * 0.35, 'CHOOSE DIFFICULTY', {
        font: '900 12px Inter',
        color: '#64748b',
        letterSpacing: 4
    }).setOrigin(0.5).setResolution(2);
    container.add(title);

    difficulties.forEach((d, i) => {
      this.createModeCard(width / 2, height * 0.45 + (i * 88), d.label, d.color, '', () => {
        soundManager.playStart();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('PlayScene', { mode: this.selectedMode, difficulty: d.diff });
        });
      }, container, d.desc);
    });

    // Back Button
    const backBtn = this.add.text(width / 2, height - 60, '← BACK TO MODES', {
        font: '900 11px Inter',
        color: '#94a3b8',
        letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(2);
    container.add(backBtn);

    backBtn.on('pointerdown', () => {
        NativeBridge.hapticLight();
        soundManager.playSelect();
        this.tweens.add({
            targets: container,
            alpha: 0,
            x: width,
            duration: 300,
            onComplete: () => {
                container.destroy();
                this.showModeSelection();
            }
        });
    });

    backBtn.on('pointerover', () => soundManager.playHover());

    this.tweens.add({
        targets: container,
        alpha: 1,
        x: 0,
        duration: 300
    });
  }
}
