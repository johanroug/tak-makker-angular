import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-public-brand',
  imports: [RouterLink],
  template: `
    <a [routerLink]="destination()" [class.header-brand]="header()" aria-label="Hovedet på Sømmet">
      <span class="mark"
        ><img src="/brand-preview/reference-symbol.svg" alt="" width="48" height="48"
      /></span>
      <span class="wordmark"
        ><strong
          >Hovedet<span>på <em>Sømmet</em></span></strong
        >
        @if (tagline()) {
          <small>Hjernen bag dit næste tilbud.</small>
        }
      </span>
    </a>
  `,
  styles: `
    :host {
      display: inline-block;
      min-width: 0;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: inherit;
      text-decoration: none;
    }
    a:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 5px;
      border-radius: 6px;
    }
    .mark {
      flex: none;
      width: 48px;
      height: 48px;
      overflow: hidden;
    }
    img {
      display: block;
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    strong {
      display: block;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.7px;
      line-height: 1.03;
    }
    strong span {
      display: block;
    }
    em {
      color: #e76f31;
      font-style: normal;
    }
    small {
      display: block;
      margin-top: 7px;
      font-size: 10px;
      letter-spacing: 0.15px;
    }
    .header-brand .mark,
    .header-brand img {
      width: 56px;
      height: 56px;
    }
    .header-brand {
      gap: 8px;
    }
    .header-brand strong {
      font-size: 20px;
    }
    @media (max-width: 600px) {
      strong {
        font-size: 18px;
      }
      small {
        display: none;
      }
    }
  `,
})
export class PublicBrandComponent {
  readonly header = input(false);
  readonly tagline = input(true);
  readonly destination = input('/');
}
