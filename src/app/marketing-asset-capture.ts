import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MarketingProductPreview } from './shared/marketing/marketing-product-preview.component';
import { TRADE_PAGES } from './features/trades/trade-pages';
@Component({ imports: [MarketingProductPreview], template: '<app-marketing-product-preview [mode]="mode" [page]="page" />' })
export class MarketingAssetCapture {
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly page = TRADE_PAGES.find(page => page.slug === this.params.get('trade'));
  readonly mode = this.params.get('mode') === 'intro' ? 'intro' : this.params.get('mode') === 'offer' ? 'offer' : 'work';
}
