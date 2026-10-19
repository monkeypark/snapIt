import Phaser from 'phaser';
import { soundManager } from '../services/soundManager';
import { NativeBridge } from '../services/nativeBridge';

interface GameConfig {
  mode: 'classic' | 'memory' | 'attack' | 'crazy' | 'super_crazy';
  difficulty: 'easy' | 'medium' | 'hard';
}

export class PlayScene extends Phaser.Scene {
  private mode: 'classic' | 'memory' | 'attack' | 'crazy' | 'super_crazy' = 'classic';
  private difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  private round: number = 1;
  private maxRounds: number = 10;
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private timerText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private targetIcon!: Phaser.GameObjects.Image;
  private targetId: number = 0;
  private optionContainer!: Phaser.GameObjects.Container;
  private isGameOver: boolean = false;
  private inputCooldown: boolean = false;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private progressBar!: Phaser.GameObjects.Rectangle;
  private combo: number = 0;
  private comboText!: Phaser.GameObjects.Text;
  private bgGlows: Phaser.GameObjects.Image[] = [];
  private intensity: number = 0;
  private heartbeatVignette!: Phaser.GameObjects.Graphics;
  
  // For Attack/Crazy Mode
  private timeLeft: number = 30;
  private attackScore: number = 0;
  private hideTimer?: Phaser.Time.TimerEvent;
  private totalTaps: number = 0;
  private correctTaps: number = 0;



  constructor() {
    super('PlayScene');
  }

  init(data: GameConfig) {
    this.mode = data.mode || 'classic';
    this.difficulty = data.difficulty || 'medium';
    this.round = 1;
    this.isGameOver = false;
    this.inputCooldown = false;
    this.attackScore = 0;
    this.combo = 0;
    this.totalTaps = 0;
    this.correctTaps = 0;
    this.timeLeft = this.difficulty === 'hard' ? 20 : (this.difficulty === 'easy' ? 45 : 30);
    
    if (this.mode === 'crazy' || this.mode === 'super_crazy') {
        this.difficulty = 'hard';
        this.timeLeft = this.mode === 'super_crazy' ? 2.5 : 3; // Even less time for Masochist Mode
    }
    
    this.elapsedTime = 0;
    this.maxRounds = this.mode === 'crazy' ? 999999 : 10;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Modern Background
    this.add.rectangle(0, 0, width, height, 0x020617).setOrigin(0);
    this.cameras.main.fadeIn(500, 2, 6, 23);
    this.add.tileSprite(0, 0, width, height, 'dots').setOrigin(0, 0).setAlpha(0.2);

    // Heartbeat Vignette (Red Pulse)
    this.heartbeatVignette = this.add.graphics();
    this.heartbeatVignette.fillStyle(0xf43f5e, 0.2);
    this.heartbeatVignette.fillRect(0, 0, width, height);
    this.heartbeatVignette.setAlpha(0);
    this.heartbeatVignette.setDepth(100);

    // Procedural Atmosphere Glows
    this.bgGlows = [];
    const colors = [0x6366f1, 0xec4899, 0xf59e0b];
    for (let i = 0; i < 3; i++) {
        const glow = this.add.image(
            i === 0 ? width * 0.2 : (i === 1 ? width * 0.8 : width * 0.5),
            i === 2 ? height * 0.8 : height * 0.3,
            'glow'
        ).setScale(4).setAlpha(0).setTint(colors[i]).setBlendMode('ADD');
        this.bgGlows.push(glow);
    }
    this.intensity = 0;

    // Particles
    this.particles = this.add.particles(0, 0, 'glow', {
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.6, end: 0 },
      speed: { min: 100, max: 400 },
      lifespan: 800,
      blendMode: 'ADD',
      emitting: false
    });

    // Top HUD
    const hudY = 60;
    this.timerText = this.add.text(width - 25, hudY, '0.00s', { 
      font: '900 24px Inter', 
      color: '#6366f1' 
    }).setOrigin(1, 0.5).setResolution(window.devicePixelRatio || 1);

