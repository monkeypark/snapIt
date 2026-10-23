import React from 'react';
import { MainMenuButtons } from './components/MainMenuButtons';
import { AdSenseBanner } from './components/AdSenseBanner';
import { AdSensePopupModal } from './components/AdSensePopupModal';

export const App: React.FC = () => {
  return (
    <>
      <MainMenuButtons />
      <AdSenseBanner />
      <AdSensePopupModal />
    </>
  );
};
