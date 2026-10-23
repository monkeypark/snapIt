type MenuListener = () => void;

class MenuNavigation {
  private isVisible: boolean = false;
  private entranceKey: number = 0;
  private currentView: 'modes' | 'difficulty' = 'modes';
  private selectedMode: string = '';
  private phaserGame: Phaser.Game | null = null;
  private listeners: Set<MenuListener> = new Set();

  public setGame(game: Phaser.Game) {
    this.phaserGame = game;
  }

  public getGame(): Phaser.Game | null {
    return this.phaserGame;
  }

  /**
   * Called when MenuScene becomes active (initial load or returning from a round)
   * Increments entranceKey to trigger fresh Framer Motion staggered entrance animation
   */
  public showMenu() {
    this.isVisible = true;
    this.currentView = 'modes';
    this.selectedMode = '';
    this.entranceKey += 1;
    this.notify();
  }

  public hideMenu() {
    this.isVisible = false;
    this.notify();
  }

  public getEntranceKey(): number {
    return this.entranceKey;
  }

  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  public getCurrentView(): 'modes' | 'difficulty' {
    return this.currentView;
  }

  public getSelectedMode(): string {
    return this.selectedMode;
  }

  public showDifficulty(mode: string) {
    this.selectedMode = mode;
    this.currentView = 'difficulty';
    this.notify();
  }

  public backToModes() {
    this.currentView = 'modes';
    this.notify();
  }

  public startGame(mode: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.hideMenu();
    if (!this.phaserGame) return;

    const currentScene = this.phaserGame.scene.getScenes(true)[0];
    if (currentScene) {
      currentScene.cameras.main.fadeOut(300, 2, 6, 23);
      currentScene.cameras.main.once('camerafadeoutcomplete', () => {
        currentScene.scene.start('PlayScene', { mode, difficulty });
      });
    } else {
      this.phaserGame.scene.start('PlayScene', { mode, difficulty });
    }
  }

  public startTraining() {
    this.hideMenu();
    if (!this.phaserGame) return;
    const currentScene = this.phaserGame.scene.getScenes(true)[0];
    if (currentScene) {
      currentScene.cameras.main.fadeOut(300, 2, 6, 23);
      currentScene.cameras.main.once('camerafadeoutcomplete', () => {
        currentScene.scene.start('TrainingScene');
      });
    }
  }

  public subscribe(listener: MenuListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const menuNavigation = new MenuNavigation();
