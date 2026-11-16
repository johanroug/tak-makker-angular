import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { AppInstallService } from '../../../core/pwa/app-install.service';

@Component({
  selector: 'app-install',
  templateUrl: './app-install.component.html',
  styleUrl: './app-install.component.scss',
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
