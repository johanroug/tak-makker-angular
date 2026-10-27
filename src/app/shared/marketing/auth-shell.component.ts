import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicBrandComponent } from '../components/public-brand/public-brand.component';
import { resetPublicPageScroll } from '../public-page-scroll';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink, PublicBrandComponent],
  template: `<div class="auth-page">
    <div class="auth-layout">
      <aside class="auth-story">
        <app-public-brand [tagline]="false" [inverse]="true" />
        <div class="auth-story-copy">
          <h2>
            {{ mode() === 'recover' ? 'Et øjeblik.' : 'Din faglighed.' }}<br /><em>{{
              mode() === 'recover' ? 'Så er du med igen.' : 'Et bedre overblik.'
            }}</em>
          </h2>
          <span class="story-rule" aria-hidden="true"></span>
          <p>
            {{
              mode() === 'register'
                ? 'Bliv testfirma og sæt dit præg på udviklingen.'
                : mode() === 'recover'
                  ? 'Vi hjælper dig sikkert tilbage til dine opgaver og tilbud.'
                  : 'Fra den første beskrivelse til et tilbud med dit navn på.'
            }}
          </p>
        </div>
        <img
          class="auth-story-photo"
          src="/marketing/craft-still-life.jpg"
          alt=""
          width="1536"
          height="1024"
        /><span class="auth-blueprint" aria-hidden="true"></span>
        <p class="auth-payoff">HJERNEN BAG DIT NÆSTE TILBUD.</p>
      </aside>
      <div class="auth-form-side">
        <a class="back-home" routerLink="/">Tilbage til forsiden ↗</a><ng-content />
      </div>
    </div>
  </div>`,
  styleUrl: './auth-shell.component.scss',
})
export class AuthShell {
  constructor() {
    resetPublicPageScroll();
  }
  readonly mode = input('register');
}
