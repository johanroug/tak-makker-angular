import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TradePage } from './trade-pages';
import { TradeLinksComponent } from './trade-links.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';
import { RevealDirective } from '../../shared/marketing-motion.directive';

@Component({
  selector: 'app-trade',
  imports: [RouterLink, TradeLinksComponent, PublicBrandComponent, RevealDirective],
  templateUrl: './trade.component.html',
  styleUrl: './trade.component.scss',
})
export class TradeComponent {
  constructor() {
    resetPublicPageScroll();
  }
  // Read current route data when Angular reuses this component for another trade.
  private readonly route = inject(ActivatedRoute);
  get page(): TradePage {
    return this.route.snapshot.data['page'];
  }
}
