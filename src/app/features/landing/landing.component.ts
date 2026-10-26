import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TradeLinksComponent } from '../trades/trade-links.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';
import { ParallaxDirective, RevealDirective } from '../../shared/marketing-motion.directive';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    TradeLinksComponent,
    PublicBrandComponent,
    ParallaxDirective,
    RevealDirective,
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
      text: 'Skriv, hvad kunden skal have lavet. Hovedet på sømmet hjælper med at gøre beskrivelsen til et tilbudsudkast.',
    },
    {
      title: 'Tilpas dit tilbud',
      text: 'Gennemgå forslag til opgaver og materialer. Ret antal, priser og timer med din egen faglige vurdering.',
    },
    {
      title: 'Hent som PDF',
      text: 'Kontrollér kunden, priserne og dine betingelser. Færdiggør tilbuddet og hent en PDF, som du selv kan sende.',
    },
  ];
}
