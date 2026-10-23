export interface ScoreCardData {
  mode: string;
  modeLabel?: string;
  difficulty?: string;
  finalScore: number;
  formattedScore: string;
  isTimeBased: boolean;
  accuracy: number;
  totalHits: number;
  maxCombo?: number;
  mistakes?: number;
  avgTimePerHit?: number;
  isNewRecord: boolean;
  previousBest?: number;
  newBest?: number;
  reason?: string;
  date?: Date;
  // Mechanisms 1, 2, 3 Additions:
  funTitle?: string;
  funSubtitle?: string;
  isDailyChallenge?: boolean;
  challengerName?: string;
  challengerComparison?: string;
  challengeUrl?: string;
}

export class ScoreCard {
  private static readonly WIDTH = 1080;
  private static readonly HEIGHT = 1350;

  /**
   * Formats mode identifier to user-facing arcade title
   */
  public static getModeTitle(mode: string): string {
    const titles: Record<string, string> = {
      classic: 'CLASSIC 10',
      memory: 'MEMORY FLASH',
      attack: 'TIME ATTACK',
      crazy: 'CRAZY MODE',
      super_crazy: 'MASOCHIST MODE',
      daily: 'DAILY CHALLENGE'
    };
    return titles[mode] || mode.toUpperCase();
  }

  /**
   * Generates a high-quality HTML5 Canvas score card
   */
  public static generateCanvas(data: ScoreCardData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.WIDTH;
    canvas.height = this.HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context');

    // Enable high quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const w = this.WIDTH;
    const h = this.HEIGHT;

    // 1. Cyberpunk Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.45, '#070b24');
    bgGrad.addColorStop(0.8, '#0b0c2a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Ambient Glowing Spheres (Neon Atmosphere)
    this.drawGlowSphere(ctx, 160, 220, 340, 'rgba(99, 102, 241, 0.22)'); // Indigo
    this.drawGlowSphere(ctx, w - 160, 480, 400, 'rgba(236, 72, 153, 0.18)'); // Pink
    this.drawGlowSphere(ctx, w / 2, 880, 420, 'rgba(16, 185, 129, 0.15)'); // Emerald / Cyan
    if (data.isNewRecord) {
      this.drawGlowSphere(ctx, w / 2, 600, 380, 'rgba(245, 158, 11, 0.25)'); // Golden record aura
    }

    // 3. Cyberpunk Geometric Grid Pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Tech Corner Brackets & Outer Neon Frame
    const frameColor = data.isDailyChallenge ? '#f59e0b' : (data.isNewRecord ? '#f59e0b' : '#6366f1');
    this.drawCyberFrame(ctx, w, h, frameColor);

    // 5. Header Section: Title & Slogan
    ctx.save();
    ctx.textAlign = 'center';

    // Top Brand Tag
    ctx.font = '700 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = data.isDailyChallenge ? '#f59e0b' : '#6366f1';
    ctx.letterSpacing = '6px';
    const topTag = data.isDailyChallenge
      ? '★ DAILY SEEDED CHALLENGE · SAME FOR EVERYONE'
      : 'TAP FAST · THINK FASTER';
    ctx.fillText(topTag, w / 2, 110);

    // Main Logo Title: SNAP IT!
    ctx.font = '900 italic 106px "Barlow Condensed", Inter, sans-serif';
    ctx.letterSpacing = '2px';
    
    // Outer glow for title
    ctx.shadowColor = data.isDailyChallenge ? 'rgba(245, 158, 11, 0.6)' : 'rgba(99, 102, 241, 0.6)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SNAP IT!', w / 2, 205);
    ctx.shadowBlur = 0;

    // Slogan
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '3px';
    ctx.fillText('Play. Snap. Repeat. · Modern Speed Challenge', w / 2, 248);
    ctx.restore();

    // 6. Mode & Difficulty Badge
    const modeLabel = data.isDailyChallenge ? 'DAILY CHALLENGE' : (data.modeLabel || this.getModeTitle(data.mode));
    const difficultyLabel = data.difficulty ? data.difficulty.toUpperCase() : 'STANDARD';
    this.drawModeBadge(ctx, w / 2, 305, `${modeLabel}  ·  ${difficultyLabel}`);

    // 7. Fun Title Banner (Mechanism 3) or NEW RECORD Banner
    if (data.funTitle) {
      this.drawFunTitleBanner(ctx, w / 2, 375, data.funTitle, data.funSubtitle);
    } else if (data.isNewRecord) {
      this.drawNewRecordBanner(ctx, w / 2, 375);
    } else {
      this.drawStandardBanner(ctx, w / 2, 375, data.reason || 'OFFICIAL RUN');
    }

    // 8. Main Score Box
    this.drawScoreHero(ctx, w / 2, 530, data);

    // 9. Head-To-Head Comparison Banner (Mechanism 2) if available
    let statsY = 720;
    if (data.challengerComparison) {
      this.drawHeadToHeadBanner(ctx, w / 2, 690, data.challengerComparison);
      statsY = 780;
    }

    // 10. Statistics Matrix (Accuracy, Max Combo, Mistakes, Total Hits / Avg Time)
    this.drawStatsMatrix(ctx, w, statsY, data);

    // 11. Social Challenge Callout Box (Mechanism 1 & 2)
    this.drawChallengeBox(ctx, w / 2, statsY + 260, data);

    // 12. Footer Protocol & Watermark
    this.drawFooter(ctx, w, h);

    return canvas;
  }

