import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-brand',
  imports: [RouterLink],
  template: `
    <a routerLink="/" aria-label="Tak Makker – forside">
      <span class="mark"><img src="/favicon.png" alt="" width="42" height="42" /></span>
      <span
        ><strong>Tak Makker</strong>
        @if (tagline()) {
          <small>DIN DIGITALE MAKKER</small>
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
      outline: 3px solid #e77845;
      outline-offset: 5px;
    }
    .mark {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #fffdf6;
    }
    img {
      display: block;
      width: 38px;
      height: 38px;
      object-fit: contain;
    }
    strong {
      display: block;
      font-size: 25px;
      font-weight: 800;
      letter-spacing: -1.4px;
      line-height: 1.1;
    }
    small {
      display: block;
      font-size: 8px;
      letter-spacing: 1.3px;
      margin-top: 6px;
    }
    @media (max-width: 360px) {
      a {
        gap: 7px;
      }
      strong {
        font-size: 21px;
      }
      small {
        font-size: 7px;
        letter-spacing: 1px;
      }
    }
  `,
})
export class PublicBrandComponent {
  readonly tagline = input(true);
}
