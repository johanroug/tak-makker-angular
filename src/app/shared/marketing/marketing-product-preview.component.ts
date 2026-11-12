import { Component, computed, input } from '@angular/core';
import { PublicBrandComponent } from '../components/public-brand/public-brand.component';
import { WorkspaceIcon } from '../components/workspace-icon.component';
import type { TradePage } from '../../features/trades/trade-pages';

/** Price-neutral, marketing-only source for product illustration assets. */
@Component({
  selector: 'app-marketing-product-preview',
  imports: [PublicBrandComponent, WorkspaceIcon],
  templateUrl: './marketing-product-preview.component.html',
  styleUrl: './marketing-product-preview.component.scss',
})
export class MarketingProductPreview {
  readonly mode = input<'intro' | 'work' | 'offer'>('work');
  readonly page = input<TradePage>();
  readonly title = computed(() => this.page()?.example.title.replace('Eksempel: ', '') ?? 'Renovering af badeværelse');
  readonly trade = computed(() => this.page()?.singular ?? 'VVS');
  readonly tasks = computed(() => this.page()?.example.items ?? [
    'Opmuring og klargøring af vægge', 'Flisearbejde på gulv og vægge',
    'Montering af bruseniche og armatur', 'Montering af vægtoilet',
    'Montering af vaskemøbel og armatur', 'El-installation og belysning',
    'Tætning og vådrumssikring', 'Afsluttende finish og oprydning',
  ]);
  readonly materials = computed(() => {
    const byTrade: Record<string, string[]> = {
      Tømrer: ['Terrassebrædder', 'Beslag og befæstelse', 'Træbeskyttelse'],
      Murer: ['Gulvfliser', 'Fliseklæber', 'Fugemørtel'],
      Maler: ['Vægmaling', 'Grunder', 'Afdækningsmaterialer'],
    };
    return byTrade[this.trade()] ?? ['Radiatorer', 'Ventiler og termostater', 'Tilslutningsmaterialer'];
  });
  readonly documentTasks = computed(() => this.page()
    ? this.tasks().slice(0, 6).map(title => ({ title, trade: this.trade() }))
    : [
      { trade: 'Murer', title: 'Klargøring af vægge og underlag' },
      { trade: 'Murer', title: 'Flisearbejde på gulv og vægge' },
      { trade: 'VVS', title: 'Montering af bruseniche og armatur' },
      { trade: 'VVS', title: 'Montering af vægtoilet' },
      { trade: 'Elektriker', title: 'El-installation og belysning' },
      { trade: 'Maler', title: 'Maling og afsluttende overfladebehandling' },
    ]);
}
