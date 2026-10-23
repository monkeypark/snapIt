# Snap It! — Google AdSense, AdMob & App Store Deployment Guide

This document provides complete instructions for managing advertisements (Google AdSense for Web and Google AdMob for Mobile) and publishing **Snap It!** to both the **Google Play Store (Android)** and the **Apple App Store (iOS)**.

---

## 1. Architecture Overview

Google policies prohibit displaying Google AdSense inside mobile native app WebViews (AdSense is strictly for websites and web browsers). To comply with Google's policies and maximize revenue, **Snap It!** uses a unified architecture:

| Platform | Ad Network | Implementation | Formats Supported |
| :--- | :--- | :--- | :--- |
| **Web / Browser** | **Google AdSense** | Dynamic script injection + `<AdSenseBanner />` React component | Responsive Display Banners |
| **Android & iOS Native** | **Google AdMob** | `@capacitor-community/admob` via native SDKs | Adaptive Banners, Fullscreen Interstitials, Rewarded Video Ads |

The app automatically detects the runtime platform:
- If running in a mobile app container (`Capacitor.isNativePlatform()`), **AdMob** is used.
- If running in a web browser, **Google AdSense** is used.

---

## 2. Configuring Production Ad IDs

The project is currently configured with **official Google Test IDs** so you can develop and test immediately without risk of invalid activity or account suspension.

When you are ready to launch in production, update your IDs in the following locations:

### Step 2.1: `src/services/ads/adConfig.ts`
Edit [`src/services/ads/adConfig.ts`](file:///home/ming/mvp_project/snap-it/src/services/ads/adConfig.ts):

```typescript
export const AD_CONFIG: AdConfiguration = {
  adsense: {
    enabled: true,
    publisherId: 'ca-pub-XXXXXXXXXXXXXXXX', // Your real AdSense Publisher ID
    bannerSlotId: 'YYYYYYYYYY',             // Your AdSense Banner Slot ID
    testMode: false                         // Set to false for live ads
  },

  admob: {
    enabled: true,
    testingMode: false,                     // Set to false for live ads
    interstitialInterval: 3,                // Frequency: show every 3 games

    android: {
      appId: 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY', // Your Android AdMob App ID
      bannerAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
      interstitialAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/AAAAAAAAAA',
      rewardedAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB'
    },

    ios: {
      appId: 'ca-app-pub-XXXXXXXXXXXXXXXX~CCCCCCCCCC', // Your iOS AdMob App ID
      bannerAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/DDDDDDDDDD',
      interstitialAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/EEEEEEEEEE',
      rewardedAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/FFFFFFFFFF'
    }
  }
};
```

### Step 2.2: Android Native Configuration
In [`android/app/src/main/AndroidManifest.xml`](file:///home/ming/mvp_project/snap-it/android/app/src/main/AndroidManifest.xml):
Replace the `APPLICATION_ID` value with your live Android AdMob App ID:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

### Step 2.3: iOS Native Configuration
In [`ios/App/App/Info.plist`](file:///home/ming/mvp_project/snap-it/ios/App/App/Info.plist):
Replace the `GADApplicationIdentifier` with your live iOS AdMob App ID:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~CCCCCCCCCC</string>
```

---

## 3. Google Play Store (Android) Publishing

### Step 3.1: Generate a Release Keystore
If you don't already have an upload keystore:
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```
*(Store this file and its password safely!)*

### Step 3.2: Configure Gradle Signing
In `android/app/build.gradle`, configure the release signing:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("path/to/my-release-key.jks")
            storePassword "YOUR_STORE_PASSWORD"
            keyAlias "my-key-alias"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3.3: Build the Android App Bundle (AAB)
Google Play requires `.aab` format for publishing:
```bash
npm run bundle:android
```
Or manually:
```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```
The signed bundle will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Step 3.4: Google Play Console Checklist
1. Open [Google Play Console](https://play.google.com/console) and create a new App.
2. **App details**:
   - Title: **Snap It!**
   - Category: Games / Arcade
3. **App Content & Policies**:
   - **Ads**: Select **"Yes, my app contains ads"** (required for AdMob).
   - **Data Safety**:
     - Declare advertising identifiers (`AD_ID` permission is already included in `AndroidManifest.xml`).
     - Mark diagnostics/crash logs used by AdMob SDK.
   - **Target Audience**: 13+ (or configure COPPA settings according to your policy).
4. **Releases**:
   - Go to **Testing > Internal testing** (or Production).
   - Upload `app-release.aab`.
   - Submit for review!

---

## 4. Apple App Store (iOS) Publishing

*Note: Building and archiving iOS apps requires macOS with Xcode installed.*

### Step 4.1: CocoaPods Installation
On your macOS machine:
```bash
npm install
npm run build
npx cap sync ios
cd ios/App
pod install
```

### Step 4.2: Open in Xcode
```bash
npx cap open ios
```
Or open `ios/App/App.xcworkspace` directly in Xcode.

### Step 4.3: Signing & Capabilities
1. In Xcode, select the **App** target.
2. Go to the **Signing & Capabilities** tab.
3. Check **Automatically manage signing**.
4. Select your **Apple Developer Team**.
5. Set your Bundle Identifier: `com.snapit.game` (must match your App ID in App Store Connect).

### Step 4.4: App Tracking Transparency & SKAdNetwork
The iOS `Info.plist` is already pre-configured with:
- `GADApplicationIdentifier` (AdMob App ID)
- `NSUserTrackingUsageDescription` (explaining why tracking is requested for personalized ads)
- Google's official `SKAdNetworkItems` list for iOS 14+ ad attribution

### Step 4.5: Archive and Upload
1. In Xcode, set the build destination to **Any iOS Device (arm64)**.
2. From the menu bar, choose **Product > Archive**.
3. When the Organizer window opens, click **Distribute App**.
4. Choose **App Store Connect** > **Upload**.
5. Follow the prompts to upload the build to TestFlight and App Store Connect.

### Step 4.6: App Store Connect Checklist
1. Go to [App Store Connect](https://appstoreconnect.apple.com/) and create a new App.
2. **App Information**:
   - Name: **Snap It!**
   - Primary Category: Games > Action / Arcade
3. **App Privacy (Nutrition Labels)**:
   - Data Used to Track You: Identifiers (Device ID / IDFA).
   - Data Linked to You: Usage Data, Diagnostics, Identifiers (used for third-party advertising via AdMob).
4. Select the uploaded build from TestFlight and click **Submit for Review**.

---

## 5. NPM Helper Scripts Reference

Use these scripts for quick workflows:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Run local web development server on port 3000 |
| `npm run build` | Compile the Vite web production bundle into `/dist` |
| `npm run cap:sync` | Build web assets and sync both Android & iOS native projects |
| `npm run cap:android` | Build, sync, and launch Android Studio |
| `npm run cap:ios` | Build, sync, and launch Xcode (macOS) |
| `npm run build:android`| Build, sync, and compile a debug APK (`./gradlew assembleDebug`) |
| `npm run bundle:android`| Build, sync, and compile release bundle AAB (`./gradlew bundleRelease`) |
