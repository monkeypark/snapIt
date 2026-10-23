export interface FunTitleResult {
  title: string;
  subtitle: string;
  tag: string;
  badgeEmoji: string;
  color: string;
  rankStars: number;
}

export interface PerformanceStats {
  accuracy: number;
  finalScore: number;
  isTimeBased: boolean;
  mistakes: number;
  maxCombo: number;
  totalHits: number;
  mode: string;
  difficulty?: string;
  isNewRecord?: boolean;
  avgTimePerHit?: number;
  isDaily?: boolean;
}

export class TitleGenerator {
  /**
   * Computes a distinctive, shareable arcade title & personality tag
   * based on accuracy, mistake count, combo streaks, and speed
   */
  public static generateTitle(stats: PerformanceStats): FunTitleResult {
    const {
      accuracy,
      mistakes,
      maxCombo,
      finalScore,
      isTimeBased,
      mode,
      difficulty,
      isNewRecord,
      avgTimePerHit,
      isDaily
    } = stats;

    // 1. GODLIKE REFLEXES (神级反应): 100% Accuracy, 0 Misses, ultra fast
    if (accuracy === 100 && mistakes === 0 && ((isTimeBased && finalScore < 3.2) || (!isTimeBased && finalScore >= 25))) {
      return {
        title: '⚡ GODLIKE REFLEXES',
        subtitle: 'Zero hesitation · Pure cyber precognition',
        tag: 'PERFECT S-TIER',
        badgeEmoji: '👑',
        color: '#fbbf24',
        rankStars: 5
      };
    }

    // 2. FLAWLESS NEURON (完美反应 / 零失误): 100% Accuracy with zero misses
    if (accuracy === 100 && mistakes === 0) {
      return {
        title: '💎 FLAWLESS NEURON',
        subtitle: '100% Precision · Not a single wasted motion',
        tag: 'ZERO MISSES',
        badgeEmoji: '💎',
        color: '#38bdf8',
        rankStars: 5
      };
    }

    // 3. LIGHTNING THUMB (闪电拇指): Fast speed per tap
    if (avgTimePerHit && avgTimePerHit < 0.32) {
      return {
        title: '⚡ LIGHTNING THUMB',
        subtitle: `Blistering ${(avgTimePerHit).toFixed(2)}s per tap · Faster than vision`,
        tag: 'SPEED DEMON',
        badgeEmoji: '⚡',
        color: '#c084fc',
        rankStars: 4
      };
    }

    // 4. COMBO MONSTER (连击狂魔): High combo streak
    if (maxCombo >= 12 || (mode === 'attack' && finalScore >= 20)) {
      return {
        title: '🔥 COMBO MONSTER',
        subtitle: `${maxCombo}x Streak · Unbroken kinetic rhythm`,
        tag: 'COMBO MASTER',
        badgeEmoji: '🔥',
        color: '#f43f5e',
        rankStars: 4
      };
    }

    // 5. DAILY TRAILBLAZER (今日破风者): Played daily challenge with high score
    if (isDaily && accuracy >= 90) {
      return {
        title: '☀️ DAILY TRAILBLAZER',
        subtitle: 'Conquered today worldwide seeded challenge',
        tag: 'DAILY ELITE',
        badgeEmoji: '☀️',
        color: '#f59e0b',
        rankStars: 4
      };
    }

    // 6. MASOCHIST SURVIVOR (地狱生还者): Surviving crazy/masochist
    if (mode === 'super_crazy' || mode === 'crazy') {
      return {
        title: '💀 CHAOS SURVIVOR',
        subtitle: 'Defied erratic sensory overload',
        tag: 'SURVIVOR',
        badgeEmoji: '💀',
        color: '#ef4444',
        rankStars: 4
      };
    }

    // 7. PANIC TAPPER (慌乱暴击手 / 狂野手速): Many hits but made a few mistakes
    if (mistakes >= 3 && accuracy >= 70) {
      return {
        title: '💥 PANIC TAPPER',
        subtitle: `${mistakes} slips, but pure grit carried the run`,
        tag: 'WILD INSTINCT',
        badgeEmoji: '💥',
        color: '#fb923c',
        rankStars: 3
      };
    }

    // 8. STEADY PULSE (定海神针 / 稳如泰山): Steady high accuracy
    if (accuracy >= 92 && mistakes <= 1) {
      return {
        title: '🎯 STEADY PULSE',
        subtitle: 'Controlled tempo · Steel composure',
        tag: 'SHARPSHOOTER',
        badgeEmoji: '🎯',
        color: '#10b981',
        rankStars: 4
      };
    }

    // 9. NEW RECORD BREAKER (纪录粉碎者)
    if (isNewRecord) {
      return {
        title: '🏆 RECORD BREAKER',
        subtitle: 'Pushed personal boundaries to a new peak',
        tag: 'NEW PEAK',
        badgeEmoji: '🏆',
        color: '#eab308',
        rankStars: 4
      };
    }

    // 10. ARCADE CONTENDER (街机挑战者): Default solid performance
    return {
      title: '🕹️ ARCADE CONTENDER',
      subtitle: 'Sharpening instincts · Ready for the next run',
      tag: 'CHALLENGER',
      badgeEmoji: '🕹️',
      color: '#818cf8',
      rankStars: 3
    };
  }
}
