import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type AdMobRewardItem
} from '@capacitor-community/admob';
import { AD_CONFIG } from './adConfig';

export interface RewardResult {
  rewarded: boolean;
  type?: string;
  amount?: number;
}

class AdService {
  private isInitialized = false;
  private isNative = false;
  private platform: string = 'web';
  private gamesCompletedSinceLastAd = 0;
  private isInterstitialLoading = false;
  private isInterstitialReady = false;
  private isRewardLoading = false;
  private isRewardReady = false;
  private isBannerVisible = false;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = Capacitor.getPlatform();
    try {
      const savedCount = parseInt(localStorage.getItem('snapit_games_completed_count') || '0', 10);
      this.gamesCompletedSinceLastAd = isNaN(savedCount) ? 0 : savedCount;
    } catch {
      this.gamesCompletedSinceLastAd = 0;
    }
  }

  /**
   * Initialize Ad System (AdMob on Android/iOS, AdSense on Web)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.isNative) {
        await this.initAdMob();
      } else {
        await this.initAdSense();
      }
      this.isInitialized = true;
      console.log(`[AdService] Initialized successfully for platform: ${this.platform}`);
    } catch (error) {
      console.warn('[AdService] Initialization warning:', error);
      // Do not throw to keep game playable even if ads fail to load
    }
  }

  /**
   * Initialize AdMob for native mobile (Android / iOS)
   */
  private async initAdMob(): Promise<void> {
    if (!AD_CONFIG.admob.enabled) return;

    try {
      // Initialize AdMob SDK
      await AdMob.initialize({
        testingDevices: AD_CONFIG.admob.testingMode ? ['EMULATOR'] : []
      });

      // Request Tracking Authorization on iOS (ATT) if on iOS 14+
      if (this.platform === 'ios') {
        try {
          const status = await AdMob.trackingAuthorizationStatus();
          if (status.status === 'notDetermined') {
            await AdMob.requestTrackingAuthorization();
          }
        } catch (e) {
          console.log('[AdService] ATT request bypassed:', e);
        }
      }

      // Register AdMob event listeners
      this.setupAdMobListeners();

      // Preload first interstitial and reward ads in background
      this.preloadInterstitial();
      this.preloadRewardVideo();
    } catch (e) {
      console.error('[AdService] AdMob init error:', e);
    }
  }

  private setupAdMobListeners(): void {
    // Interstitial listeners
    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      this.isInterstitialReady = true;
      this.isInterstitialLoading = false;
      console.log('[AdService] Interstitial ad preloaded & ready');
    });

    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
      this.isInterstitialReady = false;
      this.isInterstitialLoading = false;
      console.warn('[AdService] Interstitial failed to load:', err);
    });

    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      this.isInterstitialReady = false;
      // Preload next interstitial for upcoming game cycles
      this.preloadInterstitial();
    });

    // Rewarded Video listeners
    AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
      this.isRewardReady = true;
      this.isRewardLoading = false;
      console.log('[AdService] Rewarded video preloaded & ready');
    });

    AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
      this.isRewardReady = false;
      this.isRewardLoading = false;
      console.warn('[AdService] Rewarded ad failed to load:', err);
    });

    AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      this.isRewardReady = false;
      // Preload next reward ad
      this.preloadRewardVideo();
    });

    // Banner listeners
    AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
      console.log('[AdService] Banner ad displayed');
      this.isBannerVisible = true;
    });

    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
      console.warn('[AdService] Banner ad failed to load:', err);
      this.isBannerVisible = false;
    });
  }

  /**
   * Preload an Interstitial Ad in background
   */
  public async preloadInterstitial(): Promise<void> {
    if (!this.isNative || !AD_CONFIG.admob.enabled || this.isInterstitialLoading || this.isInterstitialReady) {
      return;
    }

    this.isInterstitialLoading = true;
    const adId = this.platform === 'ios'
      ? AD_CONFIG.admob.ios.interstitialAdUnitId
      : AD_CONFIG.admob.android.interstitialAdUnitId;

    try {
      await AdMob.prepareInterstitial({
        adId,
        isTesting: AD_CONFIG.admob.testingMode
      });
    } catch (e) {
      this.isInterstitialLoading = false;
      console.warn('[AdService] Failed to prepare interstitial:', e);
    }
  }

  /**
   * Preload a Rewarded Video Ad in background
   */
  public async preloadRewardVideo(): Promise<void> {
    if (!this.isNative || !AD_CONFIG.admob.enabled || this.isRewardLoading || this.isRewardReady) {
      return;
    }

    this.isRewardLoading = true;
    const adId = this.platform === 'ios'
      ? AD_CONFIG.admob.ios.rewardedAdUnitId
      : AD_CONFIG.admob.android.rewardedAdUnitId;

    try {
      await AdMob.prepareRewardVideoAd({
        adId,
        isTesting: AD_CONFIG.admob.testingMode
      });
    } catch (e) {
      this.isRewardLoading = false;
      console.warn('[AdService] Failed to prepare rewarded ad:', e);
    }
  }

  /**
   * Show Interstitial Ad if ready, or fallback smoothly
   */
  public async showInterstitial(): Promise<boolean> {
    if (!this.isNative) {
      if (!AD_CONFIG.adsense.enabled || !AD_CONFIG.adsense.popupEnabled) return true;

      return new Promise<boolean>((resolve) => {
        const handleClosed = () => {
          window.removeEventListener('snapit:ad-popup-closed', handleClosed);
          resolve(true);
        };
        window.addEventListener('snapit:ad-popup-closed', handleClosed);
        window.dispatchEvent(new CustomEvent('snapit:show-ad-popup'));
      });
    }

    try {
      if (this.isInterstitialReady) {
        await AdMob.showInterstitial();
        this.isInterstitialReady = false;
        return true;
      } else {
        // Try quick prepare and show if not ready
        await this.preloadInterstitial();
        return false;
      }
    } catch (e) {
      console.warn('[AdService] Error showing interstitial:', e);
      return false;
    }
  }

  /**
   * Track game completion and show interstitial ad periodically (every 10 games)
   */
  public async onGameCompleted(): Promise<boolean> {
    if (!this.isNative && !AD_CONFIG.adsense.popupEnabled) {
      return false;
    }

    const requiredInterval = this.isNative
      ? AD_CONFIG.admob.interstitialInterval
      : AD_CONFIG.adsense.popupInterval;

    this.gamesCompletedSinceLastAd++;
    try {
      localStorage.setItem('snapit_games_completed_count', this.gamesCompletedSinceLastAd.toString());
    } catch {
      // ignore
    }
    console.log(`[AdService] Game completed. Count: ${this.gamesCompletedSinceLastAd} / ${requiredInterval}`);

    if (this.gamesCompletedSinceLastAd >= requiredInterval) {
      this.gamesCompletedSinceLastAd = 0;
      try {
        localStorage.setItem('snapit_games_completed_count', '0');
      } catch {
        // ignore
      }
      return await this.showInterstitial();
    }
    return false;
  }

  /**
   * Show Rewarded Video Ad (e.g. for Extra Life / Revive)
   */
  public async showRewardVideo(): Promise<RewardResult> {
    if (!this.isNative) {
      // In web browser mode, simulate rewarded video callback
      console.log('[AdService] Web Mode: Simulating rewarded video completion');
      return { rewarded: true, type: 'revive', amount: 1 };
    }

    try {
      if (!this.isRewardReady) {
        await this.preloadRewardVideo();
      }

      const rewardItem: AdMobRewardItem = await AdMob.showRewardVideoAd();
      this.isRewardReady = false;
      return {
        rewarded: true,
        type: rewardItem?.type || 'reward',
        amount: rewardItem?.amount || 1
      };
    } catch (e) {
      console.warn('[AdService] Error presenting rewarded video:', e);
      return { rewarded: false };
    }
  }

  /**
   * Show Banner Ad (Bottom of screen)
   */
  public async showBanner(): Promise<void> {
    if (this.isNative) {
      if (!AD_CONFIG.admob.enabled || this.isBannerVisible) return;

      const adId = this.platform === 'ios'
        ? AD_CONFIG.admob.ios.bannerAdUnitId
        : AD_CONFIG.admob.android.bannerAdUnitId;

      try {
        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: AD_CONFIG.admob.testingMode
        });
        this.isBannerVisible = true;
      } catch (e) {
        console.warn('[AdService] Failed to show native banner:', e);
      }
    } else {
      // Web banner visibility dispatch
      window.dispatchEvent(new CustomEvent('snapit:show-web-banner'));
    }
  }

  /**
   * Hide Banner Ad (e.g. during intense reflex gameplay)
   */
  public async hideBanner(): Promise<void> {
    if (this.isNative) {
      if (!this.isBannerVisible) return;
      try {
        await AdMob.hideBanner();
        this.isBannerVisible = false;
      } catch (e) {
        console.warn('[AdService] Failed to hide native banner:', e);
      }
    } else {
      window.dispatchEvent(new CustomEvent('snapit:hide-web-banner'));
    }
  }

  /**
   * Initialize Google AdSense for Web
   */
  private async initAdSense(): Promise<void> {
    if (!AD_CONFIG.adsense.enabled) return;

    const pubId = AD_CONFIG.adsense.publisherId;
    if (!pubId || document.getElementById('google-adsense-script')) return;

    try {
      const script = document.createElement('script');
      script.id = 'google-adsense-script';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
      document.head.appendChild(script);
      console.log(`[AdService] Google AdSense script injected with client ID: ${pubId}`);
    } catch (e) {
      console.warn('[AdService] Could not inject AdSense script:', e);
    }
  }

  public isNativeEnvironment(): boolean {
    return this.isNative;
  }

  public isRewardedReady(): boolean {
    return this.isNative ? this.isRewardReady : true;
  }
}

export const adService = new AdService();
