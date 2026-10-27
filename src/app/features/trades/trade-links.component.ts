import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TRADE_PAGES } from './trade-pages';
import { RevealDirective } from '../../shared/marketing-motion.directive';

@Component({
  selector: 'app-trade-links',
  imports: [RouterLink, RevealDirective],
  template: `
    <section aria-labelledby="trade-links-title" appReveal>
      <p class="eyebrow">TILBUDSARBEJDE I DIT FAG</p>
      <h2 id="trade-links-title">Dit næste tilbud starter<br />med din opgave.</h2>
      <div class="links">
        @for (page of pages; track page.slug) {
          <a [routerLink]="'/' + page.slug"
            ><span>Tilbudsprogram til</span
            ><strong>{{ page.trade }} <span aria-hidden="true">↗</span></strong></a
          >
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      padding: 60px 24px;
      color: #20392f;
    }
    .eyebrow {
      font-size: 10px;
      letter-spacing: 1.8px;
      font-weight: 700;
      margin: 0 0 24px;
    }
    h2 {
      font-size: clamp(32px, 4vw, 52px);
      line-height: 1.08;
      letter-spacing: -1.5px;
      margin: 0 0 32px;
    }
    .links {
      display: grid;
      gap: 12px;
    }
    a {
      display: block;
      padding: 24px;
      color: inherit;
      text-decoration: none;
      border: 1px solid #cdd4c3;
      border-radius: 5px;
      transition: background 0.2s;
    }
    a:hover {
      background: #e4e8da;
    }
    a:focus-visible {
      outline: 3px solid #b65e37;
      outline-offset: 4px;
    }
    a > span {
      font-size: 12px;
    }
    strong {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      font-size: 24px;
      margin-top: 12px;
    }
    strong span {
      color: #a05130;
    }
    @media (min-width: 800px) {
      section {
        padding: 70px 7%;
      }
      .links {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `,
})
export class TradeLinksComponent {
  readonly pages = TRADE_PAGES;
}
