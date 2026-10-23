import { Preferences } from '@capacitor/preferences';

/**
 * Procedural Web Audio Synthesizer
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmInterval: any = null;
  private isBGMPlaying: boolean = false;
  
  private sfxEnabled: boolean = true;
  private bgmEnabled: boolean = true;

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    const { value: sfx } = await Preferences.get({ key: 'sfx_enabled' });
    const { value: bgm } = await Preferences.get({ key: 'bgm_enabled' });
    this.sfxEnabled = sfx !== 'false';
    this.bgmEnabled = bgm !== 'false';
    this.updateGains();
  }

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.connect(this.masterGain);
    
    this.masterGain.gain.value = 0.3;
    this.updateGains();
  }

  private updateGains() {
    if (!this.sfxGain || !this.bgmGain) return;
    this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 1.0 : 0, this.ctx!.currentTime, 0.05);
    this.bgmGain.gain.setTargetAtTime(this.bgmEnabled ? 1.0 : 0, this.ctx!.currentTime, 0.05);
  }

  public setSFXEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    Preferences.set({ key: 'sfx_enabled', value: enabled.toString() });
    this.updateGains();
  }

  public setBGMEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    Preferences.set({ key: 'bgm_enabled', value: enabled.toString() });
    this.updateGains();
  }

  public getSFXEnabled() { return this.sfxEnabled; }
  public getBGMEnabled() { return this.bgmEnabled; }

  public playCorrect(round: number) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    const freq = 880 + (round * 110);
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.1);

    g.gain.setValueAtTime(0.5, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playWrong() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(55, this.ctx.currentTime + 0.3);

    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playVictory() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      
      g.gain.setValueAtTime(0, now + i * 0.1);
      g.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  public playHover() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(3000, now);
    
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  public playSelect() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
    
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playStart() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      
      g.gain.setValueAtTime(0, now + i * 0.05);
      g.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.15);
    });
  }

  public playCountdownTick(isFinal: boolean = false) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    const freq = isFinal ? 880 : 587.33; // D5 for 3, 2, 1; A5 for SNAP!
    osc.frequency.setValueAtTime(freq, now);
    if (isFinal) {
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // Ramp up to D6
    }

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(isFinal ? 0.35 : 0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.35 : 0.18));

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + (isFinal ? 0.35 : 0.18));
  }

  public playGameOver() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    
    // Low rumble
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.linearRampToValueAtTime(40, now + 0.5);
    g1.gain.setValueAtTime(0.2, now);
    g1.gain.linearRampToValueAtTime(0, now + 0.5);
    osc1.connect(g1);
    g1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Dissonant high
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.linearRampToValueAtTime(300, now + 0.3);
    g2.gain.setValueAtTime(0.1, now);
    g2.gain.linearRampToValueAtTime(0, now + 0.3);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.3);
  }

  public playClick() {
    this.playSelect();
  }

  public playNewRecord() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Triumphant ascending fanfare notes: C5, E5, G5, B5, C6, E6
    const fanfareNotes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
    
    fanfareNotes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      
      osc.type = i >= 4 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.22, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

      osc.connect(g);
      g.connect(this.sfxGain!);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });

    // Shimmering high sparkle overtone
    for (let j = 0; j < 5; j++) {
      const sparkleOsc = this.ctx!.createOscillator();
      const sparkleGain = this.ctx!.createGain();
      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(2200 + j * 450, now + 0.45 + j * 0.06);
      sparkleGain.gain.setValueAtTime(0, now + 0.45 + j * 0.06);
      sparkleGain.gain.linearRampToValueAtTime(0.08, now + 0.45 + j * 0.06 + 0.01);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45 + j * 0.06 + 0.15);
      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(this.sfxGain!);
      sparkleOsc.start(now + 0.45 + j * 0.06);
      sparkleOsc.stop(now + 0.45 + j * 0.06 + 0.15);
    }
  }

  public playMissionComplete() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [783.99, 987.77, 1318.51]; // G5, B5, E6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  public playBadgeClaim() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      g.gain.setValueAtTime(0, now + i * 0.06);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.06 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);

      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.35);
    });

    for (let j = 0; j < 4; j++) {
      const sOsc = this.ctx!.createOscillator();
      const sG = this.ctx!.createGain();
      sOsc.type = 'triangle';
      sOsc.frequency.setValueAtTime(2600 + j * 500, now + 0.3 + j * 0.07);
      sG.gain.setValueAtTime(0, now + 0.3 + j * 0.07);
      sG.gain.linearRampToValueAtTime(0.07, now + 0.3 + j * 0.07 + 0.01);
      sG.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + j * 0.07 + 0.2);
      sOsc.connect(sG);
      sG.connect(this.sfxGain!);
      sOsc.start(now + 0.3 + j * 0.07);
      sOsc.stop(now + 0.3 + j * 0.07 + 0.2);
    }
  }

  private synthesizeTom(freq: number, decay: number, volume: number) {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + decay);

    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + decay);

    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(now);
    osc.stop(now + decay);
  }

  private beatListeners: (() => void)[] = [];

  public subscribeBeat(cb: () => void) {
    this.beatListeners.push(cb);
    return () => {
      this.beatListeners = this.beatListeners.filter(l => l !== cb);
    };
  }

  public startBGM(pressure: number = 1.0, mode: string = 'standard') {
    this.init();
    if (!this.ctx || this.isBGMPlaying) return;
    this.isBGMPlaying = true;

    let step = 0;
    const bpm = (mode === 'crazy' ? 160 : 120) * pressure;
    const stepTime = 60 / bpm / 2; // 8th notes

    const playStep = () => {
      if (!this.isBGMPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      
      if (step % 4 === 0) {
        this.beatListeners.forEach(cb => cb());
      }
      
      if (mode === 'crazy') {
          // HEART ATTACK RHYTHM: Double Thump (LUB-DUB)
          if (step % 8 === 0 || step % 8 === 1) {
              this.synthesizeTom(step % 8 === 0 ? 100 : 80, 0.3, 0.5);
          }
          // High Tension Ticks
          if (step % 2 === 0) {
              const tickOsc = this.ctx.createOscillator();
              const tickGain = this.ctx.createGain();
              tickOsc.type = 'sine';
              tickOsc.frequency.setValueAtTime(6000, now);
              tickGain.gain.setValueAtTime(0.04, now);
              tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
              tickOsc.connect(tickGain);
              tickGain.connect(this.bgmGain!);
              tickOsc.start(now);
              tickOsc.stop(now + 0.02);
          }
      } else {
          // STANDARD RHYTHM
          if (step % 4 === 0) {
            this.synthesizeTom(120, 0.4, 0.4);
          }
          if (step % 8 === 2 || step % 8 === 5 || step % 8 === 7) {
            this.synthesizeTom(220, 0.2, 0.25);
          }
          const tickOsc = this.ctx.createOscillator();
          const tickGain = this.ctx.createGain();
          tickOsc.type = 'sine';
          tickOsc.frequency.setValueAtTime(step % 4 === 0 ? 5000 : 4000, now);
          tickGain.gain.setValueAtTime(0.02, now);
          tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          tickOsc.connect(tickGain);
          tickGain.connect(this.bgmGain!);
          tickOsc.start(now);
          tickOsc.stop(now + 0.03);
      }

      step++;
      this.bgmInterval = setTimeout(playStep, stepTime * 1000);
    };

    playStep();
  }

  public stopBGM() {
    this.isBGMPlaying = false;
    if (this.bgmInterval) {
      clearTimeout(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
