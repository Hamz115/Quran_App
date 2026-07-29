import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && isStandalone());

  useEffect(() => {
    if (Boolean((window as any).__TAURI_INTERNALS__)) {
      setInstalled(true);
      return;
    }

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setPromptEvent(null);
      return;
    }

    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.alert(isiOS
      ? 'Install QuranTrack: tap the Share button in Safari, choose “Add to Home Screen,” then tap Add.'
      : 'Install QuranTrack from your browser menu: choose “Install QuranTrack” or “Add to Home screen.”');
  };

  return (
    <button
      type="button"
      onClick={install}
      className={compact ? 'pwa-install-compact' : 'desktop-nav-link w-full'}
      aria-label="Install QuranTrack app"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
      </svg>
      <span>{compact ? 'Install' : 'Install QuranTrack'}</span>
    </button>
  );
}
