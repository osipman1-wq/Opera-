import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical';
  className?: string;
  label?: string;
}

const AD_CLIENT = 'ca-app-pub-7630905345973270';
const DEFAULT_SLOT = '6585884409';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdBanner({
  slot = DEFAULT_SLOT,
  format = 'auto',
  className = '',
  label = 'Advertisement',
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        pushed.current = true;
      }
    } catch (e) {
      console.warn('[AdBanner] adsbygoogle push failed:', e);
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-300 mb-1">
        {label}
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
