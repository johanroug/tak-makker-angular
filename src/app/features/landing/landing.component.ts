import { Component, signal } from '@angular/core';
import { LegalLinksComponent } from '../../shared/components/legal-links/legal-links.component';
import { RouterLink } from '@angular/router';
import { TradeLinksComponent } from '../trades/trade-links.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';
import { MarketingHeader } from '../../shared/marketing/marketing-header.component';
import { MarketingPhone } from '../../shared/marketing/marketing-phone.component';
import { MarketingCustomers } from '../../shared/marketing/marketing-customers.component';
import { WorkspaceIcon } from '../../shared/components/workspace-icon.component';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    LegalLinksComponent,
    TradeLinksComponent,
    PublicBrandComponent,
    MarketingHeader,
    MarketingPhone,
    MarketingCustomers,
    WorkspaceIcon,
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
      title: 'Beskriv projektet',
      text: 'Fortæl kort, hvad der skal laves – med tekst eller tale.',
      image: '/marketing/trin-1-beskriv-opgaven-flexible.jpg',
      alt: 'Opret et projekt ved at beskrive opgaven i tekstfeltet eller med mikrofonen.',
      width: 1747, height: 889,
    },
    {
      title: 'Få forslag',
      text: 'AI’en opretter relevante arbejdsopgaver og materialer.',
      image: '/marketing/workspace-flexible.jpg',
      alt: 'Illustrativt arbejdsrum med samtale, fag, opgaver og materialer. Du vælger selv tidsforbrug og priser.',
      width: 1553, height: 1040,
    },
    {
      title: 'Lav tilbud',
      text: 'Tjek, tilpas og hent et professionelt tilbud som PDF.',
      image: '/marketing/trin-3-hent-pdf-flexible.jpg',
      alt: 'Illustrativt tilbud med faggrupper, godkendte arbejdsopgaver og materialer, klar til PDF med dine egne priser.',
      width: 1480, height: 825,
    },
  ];
}
