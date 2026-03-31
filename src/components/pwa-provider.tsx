'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallGuide = {
  title: string;
  steps: string[];
  note: string;
};

type PwaContextValue = {
  canInstall: boolean;
  showInstallAction: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  installApp: () => Promise<void>;
  closeInstallHelp: () => void;
  refreshApp: () => void;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  showInstallAction: false,
  isInstalled: false,
  isOffline: false,
  updateAvailable: false,
  installApp: async () => {},
  closeInstallHelp: () => {},
  refreshApp: () => {}
});

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function getInstallGuide() : InstallGuide {
  if (typeof navigator === 'undefined') {
    return {
      title: 'Install PowerHouse',
      steps: ['Open this app in a supported browser to install it.'],
      note: 'Chrome, Edge, and Safari support installation in different ways.'
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome|crios|edg|opr|fxios/.test(userAgent);
  const isChromium = /chrome|crios|edg|opr/.test(userAgent);

  if (isIos) {
    return {
      title: 'Install on iPhone or iPad',
      steps: [
        'Open this app in Safari.',
        'Tap the Share button in the browser toolbar.',
        'Choose "Add to Home Screen".',
        'Tap "Add" to place PowerHouse on your home screen.'
      ],
      note: 'iPhone and iPad use the Share menu instead of a browser install prompt.'
    };
  }

  if (isAndroid && isChromium) {
    return {
      title: 'Install on Android',
      steps: [
        'Tap the browser menu in Chrome or Edge.',
        'Choose "Install app" or "Add to Home screen".',
        'Confirm the install when Android asks.'
      ],
      note: 'If the browser prompt appears automatically, you can use that instead.'
    };
  }

  if (isChromium) {
    return {
      title: 'Install on desktop',
      steps: [
        'Look for the install icon in the address bar.',
        'If you do not see it, open the browser menu.',
        'Choose "Install PowerHouse Gym" or "Install app".'
      ],
      note: 'Chrome and Edge usually show an install icon once the app is ready.'
    };
  }

  if (isSafari) {
    return {
      title: 'Install from Safari',
      steps: [
        'Open the Safari File or Share menu.',
        'Choose "Add to Dock" or "Add to Home Screen" if Safari offers it.',
        'If the option is missing, use Chrome or Edge for the easiest install flow.'
      ],
      note: 'Safari install options vary by device and version.'
    };
  }

  return {
    title: 'Install PowerHouse',
    steps: [
      'Open the browser menu.',
      'Look for "Install app", "Add to Home screen", or a similar option.',
      'If your browser does not offer installation, try Chrome, Edge, or Safari.'
    ],
    note: 'Install support depends on the browser and device.'
  };
}

function PwaStatusBanner({
  isOffline,
  updateAvailable,
  onRefresh
}: {
  isOffline: boolean;
  updateAvailable: boolean;
  onRefresh: () => void;
}) {
  if (!isOffline && !updateAvailable) {
    return null;
  }

  return (
    <div className="pwa-status-stack" aria-live="polite">
      {isOffline ? (
        <div className="pwa-status-card warning">
          <strong>You are offline</strong>
          <span>Cached screens will still open, but live sync and uploads are paused.</span>
        </div>
      ) : null}
      {updateAvailable ? (
        <div className="pwa-status-card info">
          <div>
            <strong>App update ready</strong>
            <span>Refresh once to load the latest PowerHouse version.</span>
          </div>
          <button type="button" onClick={onRefresh}>Refresh App</button>
        </div>
      ) : null}
    </div>
  );
}

function PwaInstallHelp({
  open,
  guide,
  onClose
}: {
  open: boolean;
  guide: InstallGuide;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
        <button type="button" className="ghost-button compact-dismiss" onClick={onClose}>Close</button>
        <p className="eyebrow">Install PowerHouse</p>
        <h2 id="install-help-title">{guide.title}</h2>
        <p className="subcopy">{guide.note}</p>
        <ol className="install-help-list">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const probeRef = useRef<AbortController | null>(null);
  const installGuide = useMemo(() => getInstallGuide(), []);

  const checkConnectivity = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    probeRef.current?.abort();
    const controller = new AbortController();
    probeRef.current = controller;

    if (navigator.onLine) {
      setIsOffline(false);
      return;
    }

    try {
      const timeout = window.setTimeout(() => controller.abort(), 3500);
      const response = await fetch(`/api/health?ts=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'cache-control': 'no-store' },
        signal: controller.signal
      });
      window.clearTimeout(timeout);
      setIsOffline(!response.ok);
    } catch {
      setIsOffline(true);
    }
  }, []);

  useEffect(() => {
    const initialProbe = window.setTimeout(() => {
      void checkConnectivity();
    }, 0);

    const handleOnline = () => {
      void checkConnectivity();
    };
    const handleOffline = () => {
      void checkConnectivity();
    };
    const handleInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
      setShowInstallHelp(false);
    };
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkConnectivity();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(initialProbe);
      probeRef.current?.abort();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkConnectivity]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      void (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));

          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          }
        } catch {
          // Local development should still work even if cleanup fails.
        }
      })();

      return;
    }

    let active = true;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (!active) {
          return;
        }

        registrationRef.current = registration;

        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      } catch {
        // Service worker registration should never block app usage.
      }
    };

    void registerServiceWorker();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<PwaContextValue>(() => ({
    canInstall: canInstall && !isInstalled,
    showInstallAction: !isInstalled,
    isInstalled,
    isOffline,
    updateAvailable,
    installApp: async () => {
      if (deferredPromptRef.current) {
        await deferredPromptRef.current.prompt();
        const choice = await deferredPromptRef.current.userChoice;
        if (choice.outcome === 'accepted') {
          setCanInstall(false);
          return;
        }
      }

      setShowInstallHelp(true);
    },
    closeInstallHelp: () => setShowInstallHelp(false),
    refreshApp: () => {
      const waiting = registrationRef.current?.waiting;
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }

      window.location.reload();
    }
  }), [canInstall, isInstalled, isOffline, updateAvailable]);

  return (
    <PwaContext.Provider value={value}>
      {children}
      <PwaInstallHelp open={showInstallHelp && !isInstalled} guide={installGuide} onClose={value.closeInstallHelp} />
      <PwaStatusBanner isOffline={isOffline} updateAvailable={updateAvailable} onRefresh={value.refreshApp} />
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}

export function InstallAppButton({
  compact = false,
  className = '',
  label = 'Install App'
}: {
  compact?: boolean;
  className?: string;
  label?: string;
}) {
  const { showInstallAction, installApp } = usePwa();

  if (!showInstallAction) {
    return null;
  }

  return (
    <button type="button" className={className} onClick={() => void installApp()}>
      {compact ? <span>+</span> : null}
      <span>{compact ? 'Install' : label}</span>
    </button>
  );
}
