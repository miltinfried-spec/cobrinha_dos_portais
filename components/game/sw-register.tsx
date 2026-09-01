'use client';
// Registra o Service Worker para funcionalidade PWA/offline
import { useEffect } from 'react';

export function SwRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker?.register?.('/sw.js')?.catch?.(() => {
        // silenciar — SW é opcional
      });
    }
  }, []);
  return null;
}
