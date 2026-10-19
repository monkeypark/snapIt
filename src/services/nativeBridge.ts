import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export class NativeBridge {
  static async hapticLight() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }

  static async hapticMedium() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate(30);
    }
  }

  static async hapticSuccess() {
    try {
      await Haptics.notification({ type: 'SUCCESS' as any });
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
    }
  }

  static async hapticError() {
    try {
      await Haptics.notification({ type: 'ERROR' as any });
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }

  static async saveHighScore(mode: string, score: number) {
    const key = `highscore_${mode}`;
    const current = await this.getHighScore(mode);
    
    // For time-based modes (Classic, Memory), lower is better
    const isTimeBased = mode === 'classic' || mode === 'memory';
    
    if (current === 0 || (isTimeBased ? score < current : score > current)) {
      await Preferences.set({
        key,
        value: score.toString()
      });
      return true;
    }
    return false;
  }

  static async getHighScore(mode: string): Promise<number> {
    const { value } = await Preferences.get({ key: `highscore_${mode}` });
    return value ? parseFloat(value) : 0;
  }

  static async hasSeenTraining(): Promise<boolean> {
    const { value } = await Preferences.get({ key: 'training_completed' });
    return value === 'true';
  }

  static async setSeenTraining() {
    await Preferences.set({ key: 'training_completed', value: 'true' });
  }

  static async saveSession(mode: string, score: number, accuracy: number) {
    const { value } = await Preferences.get({ key: 'session_history' });
    let history = value ? JSON.parse(value) : [];
    
    const session = {
      mode,
      score,
      accuracy,
      timestamp: Date.now()
    };
    
    history.unshift(session);
    if (history.length > 50) history = history.slice(0, 50); // Keep up to 50 for more data, but chart will show last 10
    
    await Preferences.set({
      key: 'session_history',
      value: JSON.stringify(history)
    });
  }

  static async getSessionHistory(): Promise<any[]> {
    const { value } = await Preferences.get({ key: 'session_history' });
    return value ? JSON.parse(value) : [];
  }

  static async showSimulatedAd(): Promise<boolean> {
    // Simulated Rewarded Ad for Guideline 4.2 compliance and monetization hooks
    return new Promise((resolve) => {
      console.log("Showing simulated rewarded ad...");
      setTimeout(() => {
        resolve(true);
      }, 2000);
    });
  }
}
