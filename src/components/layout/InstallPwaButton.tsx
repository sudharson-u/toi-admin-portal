'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPwaButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }

  if (installed || !isInstallable) return null;

  return (
    <button
      onClick={handleInstall}
      className={className || "inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all duration-150"}
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install TOI App</span>
    </button>
  );
}
