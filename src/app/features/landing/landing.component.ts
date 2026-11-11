import { Component, signal } from '@angular/core';
import { LegalLinksComponent } from '../../shared/components/legal-links/legal-links.component';
import { RouterLink } from '@angular/router';
import { TradeLinksComponent } from '../trades/trade-links.component';
import { PublicBrandComponent } from '../../shared/components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../../shared/public-page-scroll';
import { MarketingHeader } from '../../shared/marketing/marketing-header.component';
import { MarketingPhone } from '../../shared/marketing/marketing-phone.component';
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
      image: '/marketing/trin-1-beskriv-opgaven.png',
      alt: 'Opret et projekt ved at beskrive opgaven i tekstfeltet eller med mikrofonen.',
      width: 1762, height: 897,
    },
    {
      title: 'Få forslag',
      text: 'AI’en opretter relevante arbejdsopgaver og materialer.',
      image: '/marketing/workspace-v3.jpg',
      alt: 'Arbejdsrummet med samtalen, arbejdsopgaver, materialer og tilbudsprisen.',
      width: 1553, height: 1040,
    },
    {
      title: 'Lav tilbud',
      text: 'Tjek, tilpas og hent et professionelt tilbud som PDF.',
      image: '/marketing/trin-3-hent-pdf.png',
      alt: 'Det færdige tilbud med faggrupper, materialer, samlet pris og knappen Download PDF.',
      width: 1480, height: 825,
    },
  ];
}
