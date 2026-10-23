import Phaser from 'phaser';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { TrainingScene } from './scenes/TrainingScene';
import { App } from './App';
import { menuNavigation } from './services/menuNavigation';
import { adService } from './services/ads/adService';

console.log('Snap It! Arcade: Engine Initializing...');

function initApp() {
    // Prevent double initialization
    if ((window as any).__SNAP_IT_INIT__) return;
    (window as any).__SNAP_IT_INIT__ = true;

    // Initialize AdSense (Web) and AdMob (Android / iOS)
    adService.initialize();

    // Mount React App (Overlay & Banners)
    const rootElement = document.getElementById('root');
    if (rootElement) {
        createRoot(rootElement).render(React.createElement(App));
    }

    // Wait for custom fonts to load before starting the game for sharpest text
    document.fonts.ready.then(async () => {
        try {
            // Explicitly preload custom font weights into Canvas 2D engine
            await Promise.allSettled([
                document.fonts.load('900 76px "Barlow Condensed"'),
                document.fonts.load('700 16px "Barlow Condensed"'),
                document.fonts.load('900 28px Inter'),
                document.fonts.load('700 14px Inter'),
                document.fonts.load('400 14px Inter')
            ]);

            // Target Retina text multiplier: at least 3x for razor-sharp typography
            const dpr = window.devicePixelRatio || 2;
            const targetResolution = Math.max(Math.ceil(dpr * 1.5), 3);

            // Robust font parser that properly handles multi-word families like "Barlow Condensed"
            function parseFont(font: any) {
                if (typeof font !== 'string') return null;
                let str = font.trim();

                const sizeMatch = str.match(/\b(\d+(?:\.\d+)?(?:px|pt|em|rem))\b/i);
                const size = sizeMatch ? sizeMatch[1] : '16px';
                if (sizeMatch) {
                    str = str.replace(sizeMatch[0], '').trim();
                }

                let fontStyle = '';
                if (/\bitalic\b/i.test(str)) {
                    fontStyle += 'italic ';
                    str = str.replace(/\bitalic\b/gi, '').trim();
                }

                const weightMatch = str.match(/\b([1-9]00|bold|bolder|lighter)\b/i);
                if (weightMatch) {
                    fontStyle += weightMatch[1] + ' ';
                    str = str.replace(weightMatch[0], '').trim();
                }

                let family = str.trim();
                if (!family) {
                    family = '"Inter", sans-serif';
                } else if (!family.includes(',')) {
                    const cleanName = family.replace(/^["'\s]+|["'\s]+$/g, '');
                    family = `"${cleanName}", Inter, sans-serif`;
                }

                return {
                    fontSize: size,
                    fontStyle: fontStyle.trim(),
                    fontFamily: family
                };
            }

            // Patch TextStyle.setFont to prevent multi-word font name truncation
            const originalSetFont = (Phaser.GameObjects.TextStyle.prototype as any).setFont;
            (Phaser.GameObjects.TextStyle.prototype as any).setFont = function (font: any, updateText?: boolean) {
                const parsed = parseFont(font);
                if (parsed) {
                    this.fontFamily = parsed.fontFamily;
                    this.fontSize = parsed.fontSize;
                    this.fontStyle = parsed.fontStyle;
                    this._font = [this.fontStyle, this.fontSize, this.fontFamily].join(' ').trim();
                    if (updateText !== false) {
                        this.update(true);
                    }
                    return this.parent;
                }
                return originalSetFont.call(this, font, updateText);
            };

            // Patch TextStyle.setStyle to normalize font and enforce high resolution
            const originalSetStyle = (Phaser.GameObjects.TextStyle.prototype as any).setStyle;
            (Phaser.GameObjects.TextStyle.prototype as any).setStyle = function (style: any, updateText?: boolean, setDefaults?: boolean) {
                const res = originalSetStyle.call(this, style, updateText, setDefaults);
                if (style && typeof style.font === 'string') {
                    const parsed = parseFont(style.font);
                    if (parsed) {
                        this.fontFamily = parsed.fontFamily;
                        this.fontSize = parsed.fontSize;
                        if (parsed.fontStyle) this.fontStyle = parsed.fontStyle;
                        this._font = [this.fontStyle, this.fontSize, this.fontFamily].join(' ').trim();
                    }
                }
                this.resolution = Math.max(this.resolution || 0, targetResolution);
                return res;
            };

            // Prevent manual setResolution calls from downgrading text sharpness
            (Phaser.GameObjects.TextStyle.prototype as any).setResolution = function (val?: number) {
                this.resolution = Math.max(val || targetResolution, targetResolution);
                if (this.parent && typeof this.parent.updateText === 'function') {
                    this.parent.updateText();
                }
                return this.parent;
            };

            // Ensure high quality image smoothing on Text offscreen canvas
            const originalUpdateText = (Phaser.GameObjects.Text.prototype as any).updateText;
            (Phaser.GameObjects.Text.prototype as any).updateText = function () {
                if (this.context) {
                    this.context.imageSmoothingEnabled = true;
                    this.context.imageSmoothingQuality = 'high';
                }
                if (!this.style.resolution || this.style.resolution < targetResolution) {
                    this.style.resolution = targetResolution;
                }
                return originalUpdateText.call(this);
            };

            const config: any = {
                type: Phaser.AUTO,
                parent: 'game-container',
                backgroundColor: '#020617',
                
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                    width: 390,
                    height: 844
                },

                render: {
                    antialias: true,
                    pixelArt: false,
                    roundPixels: false // Smooth subpixel rasterization
                },

                scene: [PreloadScene, MenuScene, PlayScene, TrainingScene]
            };

            const game = new Phaser.Game(config);
            menuNavigation.setGame(game);
        } catch (error) {
            console.error('Phaser Boot Error:', error);
        }
    });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initApp();
} else {
    window.addEventListener('load', initApp);
}

