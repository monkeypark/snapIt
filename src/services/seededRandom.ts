/**
 * Deterministic PRNG using the Mulberry32 algorithm
 * Ensures that identical seeds produce 100% identical pattern sequences,
 * grid sizes, and distractor layouts for Daily Challenges and Friend Battles.
 */
export class SeededRandom {
  private s: number;

  constructor(seed: string | number) {
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      this.s = (Math.abs(hash) || 123456789) >>> 0;
    } else {
      this.s = (Math.abs(seed) || 123456789) >>> 0;
    }
  }

  /**
   * Returns a pseudo-random floating point number in [0, 1)
   */
  public next(): number {
    let t = (this.s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer between min and max (inclusive)
   */
  public between(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Deterministic Fisher-Yates array shuffle in-place
   */
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  /**
   * Picks a random item from array deterministically
   */
  public pick<T>(array: T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /**
   * Generates a standardized daily seed based on the current UTC date (YYYY-MM-DD)
   */
  public static getDailySeed(date: Date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `DAILY-${yyyy}-${mm}-${dd}`;
  }

  /**
   * Generates a short 6-character random alphanumeric match seed
   */
  public static generateMatchSeed(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }
}
