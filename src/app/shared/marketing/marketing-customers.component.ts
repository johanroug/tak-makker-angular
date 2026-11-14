import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkspaceIcon } from '../components/workspace-icon.component';

@Component({
  selector: 'app-marketing-customers',
  imports: [RouterLink, WorkspaceIcon],
  template: `
    <section class="trade-focus customer-showcase" aria-labelledby="customers-title">
      <div class="trade-focus-copy">
        <p class="eyebrow">Kunder og projekter samlet</p>
        <h2 id="customers-title">Styr på kunderne.<br /><em>Mere tid til håndværket.</em></h2>
        <p>Saml kontaktoplysninger, projekter og tilbudsstatus i ét overblik. Find kunden, og fortsæt arbejdet, hvor du slap.</p>
        <p>Skal du lave mere for samme kunde? Opret et nyt projekt til kunden, og slip for at indtaste kontaktoplysningerne igen. Kundeoplysningerne følger med til tilbuddet.</p>
        <a class="trade-focus-link" routerLink="/register">Prøv gratis <span aria-hidden="true">→</span></a>
      </div>
      <div class="trade-focus-example">
        <svg class="customer-illustration" viewBox="0 0 100 130" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M30 17H17a8 8 0 0 0-8 8v94a8 8 0 0 0 8 8h66a8 8 0 0 0 8-8V25a8 8 0 0 0-8-8H70M31 10h12a7 7 0 0 1 14 0h12v17H31Z" />
          <circle cx="50" cy="48" r="8" /><path d="M37 68a13 13 0 0 1 26 0ZM25 85l4 4 7-8m10 5h29M25 105l4 4 7-8m10 5h29" />
        </svg>
        <div class="customer-example-copy">
        <span class="trade-focus-caption">Illustrativt eksempel · Kundens overblik</span>
        <h3>Én kunde. Flere opgaver.</h3>
        <ul>
          <li>Navn, telefon, e-mail og kontaktadresse samlet</li>
          <li>Kundens projekter og arbejdsadresser</li>
          <li>Seneste tilbudsstatus på hvert projekt</li>
        </ul>
        </div>
        <ol class="customer-flow" aria-label="Fra kunde til tilbud">
          <li><app-workspace-icon name="account" /> Opret kunde</li>
          <li><app-workspace-icon name="projects" /> Tilknyt projekt</li>
          <li><app-workspace-icon name="offers" /> Lav tilbud</li>
        </ol>
      </div>
    </section>
  `,
  styles: ':host { display: block; }',
})
export class MarketingCustomers {}
