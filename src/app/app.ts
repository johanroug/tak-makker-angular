import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppInstallComponent } from './shared/components/app-install/app-install.component';

@Component({
  imports: [RouterOutlet, AppInstallComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('hovedet-paa-soemmet-angular');
}
