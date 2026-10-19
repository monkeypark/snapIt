import Phaser from 'phaser';
import { soundManager } from '../services/soundManager';
import { NativeBridge } from '../services/nativeBridge';

export class StatsScene extends Phaser.Scene {
    constructor() {
        super('StatsScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(0, 0, width, height, 0x020617).setOrigin(0);
        this.cameras.main.fadeIn(500, 2, 6, 23);
        this.add.tileSprite(0, 0, width, height, 'dots').setOrigin(0, 0).setAlpha(0.2);

        // Header
        this.add.text(40, 60, 'PERFORMANCE ARCHIVE', {
            font: '900 32px "Barlow Condensed"',
            color: '#ffffff',
            fontStyle: 'italic',
            letterSpacing: 2
        }).setOrigin(0, 0.5).setResolution(2);

        this.add.text(40, 95, 'LAST 10 SESSIONS PROGRESSION', {
            font: '700 11px Inter',
            color: '#6366f1',
            letterSpacing: 3
        }).setOrigin(0, 0.5).setResolution(2);

        this.renderCharts();

        // Footer Navigation
        const backBtn = this.add.text(width / 2, height - 60, '← BACK TO MENU', {
            font: '900 11px Inter',
            color: '#94a3b8',
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

    private async renderCharts() {
        const history = await NativeBridge.getSessionHistory();
        if (history.length === 0) {
            this.showEmptyState();
            return;
        }

        const data = history.slice(0, 10).reverse(); // Last 10, chronological
        const { width, height } = this.cameras.main;

        // Chart Area Config
        const chartWidth = width - 80;
        const chartHeight = height * 0.25;
        const startX = 40;
        
        // 1. Accuracy Line Chart
        this.drawChart(startX, height * 0.3, chartWidth, chartHeight, 'ACCURACY %', data, 'accuracy', 0x10b981, (v) => `${v}%`);

        // 2. Score/Speed Line Chart
        // Score logic varies by mode, so we'll just plot the raw value
        this.drawChart(startX, height * 0.65, chartWidth, chartHeight, 'PERFORMANCE SCORE', data, 'score', 0x6366f1, (v) => v.toFixed(1));
    }

    private drawChart(x: number, y: number, w: number, h: number, label: string, data: any[], key: string, color: number, formatter: (v: number) => string) {
        // Label
        this.add.text(x, y - 25, label, {
            font: '900 12px Inter',
            color: '#475569',
            letterSpacing: 2
        }).setOrigin(0, 1).setResolution(2);

        // Background Grid
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0xffffff, 0.03);
        for (let i = 0; i <= 4; i++) {
            const gy = y - (i * (h / 4));
            graphics.lineBetween(x, gy, x + w, gy);
        }

        // Data processing
        const values = data.map(d => d[key]);
        const minVal = Math.min(...values) * 0.9;
        const maxVal = Math.max(...values) * 1.1;
        const range = maxVal - minVal;

        const points: {x: number, y: number}[] = [];
        const stepX = w / (data.length - 1 || 1);

        data.forEach((d, i) => {
            const val = d[key];
            const px = x + (i * stepX);
            const py = y - ((val - minVal) / (range || 1)) * h;
            points.push({ x: px, y: py });
        });

        // Draw Line
        graphics.lineStyle(3, color, 1);
        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.strokePath();

        // Draw Area Gradient (Simulated with multiple lines)
        graphics.lineStyle(1, color, 0.1);
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            graphics.fillStyle(color, 0.05);
            graphics.fillPoints([
                new Phaser.Geom.Point(p1.x, p1.y),
                new Phaser.Geom.Point(p2.x, p2.y),
                new Phaser.Geom.Point(p2.x, y),
                new Phaser.Geom.Point(p1.x, y)
            ], true);
        }

        // Draw Points & Tooltips
        points.forEach((p, i) => {
            const circle = this.add.circle(p.x, p.y, 4, color).setAlpha(0.8);
            
            // Tooltip on interaction
            circle.setInteractive({ useHandCursor: true });
            const tooltip = this.add.container(p.x, p.y - 20).setAlpha(0).setDepth(10);
            const bg = this.add.graphics();
            bg.fillStyle(0x1e293b, 0.9);
            bg.fillRoundedRect(-25, -15, 50, 20, 4);
            const txt = this.add.text(0, -5, formatter(data[i][key]), {
                font: '900 10px Inter',
                color: '#ffffff'
            }).setOrigin(0.5).setResolution(2);
            tooltip.add([bg, txt]);

            circle.on('pointerover', () => {
                soundManager.playHover();
                this.tweens.add({ targets: tooltip, alpha: 1, y: p.y - 25, duration: 200 });
                circle.setScale(1.5);
            });
            circle.on('pointerout', () => {
                this.tweens.add({ targets: tooltip, alpha: 0, y: p.y - 20, duration: 200 });
                circle.setScale(1);
            });
        });
    }

    private showEmptyState() {
        const { width, height } = this.cameras.main;
        this.add.text(width / 2, height / 2, 'NO SESSION DATA RECORDED\nCOMPLETE A GAME TO GENERATE ARCHIVE', {
            font: '700 14px Inter',
            color: '#475569',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5).setResolution(2);
    }
}
