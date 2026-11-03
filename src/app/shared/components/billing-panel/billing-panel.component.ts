import { Component, effect, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { BillingService } from '../../../core/billing/billing.service';

@Component({
  selector: 'app-billing-panel',
  template: `
    <section [attr.id]="compact() ? null : 'subscription'" [class.compact]="compact()" aria-label="Dit abonnement">
      @if (!compact()) { <h2>Dit abonnement</h2> }
      @if (billing.error()) {
        <p role="status">{{ billing.error() }} <button type="button" (click)="reload()">Prøv igen</button></p>
      } @else if (billing.usage(); as usage) {
        @if (usage.status === 'active') {
          <strong>Aktivt abonnement</strong>
          @if (!compact()) { <p>Din virksomhed er abonnent.</p> }
        } @else if (usage.status === 'exhausted') {
          <strong>Du har brugt dine 10 gratis forespørgsler</strong>
          <p>Du kan stadig åbne dine projekter og hente dine tilbud.</p>
          @if (!compact()) {
            <p>Du har ikke et aktivt abonnement. Abonnementer er snart klar; flere forespørgsler kræver et abonnement.</p>
          }
        } @else {
          <strong>{{ compact() ? (usage.trialRemaining === 1 ? '1 gratis forespørgsel tilbage' : usage.trialRemaining + ' gratis forespørgsler tilbage') : 'Gratis prøveperiode' }}</strong>
          @if (!compact()) {
            <p>{{ usage.trialUsed }} af {{ usage.trialLimit }} forespørgsler brugt · {{ usage.trialRemaining }} tilbage</p>
            <progress [value]="usage.trialUsed" [max]="usage.trialLimit" aria-label="Gratis forespørgsler brugt"></progress>
            <p>De 10 gratis forespørgsler deles af hele virksomheden. Kun gennemførte svar tæller.</p>
          }
          @if (usage.trialPending && !usage.canGenerate) { <p>Vent på de igangværende forespørgsler.</p> }
        }
        @if (compact()) { <button type="button" (click)="openSubscription()">Se abonnement</button> }
      } @else { <p role="status">Henter abonnement og forbrug…</p> }
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    section { padding: 24px; border: 1px solid #e6dfd2; border-radius: 16px; background: #fff; color: #263d32; scroll-margin-top: 24px; }
    h2 { margin: 0 0 16px; font-size: 20px; }
    p { margin: 8px 0; font-size: 13px; line-height: 1.6; }
    strong { font-size: 14px; }
    button { border: 0; border-radius: 6px; padding: 9px 12px; color: #12372a; background: #eef5e6; font: inherit; font-size: 12px; cursor: pointer; }
    progress { width: 100%; height: 8px; accent-color: #12372a; }
    .compact {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 4px 12px; padding: 0 4px 8px; border: 0; border-radius: 0; background: transparent;
    }
    .compact strong { font-size: 11px; font-weight: 400; color: #6b7569; }
    .compact p { flex-basis: 100%; margin: 4px 0; font-size: 12px; }
    .compact button {
      display: inline; width: auto; min-height: 28px; margin: 0; padding: 4px 0;
      border: 0; border-radius: 0; background: transparent; color: #365b44;
      font-size: 11px; font-weight: 400; text-decoration: underline; white-space: nowrap;
    }
    button:focus-visible { outline: 2px solid #8fa57d; outline-offset: 2px; }
  `,
})
export class BillingPanelComponent {
  readonly billing = inject(BillingService);
  private readonly router = inject(Router);
  readonly companyId = input<string>();
  readonly compact = input(false);
  readonly subscriptionRequested = output<void>();
  constructor() { effect(() => { void this.billing.load(this.companyId()); }); }
  reload(): void { void this.billing.load(this.companyId()); }
  openSubscription(): void {
    this.subscriptionRequested.emit();
    void this.router.navigate(['/company-profile'], { fragment: 'subscription' });
  }
}