    // End Game Button (X)
    const exitBtn = this.add.text(25, hudY, '✕', {
        font: '900 24px Inter',
        color: '#475569'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    exitBtn.on('pointerdown', () => {
        NativeBridge.hapticLight();
        soundManager.playSelect();
        this.endGame(false, 'QUIT');
    });

    exitBtn.on('pointerover', () => soundManager.playHover());

    // Adjust Round Text to be offset from X
    this.roundText = this.add.text(65, hudY, '', { 
      font: '900 14px Inter', 
      color: '#ffffff',
      letterSpacing: 1
    }).setOrigin(0, 0.5).setResolution(window.devicePixelRatio || 1);

    // Combo UI
    this.comboText = this.add.text(width / 2, height * 0.45, '', {
        font: '900 48px Inter',
        color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0).setResolution(window.devicePixelRatio || 1);

    // Difficulty Indicator
    const diffColors = { easy: '#10b981', medium: '#6366f1', hard: '#f43f5e' };
    this.add.text(width / 2, hudY, (this.mode === 'crazy' ? 'CRAZY' : (this.mode === 'super_crazy' ? 'MASOCHIST MODE' : this.difficulty)).toUpperCase(), {
        font: '900 10px Inter',
        color: (this.mode === 'crazy' || this.mode === 'super_crazy') ? '#f43f5e' : diffColors[this.difficulty],
        letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    // Progress Bar (Classic/Memory)
    if (this.mode !== 'attack' && this.mode !== 'crazy') {
      this.add.rectangle(width / 2, 95, width * 0.8, 4, 0x1e293b).setOrigin(0.5);
      const barColor = Phaser.Display.Color.HexStringToColor(diffColors[this.difficulty]).color;
      this.progressBar = this.add.rectangle(width / 2 - (width * 0.4), 95, 0, 4, barColor).setOrigin(0, 0.5);
    }
    
    // Target Zone
    const targetZoneY = height * 0.3;
    const frameColor = (this.mode === 'crazy' || this.mode === 'super_crazy') ? '#f43f5e' : diffColors[this.difficulty];
    const frameGlow = this.add.image(width / 2, targetZoneY, 'glow').setScale(2).setAlpha(0.1).setTint(Phaser.Display.Color.HexStringToColor(frameColor).color);
    this.tweens.add({ targets: frameGlow, alpha: 0.2, scale: 2.2, duration: 1500, yoyo: true, repeat: -1 });

    this.targetIcon = this.add.image(width / 2, targetZoneY, 'icon_0').setScale(0.8);

    // Grid Container
    this.optionContainer = this.add.container(0, 0);



    this.startNewRound();
    this.startTime = performance.now();
    
    // Start High Pressure BGM
    const pressureMap = { easy: 0.8, medium: 1.0, hard: 1.3 };
    soundManager.startBGM((this.mode === 'crazy' || this.mode === 'super_crazy') ? 1.0 : pressureMap[this.difficulty], (this.mode === 'crazy' || this.mode === 'super_crazy') ? 'crazy' : this.mode);

    // Crazy Mode Visual Pulse
    if (this.mode === 'crazy' || this.mode === 'super_crazy') {
        this.time.addEvent({
            delay: 375, // Matches the heart-attack tempo
            callback: () => {
                if (this.isGameOver) return;
                this.heartbeatVignette.setAlpha(0.35);
                this.tweens.add({ targets: this.heartbeatVignette, alpha: 0, duration: 300 });
                this.cameras.main.zoomTo(1.005, 50, 'Quad.easeOut', true, (c: any, p: number) => { if(p===1) c.zoomTo(1, 100); });
            },
            loop: true
        });
    }
  }



  update() {
    if (this.isGameOver) return;

    const now = performance.now();
    const delta = (now - this.startTime) / 1000;
    this.startTime = now;
    this.elapsedTime += delta;

    if (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') {
      this.timeLeft -= delta;
      
      if ((this.mode === 'attack' || this.mode === 'super_crazy') && this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame(this.mode === 'attack', 'TIME UP');
      }

      // Crazy/Super Crazy mode dynamic scaling for BGM
      if ((this.mode === 'crazy' || this.mode === 'super_crazy') && this.combo > 0 && this.combo % 5 === 0) {
          const extraPressure = Math.min(this.combo / 60, 0.8);
          soundManager.stopBGM();
          soundManager.startBGM(1.0 + extraPressure, 'crazy');
      }
    }

    this.timerText.setText(`${this.elapsedTime.toFixed(2)}s`);
    this.timerText.setColor('#6366f1');

    // Update Atmosphere Intensity
    const progress = (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') ? (this.mode === 'attack' ? this.attackScore : this.combo) : this.round;
    const maxProgress = (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') ? 50 : 10;
    this.intensity = Phaser.Math.Clamp(progress / maxProgress, 0, 1);

    this.bgGlows.forEach((glow, i) => {
        const baseAlpha = 0.05 + (this.intensity * 0.25);
        glow.setAlpha(baseAlpha + Math.sin(now / 1000 + i) * 0.05);
        
        const baseScale = 4 + (this.intensity * 2);
        glow.setScale(baseScale + Math.sin(now / 500 + i) * 0.2);
        
        // Jitter at high intensity
        if (this.intensity > 0.7) {
            glow.x += (Math.random() - 0.5) * (this.intensity * 5);
            glow.y += (Math.random() - 0.5) * (this.intensity * 5);
        }
    });
  }

  private startNewRound() {
    if (this.mode !== 'attack' && this.mode !== 'crazy' && this.mode !== 'super_crazy' && this.round > this.maxRounds) {
      this.endGame(true, 'ALL STAGES CLEAR');
      return;
    }

    this.inputCooldown = true;
    this.time.delayedCall(100, () => { this.inputCooldown = false; });

    // Update Progress
    if (this.mode === 'attack') {
      this.roundText.setText(`SCORE ${this.attackScore}`);
    } else if (this.mode === 'crazy' || this.mode === 'super_crazy') {
      this.roundText.setText(`COMBO ${this.combo}`);
    } else {
      this.roundText.setText(`STEP ${this.round} OF ${this.maxRounds}`);
      this.tweens.add({
        targets: this.progressBar,
        width: (this.round / this.maxRounds) * (this.cameras.main.width * 0.8),
        duration: 300,
        ease: 'Cubic.out'
      });
    }

    // Set Target
    this.targetId = Phaser.Math.Between(0, 11);
    this.targetIcon.setTexture(`icon_${this.targetId}`);
    this.targetIcon.setAlpha(1);
    this.targetIcon.setScale(0);
    this.tweens.add({
      targets: this.targetIcon,
      scale: 0.8,
      duration: this.mode === 'super_crazy' ? 250 : 400,
      ease: 'Back.out'
    });

    if (this.mode === 'memory' || this.mode === 'crazy' || this.mode === 'super_crazy') {
      let hideTime = 450;
      if (this.mode === 'memory') {
          hideTime = this.difficulty === 'hard' ? 250 : (this.difficulty === 'easy' ? 800 : 450);
      } else if (this.mode === 'super_crazy') {
          // Masochist Mode: Starts at 2.5s, decreases by 250ms per hit, floor at 0.3s
          hideTime = Math.max(300, 2500 - (this.combo * 250));
      } else {
          // Crazy Mode: Starts at 3.0s, decreases by 160ms per hit, floor at 0.4s
          hideTime = Math.max(400, 3000 - (this.combo * 160));
      }

      if (this.hideTimer) this.hideTimer.remove();
      this.hideTimer = this.time.delayedCall(hideTime, () => {
        if (!this.isGameOver) {
          this.tweens.add({ targets: this.targetIcon, alpha: 0, scale: 0.6, duration: 200 });
        }
      });

      if (this.mode === 'crazy' || this.mode === 'super_crazy') {
          this.timeLeft = hideTime / 1000;
      }
    }

    this.setupOptions();
  }

  private setupOptions() {
    this.optionContainer.removeAll(true);
    const { width, height } = this.cameras.main;
    const gridYStart = height * 0.58;
    const gridHeight = height * 0.35;
    
    let rows = 2, cols = 2;
    if (this.mode === 'super_crazy') {
        if (this.combo >= 15) { rows = 4; cols = 3; } // Go even bigger!
        else if (this.combo >= 8) { rows = 3; cols = 3; }
        else if (this.combo >= 4) { rows = 3; cols = 2; }
        else { rows = 2; cols = 2; }
    } else if (this.mode === 'crazy') {
        if (this.combo >= 25) { rows = 3; cols = 3; }
        else if (this.combo >= 12) { rows = 3; cols = 2; }
        else if (this.combo >= 6) { rows = 2; cols = 2; }
    } else if (this.difficulty === 'hard') {
        rows = 3; cols = 2;
        if (this.mode === 'attack' && this.attackScore >= 5) cols = 3;
        if (this.round >= 5) cols = 3;
    } else if (this.difficulty === 'medium') {
        if (this.round >= 4) rows = 3;
        if (this.round >= 8) cols = 3;
        if (this.mode === 'attack' && this.attackScore >= 5) rows = 3;
        if (this.mode === 'attack' && this.attackScore >= 10) cols = 3;
    } else {
        if (this.round >= 6) rows = 3;
        if (this.mode === 'attack' && this.attackScore >= 10) rows = 3;
    }

    const total = rows * cols;
    const padding = 20;
    const cellWidth = (width - padding * 2) / cols;
    const cellHeight = gridHeight / rows;

    const ids = [this.targetId];
    while (ids.length < total) {
      const rand = Phaser.Math.Between(0, 11);
      if (!ids.includes(rand)) ids.push(rand);
    }
    Phaser.Utils.Array.Shuffle(ids);

    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = padding + c * cellWidth + cellWidth / 2;
      const y = gridYStart + r * cellHeight + cellHeight / 2;

      const card = this.add.graphics();
      card.fillStyle(0xffffff, 0.05);
      card.fillRoundedRect(-cellWidth/2 + 6, -cellHeight/2 + 6, cellWidth - 12, cellHeight - 12, 20);
      card.lineStyle(1, 0xffffff, 0.05);
      card.strokeRoundedRect(-cellWidth/2 + 6, -cellHeight/2 + 6, cellWidth - 12, cellHeight - 12, 20);
      
      const icon = this.add.image(0, 0, `icon_${ids[i]}`).setScale(0.4);
      
      // Dynamic rotation
      if (this.mode === 'super_crazy' || this.mode === 'crazy' || this.difficulty === 'hard') {
          const isMasochist = this.mode === 'super_crazy';
          const baseDuration = isMasochist ? 3000 : 5000;
          const comboReduction = isMasochist ? Math.min(this.combo * 300, 2800) : ((this.mode === 'crazy') ? Math.min(this.combo * 180, 4400) : 0);
          this.tweens.add({
              targets: icon,
              angle: 360,
              duration: baseDuration - comboReduction,
              repeat: -1
          });
      }

      const container = this.add.container(x, y, [card, icon]);
      container.setSize(cellWidth, cellHeight);
      container.setInteractive({ useHandCursor: true });
      container.setScale(0);

      this.tweens.add({
        targets: container,
        scale: 1,
        duration: this.mode === 'super_crazy' ? 150 : 300,
        delay: i * (this.mode === 'super_crazy' ? 20 : 40),
        ease: 'Back.out'
      });

      container.on('pointerdown', () => this.onIconTap(ids[i], x, y, container));
      this.optionContainer.add(container);
    }
  }

  private onIconTap(id: number, x: number, y: number, container: Phaser.GameObjects.Container) {
    if (this.isGameOver || this.inputCooldown) return;
    this.totalTaps++;

    if (id === this.targetId) {
      this.correctTaps++;
      soundManager.playCorrect(this.round);
      
      this.combo++;
      
      if (this.combo % 5 === 0) NativeBridge.hapticMedium();
      else NativeBridge.hapticLight();

      import('../services/missionManager').then(({ MissionManager }) => {
          MissionManager.updateMissionProgress('combo_10', this.combo);
      });

      if (this.combo >= 2) this.updateComboUI();

      this.particles.setPostPipeline(`icon_${id}`);
      this.particles.emitParticleAt(x, y, 20);
      
      const isMasochist = this.mode === 'super_crazy';
      this.cameras.main.flash(isMasochist ? 80 : 150, 255, 255, 255, false);
      this.cameras.main.zoomTo(1.02, isMasochist ? 30 : 50, 'Quad.easeOut', true, (cam: any, progress: number) => {
          if (progress === 1) cam.zoomTo(1, isMasochist ? 60 : 100, 'Quad.easeIn');
      });

      const multiplierText = this.combo > 1 ? `\n${this.combo}x COMBO` : '';
      const hitText = this.add.text(x, y - 40, `PERFECT${multiplierText}`, {
          font: '900 20px Inter',
          color: '#ffffff',
          align: 'center'
      }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);
      
      this.tweens.add({
          targets: hitText,
          y: y - 100,
          alpha: 0,
          scale: 1.5,
          duration: 600,
          ease: 'Cubic.out',
          onComplete: () => hitText.destroy()
      });

      if (this.mode === 'attack') {
          this.attackScore++;
          if (this.combo % 5 === 0) {
              this.timeLeft += 1.5;
              this.cameras.main.flash(200, 16, 185, 129, false);
          }
      } else if (this.mode === 'crazy' || this.mode === 'super_crazy') {
          this.attackScore++;
      } else {
          this.round++;
      }
      
      this.startNewRound();
    } else {
      this.handleMistake(container, x, y);
    }
  }

  private updateComboUI() {
    this.comboText.setText(`${this.combo}X`);
    this.comboText.setAlpha(1);
    const scale = 1 + Math.min(this.combo * 0.1, 1.5);
    this.tweens.add({ targets: this.comboText, scale: scale, duration: 100, yoyo: true, ease: 'Back.out' });

    if (this.combo >= 15) this.comboText.setColor('#f43f5e');
    else if (this.combo >= 10) this.comboText.setColor('#fbbf24');
    else if (this.combo >= 5) this.comboText.setColor('#10b981');
    else this.comboText.setColor('#ffffff');
  }

  private handleMistake(container: Phaser.GameObjects.Container, x: number, y: number) {
    soundManager.playWrong();
    NativeBridge.hapticError();

    if (this.combo > 1) {
        this.tweens.add({ targets: this.comboText, alpha: 0, scale: 0, duration: 200 });
    }
    // We don't reset combo here for Crazy mode until we capture it in endGame
    // or we use attackScore which isn't reset.
    // However, to keep it simple, we reset it AFTER calling endGame if needed, 
    // or just rely on attackScore.
    
    this.cameras.main.shake(400, 0.025);
    this.cameras.main.flash(200, 244, 63, 94, false);

    const card = container.list[0] as Phaser.GameObjects.Graphics;
    card.clear();
    card.fillStyle(0xf43f5e, 0.4);
    card.fillRoundedRect(-container.width/2 + 6, -container.height/2 + 6, container.width - 12, container.height - 12, 20);

    const missText = this.add.text(x, y, 'COMBO BREAK', {
        font: '900 24px Inter',
        color: '#f43f5e'
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    this.tweens.add({
        targets: missText,
        angle: { from: -10, to: 10 },
        scale: 2,
        alpha: 0,
        duration: 500,
        ease: 'Back.in',
        onComplete: () => missText.destroy()
    });

    if (this.mode === 'attack') {
      const deduction = this.difficulty === 'hard' ? 3 : (this.difficulty === 'easy' ? 1 : 2);
      this.timeLeft = Math.max(0, this.timeLeft - deduction);
      this.inputCooldown = true;
      this.time.delayedCall(400, () => { this.inputCooldown = false; this.startNewRound(); });
    } else {
      // Classic, Memory, and Crazy mode stop on first mistake
      this.endGame(false, 'WRONG HIT');
    }
    
    // Reset combo for next life if applicable (though game over screen is shown)
    this.combo = 0;
  }

  private endGame(isVictory: boolean, reason: string = '') {
    this.isGameOver = true;
    soundManager.stopBGM();
    if (isVictory) {
        soundManager.playVictory();
    } else {
        soundManager.playGameOver();
    }

    const { width, height } = this.cameras.main;
    const overlay = this.add.rectangle(0, 0, width, height, 0x020617, 0.9).setOrigin(0);
    
    const card = this.add.container(width / 2, height / 2);
    const bg = this.add.graphics();
    bg.fillStyle(0x1e293b, 0.8);
    bg.fillRoundedRect(-160, -200, 320, 480, 32);
    
    const titleText = (this.mode === 'crazy' || this.mode === 'super_crazy') ? 'GAME OVER' : (isVictory ? 'VICTORY' : 'FAILED');
    const titleColor = (this.mode === 'crazy' || this.mode === 'super_crazy') ? '#ffffff' : (isVictory ? '#10b981' : '#f43f5e');

    const title = this.add.text(0, -160, titleText, {
      font: '900 32px Inter',
      color: titleColor
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const reasonText = this.add.text(0, -115, reason.toUpperCase(), {
      font: '900 32px Inter',
      color: isVictory ? '#10b981' : '#f43f5e'
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const finalScore = (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') ? this.attackScore : parseFloat(this.elapsedTime.toFixed(2));
    const scoreVal = this.add.text(0, -40, `${finalScore}${ (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') ? '' : 's'}`, {
      font: '900 64px Inter',
      color: '#ffffff'
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const scoreLbl = this.add.text(0, 10, 'FINAL SCORE', {
      font: '700 12px Inter',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const accuracy = this.totalTaps > 0 ? Math.round((this.correctTaps / this.totalTaps) * 100) : 0;
    const totalHits = this.correctTaps;

    const statsGroup = this.add.container(0, 70);
    
    const statsData = [
      { label: 'ACCURACY', value: `${accuracy}%` },
      { label: 'TOTAL HITS', value: totalHits.toString() }
    ];

    statsData.forEach((stat, i) => {
      const yPos = i * 35;
      const lbl = this.add.text(-120, yPos, stat.label, {
        font: '700 11px Inter',
        color: '#94a3b8',
        letterSpacing: 1
      }).setOrigin(0, 0.5).setResolution(window.devicePixelRatio || 1);

      const val = this.add.text(120, yPos, stat.value, {
        font: '900 16px Inter',
        color: '#ffffff'
      }).setOrigin(1, 0.5).setResolution(window.devicePixelRatio || 1);
      
      statsGroup.add([lbl, val]);
    });

    card.add([bg, title, reasonText, scoreVal, scoreLbl, statsGroup]);
    
    // Update Missions
    const hitsForMissions = (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') ? this.attackScore : this.round - 1;
    import('../services/missionManager').then(({ MissionManager }) => {
        MissionManager.updateMissionProgress('total_hits_50', hitsForMissions);
        if (this.mode === 'classic' && isVictory) {
            MissionManager.updateMissionProgress('perfect_classic', finalScore, true);
        }
        if (this.mode === 'crazy' || this.mode === 'super_crazy') {
            MissionManager.updateMissionProgress('crazy_combo', hitsForMissions);
        }
    });

    NativeBridge.saveHighScore(this.mode, finalScore);
    NativeBridge.saveSession(this.mode, finalScore, accuracy);
    
    this.createModernOverlayButton(card, 0, 165, 'TRY AGAIN', () => {
        soundManager.playStart();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.restart();
        });
    });

    this.createModernOverlayButton(card, 0, 225, 'VIEW STATISTICS', () => {
        soundManager.playSelect();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('StatsScene');
        });
    }, '#6366f1');

    this.createModernOverlayButton(card, 0, 285, 'MAIN MENU', () => {
        soundManager.playSelect();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }, '#94a3b8');

    card.setScale(0.8);
    card.setAlpha(0);
    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.out'
    });
  }

  private createModernOverlayButton(container: Phaser.GameObjects.Container, x: number, y: number, label: string, callback: Function, color: string = '#6366f1') {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xffffff, 0.05);
    btnBg.fillRoundedRect(-120, -25, 240, 50, 12);

    const btnText = this.add.text(0, 0, label, {
      font: '900 14px Inter',
      color: color,
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const btnContainer = this.add.container(x, y, [btnBg, btnText]);
    btnContainer.setSize(240, 50);
    btnContainer.setInteractive({ useHandCursor: true });

    btnContainer.on('pointerdown', () => {
      callback();
    });

    btnContainer.on('pointerover', () => {
      soundManager.playHover();
      btnBg.clear();
      btnBg.fillStyle(0xffffff, 0.1);
      btnBg.fillRoundedRect(-120, -25, 240, 50, 12);
    });

    btnContainer.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0xffffff, 0.05);
      btnBg.fillRoundedRect(-120, -25, 240, 50, 12);
    });

    container.add(btnContainer);
  }
}
