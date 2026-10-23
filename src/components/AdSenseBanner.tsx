import React, { useEffect, useState } from 'react';
import { AD_CONFIG } from '../services/ads/adConfig';
import { adService } from '../services/ads/adService';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

interface AdSenseBannerProps {
  slotId?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({
  slotId = AD_CONFIG.adsense.bannerSlotId,
  format = 'horizontal',
  className = ''
}) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const insRef = React.useRef<HTMLModElement>(null);
  const isNative = adService.isNativeEnvironment();

  useEffect(() => {
    const handleShow = () => setIsVisible(true);
    const handleHide = () => setIsVisible(false);

    window.addEventListener('snapit:show-web-banner', handleShow);
    window.addEventListener('snapit:hide-web-banner', handleHide);

    return () => {
      window.removeEventListener('snapit:show-web-banner', handleShow);
      window.removeEventListener('snapit:hide-web-banner', handleHide);
    };
  }, []);

  useEffect(() => {
    if (!AD_CONFIG.adsense.enabled || !AD_CONFIG.adsense.bannerEnabled || !isVisible || isNative) return;

    if (!AD_CONFIG.adsense.testMode && insRef.current) {
      // Check if this ad unit is already initialized by Google AdSense
      const status = insRef.current.getAttribute('data-adsbygoogle-status');
      if (!status) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setAdLoaded(true);
        } catch (e) {
          console.warn('[AdSenseBanner] Ad load warning:', e);
          setAdError(true);
        }
      }
    }
  }, [isVisible, isNative]);

  // Do not display web AdSense in native mobile app (AdMob is used instead)
  if (!AD_CONFIG.adsense.enabled || !AD_CONFIG.adsense.bannerEnabled || isNative) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-auto flex justify-center px-2 pb-1 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <aside
        aria-label="Google AdSense Banner"
        className={`w-full max-w-[468px] overflow-hidden rounded-t-xl rounded-b-md border-t border-x border-slate-800/90 bg-slate-950/95 backdrop-blur-md shadow-2xl transition-all duration-300 ${className}`}
        style={{ minHeight: '52px', maxHeight: '72px' }}
      >
        {/* Top subtle badge */}
        <div className="flex items-center justify-between px-3 py-0.5 border-b border-slate-800/50 text-[9px] font-mono uppercase tracking-wider text-slate-500 bg-slate-900/60">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
            Google AdSense
          </span>
          <span className="text-slate-600">Ad</span>
        </div>

        {/* Ad Content */}
        <div className="flex items-center justify-center p-1 min-h-[48px] max-h-[52px] overflow-hidden">
          {AD_CONFIG.adsense.testMode ? (
            <div className="flex flex-col items-center justify-center py-0.5 text-center select-none">
              <p className="text-[11px] font-semibold text-slate-300 tracking-wide">
                🎯 Google AdSense Banner (Bottom)
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                Publisher: {AD_CONFIG.adsense.publisherId} • Slot: {slotId}
              </p>
            </div>
          ) : (
            <ins
              ref={insRef}
              className="adsbygoogle"
              style={{ display: 'inline-block', width: '100%', height: '50px' }}
              data-ad-client={AD_CONFIG.adsense.publisherId}
              data-ad-slot={slotId}
              data-ad-format={format}
              data-full-width-responsive="true"
            />
          )}
        </div>
      </aside>
    </div>
  );
};
