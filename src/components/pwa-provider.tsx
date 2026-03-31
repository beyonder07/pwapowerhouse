'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PwaContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  installApp: () => Promise<void>;
  refreshApp: () => void;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  isInstalled: false,
  isOffline: false,
  updateAvailable: false,
  installApp: async () => {},
  refreshApp: () => {}
});

function isStandaloneDisplay() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
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

export function PwaProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const probeRef = useRef<AbortController | null>(null);

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
    isInstalled,
    isOffline,
    updateAvailable,
    installApp: async () => {
      if (!deferredPromptRef.current) {
        return;
      }

      await deferredPromptRef.current.prompt();
      const choice = await deferredPromptRef.current.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
      }
    },
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
  const { canInstall, installApp } = usePwa();

  if (!canInstall) {
    return null;
  }

  return (
    <button type="button" className={className} onClick={() => void installApp()}>
      {compact ? <span>+</span> : null}
      <span>{compact ? 'Install' : label}</span>
    </button>
  );
}
