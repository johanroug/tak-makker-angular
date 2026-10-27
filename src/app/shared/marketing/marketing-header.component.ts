import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicBrandComponent } from '../components/public-brand/public-brand.component';

@Component({
  selector: 'app-marketing-header',
  imports: [RouterLink, PublicBrandComponent],
  template: `<header class="marketing-header">
    <app-public-brand [tagline]="false" />
    <nav aria-label="Hovednavigation">
      <a class="nav-secondary" routerLink="/" fragment="saadan">Sådan virker det</a
      ><a class="nav-secondary" routerLink="/" fragment="fag">Til dit fag</a
      ><a routerLink="/login">Log ind</a
      ><a class="marketing-button" routerLink="/register"
        >Bliv testfirma <span aria-hidden="true">↗</span></a
      >
    </nav>
  </header>`,
})
export class MarketingHeader {}
