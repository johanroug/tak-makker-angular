import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MarketingHeader } from '../../shared/marketing/marketing-header.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { LegalLinksComponent } from '../../shared/components/legal-links/legal-links.component';
import { TradeLinksComponent } from '../trades/trade-links.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';
import { PRODUCT_PAGES } from './product-pages';

@Component({
  selector: 'app-product',
  imports: [RouterLink, MarketingHeader, PublicBrandComponent, LegalLinksComponent, TradeLinksComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
})
export class ProductComponent {
  private readonly route = inject(ActivatedRoute);
  get page(): (typeof PRODUCT_PAGES)[number] { return this.route.snapshot.data['product']; }
  constructor() { resetPublicPageScroll(); }
}
