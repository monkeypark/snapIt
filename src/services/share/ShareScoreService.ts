import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ScoreCard, ScoreCardData } from './ScoreCard';

export interface ShareResult {
  success: boolean;
  cancelled?: boolean;
  method?: 'native' | 'web-share' | 'download';
  error?: string;
  userMessage?: string;
}

export interface ShareOptions {
  challengeUrl?: string;
}

export class ShareScoreService {
  private static isSharingInProgress: boolean = false;
  private static lastCreatedFilePath: string | null = null;

  /**
   * Generates score message text with challenge link and title
   */
  public static generateShareText(data: ScoreCardData, options?: ShareOptions): string {
    const modeName = data.modeLabel || ScoreCard.getModeTitle(data.mode);
    const scoreStr = data.formattedScore;
    const challengeUrl = options?.challengeUrl || data.challengeUrl;
    const mistakesStr = data.mistakes !== undefined ? `${data.mistakes} mistakes` : '0 mistakes';
    const titleStr = data.funTitle ? ` [${data.funTitle}]` : '';

    let text = '';

    if (data.isDailyChallenge) {
      text = `☀️ I just conquered today's Snap It! Daily Challenge in ${scoreStr} (${mistakesStr})!${titleStr} Can you beat my time on today's puzzle?`;
    } else if (data.challengerComparison) {
      text = `⚔️ ${data.challengerComparison}! Final: ${scoreStr}${titleStr} on Snap It! Can you beat me on the exact same puzzle?`;
    } else if (data.isNewRecord) {
      text = `🏆 NEW ALL-TIME RECORD! I scored ${scoreStr} in ${modeName} on Snap It!${titleStr} (${mistakesStr}). Can you beat my high score?`;
    } else {
      text = `⚡ I just scored ${scoreStr} in ${modeName} on Snap It!${titleStr} (${mistakesStr}). Can you beat me?`;
    }

    if (challengeUrl) {
      text += `\n\n👉 Tap to challenge me on the same puzzle: ${challengeUrl}`;
    } else {
      text += `\n#SnapIt #ArcadeReaction #SpeedChallenge`;
    }

    return text;
  }

  /**
   * Main score sharing routine
   */
  public static async shareScore(
    data: ScoreCardData,
    options?: ShareOptions
  ): Promise<ShareResult> {
    if (this.isSharingInProgress) {
      return { success: false, error: 'Share already in progress' };
    }

    this.isSharingInProgress = true;

    try {
      const shareText = this.generateShareText(data, options);
      const shareTitle = data.isDailyChallenge
        ? '☀️ Snap It! Daily Challenge'
        : (data.challengerComparison ? '⚔️ Snap It! Battle Result' : (data.isNewRecord ? '🏆 Snap It! New High Score!' : '⚡ Snap It! Score Challenge'));
      const fileName = `snap-it-${data.mode}-${Date.now()}.png`;

      // 1. Generate Image Blob
      const blob = await ScoreCard.generateBlob(data);

      // 2. Native Mobile Platform (Android & iOS)
      if (Capacitor.isNativePlatform()) {
        return await this.shareOnNative(blob, fileName, shareTitle, shareText);
      }

      // 3. Web Platform (Web Share API with fallback to Download)
      return await this.shareOnWeb(blob, fileName, shareTitle, shareText);
    } catch (error: any) {
      const isAbort = error?.name === 'AbortError' || 
                      error?.message?.toLowerCase().includes('cancel') || 
                      error?.message?.toLowerCase().includes('abort');

      if (isAbort) {
        return { success: false, cancelled: true };
      }

      console.error('ShareScoreService error:', error);
      return {
        success: false,
        error: error?.message || 'Failed to share score card'
      };
    } finally {
      this.isSharingInProgress = false;
    }
  }

  /**
   * Quick 1-click challenge friend action (Mechanism 2):
   * Copies instant challenge link to clipboard or invokes native share with the link
   */
  public static async challengeFriend(
    challengeUrl: string,
    shareMessage: string
  ): Promise<ShareResult> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: '⚔️ Snap It! 1-Click Challenge',
          text: shareMessage,
          url: challengeUrl,
          dialogTitle: 'Challenge Your Friend'
        });
        return {
          success: true,
          method: 'native',
          userMessage: 'Challenge link shared!'
        };
      }

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: '⚔️ Snap It! 1-Click Challenge',
            text: shareMessage,
            url: challengeUrl
          });
          return {
            success: true,
            method: 'web-share',
            userMessage: 'Challenge link shared!'
          };
        } catch (err: any) {
          if (err?.name === 'AbortError') return { success: false, cancelled: true };
        }
      }

      // Clipboard fallback
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${shareMessage}\n${challengeUrl}`);
        return {
          success: true,
          method: 'download',
          userMessage: 'Challenge link copied! Send it to your friend.'
        };
      }

      return {
        success: true,
        userMessage: 'Challenge link ready!'
      };
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes('cancel')) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error: error?.message || 'Failed to share challenge link'
      };
    }
  }

  /**
   * Native Android/iOS implementation via Capacitor Share & Filesystem
   */
  private static async shareOnNative(
    blob: Blob,
    fileName: string,
    title: string,
    text: string
  ): Promise<ShareResult> {
    try {
      // Clean up previous temporary file if exists
      if (this.lastCreatedFilePath) {
        try {
          await Filesystem.deleteFile({
            path: this.lastCreatedFilePath,
            directory: Directory.Cache
          });
        } catch {
          // Ignore cache deletion errors
        }
        this.lastCreatedFilePath = null;
      }

      // Convert Blob to Base64
      const base64Data = await this.blobToBase64(blob);
      const filePath = `scores/${fileName}`;

      // Write image to Cache directory
      const writeResult = await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true
      });

      this.lastCreatedFilePath = filePath;
      const fileUri = writeResult.uri;

      // Invoke Native Share Sheet
      await Share.share({
        title,
        text,
        dialogTitle: 'Share Your Score & Challenge',
        files: [fileUri]
      });

      return {
        success: true,
        method: 'native',
        userMessage: 'Score & challenge shared!'
      };
    } catch (error: any) {
      const isAbort = error?.message?.toLowerCase().includes('canceled') ||
                      error?.message?.toLowerCase().includes('cancelled') ||
                      error?.message?.toLowerCase().includes('dismiss');
      if (isAbort) {
        return { success: false, cancelled: true };
      }
      throw error;
    }
  }

  /**
   * Web implementation (Web Share API with graceful file fallback)
   */
  private static async shareOnWeb(
    blob: Blob,
    fileName: string,
    title: string,
    text: string
  ): Promise<ShareResult> {
    const file = new File([blob], fileName, { type: 'image/png' });

    // Try Web Share API with Files first
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title,
          text,
          files: [file]
        });
        return {
          success: true,
          method: 'web-share',
          userMessage: 'Score card shared!'
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        console.warn('Web share failed, falling back to download:', err);
      }
    }

    // Fallback: Trigger direct image download & copy challenge text
    this.triggerDownload(blob, fileName);
    
    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        // Ignore clipboard permission issues
      }
    }

    return {
      success: true,
      method: 'download',
      userMessage: copied
        ? 'Score card saved & challenge link copied!'
        : 'Score card image saved to downloads!'
    };
  }

  /**
   * Triggers a browser download of the image blob
   */
  private static triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  /**
   * Converts a Blob to a base64 string
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if sharing is currently in progress
   */
  public static isSharing(): boolean {
    return this.isSharingInProgress;
  }
}
