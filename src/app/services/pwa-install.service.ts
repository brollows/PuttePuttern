import { Injectable, NgZone } from '@angular/core';

type PwaInstallOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: PwaInstallOutcome;
    platform: string;
  }>;
  prompt(): Promise<{
    outcome: PwaInstallOutcome;
    platform: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  canInstall = false;
  isInstalled = false;
  isIos = false;

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor(private zone: NgZone) {
    if (typeof window === 'undefined') {
      return;
    }

    this.isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    this.isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();

      this.zone.run(() => {
        this.deferredPrompt = event as BeforeInstallPromptEvent;
        this.canInstall = true;
      });
    });

    window.addEventListener('appinstalled', () => {
      this.zone.run(() => {
        this.deferredPrompt = null;
        this.canInstall = false;
        this.isInstalled = true;
      });
    });
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) {
      return;
    }

    const promptEvent = this.deferredPrompt;

    this.deferredPrompt = null;
    this.canInstall = false;

    await promptEvent.prompt();
  }
}
