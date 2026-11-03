import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-loading',
  templateUrl: './page-loading.component.html',
  styleUrl: './page-loading.component.scss',
})
export class PageLoading {
  readonly label = input('Henter dine oplysninger…');
  readonly layout = input<'project' | 'document'>('document');
}
