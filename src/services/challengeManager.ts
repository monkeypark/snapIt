import { NativeBridge } from './nativeBridge';
import { SeededRandom } from './seededRandom';

export interface ChallengeData {
  seed: string;
  mode: 'classic' | 'memory' | 'attack' | 'crazy' | 'super_crazy';
  difficulty: 'easy' | 'medium' | 'hard';
  challengerScore: number;
  challengerName: string;
  challengerAccuracy?: number;
  challengerCombo?: number;
  challengerMistakes?: number;
  isDaily?: boolean;
}

export interface HeadToHeadComparison {
  isVictory: boolean;
  diffValue: number;
  formattedDiff: string;
  bannerText: string;
  shortSummary: string;
  challengerName: string;
  playerScoreFormatted: string;
  challengerScoreFormatted: string;
}

export interface DailyChallengeInfo {
  dateStr: string;
  seed: string;
  bestScore: number;
  formattedBest: string;
  hasPlayed: boolean;
  timeUntilReset: string;
}

export class ChallengeManager {
  private static cachedPendingChallenge: ChallengeData | null = null;
  private static hasParsedUrl: boolean = false;

  /**
   * Parses URL query parameters for incoming challenge links
   * Supports both query params (?challenge=1&mode=...&seed=...)
   * and hash params (#challenge?...) for flexible mobile iframe embedding.
   */
  public static parseUrlChallenge(): ChallengeData | null {
    if (this.hasParsedUrl) {
      return this.cachedPendingChallenge;
    }
    this.hasParsedUrl = true;

    try {
      if (typeof window === 'undefined') return null;

      const urlParams = new URLSearchParams(window.location.search);
      const isChallenge = urlParams.get('challenge') === '1' || urlParams.get('battle') === '1' || urlParams.get('daily') === '1';

      if (!isChallenge && !urlParams.has('seed')) {
        return null;
      }

      const seed = urlParams.get('seed') || SeededRandom.generateMatchSeed();
      const mode = (urlParams.get('mode') || 'classic') as ChallengeData['mode'];
      const difficulty = (urlParams.get('diff') || 'medium') as ChallengeData['difficulty'];
      const challengerScore = parseFloat(urlParams.get('score') || '0');
      const challengerName = decodeURIComponent(urlParams.get('name') || 'Friend');
      const challengerAccuracy = parseFloat(urlParams.get('acc') || '100');
      const challengerCombo = parseInt(urlParams.get('combo') || '0', 10);
      const challengerMistakes = parseInt(urlParams.get('miss') || '0', 10);
      const isDaily = urlParams.get('daily') === '1' || seed.startsWith('DAILY-');

      this.cachedPendingChallenge = {
        seed,
        mode,
        difficulty,
        challengerScore,
        challengerName,
        challengerAccuracy,
        challengerCombo,
        challengerMistakes,
        isDaily
      };

      return this.cachedPendingChallenge;
    } catch {
      return null;
    }
  }

  /**
   * Returns current pending challenge if available
   */
  public static getPendingChallenge(): ChallengeData | null {
    if (!this.hasParsedUrl) {
      return this.parseUrlChallenge();
    }
    return this.cachedPendingChallenge;
  }

  /**
   * Clears pending challenge state after it is consumed
   */
  public static clearPendingChallenge() {
    this.cachedPendingChallenge = null;
  }

  /**
   * Constructs an instant 1-click shareable challenge URL
   */
  public static buildChallengeUrl(data: {
    seed: string;
    mode: string;
    difficulty: string;
    score: number;
    playerName?: string;
    accuracy?: number;
    combo?: number;
    mistakes?: number;
    isDaily?: boolean;
  }): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://snap-it.app';
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const name = encodeURIComponent(data.playerName || 'Player');

    const params = new URLSearchParams();
    params.set('challenge', '1');
    params.set('seed', data.seed);
    params.set('mode', data.mode);
    params.set('diff', data.difficulty);
    params.set('score', data.score.toString());
    params.set('name', name);
    if (data.accuracy !== undefined) params.set('acc', data.accuracy.toString());
    if (data.combo !== undefined) params.set('combo', data.combo.toString());
    if (data.mistakes !== undefined) params.set('miss', data.mistakes.toString());
    if (data.isDaily) params.set('daily', '1');