  /**
   * Generates a PNG Blob from the score card
   */
  public static async generateBlob(data: ScoreCardData): Promise<Blob> {
    const canvas = this.generateCanvas(data);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create Blob from Canvas'));
        },
        'image/png',
        0.96
      );
    });
  }

  /**
   * Generates a Data URL from the score card
   */
  public static generateDataUrl(data: ScoreCardData): string {
    const canvas = this.generateCanvas(data);
    return canvas.toDataURL('image/png', 0.96);
  }

  // --- PRIVATE DRAWING HELPERS ---

  private static drawGlowSphere(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private static drawCyberFrame(ctx: CanvasRenderingContext2D, w: number, h: number, accentColor: string) {
    ctx.save();
    const pad = 44;
    const cornerSize = 40;

    // Outer subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    // Neon Corner Brackets
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;

    // Top Left
    ctx.beginPath();
    ctx.moveTo(pad, pad + cornerSize);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + cornerSize, pad);
    ctx.stroke();

    // Top Right
    ctx.beginPath();
    ctx.moveTo(w - pad - cornerSize, pad);
    ctx.lineTo(w - pad, pad);
    ctx.lineTo(w - pad, pad + cornerSize);
    ctx.stroke();

    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(pad, h - pad - cornerSize);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(pad + cornerSize, h - pad);
    ctx.stroke();

    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(w - pad - cornerSize, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(w - pad, h - pad - cornerSize);
    ctx.stroke();

    ctx.restore();
  }

  private static drawModeBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
    ctx.save();
    ctx.font = '800 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const textWidth = ctx.measureText(text).width;
    const padX = 36;
    const boxW = Math.max(340, textWidth + padX * 2);
    const boxH = 50;

    // Background pill
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    this.roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 25);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#e2e8f0';
    ctx.letterSpacing = '2px';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  private static drawFunTitleBanner(ctx: CanvasRenderingContext2D, x: number, y: number, title: string, subtitle?: string) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxW = 620;
    const boxH = subtitle ? 66 : 52;

    // Glowing Neon Amber / Cyan gradient fill
    const grad = ctx.createLinearGradient(x - boxW / 2, 0, x + boxW / 2, 0);
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.28)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.28)');
    ctx.fillStyle = grad;
    this.roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 26);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '900 italic 26px "Barlow Condensed", Inter, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.letterSpacing = '2px';
    ctx.fillText(title.toUpperCase(), x, subtitle ? y - 10 : y);

    if (subtitle) {
      ctx.font = '600 15px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.letterSpacing = '1px';
      ctx.fillText(subtitle, x, y + 16);
    }

    ctx.restore();
  }

  private static drawNewRecordBanner(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxW = 540;
    const boxH = 50;

    const grad = ctx.createLinearGradient(x - boxW / 2, 0, x + boxW / 2, 0);
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    grad.addColorStop(0.5, 'rgba(234, 179, 8, 0.4)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.25)');
    ctx.fillStyle = grad;
    this.roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 25);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '900 italic 26px "Barlow Condensed", Inter, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.letterSpacing = '3px';
    ctx.fillText('★ NEW ALL-TIME RECORD ★', x, y + 1);
    ctx.restore();
  }

  private static drawStandardBanner(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxW = 420;
    const boxH = 46;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    this.roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 23);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '800 18px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '2px';
    ctx.fillText(text.toUpperCase(), x, y + 1);
    ctx.restore();
  }

  private static drawScoreHero(ctx: CanvasRenderingContext2D, x: number, y: number, data: ScoreCardData) {
    ctx.save();
    ctx.textAlign = 'center';

    const boxW = 860;
    const boxH = 220;

    // Frosted Score Card Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    this.roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 30);
    ctx.fill();

    // Cyberpunk border with highlight
    ctx.strokeStyle = data.isNewRecord ? 'rgba(245, 158, 11, 0.6)' : 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top Label
    ctx.font = '800 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '4px';
    const topLabel = data.isTimeBased ? 'COMPLETION TIME' : 'TOTAL SCORE';
    ctx.fillText(topLabel, x, y - 50);

    // Giant Hero Score Value
    ctx.font = '900 110px "Barlow Condensed", Inter, sans-serif';
    ctx.letterSpacing = '-1px';
    ctx.fillStyle = data.isNewRecord ? '#fbbf24' : '#ffffff';
    if (data.isNewRecord) {
      ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
      ctx.shadowBlur = 24;
    }
    ctx.fillText(data.formattedScore, x, y + 50);
    ctx.shadowBlur = 0;

    // Sub-caption: Previous best comparison
    if (data.previousBest !== undefined && data.previousBest > 0) {
      ctx.font = '600 19px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#64748b';
      const prevFormatted = data.isTimeBased ? `${data.previousBest.toFixed(2)}s` : `${data.previousBest}`;
      ctx.fillText(`PREVIOUS BEST: ${prevFormatted}`, x, y + 86);
    }

    ctx.restore();
  }

  private static drawHeadToHeadBanner(ctx: CanvasRenderingContext2D, x: number, y: number, comparisonText: string) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const boxW = 860;
    const boxH = 58;

    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    this.roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 20);
    ctx.fill();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '900 italic 26px "Barlow Condensed", Inter, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.letterSpacing = '2px';
    ctx.fillText(comparisonText.toUpperCase(), x, y);
    ctx.restore();
  }

  private static drawStatsMatrix(ctx: CanvasRenderingContext2D, w: number, y: number, data: ScoreCardData) {
    ctx.save();
    
    // 4 Distinct Stat Cards for Mechanism 3 (Accuracy, Combo, Mistakes, Hits)
    const stats: { label: string; value: string; color: string }[] = [
      { label: 'ACCURACY', value: `${data.accuracy}%`, color: '#10b981' },
      { label: 'MAX COMBO', value: data.maxCombo ? `${data.maxCombo}x` : '1x', color: '#f59e0b' },
      {
        label: 'MISTAKES',
        value: data.mistakes !== undefined ? (data.mistakes === 0 ? '0 (FLAWLESS)' : `${data.mistakes}`) : '0',
        color: (data.mistakes || 0) === 0 ? '#38bdf8' : '#fb923c'
      },
      {
        label: data.isTimeBased ? 'AVG / HIT' : 'TOTAL HITS',
        value: (data.isTimeBased && data.avgTimePerHit && data.avgTimePerHit > 0)
          ? `${data.avgTimePerHit.toFixed(2)}s`
          : data.totalHits.toString(),
        color: '#a855f7'
      }
    ];

    const cardCount = stats.length;
    const totalW = 860;
    const gap = 16;
    const cardW = (totalW - (gap * (cardCount - 1))) / cardCount;
    const cardH = 120;
    const startX = (w - totalW) / 2;

    stats.forEach((stat, i) => {
      const cx = startX + i * (cardW + gap);
      
      // Card bg
      ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';
      this.roundRect(ctx, cx, y, cardW, cardH, 18);
      ctx.fill();

      // Subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.textAlign = 'center';
      ctx.font = '700 15px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.letterSpacing = '1.5px';
      ctx.fillText(stat.label, cx + cardW / 2, y + 36);

      // Value
      ctx.font = '900 32px "Barlow Condensed", Inter, sans-serif';
      ctx.fillStyle = stat.color;
      ctx.fillText(stat.value, cx + cardW / 2, y + 84);
    });

    ctx.restore();
  }

  private static drawChallengeBox(ctx: CanvasRenderingContext2D, x: number, y: number, data: ScoreCardData) {
    ctx.save();
    ctx.textAlign = 'center';

    const boxW = 860;
    const boxH = 120;

    // Glowing Cyberpunk Callout
    ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
    this.roundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 24);
    ctx.fill();

    ctx.strokeStyle = data.isDailyChallenge ? '#f59e0b' : '#6366f1';
    ctx.lineWidth = 2;
    ctx.shadowColor = data.isDailyChallenge ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.4)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Challenge Header
    ctx.font = '900 italic 32px "Barlow Condensed", Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '2px';
    const headline = data.isDailyChallenge
      ? '☀️ DAILY WORLDWIDE SEEDED PUZZLE ☀️'
      : (data.challengerName ? `⚔️ BATTLE WITH ${data.challengerName.toUpperCase()} ⚔️` : '⚡ CAN YOU BEAT MY SCORE? ⚡');
    ctx.fillText(headline, x, y - 8);

    // Invitation text
    ctx.font = '600 19px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#a5b4fc';
    ctx.letterSpacing = '1px';
    const sub = data.isDailyChallenge
      ? 'Every player worldwide solves this exact sequence today!'
      : 'Play the exact same seed pattern & test your reaction speed!';
    ctx.fillText(sub, x, y + 32);

    ctx.restore();
  }

  private static drawFooter(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 15px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.letterSpacing = '3px';
    ctx.fillText('SNAP IT! ARCADE PROTOCOL · POWERED BY REACTION ENGINE', w / 2, h - 70);
    ctx.restore();
  }

  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
