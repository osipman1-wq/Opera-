import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

async function initAdMob() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: [],
      initializeForTesting: false,
    });
    console.log('[AdMob] Initialized successfully');
  } catch (err: any) {
    console.warn('[AdMob] Initialization failed:', err.message);
  }
}

initAdMob();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
