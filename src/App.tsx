import React from 'react';
import { MainMenuButtons } from './components/MainMenuButtons';
import { AdSenseBanner } from './components/AdSenseBanner';
import { AdSensePopupModal } from './components/AdSensePopupModal';

import { AD_CONFIG } from './services/ads/adConfig';

export const App: React.FC = () => {
  return (
    <>
      <MainMenuButtons />
      <AdSenseBanner />
      {AD_CONFIG.adsense.popupEnabled && <AdSensePopupModal />}
    </>
  );
};
