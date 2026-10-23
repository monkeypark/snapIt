import Phaser from 'phaser';
import { soundManager } from '../services/soundManager';
import { NativeBridge } from '../services/nativeBridge';
import { ScoreCard, ScoreCardData } from '../services/share/ScoreCard';
import { ShareScoreService } from '../services/share/ShareScoreService';
import { adService } from '../services/ads/adService';

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
  private isCountingDown: boolean = true;
  private countdownContainer: Phaser.GameObjects.Container | null = null;
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
  private maxCombo: number = 0;

  constructor() {
    super('PlayScene');
  }

  init(data: GameConfig) {
    this.mode = data.mode || 'classic';
    this.difficulty = data.difficulty || 'medium';
    this.round = 1;
    this.isGameOver = false;
    this.isCountingDown = true;
    this.inputCooldown = false;
    this.attackScore = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalTaps = 0;
    this.correctTaps = 0;
    this.timeLeft = this.difficulty === 'hard' ? 20 : (this.difficulty === 'easy' ? 45 : 30);
    
    if (this.mode === 'crazy' || this.mode === 'super_crazy') {
        this.difficulty = 'hard';
        this.timeLeft = this.mode === 'super_crazy' ? 2.5 : 3; // Even less time for Masochist Mode
    }
    
    this.elapsedTime = 0;
    this.maxRounds = (this.mode === 'crazy' || this.mode === 'super_crazy') ? 999999 : 10;
  }

  create() {
    // Hide banner ad during high-speed gameplay
    adService.hideBanner();

    const { width, height } = this.cameras.main;

    // Pastel Aesthetic Background with Gameplay Scrim
    this.add.image(width / 2, height / 2, 'game_bg').setDisplaySize(width, height).setOrigin(0.5);
    this.add.rectangle(0, 0, width, height, 0x090d16).setOrigin(0).setAlpha(0.35);
    this.cameras.main.fadeIn(500, 2, 6, 23);
    this.add.tileSprite(0, 0, width, height, 'dots').setOrigin(0, 0).setAlpha(0.15);

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



    // 3-second countdown before game begins
    this.startCountdown();
  }

  update() {
    if (this.isGameOver || this.isCountingDown) return;

    const now = performance.now();
    const delta = (now - this.startTime) / 1000;
    this.startTime = now;
    this.elapsedTime += delta;

    if (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') {
      this.timeLeft -= delta;
      
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame(this.mode === 'attack' || this.attackScore > 0, 'TIME UP');
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

  /**
   * 3-Second High-Energy Arcade Countdown before gameplay starts
   */
  private startCountdown() {
    this.isCountingDown = true;
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 2).setDepth(200);
    this.countdownContainer = container;

    // Dark focus backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x020617, 0.72).setOrigin(0.5);
    backdrop.setInteractive(); // Prevent taps underneath during countdown

    // Countdown Font Size set to 112px, matching circle diameter (112px)
    const countdownFontSize = 112;
    const circleRadius = 56; // 112px diameter
    const circleDiameter = circleRadius * 2; // 112px

    const circleCenterY = -10;

    // Ambient glow behind countdown number, scaled to match circle
    const glowScale = Math.max(3.2, (circleRadius / 25) * 1.15);
    const glow = this.add.image(0, circleCenterY, 'glow').setScale(glowScale).setAlpha(0.28).setTint(0x6366f1);
    this.tweens.add({
      targets: glow,
      scale: glowScale * 1.3,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Rotating Tech HUD Ring around the circle
    const hudRing = this.add.graphics();
    const drawHudRing = (color: number) => {
      hudRing.clear();
      hudRing.lineStyle(1.5, color, 0.6);
      // Dashed / segmented radar ticks
      for (let a = 0; a < 360; a += 30) {
        const rad = Phaser.Math.DegToRad(a);
        const r1 = circleRadius + 8;
        const r2 = circleRadius + 14;
        hudRing.lineBetween(
          Math.cos(rad) * r1, circleCenterY + Math.sin(rad) * r1,
          Math.cos(rad) * r2, circleCenterY + Math.sin(rad) * r2
        );
      }
      // Outer subtle thin orbit
      hudRing.strokeCircle(0, circleCenterY, circleRadius + 11);
    };
    drawHudRing(0x6366f1);

    this.tweens.add({
      targets: hudRing,
      angle: 360,
      duration: 6000,
      repeat: -1,
      ease: 'Linear'
    });

    // Expanding shockwave rings
    const ring1 = this.add.graphics();
    const ring2 = this.add.graphics();

    // Mode title and difficulty badge positioned above the circle
    const modeTitle = ScoreCard.getModeTitle(this.mode);
    const diffLabel = (this.mode === 'crazy' || this.mode === 'super_crazy')
      ? 'EXTREME'
      : this.difficulty.toUpperCase();

    const bannerY = circleCenterY - circleRadius - 42;
    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x1e293b, 0.92);
    bannerBg.fillRoundedRect(-140, bannerY - 19, 280, 38, 19);
    bannerBg.lineStyle(1.5, 0x6366f1, 0.8);
    bannerBg.strokeRoundedRect(-140, bannerY - 19, 280, 38, 19);

    const bannerText = this.add.text(0, bannerY, `${modeTitle}  ·  ${diffLabel}`, {
      font: '900 12px Inter',
      color: '#c7d2fe',
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    // Prompt subtitle positioned below the circle
    const promptY = circleCenterY + circleRadius + 38;
    const promptText = this.add.text(0, promptY, 'GET READY...', {
      font: '800 13px Inter',
      color: '#94a3b8',
      letterSpacing: 3
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    // Permanent Countdown Circle Frame & Glowing Backdrop
    const circleBase = this.add.graphics();
    const updateCircleBase = (color: number) => {
      circleBase.clear();
      // Translucent backdrop disc with gradient feel
      circleBase.fillStyle(0x0f172a, 0.85);
      circleBase.fillCircle(0, circleCenterY, circleRadius);
      // Outer glowing rim matching current step color
      circleBase.lineStyle(4, color, 0.98);
      circleBase.strokeCircle(0, circleCenterY, circleRadius);
      // Inner tech crosshairs
      circleBase.lineStyle(1, color, 0.3);
      circleBase.lineBetween(-circleRadius + 12, circleCenterY, -circleRadius + 22, circleCenterY);
      circleBase.lineBetween(circleRadius - 22, circleCenterY, circleRadius - 12, circleCenterY);
      circleBase.lineBetween(0, circleCenterY - circleRadius + 12, 0, circleCenterY - circleRadius + 22);
      circleBase.lineBetween(0, circleCenterY + circleRadius - 22, 0, circleCenterY + circleRadius - 12);
    };
    updateCircleBase(0x6366f1);

    // Glitch Echo Text & Main Countdown Number Text
    const echoText = this.add.text(3, circleCenterY + 3, '3', {
      font: `900 italic ${countdownFontSize}px "Barlow Condensed", Inter, sans-serif`,
      color: '#ec4899'
    }).setOrigin(0.5).setAlpha(0).setResolution(window.devicePixelRatio || 1);

    const countText = this.add.text(0, circleCenterY, '3', {
      font: `900 italic ${countdownFontSize}px "Barlow Condensed", Inter, sans-serif`,
      color: '#6366f1'
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    container.add([backdrop, glow, circleBase, ring1, ring2, hudRing, bannerBg, bannerText, promptText, echoText, countText]);

    const pulseRings = (color: number) => {
      ring1.clear();
      ring1.lineStyle(3, color, 0.9);
      ring1.strokeCircle(0, circleCenterY, circleRadius);
      ring1.setAlpha(1);
      ring1.setScale(1);

      this.tweens.add({
        targets: ring1,
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: 0,
        duration: 700,
        ease: 'Quad.easeOut'
      });

      this.time.delayedCall(120, () => {
        ring2.clear();
        ring2.lineStyle(1.5, color, 0.7);
        ring2.strokeCircle(0, circleCenterY, circleRadius);
        ring2.setAlpha(1);
        ring2.setScale(1);

        this.tweens.add({
          targets: ring2,
          scaleX: 3.0,
          scaleY: 3.0,
          alpha: 0,
          duration: 600,
          ease: 'Cubic.easeOut'
        });
      });
    };

    const runCountStep = (step: number) => {
      if (this.isGameOver) return;

      if (step === 3) {
        countText.setText('3');
        echoText.setText('3');
        countText.setColor('#6366f1');
        echoText.setColor('#ec4899');
        countText.setFontSize(countdownFontSize);
        echoText.setFontSize(countdownFontSize);
        glow.setTint(0x6366f1);
        promptText.setText('CONCENTRATE...');
        soundManager.playCountdownTick(false);
        NativeBridge.hapticLight();
        updateCircleBase(0x6366f1);
        drawHudRing(0x6366f1);
        pulseRings(0x6366f1);
      } else if (step === 2) {
        countText.setText('2');
        echoText.setText('2');
        countText.setColor('#ec4899');
        echoText.setColor('#f59e0b');
        countText.setFontSize(countdownFontSize);
        echoText.setFontSize(countdownFontSize);
        glow.setTint(0xec4899);
        promptText.setText('TARGET LOCKED...');
        soundManager.playCountdownTick(false);
        NativeBridge.hapticLight();
        updateCircleBase(0xec4899);
        drawHudRing(0xec4899);
        pulseRings(0xec4899);
      } else if (step === 1) {
        countText.setText('1');
        echoText.setText('1');
        countText.setColor('#f59e0b');
        echoText.setColor('#ef4444');
        countText.setFontSize(countdownFontSize);
        echoText.setFontSize(countdownFontSize);
        glow.setTint(0xf59e0b);
        promptText.setText('SNAP IT NOW!');
        soundManager.playCountdownTick(false);
        NativeBridge.hapticMedium();
        updateCircleBase(0xf59e0b);
        drawHudRing(0xf59e0b);
        pulseRings(0xf59e0b);
      } else if (step === 0) {
        countText.setText('SNAP!');
        echoText.setText('SNAP!');
        countText.setColor('#10b981');
        echoText.setColor('#6366f1');
        countText.setFontSize(Math.round(countdownFontSize * 0.36));
        echoText.setFontSize(Math.round(countdownFontSize * 0.36));
        glow.setTint(0x10b981);
        promptText.setText('GO! GO! GO!');
        promptText.setColor('#10b981');
        soundManager.playCountdownTick(true);
        NativeBridge.hapticSuccess();
        updateCircleBase(0x10b981);
        drawHudRing(0x10b981);
        pulseRings(0x10b981);
        this.cameras.main.shake(220, 0.007);
      }

      // High-impact dramatic drop-in animation (scale 2.2 -> 1.0 with rotation and echo trail)
      countText.setScale(2.2);
      countText.setAlpha(0);
      countText.angle = -14;

      echoText.setScale(2.4);
      echoText.setAlpha(0);
      echoText.angle = 10;

      this.tweens.add({
        targets: countText,
        scale: 1.0,
        alpha: 1.0,
        angle: 0,
        duration: 320,
        ease: 'Back.out'
      });

      this.tweens.add({
        targets: echoText,
        scale: 1.0,
        alpha: 0.45,
        angle: 0,
        duration: 220,
        ease: 'Power2',
        yoyo: true,
        hold: 100
      });

      if (step > 0) {
        this.time.delayedCall(1000, () => runCountStep(step - 1));
      } else {
        // Countdown completed: fade out overlay and start game
        this.time.delayedCall(450, () => {
          this.tweens.add({
            targets: container,
            alpha: 0,
            scale: 1.08,
            duration: 250,
            ease: 'Power2',
            onComplete: () => {
              container.destroy();
              this.countdownContainer = null;
              this.isCountingDown = false;
              this.startTime = performance.now();

              // Start High Pressure BGM
              const pressureMap = { easy: 0.8, medium: 1.0, hard: 1.3 };
              soundManager.startBGM(
                (this.mode === 'crazy' || this.mode === 'super_crazy') ? 1.0 : pressureMap[this.difficulty],
                (this.mode === 'crazy' || this.mode === 'super_crazy') ? 'crazy' : this.mode
              );

              // Crazy Mode Visual Pulse
              if (this.mode === 'crazy' || this.mode === 'super_crazy') {
                this.time.addEvent({
                  delay: 375,
                  callback: () => {
                    if (this.isGameOver || this.isCountingDown) return;
                    this.heartbeatVignette.setAlpha(0.35);
                    this.tweens.add({ targets: this.heartbeatVignette, alpha: 0, duration: 300 });
                    this.cameras.main.zoomTo(1.005, 50, 'Quad.easeOut', true, (c: any, p: number) => { if (p === 1) c.zoomTo(1, 100); });
                  },
                  loop: true
                });
              }

              this.startNewRound();
            }
          });
        });
      }
    };

    runCountStep(3);
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

    // Set Target (from 24 Cute Animals)
    this.targetId = Phaser.Math.Between(0, 23);
    this.targetIcon.setTexture(`icon_${this.targetId}`);
    this.targetIcon.setAlpha(1);
    this.targetIcon.setScale(0);
    this.tweens.killTweensOf(this.targetIcon);
    this.tweens.add({
      targets: this.targetIcon,
      scale: 0.8,
      alpha: 1,
      duration: this.mode === 'super_crazy' ? 250 : 400,
      ease: 'Back.out'
    });

    if (this.mode === 'memory' || this.mode === 'crazy' || this.mode === 'super_crazy') {
      let hideTime = 450;
      if (this.mode === 'memory') {
          // Memory Flash durations: Easy 1s, Medium 0.8s, Hard 0.5s
          hideTime = this.difficulty === 'hard' ? 500 : (this.difficulty === 'easy' ? 1000 : 800);
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
          // Fade away completely (alpha: 0) for Memory Flash and other hidden modes
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
      const rand = Phaser.Math.Between(0, 23);
      if (!ids.includes(rand)) ids.push(rand);
    }
    Phaser.Utils.Array.Shuffle(ids);

    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = padding + c * cellWidth + cellWidth / 2;
      const y = gridYStart + r * cellHeight + cellHeight / 2;

      // Clean animal head icon directly (no square board)
      const iconScale = (Math.min(cellWidth, cellHeight) / 144) * 0.85;
      const icon = this.add.image(0, 0, `icon_${ids[i]}`).setScale(iconScale);
      
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

      const container = this.add.container(x, y, [icon]);
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
    if (this.isGameOver || this.isCountingDown || this.inputCooldown) return;
    this.totalTaps++;

    if (id === this.targetId) {
      this.correctTaps++;
      soundManager.playCorrect(this.round);
      
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      
      if (this.combo % 5 === 0) NativeBridge.hapticMedium();
      else NativeBridge.hapticLight();

      import('../services/missionManager').then(async ({ MissionManager }) => {
        const completedTap = await MissionManager.recordTap(true);
        const completedCombo = await MissionManager.recordCombo(this.combo);
        const all = [...completedTap, ...completedCombo];
        if (all.length > 0) {
          this.showMissionToast(all[0].title);
        }
      });

      if (this.combo >= 2) this.updateComboUI();

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
      // Classic, Memory, Crazy, Super Crazy mode stop on first mistake
      this.endGame(false, 'WRONG HIT');
    }
    
    // Reset combo for next life if applicable (though game over screen is shown)
    this.combo = 0;
  }

  private async endGame(isVictory: boolean, reason: string = '') {
    if (this.isGameOver) return;
    this.isGameOver = true;
    if (this.countdownContainer) {
      this.countdownContainer.destroy();
      this.countdownContainer = null;
    }
    this.isCountingDown = false;
    soundManager.stopBGM();

    const finalScore = (this.mode === 'attack' || this.mode === 'crazy' || this.mode === 'super_crazy') 
      ? this.attackScore 
      : parseFloat(this.elapsedTime.toFixed(2));
    const accuracy = this.totalTaps > 0 ? Math.round((this.correctTaps / this.totalTaps) * 100) : 0;
    const totalHits = this.correctTaps;

    const isTimeBased = this.mode === 'classic' || this.mode === 'memory';
    const isEligibleForRecord = isTimeBased ? isVictory : (finalScore > 0);

    let recordResult = { isNewRecord: false, previousBest: 0, newBest: 0 };
    if (isEligibleForRecord) {
      recordResult = await NativeBridge.saveHighScore(this.mode, finalScore, this.difficulty);
    } else {
      const currentBest = await NativeBridge.getHighScore(this.mode, this.difficulty);
      recordResult = { isNewRecord: false, previousBest: currentBest, newBest: currentBest };
    }

    if (recordResult.isNewRecord) {
      soundManager.playNewRecord();
      NativeBridge.hapticHeavy();
    } else if (isVictory) {
      soundManager.playVictory();
    } else {
      soundManager.playGameOver();
    }

    const { width, height } = this.cameras.main;
    this.add.rectangle(0, 0, width, height, 0x020617, 0.9).setOrigin(0);
    
    const card = this.add.container(width / 2, height / 2);
    const bg = this.add.graphics();
    bg.fillStyle(0x1e293b, 0.92);
    bg.fillRoundedRect(-165, -230, 330, 560, 28);
    bg.lineStyle(2, recordResult.isNewRecord ? 0xf59e0b : 0x334155, recordResult.isNewRecord ? 1.0 : 0.4);
    bg.strokeRoundedRect(-165, -230, 330, 560, 28);
    
    const titleText = (this.mode === 'crazy' || this.mode === 'super_crazy') ? 'GAME OVER' : (isVictory ? 'VICTORY' : 'FAILED');
    const titleColor = (this.mode === 'crazy' || this.mode === 'super_crazy') ? '#ffffff' : (isVictory ? '#10b981' : '#f43f5e');

    const title = this.add.text(0, -185, titleText, {
      font: '900 28px Inter',
      color: titleColor
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const reasonText = this.add.text(0, -155, reason.toUpperCase(), {
      font: '800 12px Inter',
      color: isVictory ? '#10b981' : '#f43f5e',
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    // Record Badge
    const recordBadge = this.add.container(0, -118);
    const badgeGfx = this.add.graphics();
    
    if (recordResult.isNewRecord) {
      // Golden glowing banner for NEW RECORD!
      badgeGfx.fillStyle(0xf59e0b, 0.3);
      badgeGfx.lineStyle(2, 0xfbbf24, 1.0);
      badgeGfx.fillRoundedRect(-105, -18, 210, 36, 18);
      badgeGfx.strokeRoundedRect(-105, -18, 210, 36, 18);

      // Glowing outer ring
      badgeGfx.lineStyle(1, 0xfde047, 0.4);
      badgeGfx.strokeRoundedRect(-109, -22, 218, 44, 22);

      const recordText = this.add.text(0, 0, '🏆 NEW RECORD! 🏆', {
        font: '900 13px Inter',
        color: '#fef08a',
        letterSpacing: 2
      }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);
      
      recordBadge.add([badgeGfx, recordText]);

      // Pulsing celebration animation
      this.tweens.add({
        targets: recordBadge,
        scale: 1.08,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Celebration sparkle bursts
      this.time.delayedCall(120, () => {
        this.particles.emitParticleAt(width / 2, height / 2 - 118, 30);
      });
      this.time.delayedCall(300, () => {
        this.particles.emitParticleAt(width / 2, height / 2 - 50, 20);
      });
    } else {
      // Regular Best Score Tag
      badgeGfx.fillStyle(0xffffff, 0.05);
      badgeGfx.lineStyle(1, 0x475569, 0.5);
      badgeGfx.fillRoundedRect(-75, -14, 150, 28, 14);
      badgeGfx.strokeRoundedRect(-75, -14, 150, 28, 14);

      const bestVal = recordResult.previousBest > 0 
        ? (isTimeBased ? `${recordResult.previousBest.toFixed(2)}s` : `${recordResult.previousBest}`)
        : '-';
      const recordText = this.add.text(0, 0, `BEST: ${bestVal}`, {
        font: '700 11px Inter',
        color: '#94a3b8',
        letterSpacing: 1
      }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

      recordBadge.add([badgeGfx, recordText]);
    }

    const scoreColor = recordResult.isNewRecord ? '#fbbf24' : '#ffffff';
    const scoreVal = this.add.text(0, -50, `${finalScore}${isTimeBased ? 's' : ''}`, {
      font: '900 56px Inter',
      color: scoreColor
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const scoreLbl = this.add.text(0, -2, 'FINAL SCORE', {
      font: '700 11px Inter',
      color: '#94a3b8',
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const statsGroup = this.add.container(0, 42);
    
    const statsData: { label: string; value: string }[] = [
      { label: 'ACCURACY', value: `${accuracy}%` },
      { label: 'TOTAL HITS', value: totalHits.toString() }
    ];

    if (isTimeBased && isVictory && totalHits > 0) {
      statsData.push({ label: 'AVG / HIT', value: `${(finalScore / totalHits).toFixed(2)}s` });
    } else if (this.maxCombo > 1) {
      statsData.push({ label: 'MAX COMBO', value: `${this.maxCombo}x` });
    }

    statsData.forEach((stat, i) => {
      const yPos = i * 25;
      const lbl = this.add.text(-120, yPos, stat.label, {
        font: '700 11px Inter',
        color: '#94a3b8',
        letterSpacing: 1
      }).setOrigin(0, 0.5).setResolution(window.devicePixelRatio || 1);

      const val = this.add.text(120, yPos, stat.value, {
        font: '900 15px Inter',
        color: '#ffffff'
      }).setOrigin(1, 0.5).setResolution(window.devicePixelRatio || 1);
      
      statsGroup.add([lbl, val]);
    });

    card.add([bg, title, reasonText, recordBadge, scoreVal, scoreLbl, statsGroup]);
    
    // Update Daily Missions
    import('../services/missionManager').then(async ({ MissionManager }) => {
      const completed = await MissionManager.recordGameEnd(
        this.mode,
        finalScore,
        accuracy,
        isVictory,
        this.elapsedTime
      );
      if (completed.length > 0) {
        this.showMissionToast(completed[0].title);
      }
    });

    NativeBridge.saveSession(this.mode, finalScore, accuracy);

    // Prepare ScoreCard Data for Share
    const scoreCardData: ScoreCardData = {
      mode: this.mode,
      modeLabel: ScoreCard.getModeTitle(this.mode),
      difficulty: this.difficulty,
      finalScore: finalScore,
      formattedScore: isTimeBased ? `${finalScore.toFixed(2)}s` : `${finalScore} PTS`,
      isTimeBased: isTimeBased,
      accuracy: accuracy,
      totalHits: totalHits,
      maxCombo: this.maxCombo,
      avgTimePerHit: (isTimeBased && isVictory && totalHits > 0) ? (finalScore / totalHits) : undefined,
      isNewRecord: recordResult.isNewRecord,
      previousBest: recordResult.previousBest,
      newBest: recordResult.newBest,
      reason: reason || (isVictory ? 'VICTORY' : 'COMPLETED')
    };

    // 1. Prominent Cyberpunk SHARE SCORE Button
    this.createShareButton(card, 0, 138, async () => {
      soundManager.playSelect();
      NativeBridge.hapticLight();
      const res = await ShareScoreService.shareScore(scoreCardData);
      if (res.success) {
        NativeBridge.hapticSuccess();
        this.showShareToast(res.userMessage || 'Score shared successfully!');
      } else if (res.error) {
        this.showShareToast(res.error);
      }
    });
    
    // 2. TRY AGAIN Button
    this.createModernOverlayButton(card, 0, 188, 'TRY AGAIN', async () => {
        soundManager.playStart();
        await adService.onGameCompleted();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.restart();
        });
    }, '#ffffff');

    // 3. MAIN MENU Button
    this.createModernOverlayButton(card, 0, 238, 'MAIN MENU', async () => {
        soundManager.playSelect();
        await adService.onGameCompleted();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MenuScene');
        });
    }, '#94a3b8');

    // Responsive scaling to fit mobile displays comfortably
    const targetScale = Math.min(1, (height * 0.94) / 580);
    card.setScale(targetScale * 0.8);
    card.setAlpha(0);
    this.tweens.add({
      targets: card,
      scale: targetScale,
      alpha: 1,
      duration: 450,
      ease: 'Back.out'
    });
  }

  /**
   * Dedicated neon cyberpunk SHARE SCORE button with loading state and tap debounce
   */
  private createShareButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    onShare: () => Promise<void>
  ) {
    const btnWidth = 240;
    const btnHeight = 42;
    const btnBg = this.add.graphics();

    const drawBg = (hover: boolean, busy: boolean) => {
      btnBg.clear();
      if (busy) {
        btnBg.fillStyle(0x334155, 0.7);
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        btnBg.lineStyle(1.5, 0x64748b, 0.7);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      } else if (hover) {
        btnBg.fillStyle(0x06b6d4, 0.28);
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        btnBg.lineStyle(2, 0x38bdf8, 1.0);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      } else {
        btnBg.fillStyle(0x0891b2, 0.2);
        btnBg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        btnBg.lineStyle(1.5, 0x06b6d4, 0.9);
        btnBg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
      }
    };

    drawBg(false, false);

    const btnText = this.add.text(0, 0, '⚡ SHARE SCORE', {
      font: '900 13px Inter',
      color: '#38bdf8',
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const btnContainer = this.add.container(x, y, [btnBg, btnText]);
    btnContainer.setSize(btnWidth, btnHeight);
    btnContainer.setInteractive({ useHandCursor: true });

    let isBusy = false;

    btnContainer.on('pointerdown', async () => {
      if (isBusy || ShareScoreService.isSharing()) return;
      isBusy = true;
      drawBg(false, true);
      btnText.setText('GENERATING...');
      btnText.setColor('#94a3b8');

      try {
        await onShare();
      } catch (err) {
        console.error('Error during share:', err);
      } finally {
        isBusy = false;
        drawBg(false, false);
        btnText.setText('⚡ SHARE SCORE');
        btnText.setColor('#38bdf8');
      }
    });

    btnContainer.on('pointerover', () => {
      if (!isBusy) {
        soundManager.playHover();
        drawBg(true, false);
      }
    });

    btnContainer.on('pointerout', () => {
      if (!isBusy) {
        drawBg(false, false);
      }
    });

    container.add(btnContainer);
  }

  /**
   * Displays temporary cyberpunk toast feedback for score sharing operations
   */
  private showShareToast(message: string) {
    const { width } = this.cameras.main;
    const toast = this.add.container(width / 2, -50).setDepth(220);

    const toastBg = this.add.graphics();
    toastBg.fillStyle(0x0f172a, 0.96);
    toastBg.fillRoundedRect(-150, -18, 300, 36, 18);
    toastBg.lineStyle(1.5, 0x06b6d4, 0.95);
    toastBg.strokeRoundedRect(-150, -18, 300, 36, 18);

    const toastText = this.add.text(0, 0, message.toUpperCase(), {
      font: '800 11px Inter',
      color: '#38bdf8',
      letterSpacing: 1
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    toast.add([toastBg, toastText]);

    this.tweens.add({
      targets: toast,
      y: 70,
      duration: 350,
      ease: 'Back.out',
      onComplete: () => {
        this.time.delayedCall(2400, () => {
          this.tweens.add({
            targets: toast,
            y: -50,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.in',
            onComplete: () => toast.destroy()
          });
        });
      }
    });
  }

  private createModernOverlayButton(container: Phaser.GameObjects.Container, x: number, y: number, label: string, callback: Function, color: string = '#6366f1') {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xffffff, 0.05);
    btnBg.fillRoundedRect(-120, -22, 240, 44, 12);

    const btnText = this.add.text(0, 0, label, {
      font: '900 13px Inter',
      color: color,
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    const btnContainer = this.add.container(x, y, [btnBg, btnText]);
    btnContainer.setSize(240, 44);
    btnContainer.setInteractive({ useHandCursor: true });

    btnContainer.on('pointerdown', () => {
      callback();
    });

    btnContainer.on('pointerover', () => {
      soundManager.playHover();
      btnBg.clear();
      btnBg.fillStyle(0xffffff, 0.12);
      btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
    });

    btnContainer.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0xffffff, 0.05);
      btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
    });

    container.add(btnContainer);
  }

  private showMissionToast(missionTitle: string) {
    soundManager.playMissionComplete();
    NativeBridge.hapticSuccess();

    const { width } = this.cameras.main;
    const toast = this.add.container(width / 2, -50).setDepth(200);

    const toastBg = this.add.graphics();
    toastBg.fillStyle(0x0f172a, 0.95);
    toastBg.fillRoundedRect(-140, -18, 280, 36, 18);
    toastBg.lineStyle(1.5, 0xf59e0b, 0.9);
    toastBg.strokeRoundedRect(-140, -18, 280, 36, 18);

    const toastText = this.add.text(0, 0, `★ MISSION COMPLETED: ${missionTitle.toUpperCase()} ★`, {
      font: '900 11px Inter',
      color: '#fef08a',
      letterSpacing: 1
    }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

    toast.add([toastBg, toastText]);

    this.tweens.add({
      targets: toast,
      y: 70,
      duration: 350,
      ease: 'Back.out',
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: toast,
            y: -50,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.in',
            onComplete: () => toast.destroy()
          });
        });
      }
    });
  }
}
