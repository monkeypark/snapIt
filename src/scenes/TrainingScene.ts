import Phaser from 'phaser';
import { soundManager } from '../services/soundManager';
import { NativeBridge } from '../services/nativeBridge';

export class TrainingScene extends Phaser.Scene {
    private step: number = 0;
    private target?: Phaser.GameObjects.Container;
    private instructionText?: Phaser.GameObjects.Text;
    private nextBtn?: Phaser.GameObjects.Container;

    constructor() {
        super('TrainingScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Pastel Aesthetic Background with Focus Scrim
        this.add.image(width / 2, height / 2, 'game_bg').setDisplaySize(width, height).setOrigin(0.5);
        this.add.rectangle(0, 0, width, height, 0x090d16).setOrigin(0).setAlpha(0.35);
        this.cameras.main.fadeIn(500, 2, 6, 23);
        this.add.tileSprite(0, 0, width, height, 'dots').setOrigin(0, 0).setAlpha(0.15);

        // Header
        this.add.text(width / 2, 60, 'BASIC TRAINING', {
            font: '900 28px Inter',
            color: '#ffffff',
            letterSpacing: 4
        }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

        this.instructionText = this.add.text(width / 2, height * 0.25, '', {
            font: '700 18px Inter',
            color: '#94a3b8',
            align: 'center',
            wordWrap: { width: width * 0.8 }
        }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

        this.showStep(0);

        // Footer Navigation
        const backBtn = this.add.text(width / 2, height - 40, '← BACK TO MENU', {
            font: '900 11px Inter',
            color: '#475569',
            letterSpacing: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setResolution(2);

        backBtn.on('pointerdown', () => {
            soundManager.playSelect();
            this.cameras.main.fadeOut(300, 2, 6, 23);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MenuScene');
            });
        });

        backBtn.on('pointerover', () => soundManager.playHover());
    }

    private showStep(step: number) {
        this.step = step;
        const { width, height } = this.cameras.main;

        if (this.target) this.target.destroy();
        if (this.nextBtn) this.nextBtn.destroy();

        switch (step) {
            case 0:
                this.instructionText?.setText('THE GOAL IS SIMPLE:\nCLICK THE TARGETS AS FAST AS YOU CAN.');
                this.createTarget(width / 2, height / 2, () => {
                    soundManager.playClick();
                    NativeBridge.hapticMedium();
                    this.showStep(1);
                });
                break;
            case 1:
                this.instructionText?.setText('BE CAREFUL!\n\nWRONG HITS OR TIME RUNNING OUT\nWILL END YOUR SESSION.');
                this.createFailureDemo();
                break;
            case 2:
                this.instructionText?.setText('MODES & DIFFICULTY:\n\nNORMAL: BALANCED PACE\nCRAZY: FAST & UNPREDICTABLE\nMASOCHIST: EXTREME PRESSURE');
                this.createModeSummary();
                break;
            case 3:
                this.instructionText?.setText('YOU ARE READY.\n\nGOOD LUCK, PILOT.');
                this.createModernButton(width / 2, height * 0.8, 'START PLAYING', 0x10b981, async () => {
                    await NativeBridge.setSeenTraining();
                    this.cameras.main.fadeOut(300, 2, 6, 23);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.start('MenuScene');
                    });
                });
                break;
        }
    }

    private createTarget(x: number, y: number, callback: Function) {
        const size = 120;
        const bg = this.add.graphics();
        bg.fillStyle(0x6366f1, 0.2);
        bg.fillCircle(0, 0, size / 2);
        bg.lineStyle(4, 0x6366f1, 1);
        bg.strokeCircle(0, 0, size / 2);

        const inner = this.add.circle(0, 0, size / 4, 0x6366f1);
        
        this.target = this.add.container(x, y, [bg, inner]);
        this.target.setSize(size, size);
        this.target.setInteractive({ useHandCursor: true });
        
        this.tweens.add({
            targets: this.target,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.target.on('pointerdown', () => {
            soundManager.playSelect();
            callback();
        });

        this.target.on('pointerover', () => soundManager.playHover());
    }

    private createFailureDemo() {
        const { width, height } = this.cameras.main;
        
        const container = this.add.container(width / 2, height / 2);
        
        const timeUp = this.add.text(0, -30, 'TIME UP', {
            font: '900 32px Inter',
            color: '#f43f5e'
        }).setOrigin(0.5).setAlpha(0);

        const wrongHit = this.add.text(0, 30, 'WRONG HIT', {
            font: '900 32px Inter',
            color: '#f43f5e'
        }).setOrigin(0.5).setAlpha(0);

        container.add([timeUp, wrongHit]);

        this.tweens.add({
            targets: timeUp,
            alpha: 1,
            y: '-=20',
            duration: 1000,
            ease: 'Power2',
            delay: 500
        });

        this.tweens.add({
            targets: wrongHit,
            alpha: 1,
            y: '+=20',
            duration: 1000,
            ease: 'Power2',
            delay: 1500
        });

        this.createModernButton(width / 2, height * 0.8, 'NEXT', 0x6366f1, () => {
            container.destroy();
            this.showStep(2);
        });
    }

    private createModeSummary() {
        const { width, height } = this.cameras.main;
        const container = this.add.container(width / 2, height / 2);

        const items = [
            { label: 'NORMAL', color: 0x10b981 },
            { label: 'CRAZY', color: 0xf43f5e },
            { label: 'MASOCHIST', color: 0x991b1b }
        ];

        items.forEach((item, i) => {
            const y = (i - 1) * 60;
            const bg = this.add.rectangle(-80, y, 10, 30, item.color).setOrigin(0, 0.5);
            const text = this.add.text(-60, y, item.label, {
                font: '900 20px Inter',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
            container.add([bg, text]);
        });

        this.createModernButton(width / 2, height * 0.8, 'GOT IT', 0x6366f1, () => {
            container.destroy();
            this.showStep(3);
        });
    }

    private createModernButton(x: number, y: number, label: string, color: number, callback: Function) {
        const { width } = this.cameras.main;
        const btnWidth = width * 0.7;
        const btnHeight = 60;

        const bg = this.add.graphics();
        bg.fillStyle(color, 0.2);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);
        bg.lineStyle(2, color, 1);
        bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 12);

        const text = this.add.text(0, 0, label, {
            font: '900 18px Inter',
            color: '#ffffff'
        }).setOrigin(0.5).setResolution(window.devicePixelRatio || 1);

        this.nextBtn = this.add.container(x, y, [bg, text]);
        this.nextBtn.setSize(btnWidth, btnHeight);
        this.nextBtn.setInteractive({ useHandCursor: true });

        this.nextBtn.on('pointerdown', () => {
            soundManager.playSelect();
            NativeBridge.hapticLight();
            callback();
        });

        this.nextBtn.on('pointerover', () => soundManager.playHover());
    }
}
