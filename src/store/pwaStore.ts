import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setIsInstalled: (installed: boolean) => void;
  checkPwaStatus: () => void;
  installApp: () => Promise<'accepted' | 'dismissed' | 'manual_ios' | 'unsupported'>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  isAndroid: false,
  isStandalone: false,

  setDeferredPrompt: (prompt) => {
    set({ deferredPrompt: prompt, isInstallable: !!prompt });
  },

  setIsInstalled: (installed) => {
    set({ isInstalled: installed });
  },

  checkPwaStatus: () => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    set({
      isIOS: isIOSDevice,
      isAndroid: isAndroidDevice,
      isStandalone: isStandaloneMode,
      isInstalled: isStandaloneMode
    });
  },

  installApp: async () => {
    const { deferredPrompt, isIOS, isStandalone } = get();

    if (isStandalone) {
      return 'accepted';
    }

    if (isIOS) {
      return 'manual_ios';
    }

    if (!deferredPrompt) {
      return 'unsupported';
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        set({ deferredPrompt: null, isInstallable: false, isInstalled: true });
        return 'accepted';
      } else {
        return 'dismissed';
      }
    } catch (error) {
      console.error('Error executing PWA install prompt:', error);
      return 'unsupported';
    }
  }
}));

// Initialize global event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwaStore.getState().setDeferredPrompt(e as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', () => {
    usePwaStore.getState().setIsInstalled(true);
    usePwaStore.getState().setDeferredPrompt(null);
  });
}
