import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { AppInstallService } from '../../../core/pwa/app-install.service';

@Component({
  selector: 'app-install',
  template: `
    @if (install.visible()) {
      <div class="install-footer"><button type="button" [disabled]="install.busy()" (click)="install.install()">Brug Hovedet på Sømmet som app</button></div>
    }
    <dialog #dialog aria-labelledby="install-title" (close)="install.guide.set(null)" (cancel)="install.guide.set(null)" (click)="$event.target === dialog && dialog.close()">
      <h2 id="install-title">Installer som app</h2>
      @if (install.guide() === 'ios') {
        <p>Åbn Hovedet på Sømmet i Safari på din iPhone eller iPad.</p>
        <ol><li>Åbn browserens delingsmenu (firkanten med pil op). Den kan ligge under menuknappen.</li><li>Vælg <strong>Føj til hjemmeskærm</strong>.</li><li>Slå <strong>Åbn som webapp</strong> til, hvis muligheden vises, og tryk <strong>Tilføj</strong>.</li></ol>
      } @else {
        <p>Åbn Hovedet på Sømmet i en mobilbrowser, fx Chrome.</p>
        <ol><li>Åbn browserens menu (typisk de tre prikker).</li><li>Vælg <strong>Installer app</strong> eller <strong>Føj til startskærm</strong>, og bekræft.</li></ol>
        <p>Hvis valget mangler, kan du prøve Chrome eller en anden browser, der understøtter installation. Åbn siden direkte i browseren, hvis du kom fra en anden app.</p>
      }
      <button type="button" class="close" (click)="dialog.close()" autofocus>Forstået</button>
    </dialog>
  `,
  styles: `
    :host { display: block; }
    .install-footer { padding: 12px 16px calc(24px + env(safe-area-inset-bottom, 0px)); text-align: center; }
    .install-footer button { border: 0; padding: 8px; background: transparent; color: #526459; font: inherit; font-size: 12px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
    dialog { width: min(420px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); overflow: auto; box-sizing: border-box; padding: 24px; border: 1px solid #e0e5dc; border-radius: 16px; background: #fffaf4; color: #12372a; box-shadow: 0 16px 48px #082f2630; }
    dialog::backdrop { background: #082f2666; }
    h2 { margin: 0 0 16px; font-size: 22px; }
    p, li { font-size: 15px; line-height: 1.6; }
    ol { padding-left: 22px; } li + li { margin-top: 10px; }
    .close { min-height: 44px; margin-top: 8px; padding: 10px 18px; border: 0; border-radius: 9px; background: #12372a; color: white; font: inherit; cursor: pointer; }
    button:focus-visible { outline: 2px solid #b98131; outline-offset: 3px; }
    @media (display-mode: standalone), (display-mode: fullscreen) { .install-footer { display: none; } }
    @media (max-width: 900px) { :host-context(app-root:has(.mobile-workspace-nav)) .install-footer { padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px)); } }
  `,
})
export class AppInstallComponent {
  readonly install = inject(AppInstallService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    effect(() => {
      const guide = this.install.guide();
      const dialog = this.dialog()?.nativeElement;
      if (guide && dialog && !dialog.open) dialog.showModal();
      else if (!guide && dialog?.open) dialog.close();
    });
  }
}