    return `${origin}${path}?${params.toString()}`;
  }

  /**
   * Computes head-to-head comparison between player and friend:
   * e.g., "YOU BEAT ALEX BY 0.80s! 🏆" or "ALEX LEADS BY 3 PTS! 🔥"
   */
  public static compareHeadToHead(
    playerScore: number,
    challengerScore: number,
    isTimeBased: boolean,
    challengerName: string
  ): HeadToHeadComparison {
    const name = challengerName || 'Friend';
    let isVictory = false;
    let diffValue = 0;
    let formattedDiff = '';
    let bannerText = '';
    let shortSummary = '';

    const playerScoreFormatted = isTimeBased ? `${playerScore.toFixed(2)}s` : `${playerScore} PTS`;
    const challengerScoreFormatted = isTimeBased ? `${challengerScore.toFixed(2)}s` : `${challengerScore} PTS`;

    if (isTimeBased) {
      // Lower time is better
      diffValue = Math.abs(challengerScore - playerScore);
      formattedDiff = `${diffValue.toFixed(2)}s`;

      if (playerScore < challengerScore) {
        isVictory = true;
        bannerText = `🏆 YOU BEAT ${name.toUpperCase()} BY ${formattedDiff}!`;
        shortSummary = `+${formattedDiff} FASTER`;
      } else if (playerScore > challengerScore) {
        isVictory = false;
        bannerText = `⚡ ${name.toUpperCase()} LEADS BY ${formattedDiff}!`;
        shortSummary = `-${formattedDiff} BEHIND`;
      } else {
        isVictory = true;
        bannerText = `🤝 TIED WITH ${name.toUpperCase()}! EXACT SAME TIME`;
        shortSummary = 'EXACT TIE';
      }
    } else {
      // Higher score is better
      diffValue = Math.abs(playerScore - challengerScore);
      formattedDiff = `${diffValue} PTS`;

      if (playerScore > challengerScore) {
        isVictory = true;
        bannerText = `🏆 YOU BEAT ${name.toUpperCase()} BY ${formattedDiff}!`;
        shortSummary = `+${formattedDiff} AHEAD`;
      } else if (playerScore < challengerScore) {
        isVictory = false;
        bannerText = `⚡ ${name.toUpperCase()} LEADS BY ${formattedDiff}!`;
        shortSummary = `-${formattedDiff} BEHIND`;
      } else {
        isVictory = true;
        bannerText = `🤝 TIED WITH ${name.toUpperCase()}! EXACT SCORE`;
        shortSummary = 'EXACT TIE';
      }
    }

    return {
      isVictory,
      diffValue,
      formattedDiff,
      bannerText,
      shortSummary,
      challengerName: name,
      playerScoreFormatted,
      challengerScoreFormatted
    };
  }

  /**
   * Retrieves today's Daily Seeded Challenge information and countdown to reset
   */
  public static async getDailyChallengeInfo(): Promise<DailyChallengeInfo> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const seed = SeededRandom.getDailySeed(now);

    // Calculate time until next UTC midnight reset
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const diffMs = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeUntilReset = `${hours}h ${minutes}m`;

    const storedScore = await NativeBridge.getHighScore(`daily_${dateStr}`);
    const hasPlayed = storedScore > 0;
    const formattedBest = hasPlayed ? `${storedScore.toFixed(2)}s` : 'READY TO PLAY';

    return {
      dateStr,
      seed,
      bestScore: storedScore,
      formattedBest,
      hasPlayed,
      timeUntilReset
    };
  }

  /**
   * Records today's daily challenge score
   */
  public static async recordDailyScore(score: number): Promise<boolean> {
    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `daily_${dateStr}`;
    const previous = await NativeBridge.getHighScore(key);
    
    // Time based: lower is better
    if (previous <= 0 || score < previous) {
      await NativeBridge.saveHighScore(key, score);
      return true; // new daily record
    }
    return false;
  }
}
