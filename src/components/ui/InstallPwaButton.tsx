import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPwaButton: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
        title="Install aplikasi ke layar utama HP/perangkat"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Install Aplikasi</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
    >
      <Smartphone className="w-4 h-4" />
      Install Aplikasi ke HP
    </button>
  );
};
