import { Preferences } from '@capacitor/preferences';

export interface VisualBadge {
  id: string;
  name: string;
  title: string;
  description: string;
  iconIndex: number; // 0 to 23 corresponding to PreloadScene animal textures
  color: number;
  textColor: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  unlockedAt?: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  type: 'taps' | 'combo' | 'games' | 'time_attack' | 'classic_speed' | 'accuracy' | 'crazy_score';
  rewardTitle: string;
  rewardBadge: VisualBadge;
  completed: boolean;
  claimed: boolean;
}

export class MissionManager {
  private static readonly STORAGE_KEY = 'snapit_daily_missions_v3';
  private static readonly DATE_KEY = 'snapit_daily_date_v3';
  private static readonly BADGES_KEY = 'snapit_unlocked_badges_v3';

  /**
   * Returns a deterministic hash number for a given string (e.g. date '2026-10-19')
   */
  private static getDaySeed(dateStr: string): number {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private static getTodayString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static async getMissions(): Promise<DailyMission[]> {
    const today = this.getTodayString();
    const { value: lastDate } = await Preferences.get({ key: this.DATE_KEY });

    if (lastDate !== today) {
      return await this.generateDailyMissions(today);
    }

    const { value: missionsJson } = await Preferences.get({ key: this.STORAGE_KEY });
    if (!missionsJson) {
      return await this.generateDailyMissions(today);
    }

    try {
      const parsed: DailyMission[] = JSON.parse(missionsJson);
      // Ensure all fields exist
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Fallback
    }
    return await this.generateDailyMissions(today);
  }

  static async getFeaturedMission(): Promise<DailyMission> {
    const missions = await this.getMissions();
    return missions[0];
  }

  private static async generateDailyMissions(dateStr: string): Promise<DailyMission[]> {
    const seed = this.getDaySeed(dateStr);

    // Primary Tap Mission Variations
    const tapTargets = [50, 60, 75, 40, 80, 50, 70];
    const tapTarget = tapTargets[seed % tapTargets.length];

    const primaryMission: DailyMission = {
      id: `daily_taps_${dateStr}`,
      title: 'TAP PROTOCOL',
      description: `Perform ${tapTarget} successful taps today`,
      target: tapTarget,
      current: 0,
      unit: 'taps',
      type: 'taps',
      rewardTitle: 'Neon Reflex Badge',
      rewardBadge: {
        id: `badge_neon_reflex_${dateStr}`,
        name: 'Neon Reflex Badge',
        title: 'LIGHTNING SPEED',
        description: `Awarded for landing ${tapTarget} precision taps in Snap It!`,
        iconIndex: 2, // Bolt
        color: 0xf59e0b,
        textColor: '#fbbf24',
        tier: 'gold'
      },
      completed: false,
      claimed: false
    };

    // Secondary Streak/Combo Mission Variations
    const comboTargets = [10, 12, 15, 12, 18, 14, 16];
    const comboTarget = comboTargets[(seed >> 2) % comboTargets.length];

    const secondaryMission: DailyMission = {
      id: `daily_combo_${dateStr}`,
      title: 'COMBO FLOW',
      description: `Reach a ${comboTarget}x combo streak in any mode`,
      target: comboTarget,
      current: 0,
      unit: 'combo',
      type: 'combo',
      rewardTitle: 'Hyper Streak Medal',
      rewardBadge: {
        id: `badge_hyper_streak_${dateStr}`,
        name: 'Hyper Streak Medal',
        title: 'COMBO ARCHITECT',
        description: `Achieved a sustained ${comboTarget}x precision combo streak.`,
        iconIndex: 0, // Star
        color: 0xec4899,
        textColor: '#f472b6',
        tier: 'silver'
      },
      completed: false,
      claimed: false
    };

    // Tertiary Mode Specific Challenges
    const modeQuests: {
      title: string;
      description: string;
      target: number;
      unit: string;
      type: DailyMission['type'];
      badgeName: string;
      badgeTitle: string;
      badgeDesc: string;
      iconIndex: number;
      color: number;
      textColor: string;
      tier: 'bronze' | 'silver' | 'gold' | 'diamond';
    }[] = [
      {
        title: 'TIME ATTACK DRILL',
        description: 'Score 30+ points in Time Attack mode',
        target: 30,
        unit: 'pts',
        type: 'time_attack',
        badgeName: 'Chrono Blitz Insignia',
        badgeTitle: 'TEMPORAL MASTER',
        badgeDesc: 'Clocked a 30+ target rush in Time Attack frenzy.',
        iconIndex: 11, // Hourglass / Glass
        color: 0x38bdf8,
        textColor: '#38bdf8',
        tier: 'diamond'
      },
      {
        title: 'CLASSIC SPRINT',
        description: 'Clear Classic 10 in under 16.0s',
        target: 16.0,
        unit: 's',
        type: 'classic_speed',
        badgeName: 'Velocity Star Badge',
        badgeTitle: 'RAPID NEURON',
        badgeDesc: 'Sub-16 second clearance across 10 stages of Classic Snap.',
        iconIndex: 3, // Diamond
        color: 0x10b981,
        textColor: '#34d399',
        tier: 'gold'
      },
      {
        title: 'SURVIVAL GRIND',
        description: 'Play 3 complete game sessions today',
        target: 3,
        unit: 'games',
        type: 'games',
        badgeName: 'Arcade Veteran Crest',
        badgeTitle: 'CONSISTENT DRIFTER',
        badgeDesc: 'Completed 3 full high-speed sessions in the Snap Archive.',
        iconIndex: 9, // Heart
        color: 0xa855f7,
        textColor: '#c084fc',
        tier: 'bronze'
      },
      {
        title: 'SHARP EYE',
        description: 'Finish any game with 90%+ accuracy',
        target: 90,
        unit: '%',
        type: 'accuracy',
        badgeName: 'Hawk Eye Medallion',
        badgeTitle: 'ZERO MISTAKE',
        badgeDesc: 'Maintained 90% or greater accuracy in high-stress play.',
        iconIndex: 1, // Hex
        color: 0x06b6d4,
        textColor: '#22d3ee',
        tier: 'silver'
      }
    ];

    const questConfig = modeQuests[(seed >> 4) % modeQuests.length];
    const tertiaryMission: DailyMission = {
      id: `daily_quest_${dateStr}`,
      title: questConfig.title,
      description: questConfig.description,
      target: questConfig.target,
      current: questConfig.type === 'classic_speed' ? 999 : 0,
      unit: questConfig.unit,
      type: questConfig.type,
      rewardTitle: questConfig.badgeName,
      rewardBadge: {
        id: `badge_quest_${dateStr}`,
        name: questConfig.badgeName,
        title: questConfig.badgeTitle,
        description: questConfig.badgeDesc,
        iconIndex: questConfig.iconIndex,
        color: questConfig.color,
        textColor: questConfig.textColor,
        tier: questConfig.tier
      },
      completed: false,
      claimed: false
    };

    const dailyMissions: DailyMission[] = [primaryMission, secondaryMission, tertiaryMission];

    await Preferences.set({ key: this.DATE_KEY, value: dateStr });
    await this.saveMissions(dailyMissions);
    return dailyMissions;
  }

  /**
   * Called on every successful tap in PlayScene.
   * Increments progress for daily tap missions.
   * Returns newly completed missions (if any) to trigger immediate in-game fanfare.
   */
  static async recordTap(isCorrect: boolean): Promise<DailyMission[]> {
    if (!isCorrect) return [];

    const missions = await this.getMissions();
    const newlyCompleted: DailyMission[] = [];
    let changed = false;

    for (const m of missions) {
      if (m.type === 'taps' && !m.completed) {
        m.current++;
        changed = true;
        if (m.current >= m.target) {
          m.completed = true;
          newlyCompleted.push(m);
        }
      }
    }

    if (changed) {
      await this.saveMissions(missions);
    }
    return newlyCompleted;
  }

  /**
   * Called when combo increases.
   */
  static async recordCombo(combo: number): Promise<DailyMission[]> {
    const missions = await this.getMissions();
    const newlyCompleted: DailyMission[] = [];
    let changed = false;

    for (const m of missions) {
      if (m.type === 'combo' && !m.completed) {
        if (combo > m.current) {
          m.current = combo;
          changed = true;
        }
        if (m.current >= m.target) {
          m.completed = true;
          newlyCompleted.push(m);
        }
      }
    }

    if (changed) {
      await this.saveMissions(missions);
    }
    return newlyCompleted;
  }

  /**
   * Called when game finishes.
   */
  static async recordGameEnd(
    mode: string,
    score: number,
    accuracy: number,
    isVictory: boolean,
    timeSec: number
  ): Promise<DailyMission[]> {
    const missions = await this.getMissions();
    const newlyCompleted: DailyMission[] = [];
    let changed = false;

    for (const m of missions) {
      if (m.completed) continue;

      if (m.type === 'games') {
        m.current++;
        changed = true;
        if (m.current >= m.target) {
          m.completed = true;
          newlyCompleted.push(m);
        }
      } else if (m.type === 'accuracy') {
        if (accuracy > m.current) {
          m.current = accuracy;
          changed = true;
        }
        if (accuracy >= m.target) {
          m.completed = true;
          newlyCompleted.push(m);
        }
      } else if (m.type === 'time_attack' && mode === 'attack') {
        if (score > m.current) {
          m.current = score;
          changed = true;
        }
        if (score >= m.target) {
          m.completed = true;
          newlyCompleted.push(m);
        }
      } else if (m.type === 'classic_speed' && mode === 'classic' && isVictory) {
        if (timeSec < m.current) {
          m.current = parseFloat(timeSec.toFixed(2));
          changed = true;
        }
        if (timeSec <= m.target) {
          m.completed = true;
          newlyCompleted.push(m);
        }
      } else if (m.type === 'crazy_score' && (mode === 'crazy' || mode === 'super_crazy')) {
        if (score > m.current) {
          m.current = score;
          changed = true;
        }
        if (score >= m.target) {
          m.completed = true;
          newlyCompleted.push(m);
        }
      }
    }

    if (changed) {
      await this.saveMissions(missions);
    }
    return newlyCompleted;
  }

  /**
   * Claim reward badge for a completed mission.
   */
  static async claimReward(missionId: string): Promise<VisualBadge | null> {
    const missions = await this.getMissions();
    const mission = missions.find(m => m.id === missionId);

    if (!mission || !mission.completed || mission.claimed) {
      return null;
    }

    mission.claimed = true;
    await this.saveMissions(missions);

    const badge: VisualBadge = {
      ...mission.rewardBadge,
      unlockedAt: new Date().toISOString()
    };

    const unlocked = await this.getUnlockedBadges();
    // Prevent duplicate badge IDs
    if (!unlocked.some(b => b.id === badge.id)) {
      unlocked.unshift(badge);
      await Preferences.set({
        key: this.BADGES_KEY,
        value: JSON.stringify(unlocked)
      });
    }

    return badge;
  }

  static async getUnlockedBadges(): Promise<VisualBadge[]> {
    const { value } = await Preferences.get({ key: this.BADGES_KEY });
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  static async hasUnclaimedMissions(): Promise<boolean> {
    const missions = await this.getMissions();
    return missions.some(m => m.completed && !m.claimed);
  }

  private static async saveMissions(missions: DailyMission[]) {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(missions)
    });
  }
}
