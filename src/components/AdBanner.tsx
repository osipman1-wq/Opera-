import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdMobBannerSize } from '@capacitor-community/admob';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical';
  className?: string;
  label?: string;
}

const ADSENSE_CLIENT  = 'ca-pub-7630905345973270';
const ADSENSE_SLOT    = '6585884409';
const ADMOB_UNIT_ID   = 'ca-app-pub-7630905345973270/6585884409';

declare global {
  interface Window { adsbygoogle: any[]; }
}

function WebAdSense({ slot, format, label, className }: AdBannerProps) {
  const adRef   = useRef<HTMLModElement>(null);
  const pushed  = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch (e) {
      console.warn('[AdBanner] adsbygoogle push failed:', e);
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden ${className ?? ''}`}>
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-300 mb-1">
        {label}
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot ?? ADSENSE_SLOT}
        data-ad-format={format ?? 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  );
}

function MobileAdMobBanner({ label, className }: Pick<AdBannerProps, 'label' | 'className'>) {
  const [shown, setShown] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function showBanner() {
      try {
        const options: BannerAdOptions = {
          adId: ADMOB_UNIT_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        };
        await AdMob.showBanner(options);
        if (mounted) setShown(true);
      } catch (err: any) {
        console.warn('[AdMob] Banner failed:', err.message);
        if (mounted) setError(true);
      }
    }

    showBanner();
    return () => {
      mounted = false;
      AdMob.hideBanner().catch(() => {});
    };
  }, []);

  if (error) return null;

  return (
    <div className={`w-full ${className ?? ''}`}>
      {!shown && (
        <div className="h-14 bg-neutral-100 rounded animate-pulse" />
      )}
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-300 mt-1">
        {label ?? 'Advertisement'}
      </p>
    </div>
  );
}

export default function AdBanner(props: AdBannerProps) {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    return <MobileAdMobBanner label={props.label} className={props.className} />;
  }
  return <WebAdSense {...props} />;
}
