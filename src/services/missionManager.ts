import { Preferences } from '@capacitor/preferences';

export interface Mission {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: string;
  completed: boolean;
}

export class MissionManager {
  private static readonly STORAGE_KEY = 'daily_missions';
  private static readonly DATE_KEY = 'last_mission_date';

  static async getMissions(): Promise<Mission[]> {
    const today = new Date().toDateString();
    const { value: lastDate } = await Preferences.get({ key: this.DATE_KEY });

    if (lastDate !== today) {
      return await this.generateDailyMissions(today);
    }

    const { value: missionsJson } = await Preferences.get({ key: this.STORAGE_KEY });
    return missionsJson ? JSON.parse(missionsJson) : await this.generateDailyMissions(today);
  }

  private static async generateDailyMissions(date: string): Promise<Mission[]> {
    const dailyMissions: Mission[] = [
      {
        id: 'total_hits_50',
        description: 'Hit 50 icons in one session',
        target: 50,
        current: 0,
        reward: 'Neon Core Skin',
        completed: false
      },
      {
        id: 'combo_10',
        description: 'Reach a 10x combo streak',
        target: 10,
        current: 0,
        reward: 'Indigo Trail',
        completed: false
      },
      {
        id: 'perfect_classic',
        description: 'Complete Classic Mode under 15s',
        target: 15, // Using target as time threshold
        current: 999, // Current best time
        reward: 'Gold Trophy Icon',
        completed: false
      },
      {
        id: 'crazy_combo',
        description: 'Reach 30x Combo in Crazy Mode',
        target: 30,
        current: 0,
        reward: 'Devil Red Trail',
        completed: false
      }
    ];

    await Preferences.set({ key: this.DATE_KEY, value: date });
    await this.saveMissions(dailyMissions);
    return dailyMissions;
  }

  static async updateMissionProgress(id: string, progress: number, isTimeBased: boolean = false) {
    const missions = await this.getMissions();
    const mission = missions.find(m => m.id === id);

    if (mission && !mission.completed) {
      if (isTimeBased) {
        if (progress < mission.target) {
            mission.completed = true;
            mission.current = progress;
        }
      } else {
        mission.current = Math.max(mission.current, progress);
        if (mission.current >= mission.target) {
          mission.completed = true;
        }
      }
      await this.saveMissions(missions);
    }
  }

  private static async saveMissions(missions: Mission[]) {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(missions)
    });
  }
}
