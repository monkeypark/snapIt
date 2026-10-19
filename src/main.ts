import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { TrainingScene } from './scenes/TrainingScene';
import { StatsScene } from './scenes/StatsScene';

console.log('Snap It! Arcade: Engine Initializing...');

window.addEventListener('load', () => {
    // Wait for custom fonts to load before starting the game for sharpest text
    document.fonts.ready.then(() => {
        try {
            const config: Phaser.Types.Core.GameConfig = {
                type: Phaser.AUTO,
                width: window.innerWidth,
                height: window.innerHeight,
                parent: 'root',
                backgroundColor: '#020617',
                transparent: false,
                render: {
                    antialias: true,
                    pixelArt: false,
                    roundPixels: false
                },
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                },
                scene: [PreloadScene, MenuScene, PlayScene, TrainingScene, StatsScene]
            };

            new Phaser.Game(config);
        } catch (error) {
            console.error('Phaser Boot Error:', error);
        }
    });
});
