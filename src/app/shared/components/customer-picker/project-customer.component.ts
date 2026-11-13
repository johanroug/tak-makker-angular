import { Component, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/projects/project.service';
import { CustomerChoice, CustomerPicker } from './customer-picker.component';

export type CustomerMode = 'new' | 'existing';

@Component({
  selector: 'app-project-customer', imports: [CustomerPicker, RouterLink],
  template: `
    <section class="project-customer" aria-label="Projektets kunde">
      <div class="customer-heading"><strong>Kunde</strong>
        @if (!choice() && data().customer; as customer) {
          <a class="customer-edit-link" [routerLink]="['/customers',customer.id]" (click)="contactOpened.emit()">Rediger kundeoplysninger →</a>
        }
      </div>
      @if (displayCustomer(); as customer) {
        <dl class="customer-summary"><div><dt>Kundenavn</dt><dd>{{ customer.name }}</dd></div><div><dt>Kontaktadresse</dt><dd>{{ customer.address || 'Ingen kontaktadresse' }}</dd></div>
          @if (customer.email) { <div><dt>E-mail</dt><dd>{{ customer.email }}</dd></div> }
          @if (customer.phone) { <div><dt>Telefon</dt><dd>{{ customer.phone }}</dd></div> }
        </dl>
      } @else { <p>Ingen kunde tilknyttet.</p> }
      @if (!displayCustomer() || changing()) {
        <div class="customer-mode-actions" aria-label="Vælg kundetype">
          <button type="button" [attr.aria-pressed]="mode() === 'new'" (click)="start('new')">＋ Ny kunde</button>
          <button type="button" [attr.aria-pressed]="mode() === 'existing'" (click)="start('existing')">Eksisterende kunde</button>
        </div>
      } @else {
        <div class="customer-mode-actions"><button type="button" (click)="changeCustomer()">Skift kunde</button></div>
      }
      @if (changing() && mode(); as selectedMode) {
        @for (activeMode of [selectedMode]; track activeMode) {
          <app-customer-picker [deferred]="true" [startNewCustomer]="activeMode === 'new'"
            [initialName]="data().project.customer_id ? '' : data().project.customer_name || ''"
            [initialAddress]="data().project.customer_id ? '' : data().project.customer_address || ''"
            [initialEmail]="data().project.customer_id ? '' : data().project.pending_customer_email || ''"
            [initialPhone]="data().project.customer_id ? '' : data().project.pending_customer_phone || ''"
            (selected)="select($event)" />
        }
        <p class="customer-draft-note" role="status">{{ choice() ? 'Kundevalget er ikke gemt endnu.' : selectedMode === 'new' ? 'Den nye kunde oprettes først, når du gemmer.' : 'Vælg en kunde fra søgeresultaterne.' }} Brug Gem ændringer for at gemme.</p>
      }
      @if (choice() && !changing()) { <p class="customer-draft-note" role="status">Kundevalget er ikke gemt endnu. Brug Gem ændringer for at gemme.</p> }
    </section>
  `,
  styleUrl: './project-customer.component.scss',
})
export class ProjectCustomer {
  readonly data = input.required<Awaited<ReturnType<ProjectService['getProject']>>>();
  readonly initialMode = input<CustomerMode | null>(null);
  readonly contactOpened = output<void>();
  readonly mode = signal<CustomerMode | null>(null);
  readonly choice = signal<CustomerChoice | null>(null);
  readonly changing = signal(false);
  readonly displayCustomer = computed(() => this.choice()?.customer ?? this.data().customer);
  private readonly picker = viewChild(CustomerPicker);
  constructor() { effect(() => { const mode = this.initialMode(); this.mode.set(mode); this.changing.set(!!mode); this.choice.set(null); }); }
  start(mode: CustomerMode): void {
    this.changing.set(true);
    if (this.mode() !== mode) { this.mode.set(mode); this.choice.set(null); }
  }
  changeCustomer(): void { this.changing.set(true); this.mode.set(null); this.choice.set(null); }
  select(choice: CustomerChoice | null): void { this.choice.set(choice); if (choice) this.changing.set(false); }
  selection(): { valid: boolean; choice: CustomerChoice | null } {
    if (this.mode() === 'new') {
      const choice = this.picker()?.newChoice() ?? null;
      return { valid: !!choice, choice };
    }
    return { valid: true, choice: this.choice() };
  }
}
