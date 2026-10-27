import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingHeader } from '../../shared/marketing/marketing-header.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MarketingHeader],
  template: `<div class="marketing-page">
    <app-marketing-header />
    <main>
      <p class="eyebrow">404 · EN LILLE OMVEJ</p>
      <h1>Her ramte vi<br /><em>ved siden af.</em></h1>
      <p>Siden findes ikke. Lad os få dig tilbage på sporet.</p>
      <div class="actions">
        <a class="marketing-button" routerLink="/">Til forsiden ↗</a
        ><a routerLink="/projects">Åbn dit arbejdsrum →</a>
      </div>
    </main>
  </div>`,
  styles: `
    :host {
      display: block;
    }
    .marketing-page {
      min-height: 100dvh;
    }
    main {
      max-width: 1328px;
      margin: auto;
      padding: 90px 56px;
      background: url('/marketing/blueprint.svg') right center / 50% auto no-repeat;
    }
    h1 {
      font-size: clamp(48px, 7vw, 80px);
      font-weight: 800;
      letter-spacing: -3px;
      line-height: 1.05;
      margin: 0 0 24px;
    }
    p {
      line-height: 1.8;
    }
    .actions {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 32px;
      font-size: 12px;
    }
    @media (max-width: 650px) {
      main {
        padding: 50px 24px;
        background-size: 70% auto;
      }
    }
  `,
})
export class NotFoundComponent {}
