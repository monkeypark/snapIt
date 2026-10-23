/**
 * AdSense & AdMob Configuration
 *
 * For development & testing, official Google Test IDs are pre-configured.
 * Replace with your real Google AdSense Publisher ID and AdMob Ad Unit IDs
 * when ready for production release.
 */

export interface AdConfiguration {
  // Google AdSense (Web)
  adsense: {
    enabled: boolean;
    bannerEnabled: boolean;
    popupEnabled: boolean;
    publisherId: string; // e.g. "ca-pub-XXXXXXXXXXXXXXXX"
    bannerSlotId: string; // Bottom banner slot
    interstitialSlotId: string; // Display ad slot for popups
    popupInterval: number; // Show popup ad every X completed games
    testMode: boolean;
  };

  // Google AdMob (Mobile Android & iOS)
  admob: {
    enabled: boolean;
    testingMode: boolean;
    interstitialInterval: number; // Show interstitial ad every X completed games

    android: {
      appId: string;
      bannerAdUnitId: string;
      interstitialAdUnitId: string;
      rewardedAdUnitId: string;
    };

    ios: {
      appId: string;
      bannerAdUnitId: string;
      interstitialAdUnitId: string;
      rewardedAdUnitId: string;
    };
  };
}

export const AD_CONFIG: AdConfiguration = {
  adsense: {
    enabled: true,
    bannerEnabled: true,
    popupEnabled: false, // Disabled: user requested banner only
    publisherId: 'ca-pub-3612854431763761',
    bannerSlotId: '6893583461',
    interstitialSlotId: '9128864564',
    popupInterval: 10,
    testMode: false
  },

  admob: {
    enabled: true,
    testingMode: true, // Keep true during testing to prevent invalid impressions
    interstitialInterval: 10, // Show interstitial every 10 games

    // Official Google AdMob Test IDs (Guaranteed to serve test ads without policy bans)
    android: {
      appId: 'ca-app-pub-3940256099942544~3347511713',
      bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
      interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
      rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917'
    },

    ios: {
      appId: 'ca-app-pub-3940256099942544~1458602516',
      bannerAdUnitId: 'ca-app-pub-3940256099942544/2934735716',
      interstitialAdUnitId: 'ca-app-pub-3940256099942544/4411468910',
      rewardedAdUnitId: 'ca-app-pub-3940256099942544/1712485313'
    }
  }
};
