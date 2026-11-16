import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class AppInstallService {
  readonly visible = signal(false);
  readonly guide = signal<'ios' | 'android' | null>(null);
  readonly busy = signal(false);
  private pending: InstallPrompt | null = null;
  private ios = false;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const destroy = inject(DestroyRef);
    const standalone = window.matchMedia('(display-mode: standalone)');
    const fullscreen = window.matchMedia('(display-mode: fullscreen)');
    const nav = navigator as Navigator & { standalone?: boolean; userAgentData?: { mobile: boolean } };
    this.ios = /iPhone|iPad|iPod/i.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    const mobile = this.ios || /Android|Mobile/i.test(nav.userAgent) || nav.userAgentData?.mobile === true;
    let installed = false;
    const update = () => {
      this.visible.set(mobile && !installed && !standalone.matches && !fullscreen.matches && !nav.standalone);
      if (!this.visible()) this.guide.set(null);
    };
    const before = (event: Event) => {
      event.preventDefault();
      this.pending = event as InstallPrompt;
      update();
    };
    const after = () => { installed = true; this.pending = null; update(); };
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', after);
    standalone.addEventListener('change', update);
    fullscreen.addEventListener('change', update);
    window.addEventListener('pageshow', update);
    update();
    destroy.onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', before);
      window.removeEventListener('appinstalled', after);
      standalone.removeEventListener('change', update);
      fullscreen.removeEventListener('change', update);
      window.removeEventListener('pageshow', update);
    });
  }

  async install(): Promise<void> {
    if (!this.visible() || this.busy()) return;
    if (this.ios || !this.pending) {
      this.guide.set(this.ios ? 'ios' : 'android');
      return;
    }
    const prompt = this.pending;
    this.pending = null;
    this.busy.set(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      this.guide.set('android');
    } finally {
      this.busy.set(false);
    }
  }
}
