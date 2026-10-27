import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TradeLinksComponent } from '../trades/trade-links.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';
import { ParallaxDirective } from '../../shared/marketing-motion.directive';
import { MarketingHeader } from '../../shared/marketing/marketing-header.component';
import { ProductPreview } from '../../shared/marketing/product-preview.component';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    TradeLinksComponent,
    PublicBrandComponent,
    ParallaxDirective,
    MarketingHeader,
    ProductPreview,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  constructor() {
    resetPublicPageScroll();
  }
  readonly step = signal(0);
  readonly steps = [
    {
      title: 'Beskriv opgaven',
      text: 'Fortæl, hvad der skal laves, med dine egne ord.',
    },
    {
      title: 'Tilpas og godkend',
      text: 'Gennemgå opgaver, materialer og priser — og tilpas, så det passer til dit fag.',
    },
    {
      title: 'Send dit tilbud',
      text: 'Når alt er, som det skal være, henter du tilbuddet som PDF og sender det til kunden.',
    },
  ];
}
