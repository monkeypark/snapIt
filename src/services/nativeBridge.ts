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

  static async hapticHeavy() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate([40, 60, 80]);
    }
  }

  static async saveHighScore(
    mode: string,
    score: number,
    difficulty?: string
  ): Promise<{ isNewRecord: boolean; previousBest: number; newBest: number; difficultyKey?: string }> {
    const isTimeBased = mode === 'classic' || mode === 'memory';
    if (score <= 0) {
      const current = await this.getHighScore(mode, difficulty);
      return { isNewRecord: false, previousBest: current, newBest: current };
    }

    // 1. Check difficulty-specific record if applicable
    const diffKey = difficulty ? `highscore_${mode}_${difficulty}` : null;
    const modeKey = `highscore_${mode}`;

    const previousDiffBest = diffKey ? await this.getStorageNumber(diffKey) : 0;
    const previousModeBest = await this.getStorageNumber(modeKey);

    const isDiffRecord = diffKey 
      ? (previousDiffBest === 0 || (isTimeBased ? score < previousDiffBest : score > previousDiffBest))
      : false;

    const isModeRecord = previousModeBest === 0 || (isTimeBased ? score < previousModeBest : score > previousModeBest);

    const isRecord = isDiffRecord || isModeRecord;
    const previousRelevantBest = diffKey && previousDiffBest > 0 ? previousDiffBest : previousModeBest;

    if (isRecord) {
      if (diffKey && isDiffRecord) {
        await this.setStorageNumber(diffKey, score);
      }
      if (isModeRecord) {
        await this.setStorageNumber(modeKey, score);
      }
      // Record this mode as having a fresh new record for visual glow in menus
      await this.setStorageString('latest_new_record_mode', mode);
      await this.setStorageNumber('latest_new_record_time', Date.now());

      return {
        isNewRecord: true,
        previousBest: previousRelevantBest,
        newBest: score,
        difficultyKey: difficulty
      };
    }

    return {
      isNewRecord: false,
      previousBest: previousRelevantBest,
      newBest: previousRelevantBest,
      difficultyKey: difficulty
    };
  }

  static async getHighScore(mode: string, difficulty?: string): Promise<number> {
    if (difficulty) {
      const diffScore = await this.getStorageNumber(`highscore_${mode}_${difficulty}`);
      if (diffScore > 0) return diffScore;
    }
    return await this.getStorageNumber(`highscore_${mode}`);
  }

  private static async getStorageNumber(key: string): Promise<number> {
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null && value !== undefined && value !== '') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {
      // Fallback to window.localStorage
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) {
          const parsed = parseFloat(val);
          if (!isNaN(parsed)) return parsed;
        }
      }
    } catch (e) {}

    return 0;
  }

  private static async setStorageNumber(key: string, value: number): Promise<void> {
    const str = value.toString();
    try {
      await Preferences.set({ key, value: str });
    } catch (e) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, str);
      }
    } catch (e) {}
  }

  private static async setStorageString(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (e) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}
  }

  static async getLatestRecordMode(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: 'latest_new_record_mode' });
      return value || null;
    } catch (e) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('latest_new_record_mode');
      }
      return null;
    }
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
