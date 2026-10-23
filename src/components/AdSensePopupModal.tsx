import React, { useEffect, useState, useRef } from 'react';
import { AD_CONFIG } from '../services/ads/adConfig';
import { adService } from '../services/ads/adService';
import { soundManager } from '../services/soundManager';

export const AdSensePopupModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const insRef = useRef<HTMLModElement>(null);
  const isNative = adService.isNativeEnvironment();

  useEffect(() => {
    const handleOpen = () => {
      if (isNative || !AD_CONFIG.adsense.enabled) return;
      setIsOpen(true);
      setCountdown(3);
    };

    const handleCloseEvent = () => {
      setIsOpen(false);
    };

    window.addEventListener('snapit:show-ad-popup', handleOpen);
    window.addEventListener('snapit:close-ad-popup', handleCloseEvent);

    return () => {
      window.removeEventListener('snapit:show-ad-popup', handleOpen);
      window.removeEventListener('snapit:close-ad-popup', handleCloseEvent);
    };
  }, [isNative]);

  // Countdown timer for skip/close button
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  // Initialize AdSense display ad when modal opens
  useEffect(() => {
    if (!isOpen || isNative || !AD_CONFIG.adsense.enabled) return;

    if (!AD_CONFIG.adsense.testMode && insRef.current) {
      const status = insRef.current.getAttribute('data-adsbygoogle-status');
      if (!status) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
          console.warn('[AdSensePopupModal] Display ad load warning:', e);
        }
      }
    }
  }, [isOpen, isNative]);

  const handleClose = () => {
    if (countdown > 0) return; // Prevent skipping until countdown completes
    soundManager.playSelect();
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('snapit:ad-popup-closed'));
  };

  if (!isOpen || isNative || !AD_CONFIG.adsense.enabled) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              ADVERTISEMENT
            </span>
          </div>

          <button
            onClick={handleClose}
            disabled={countdown > 0}
            className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider transition-all ${
              countdown > 0
                ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md'
            }`}
          >
            {countdown > 0 ? `SKIP IN ${countdown}S` : '✕ CLOSE AD'}
          </button>
        </div>

        {/* Ad Container */}
        <div className="w-full min-h-[280px] flex items-center justify-center p-3 bg-slate-950/40">
          {AD_CONFIG.adsense.testMode ? (
            <div className="flex flex-col items-center justify-center p-6 text-center select-none border border-dashed border-slate-700 rounded-xl w-full">
              <span className="text-2xl mb-2">⚡</span>
              <p className="text-sm font-black text-white tracking-wide">
                Google AdSense Display Ad
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Triggered every 10 games
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-2">
                Slot: {AD_CONFIG.adsense.interstitialSlotId}
              </p>
            </div>
          ) : (
            <ins
              ref={insRef}
              className="adsbygoogle"
              style={{ display: 'block', minWidth: '280px', width: '100%', minHeight: '250px' }}
              data-ad-client={AD_CONFIG.adsense.publisherId}
              data-ad-slot={AD_CONFIG.adsense.interstitialSlotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          )}
        </div>
      </div>
    </div>
  );
};
