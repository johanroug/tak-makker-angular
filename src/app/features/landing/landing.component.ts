import { Component, signal } from '@angular/core';
import { LegalLinksComponent } from '../../shared/components/legal-links/legal-links.component';
import { RouterLink } from '@angular/router';
import { TradeLinksComponent } from '../trades/trade-links.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';
import { ParallaxDirective } from '../../shared/marketing-motion.directive';
import { MarketingHeader } from '../../shared/marketing/marketing-header.component';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    LegalLinksComponent,
    TradeLinksComponent,
    PublicBrandComponent,
    ParallaxDirective,
    MarketingHeader,
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
      text: 'Skriv eller indtal, hvad der skal laves, med dine egne ord.',
      image: '/marketing/trin-1-beskriv-opgaven.png',
      alt: 'Opret et projekt ved at beskrive opgaven i tekstfeltet eller med mikrofonen.',
      width: 1762, height: 897,
    },
    {
      title: 'Tilpas tilbuddet',
      text: 'Gennemgå opgaver, materialer og priser — og tilpas, så det passer til dit fag.',
      image: '/marketing/trin-2-tilpas-tilbuddet.png',
      alt: 'Arbejdsrummet med samtalen, arbejdsopgaver, materialer og tilbudsprisen.',
      width: 1823, height: 905,
    },
    {
      title: 'Hent PDF',
      text: 'Når alt er, som det skal være, henter du tilbuddet som PDF og sender det til kunden.',
      image: '/marketing/trin-3-hent-pdf.png',
      alt: 'Det færdige tilbud med faggrupper, materialer, samlet pris og knappen Download PDF.',
      width: 1480, height: 825,
    },
  ];
}
