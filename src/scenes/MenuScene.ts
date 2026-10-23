import Phaser from 'phaser';
import { soundManager } from '../services/soundManager';
import { NativeBridge } from '../services/nativeBridge';
import { MissionManager, DailyMission, VisualBadge } from '../services/missionManager';
import { menuNavigation } from '../services/menuNavigation';
import { adService } from '../services/ads/adService';

export class MenuScene extends Phaser.Scene {
  private selectedMode: string = '';
  private grid: Phaser.GameObjects.TileSprite | null = null;
  private glows: Phaser.GameObjects.Image[] = [];
  private missionWidgetContainer: Phaser.GameObjects.Container | null = null;
  private footerContainer: Phaser.GameObjects.Container | null = null;
  private modeContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('MenuScene');
  }

  create() {
    // Show banner ad in menus
    adService.showBanner();

    const { width, height } = this.cameras.main;

    // 1. Background Layer (Pastel Aesthetic Art with Interactive Parallax)
    const bgSprite = this.add.image(width / 2, height / 2, 'game_bg')
      .setDisplaySize(width * 1.05, height * 1.05)
      .setOrigin(0.5);
    
    // Subtle scrim so white typography and dark glass cards maintain high contrast
    this.add.rectangle(0, 0, width, height, 0x090d16).setOrigin(0).setAlpha(0.25);
    this.cameras.main.fadeIn(500, 2, 6, 23);
    
    // Animated Grid Pattern (Parallax Layer 1)
    this.grid = this.add.tileSprite(0, 0, width, height, 'dots').setOrigin(0, 0).setAlpha(0.18);
    
    // Decorative Ambient Glows (Parallax Layer 2)
    const glow1 = this.add.image(width * 0.1, height * 0.2, 'glow').setScale(4).setTint(0x6366f1).setAlpha(0.1);
    const glow2 = this.add.image(width * 0.9, height * 0.8, 'glow').setScale(5).setTint(0xec4899).setAlpha(0.1);
    this.glows = [glow1, glow2];

    // Reactive Parallax Logic
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const nx = (pointer.x - width / 2) / (width / 2);
      const ny = (pointer.y - height / 2) / (height / 2);

      bgSprite.setPosition(width / 2 - nx * 8, height / 2 - ny * 8);

      if (this.grid) {
        this.grid.tilePositionX = -nx * 15;
        this.grid.tilePositionY = -ny * 15;
      }

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
    const titleTop = Math.min(height * 0.08, 65);
    const titleContainer = this.add.container(36, titleTop);
    
    const title1 = this.add.text(0, 0, 'SNAP', {
      font: '900 76px "Barlow Condensed"',
      color: '#ffffff',
      fontStyle: 'italic',
      letterSpacing: -2
    }).setOrigin(0, 0.5).setResolution(2);

    const title2 = this.add.text(0, 52, 'IT!', {
      font: '900 76px "Barlow Condensed"',
      color: '#ffffff',
      fontStyle: 'italic',
      letterSpacing: -2
    }).setOrigin(0, 0.5).setResolution(2);

    const subtitle = this.add.text(4, 94, 'TAP FAST · THINK FASTER', {
      font: '700 11px Inter',
      color: '#6366f1',
      letterSpacing: 4
    }).setOrigin(0, 0.5).setResolution(2);

    titleContainer.add([title1, title2, subtitle]);

    // 3. Audio & System Toggles (Top Right)
    this.createModernSettings(width - 36, titleTop);

    // 4. Daily Mission Interactive Widget (Main Menu Prominent Banner)
    // Generous breathing room between subtitle and banner card
    const subtitleBottom = titleTop + 94 + 8; // approx 167px
    const widgetY = Math.max(subtitleBottom + 64, height * 0.26); // approx 231px+, ensuring 30px+ clearance
    this.createDailyMissionWidget(width / 2, widgetY);

    // Start BGM and subscribe to 120 BPM beat
    soundManager.startBGM(1.0, 'standard');
    const unsubscribeBeat = soundManager.subscribeBeat(() => {
      // Pulse ambient glows and grid alpha on beat
      this.glows.forEach((glow, idx) => {
        this.tweens.add({
          targets: glow,
          scale: idx === 0 ? 4.8 : 5.8,
          alpha: 0.22,
          duration: 120,
          yoyo: true,
          ease: 'Quad.easeOut'
        });
      });

      if (this.grid) {
        this.tweens.add({
          targets: this.grid,
          alpha: 0.35,
          duration: 80,
          yoyo: true,
          ease: 'Sine.easeOut'
        });
      }

      // Spawn floating neon particle burst reacting to BPM
      const pX = Phaser.Math.Between(width * 0.15, width * 0.85);
      const pY = Phaser.Math.Between(height * 0.2, height * 0.8);
      const colors = [0x6366f1, 0xec4899, 0xf59e0b, 0x10b981];
      const pColor = Phaser.Utils.Array.GetRandom(colors);
      const particle = this.add.circle(pX, pY, Phaser.Math.Between(3, 8), pColor).setAlpha(0.85).setDepth(5);
      
      this.tweens.add({
        targets: particle,
        scale: 4.0,
        alpha: 0,
        y: pY - 90,
        duration: 550,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    });

    // 5. Framer Motion Mode Selection with Staggered Entrance Animation
    menuNavigation.showMenu();
    this.events.once('shutdown', () => {
      menuNavigation.hideMenu();
      soundManager.stopBGM();
      unsubscribeBeat();
    });

    // Footer buttons are now handled by React MainMenuButtons.tsx
  }

  private createModernSettings(x: number, y: number) {
    const container = this.add.container(x, y);
    
    const sfxBtn = this.add.text(0, 0, soundManager.getSFXEnabled() ? 'SFX ON' : 'SFX OFF', {
      font: '900 11px Inter',
      color: soundManager.getSFXEnabled() ? '#10b981' : '#475569'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    const bgmBtn = this.add.text(0, 24, soundManager.getBGMEnabled() ? 'BGM ON' : 'BGM OFF', {
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

  /**
   * Prominent Daily Mission Widget directly on the Main Menu
   */
  private async createDailyMissionWidget(x: number, y: number) {
    if (this.missionWidgetContainer) {
      this.missionWidgetContainer.destroy();
      this.missionWidgetContainer = null;
    }

    const { width } = this.cameras.main;
    const cardWidth = Math.min(width * 0.90, 420);
    const cardHeight = 66;

    const featured = await MissionManager.getFeaturedMission();
    const isReadyToClaim = featured.completed && !featured.claimed;

    const container = this.add.container(x, y);
    this.missionWidgetContainer = container;

    // Ambient soft glow behind card
    const cardGlow = this.add.image(0, 0, 'glow')
      .setDisplaySize(cardWidth * 1.05, cardHeight * 1.5)
      .setAlpha(isReadyToClaim ? 0.2 : 0.08)
      .setTint(isReadyToClaim ? 0xf59e0b : 0x6366f1);

    // Card Glass Background
    const bg = this.add.graphics();
    if (isReadyToClaim) {
      bg.fillStyle(0x181329, 0.88);
      bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
      bg.lineStyle(1.5, 0xf59e0b, 0.9);
      bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
    } else {
      bg.fillStyle(0x0c1322, 0.82);
      bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
      bg.lineStyle(1, 0x1e293b, 0.85);
      bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
    }

    // Top Subtle Glass Highlight Line
    bg.lineStyle(1, 0xffffff, 0.08);
    bg.lineBetween(-cardWidth / 2 + 16, -cardHeight / 2 + 1, cardWidth / 2 - 16, -cardHeight / 2 + 1);

    // Left Animal Avatar (Direct clean cutout, no square box or stroke)
    const avatarX = -cardWidth / 2 + 34;
    const iconKey = `icon_${featured.rewardBadge.iconIndex}`;
    const badgeIcon = this.add.image(avatarX, 0, iconKey).setScale(0.42);

    // Subtle gentle breathing animation for animal hero
    this.tweens.add({
      targets: badgeIcon,
      y: -2,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Content Text Anchor
    const contentX = -cardWidth / 2 + 64;

    // Header Tag: ⚡ DAILY MISSION · [TITLE]
    const titleLabel = this.add.text(contentX, -16, `⚡ DAILY MISSION · ${featured.title.toUpperCase()}`, {
      font: '900 10px Inter',
      color: isReadyToClaim ? '#fbbf24' : '#818cf8',
      letterSpacing: 1.5
    }).setOrigin(0, 0.5).setResolution(2);

    // Objective Description
    const descText = this.add.text(contentX, 0, featured.description, {
      font: '700 12px Inter',
      color: '#ffffff'
    }).setOrigin(0, 0.5).setResolution(2);

    // Progress Track & Fill
    const progressTrackWidth = Math.min(130, cardWidth * 0.35);
    const progressY = 16;
    const progressTrack = this.add.graphics();
    progressTrack.fillStyle(0x070b14, 0.9);
    progressTrack.fillRoundedRect(contentX, progressY - 2.5, progressTrackWidth, 5, 2.5);

    const progressPercent = Math.min(1, Math.max(0, featured.current / featured.target));
    const progressFill = this.add.graphics();
    progressFill.fillStyle(isReadyToClaim ? 0xf59e0b : 0x10b981, 1);
    if (progressPercent > 0) {
      progressFill.fillRoundedRect(contentX, progressY - 2.5, Math.max(progressTrackWidth * progressPercent, 5), 5, 2.5);
    }

    // Right Action / Status Element
    let rightElement: Phaser.GameObjects.GameObject;

    if (isReadyToClaim) {
      // Pulsing Claim Button
      const claimBg = this.add.graphics();
      claimBg.fillStyle(0xf59e0b, 1);
      claimBg.fillRoundedRect(-40, -14, 80, 28, 14);

      const claimText = this.add.text(0, 0, '★ CLAIM', {
        font: '900 11px Inter',
        color: '#0f172a',
        letterSpacing: 1
      }).setOrigin(0.5).setResolution(2);

      const claimContainer = this.add.container(cardWidth / 2 - 50, 0, [claimBg, claimText]);
      this.tweens.add({
        targets: claimContainer,
        scale: 1.06,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      rightElement = claimContainer;
    } else if (featured.claimed) {
      const claimPillBg = this.add.graphics();
      claimPillBg.fillStyle(0x064e3b, 0.4);
      claimPillBg.lineStyle(1, 0x10b981, 0.5);
      claimPillBg.fillRoundedRect(-44, -12, 88, 24, 12);
      claimPillBg.strokeRoundedRect(-44, -12, 88, 24, 12);

      const claimedTag = this.add.text(0, 0, '✓ CLAIMED', {
        font: '900 10px Inter',
        color: '#34d399',
        letterSpacing: 1
      }).setOrigin(0.5).setResolution(2);

      rightElement = this.add.container(cardWidth / 2 - 52, 0, [claimPillBg, claimedTag]);
    } else {
      const progressText = this.add.text(cardWidth / 2 - 20, 0, `${featured.current}/${featured.target}`, {
        font: '900 12px Inter',
        color: '#94a3b8'
      }).setOrigin(1, 0.5).setResolution(2);
      rightElement = progressText;
    }

    container.add([
      cardGlow,
      bg,
      badgeIcon,
      titleLabel,
      descText,
      progressTrack,
      progressFill,
      rightElement
    ]);
    container.setSize(cardWidth, cardHeight);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      NativeBridge.hapticLight();
      soundManager.playSelect();
      this.showMissionsOverlay();
    });

    container.on('pointerover', () => {
      soundManager.playHover();
      this.tweens.add({
        targets: container,
        scale: 1.015,
        duration: 150
      });
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 150
      });
    });
  }

  private async createFooterActions(x: number, y: number) {
    // Footer rendered in React MainMenuButtons.tsx
  }

  private async showModeSelection(startY: number = 280) {
    if (this.modeContainer) {
      this.modeContainer.destroy();
      this.modeContainer = null;
    }

    const { width } = this.cameras.main;
    const container = this.add.container(0, 0);
    this.modeContainer = container;

    const modes = [
      { label: 'CLASSIC 10', mode: 'classic', color: 0x6366f1, desc: 'Original reaction challenge' },
      { label: 'MEMORY FLASH', mode: 'memory', color: 0xec4899, desc: 'Recall the sequence' },
      { label: 'TIME ATTACK', mode: 'attack', color: 0xf59e0b, desc: '30 seconds to peak score' },
      { label: 'CRAZY MODE', mode: 'crazy', color: 0xf43f5e, desc: 'High-speed erratic targets' },
      { label: 'MASOCHIST MODE', mode: 'super_crazy', color: 0x991b1b, desc: 'Absolute reflex limit' }
    ];

    const latestRecordMode = await NativeBridge.getLatestRecordMode();

    for (let i = 0; i < modes.length; i++) {
      const m = modes[i];
      const score = await NativeBridge.getHighScore(m.mode);
      let formattedScore = (m.mode === 'attack' || m.mode === 'crazy' || m.mode === 'super_crazy') 
        ? (score > 0 ? `BEST: ${score}` : 'BEST: -') 
        : (score > 0 ? `BEST: ${score.toFixed(2)}s` : 'BEST: -');

      if (latestRecordMode === m.mode && score > 0) {
        formattedScore = `🏆 RECORD: ${formattedScore.replace('BEST: ', '')} 🏆`;
      }

      this.createModeCard(width / 2, startY + (i * 76), m.label, m.color, formattedScore, async () => {
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
    const btnHeight = 68;

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.03);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
    bg.lineStyle(1, 0xffffff, 0.05);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

    const accent = this.add.rectangle(-btnWidth / 2 + 12, 0, 3, btnHeight * 0.35, color).setOrigin(0, 0.5);

    const title = this.add.text(-btnWidth / 2 + 28, -10, label, {
      font: '900 17px Inter',
      color: '#ffffff'
    }).setOrigin(0, 0.5).setResolution(2);

    const description = this.add.text(-btnWidth / 2 + 28, 12, desc, {
      font: '600 11px Inter',
      color: '#64748b'
    }).setOrigin(0, 0.5).setResolution(2);

    const isRecordText = score.includes('RECORD');
    const scoreText = this.add.text(btnWidth / 2 - 20, 0, score, {
      font: '900 11px Inter',
      color: isRecordText ? '#fbbf24' : '#64748b'
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

  /**
   * High-Fidelity Daily Missions & Visual Badges Cabinet Overlay
   */
  public async showMissionsOverlay() {
    menuNavigation.hideMenu();
    if (this.missionWidgetContainer) {
      this.missionWidgetContainer.setVisible(false);
    }
    const { width, height } = this.cameras.main;
    const overlay = this.add.container(0, 0).setDepth(150);

    // Modal Pastel Background with dark glass tint
    const modalBg = this.add.image(width / 2, height / 2, 'game_bg')
      .setDisplaySize(width * 1.05, height * 1.05)
      .setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, width, height, 0x070b14, 0.88).setOrigin(0);
    bg.setInteractive(); // Blocks clicks behind
    overlay.add([modalBg, bg]);

    // Header Section
    const topBar = this.add.container(0, 0);
    
    const title = this.add.text(28, 55, 'DAILY MISSIONS', {
      font: '900 30px "Barlow Condensed"',
      color: '#ffffff',
      fontStyle: 'italic',
      letterSpacing: 2
    }).setOrigin(0, 0.5).setResolution(2);

    const subtitle = this.add.text(28, 82, 'RESETS DAILY · EARN EXCLUSIVE VISUAL BADGES', {
      font: '700 10px Inter',
      color: '#6366f1',
      letterSpacing: 2
    }).setOrigin(0, 0.5).setResolution(2);

    const closeBtn = this.add.text(width - 28, 55, '✕ CLOSE', {
      font: '900 12px Inter',
      color: '#94a3b8',
      letterSpacing: 1.5
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    closeBtn.on('pointerdown', () => {
      soundManager.playSelect();
      overlay.destroy();
      const titleTop = Math.min(height * 0.08, 65);
      const subtitleBottom = titleTop + 94 + 8;
      const widgetY = Math.max(subtitleBottom + 64, height * 0.26);
      this.createDailyMissionWidget(width / 2, widgetY);
      menuNavigation.showMenu();
    });
    closeBtn.on('pointerover', () => soundManager.playHover());

    topBar.add([title, subtitle, closeBtn]);
    overlay.add(topBar);

    // Tabs: [ TODAY'S MISSIONS ] | [ BADGE CABINET ]
    let currentTab: 'missions' | 'cabinet' = 'missions';
    const tabContainer = this.add.container(0, 115);
    const contentContainer = this.add.container(0, 160);
    overlay.add([tabContainer, contentContainer]);

    const renderTabs = () => {
      tabContainer.removeAll(true);

      const tab1Width = (width - 56) / 2;
      const tab2Width = (width - 56) / 2;

      // Tab 1 Button
      const tab1Bg = this.add.graphics();
      tab1Bg.fillStyle(currentTab === 'missions' ? 0x6366f1 : 0xffffff, currentTab === 'missions' ? 0.2 : 0.04);
      tab1Bg.lineStyle(1, currentTab === 'missions' ? 0x6366f1 : 0x334155, 0.8);
      tab1Bg.fillRoundedRect(28, 0, tab1Width - 4, 34, 8);
      tab1Bg.strokeRoundedRect(28, 0, tab1Width - 4, 34, 8);

      const tab1Text = this.add.text(28 + (tab1Width - 4) / 2, 17, "TODAY'S TASKS", {
        font: '900 11px Inter',
        color: currentTab === 'missions' ? '#ffffff' : '#94a3b8',
        letterSpacing: 1.5
      }).setOrigin(0.5).setResolution(2);

      const tab1Zone = this.add.zone(28 + (tab1Width - 4) / 2, 17, tab1Width - 4, 34)
        .setInteractive({ useHandCursor: true });
      tab1Zone.on('pointerdown', () => {
        if (currentTab !== 'missions') {
          currentTab = 'missions';
          soundManager.playSelect();
          renderTabs();
          renderContent();
        }
      });

      // Tab 2 Button
      const tab2Bg = this.add.graphics();
      tab2Bg.fillStyle(currentTab === 'cabinet' ? 0xf59e0b : 0xffffff, currentTab === 'cabinet' ? 0.2 : 0.04);
      tab2Bg.lineStyle(1, currentTab === 'cabinet' ? 0xf59e0b : 0x334155, 0.8);
      tab2Bg.fillRoundedRect(28 + tab1Width + 4, 0, tab2Width - 4, 34, 8);
      tab2Bg.strokeRoundedRect(28 + tab1Width + 4, 0, tab2Width - 4, 34, 8);

      const tab2Text = this.add.text(28 + tab1Width + 4 + (tab2Width - 4) / 2, 17, '★ BADGE CABINET', {
        font: '900 11px Inter',
        color: currentTab === 'cabinet' ? '#fef08a' : '#94a3b8',
        letterSpacing: 1.5
      }).setOrigin(0.5).setResolution(2);

      const tab2Zone = this.add.zone(28 + tab1Width + 4 + (tab2Width - 4) / 2, 17, tab2Width - 4, 34)
        .setInteractive({ useHandCursor: true });
      tab2Zone.on('pointerdown', () => {
        if (currentTab !== 'cabinet') {
          currentTab = 'cabinet';
          soundManager.playSelect();
          renderTabs();
          renderContent();
        }
      });

      tabContainer.add([tab1Bg, tab1Text, tab1Zone, tab2Bg, tab2Text, tab2Zone]);
    };

    const renderContent = async () => {
      contentContainer.removeAll(true);

      if (currentTab === 'missions') {
        const missions = await MissionManager.getMissions();
        const cardWidth = width - 56;
        const cardHeight = 114;

        missions.forEach((m, i) => {
          const itemY = i * (cardHeight + 12);
          const isReadyToClaim = m.completed && !m.claimed;

          const itemBg = this.add.graphics();
          if (isReadyToClaim) {
            itemBg.fillStyle(0x181329, 0.92);
            itemBg.fillRoundedRect(28, itemY, cardWidth, cardHeight, 16);
            itemBg.lineStyle(1.5, 0xf59e0b, 0.9);
            itemBg.strokeRoundedRect(28, itemY, cardWidth, cardHeight, 16);
          } else if (m.claimed) {
            itemBg.fillStyle(0x06281e, 0.88);
            itemBg.fillRoundedRect(28, itemY, cardWidth, cardHeight, 16);
            itemBg.lineStyle(1, 0x10b981, 0.5);
            itemBg.strokeRoundedRect(28, itemY, cardWidth, cardHeight, 16);
          } else {
            itemBg.fillStyle(0x0c1322, 0.88);
            itemBg.fillRoundedRect(28, itemY, cardWidth, cardHeight, 16);
            itemBg.lineStyle(1, 0x1e293b, 0.85);
            itemBg.strokeRoundedRect(28, itemY, cardWidth, cardHeight, 16);
          }

          // Left Badge Thumbnail (Clean floating animal cutout, vertically centered)
          const iconKey = `icon_${m.rewardBadge.iconIndex}`;
          const badgeImg = this.add.image(62, itemY + cardHeight / 2, iconKey).setScale(0.48);

          // Content Column (Anchored cleanly at x = 98)
          const contentX = 98;

          // Title Tag
          const titleText = this.add.text(contentX, itemY + 16, m.title.toUpperCase(), {
            font: '900 11px Inter',
            color: isReadyToClaim ? '#fbbf24' : '#818cf8',
            letterSpacing: 1.5
          }).setResolution(2);

          // Description (Constrained width to avoid collision with right-hand status)
          const descText = this.add.text(contentX, itemY + 34, m.description, {
            font: '700 12px Inter',
            color: '#ffffff',
            wordWrap: { width: cardWidth - 170 }
          }).setResolution(2);

          // Reward Tag (Clean 34px below description start, avoiding wrapped text)
          const rewardLabel = this.add.text(contentX, itemY + 68, `★ REWARD: ${m.rewardBadge.name}`, {
            font: '800 10px Inter',
            color: m.rewardBadge.textColor,
            letterSpacing: 1
          }).setResolution(2);

          // Progress Bar
          const barW = Math.min(125, cardWidth - 210);
          const barY = itemY + 92;
          const track = this.add.graphics();
          track.fillStyle(0x070b14, 0.9);
          track.fillRoundedRect(contentX, barY - 2.5, barW, 5, 2.5);

          const ratio = Math.min(1, Math.max(0, m.current / m.target));
          const fill = this.add.graphics();
          fill.fillStyle(isReadyToClaim ? 0xf59e0b : (m.claimed ? 0x10b981 : 0x38bdf8), 1);
          if (ratio > 0) {
            fill.fillRoundedRect(contentX, barY - 2.5, Math.max(barW * ratio, 5), 5, 2.5);
          }

          const progText = this.add.text(contentX + barW + 10, barY, `${m.current}/${m.target}`, {
            font: '900 11px Inter',
            color: '#94a3b8'
          }).setOrigin(0, 0.5).setResolution(2);

          // Right Status Action (Clean dedicated pill area)
          let rightAction: Phaser.GameObjects.GameObject;
          const rightCenterX = 28 + cardWidth - 48;
          const rightCenterY = itemY + cardHeight / 2;

          if (isReadyToClaim) {
            const claimBtn = this.add.container(rightCenterX, rightCenterY);
            const claimGfx = this.add.graphics();
            claimGfx.fillStyle(0xf59e0b, 1);
            claimGfx.fillRoundedRect(-38, -15, 76, 30, 15);

            const claimLbl = this.add.text(0, 0, '★ CLAIM', {
              font: '900 11px Inter',
              color: '#0f172a',
              letterSpacing: 1.5
            }).setOrigin(0.5).setResolution(2);

            claimBtn.add([claimGfx, claimLbl]);
            claimBtn.setSize(76, 30);
            claimBtn.setInteractive({ useHandCursor: true });

            this.tweens.add({
              targets: claimBtn,
              scale: 1.08,
              duration: 600,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });

            claimBtn.on('pointerdown', async () => {
              const claimedBadge = await MissionManager.claimReward(m.id);
              if (claimedBadge) {
                soundManager.playBadgeClaim();
                NativeBridge.hapticHeavy();
                this.showBadgeUnlockModal(claimedBadge, () => {
                  renderContent();
                  const titleTop = Math.min(height * 0.08, 65);
                  const subtitleBottom = titleTop + 94 + 8;
                  const widgetY = Math.max(subtitleBottom + 64, height * 0.26);
                  this.createDailyMissionWidget(width / 2, widgetY);
                });
              }
            });

            rightAction = claimBtn;
          } else if (m.claimed) {
            const claimPillBg = this.add.graphics();
            claimPillBg.fillStyle(0x064e3b, 0.5);
            claimPillBg.lineStyle(1, 0x10b981, 0.5);
            claimPillBg.fillRoundedRect(-42, -13, 84, 26, 13);
            claimPillBg.strokeRoundedRect(-42, -13, 84, 26, 13);

            const claimedTag = this.add.text(0, 0, '✓ CLAIMED', {
              font: '900 10px Inter',
              color: '#34d399',
              letterSpacing: 1
            }).setOrigin(0.5).setResolution(2);

            rightAction = this.add.container(rightCenterX, rightCenterY, [claimPillBg, claimedTag]);
          } else {
            const progPillBg = this.add.graphics();
            progPillBg.fillStyle(0x1e293b, 0.5);
            progPillBg.lineStyle(1, 0x334155, 0.5);
            progPillBg.fillRoundedRect(-44, -12, 88, 24, 12);
            progPillBg.strokeRoundedRect(-44, -12, 88, 24, 12);

            const tag = this.add.text(0, 0, 'IN PROGRESS', {
              font: '800 10px Inter',
              color: '#94a3b8',
              letterSpacing: 1
            }).setOrigin(0.5).setResolution(2);

            rightAction = this.add.container(rightCenterX, rightCenterY, [progPillBg, tag]);
          }

          contentContainer.add([itemBg, badgeImg, titleText, descText, rewardLabel, track, fill, progText, rightAction]);
        });
      } else {
        // Cabinet Tab
        const unlockedBadges = await MissionManager.getUnlockedBadges();
        
        const countHeader = this.add.text(28, 0, `COLLECTED BADGES: ${unlockedBadges.length}`, {
          font: '900 13px Inter',
          color: '#fbbf24',
          letterSpacing: 2
        }).setResolution(2);
        contentContainer.add(countHeader);

        if (unlockedBadges.length === 0) {
          const emptyText = this.add.text(width / 2, 120, 'NO BADGES COLLECTED YET\n\nComplete Daily Missions above to earn\nexclusive visual badges and fill your cabinet!', {
            font: '700 13px Inter',
            color: '#64748b',
            align: 'center',
            lineSpacing: 8
          }).setOrigin(0.5).setResolution(2);
          contentContainer.add(emptyText);
        } else {
          // Render Badges
          const cardWidth = width - 56;
          const cardHeight = 78;

          unlockedBadges.forEach((badge, idx) => {
            const itemY = 32 + idx * (cardHeight + 12);
            const bBg = this.add.graphics();
            bBg.fillStyle(0xffffff, 0.04);
            bBg.lineStyle(1.5, badge.color, 0.8);
            bBg.fillRoundedRect(28, itemY, cardWidth, cardHeight, 14);
            bBg.strokeRoundedRect(28, itemY, cardWidth, cardHeight, 14);

            const iconKey = `icon_${badge.iconIndex}`;
            const bPlate = this.add.graphics();
            bPlate.fillStyle(badge.color, 0.25);
            bPlate.fillCircle(62, itemY + cardHeight / 2, 22);

            const bImg = this.add.image(62, itemY + cardHeight / 2, iconKey).setScale(0.44);

            const bTier = this.add.text(96, itemY + 14, `★ ${badge.tier.toUpperCase()} TIER · ${badge.title}`, {
              font: '900 10px Inter',
              color: badge.textColor,
              letterSpacing: 1.5
            }).setResolution(2);

            const bName = this.add.text(96, itemY + 32, badge.name, {
              font: '800 15px Inter',
              color: '#ffffff'
            }).setResolution(2);

            const bDesc = this.add.text(96, itemY + 52, badge.description, {
              font: '600 11px Inter',
              color: '#94a3b8'
            }).setResolution(2);

            const inspectZone = this.add.zone(28 + cardWidth / 2, itemY + cardHeight / 2, cardWidth, cardHeight)
              .setInteractive({ useHandCursor: true });

            inspectZone.on('pointerdown', () => {
              soundManager.playSelect();
              this.showBadgeInspectModal(badge);
            });

            contentContainer.add([bBg, bPlate, bImg, bTier, bName, bDesc, inspectZone]);
          });
        }
      }
    };

    renderTabs();
    renderContent();
  }

  /**
   * Grand Celebratory Modal when a Visual Badge is unlocked & claimed
   */
  private showBadgeUnlockModal(badge: VisualBadge, onDismiss: () => void) {
    const { width, height } = this.cameras.main;
    const modal = this.add.container(0, 0).setDepth(200);

    const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0);
    blocker.setInteractive();

    const card = this.add.container(width / 2, height / 2);
    
    // Background plate
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x0f172a, 0.98);
    bgGfx.fillRoundedRect(-155, -210, 310, 420, 24);
    bgGfx.lineStyle(2, badge.color, 0.9);
    bgGfx.strokeRoundedRect(-155, -210, 310, 420, 24);

    // Glowing aura behind badge
    const aura = this.add.image(0, -70, 'glow').setScale(3).setTint(badge.color).setAlpha(0.35).setBlendMode('ADD');
    this.tweens.add({
      targets: aura,
      scale: 3.4,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Badge Pod & Icon
    const badgeRim = this.add.graphics();
    badgeRim.fillStyle(0x0f172a, 0.8);
    badgeRim.lineStyle(2, badge.color, 0.9);
    badgeRim.fillRoundedRect(-54, -124, 108, 108, 24);
    badgeRim.strokeRoundedRect(-54, -124, 108, 108, 24);

    const badgeIcon = this.add.image(0, -70, `icon_${badge.iconIndex}`).setScale(0.85);

    // Badge Rotating Star Flare
    this.tweens.add({
      targets: badgeIcon,
      rotation: 0.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const celebrationTitle = this.add.text(0, -165, '★ BADGE UNLOCKED! ★', {
      font: '900 16px Inter',
      color: '#fef08a',
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(2);

    const tierLabel = this.add.text(0, 10, `★ ${badge.tier.toUpperCase()} TIER · ${badge.title} ★`, {
      font: '900 11px Inter',
      color: badge.textColor,
      letterSpacing: 1.5
    }).setOrigin(0.5).setResolution(2);

    const nameText = this.add.text(0, 38, badge.name, {
      font: '900 22px Inter',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    const descText = this.add.text(0, 84, badge.description, {
      font: '600 12px Inter',
      color: '#94a3b8',
      align: 'center',
      wordWrap: { width: 250 }
    }).setOrigin(0.5).setResolution(2);

    // Equip / Collect Button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(badge.color, 1);
    btnBg.fillRoundedRect(-100, 135, 200, 44, 22);

    const btnText = this.add.text(0, 157, 'COLLECT BADGE', {
      font: '900 12px Inter',
      color: '#020617',
      letterSpacing: 2
    }).setOrigin(0.5).setResolution(2);

    const btnZone = this.add.zone(0, 157, 200, 44).setInteractive({ useHandCursor: true });
    btnZone.on('pointerdown', () => {
      soundManager.playSelect();
      NativeBridge.hapticLight();
      this.tweens.add({
        targets: modal,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          modal.destroy();
          onDismiss();
        }
      });
    });

    card.add([bgGfx, aura, badgeRim, badgeIcon, celebrationTitle, tierLabel, nameText, descText, btnBg, btnText, btnZone]);
    modal.add([blocker, card]);

    // Popup Animation
    card.setScale(0.7);
    card.setAlpha(0);
    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 350,
      ease: 'Back.out'
    });
  }

  /**
   * Inspection card when clicking an earned badge in the cabinet
   */
  private showBadgeInspectModal(badge: VisualBadge) {
    const { width, height } = this.cameras.main;
    const modal = this.add.container(0, 0).setDepth(200);

    const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);
    blocker.setInteractive();

    const card = this.add.container(width / 2, height / 2);
    
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x0f172a, 0.98);
    bgGfx.fillRoundedRect(-140, -160, 280, 320, 20);
    bgGfx.lineStyle(1.5, badge.color, 0.8);
    bgGfx.strokeRoundedRect(-140, -160, 280, 320, 20);

    const badgeRim = this.add.graphics();
    badgeRim.fillStyle(0x0f172a, 0.8);
    badgeRim.lineStyle(1.5, badge.color, 0.9);
    badgeRim.fillRoundedRect(-46, -111, 92, 92, 20);
    badgeRim.strokeRoundedRect(-46, -111, 92, 92, 20);

    const badgeIcon = this.add.image(0, -65, `icon_${badge.iconIndex}`).setScale(0.72);

    const tierLabel = this.add.text(0, -5, `★ ${badge.tier.toUpperCase()} TIER · ${badge.title} ★`, {
      font: '900 10px Inter',
      color: badge.textColor,
      letterSpacing: 1.5
    }).setOrigin(0.5).setResolution(2);

    const nameText = this.add.text(0, 22, badge.name, {
      font: '900 18px Inter',
      color: '#ffffff'
    }).setOrigin(0.5).setResolution(2);

    const descText = this.add.text(0, 60, badge.description, {
      font: '600 12px Inter',
      color: '#94a3b8',
      align: 'center',
      wordWrap: { width: 230 }
    }).setOrigin(0.5).setResolution(2);

    const closeBtn = this.add.text(0, 115, '✕ CLOSE', {
      font: '900 11px Inter',
      color: '#ffffff',
      letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(2);

    closeBtn.on('pointerdown', () => {
      soundManager.playSelect();
      modal.destroy();
    });

    card.add([bgGfx, badgeRim, badgeIcon, tierLabel, nameText, descText, closeBtn]);
    modal.add([blocker, card]);

    card.setScale(0.85);
    card.setAlpha(0);
    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.out'
    });
  }

  private async showDifficultySelection() {
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

    const isTimeBased = this.selectedMode === 'classic' || this.selectedMode === 'memory';

    for (let i = 0; i < difficulties.length; i++) {
      const d = difficulties[i];
      const diffScore = await NativeBridge.getHighScore(this.selectedMode, d.diff);
      const formattedDiffScore = diffScore > 0 
        ? (isTimeBased ? `BEST: ${diffScore.toFixed(2)}s` : `BEST: ${diffScore}`)
        : 'BEST: -';

      this.createModeCard(width / 2, height * 0.45 + (i * 88), d.label, d.color, formattedDiffScore, () => {
        soundManager.playStart();
        this.cameras.main.fadeOut(300, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('PlayScene', { mode: this.selectedMode, difficulty: d.diff });
        });
      }, container, d.desc);
    }

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
